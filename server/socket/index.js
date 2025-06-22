const express = require('express')
const { Server } = require('socket.io')
const http  = require('http')
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken')
const UserModel = require("../models/UserModel")
const { ConversationModel, MessageModel } = require('../models/ConversationModel')
const MessageRequestModel = require('../models/MessageRequestModel')
const getConversation = require('../helpers/getConversation')

const app = express()
const server = http.createServer(app)

// Initialize socket server
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', process.env.FRONTEND_URL],
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    pingTimeout: 60000,
    pingInterval: 25000
})

// Track online users with Map for efficient lookups
const onlineUsers = new Map()

// Helper function to update conversation list
async function updateConversationList(userId) {
    if (!userId) {
        console.error('updateConversationList: No userId provided');
        return;
    }

    try {
        const userSocket = onlineUsers.get(userId.toString());
        if (!userSocket) {
            console.log(`User ${userId} is offline, skipping conversation update`);
            return;
        }

        const conversations = await getConversation(userId);
        console.log(`Sending ${conversations.length} conversations to user ${userId}`);
        
        io.to(userSocket).emit('conversation', conversations);
    } catch (error) {
        console.error('Update conversation list error:', error);
    }
}

// Socket authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token
        if (!token) {
            return next(new Error('Authentication token missing'))
        }

        const user = await getUserDetailsFromToken(token)
        if (!user) {
            return next(new Error('Invalid token'))
        }

        socket.user = user
        next()
    } catch (error) {
        console.error('Socket authentication error:', error)
        next(new Error('Authentication failed'))
    }
})

io.on('connection', async(socket) => {
    try {
        const userId = socket.user._id.toString()
        console.log("User connected:", socket.user.name, "Socket ID:", socket.id)

        // Add user to online users and broadcast
        onlineUsers.set(userId, socket.id)
        io.emit('onlineUser', Array.from(onlineUsers.keys()))

        // Update user online status in database
        await UserModel.findByIdAndUpdate(userId, { online: true })

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log("User disconnected:", socket.user.name)
            
            // Remove from online users
            onlineUsers.delete(userId)
            
            // Update database status
            await UserModel.findByIdAndUpdate(userId, { online: false })
            
            // Broadcast updated online users list
            io.emit('onlineUser', Array.from(onlineUsers.keys()))
        })

        // Handle message-page request
        socket.on('message-page', async (targetUserId) => {
            try {
                const targetUser = await UserModel.findById(targetUserId)
                if (!targetUser) {
                    socket.emit('message-user', {
                        isDeleted: true,
                        message: 'User account has been deleted'
                    })
                    return
                }

                const currentUser = await UserModel.findById(userId)
                const isBlocked = currentUser.blockedUsers?.includes(targetUserId)
                const isBlockedBy = targetUser.blockedUsers?.includes(userId)
                
                // Check for pending message request
                const pendingRequest = await MessageRequestModel.findOne({
                    $or: [
                        { sender: userId, receiver: targetUserId },
                        { sender: targetUserId, receiver: userId }
                    ],
                    status: 'pending'
                })

                const userDetails = {
                    _id: targetUser._id,
                    name: targetUser.name,
                    profile_pic: targetUser.profile_pic,
                    online: onlineUsers.has(targetUserId.toString()),
                    isDeleted: false,
                    isBlocked,
                    isBlockedBy,
                    messagePending: !!pendingRequest
                }

                socket.emit('message-user', userDetails)

                // Only load messages if there's no block and no pending request
                if (!isBlocked && !isBlockedBy && !pendingRequest) {
                    const conversation = await ConversationModel.findOne({
                        $or: [
                            { sender: userId, receiver: targetUserId },
                            { sender: targetUserId, receiver: userId }
                        ]
                    }).populate('messages')

                    if (conversation) {
                        socket.emit('message', conversation.messages)
                    }
                }
            } catch (error) {
                console.error('Message page error:', error)
                socket.emit('message_error', { message: error.message })
            }
        })

        // Handle new message
        socket.on('new message', async (data) => {
            try {
                const { sender, receiver, text, imageUrl, videoUrl, msgByUserId } = data

                const [senderUser, receiverUser] = await Promise.all([
                    UserModel.findById(sender),
                    UserModel.findById(receiver)
                ])

                if (!senderUser || !receiverUser) {
                    socket.emit('message_error', { message: 'User not found' })
                    return
                }

                const isBlocked = receiverUser.blockedUsers?.includes(sender)
                const isBlockedBy = senderUser.blockedUsers?.includes(receiver)

                if (isBlocked || isBlockedBy) {
                    socket.emit('message_error', { message: 'Unable to send message - user is blocked' })
                    return
                }

                // Check for existing conversation
                const existingConversation = await ConversationModel.findOne({
                    $or: [
                        { sender, receiver },
                        { sender: receiver, receiver: sender }
                    ]
                })

                // If no existing conversation, check for pending request
                if (!existingConversation) {
                    const pendingRequest = await MessageRequestModel.findOne({
                        $or: [
                            { sender, receiver, status: 'pending' },
                            { sender: receiver, receiver: sender, status: 'pending' }
                        ]
                    })

                    // If no pending request, create one
                    if (!pendingRequest) {
                        const newRequest = new MessageRequestModel({
                            sender,
                            receiver,
                            status: 'pending',
                            firstMessage: {
                                text,
                                imageUrl,
                                videoUrl
                            }
                        })
                        await newRequest.save()

                        // Notify receiver about new message request
                        const receiverSocket = onlineUsers.get(receiver.toString())
                        if (receiverSocket) {
                            io.to(receiverSocket).emit('new_message_request', {
                                request: await MessageRequestModel.findById(newRequest._id)
                                    .populate('sender', '-password')
                                    .populate('receiver', '-password')
                            })
                        }

                        socket.emit('message_error', { 
                            message: 'Message request sent. Waiting for acceptance.',
                            errorType: 'REQUEST_PENDING'
                        })
                        return
                    }

                    // If there's a pending request and sender isn't the original requester
                    if (pendingRequest && pendingRequest.sender.toString() !== sender) {
                        socket.emit('message_error', { 
                            message: 'Cannot send messages until request is accepted',
                            errorType: 'REQUEST_PENDING'
                        })
                        return
                    }
                }

                // If we reach here, either there's an existing conversation or the sender has a pending request
                // Create and save the message
                const message = new MessageModel({
                    text,
                    imageUrl,
                    videoUrl,
                    msgByUserId
                })
                const savedMessage = await message.save()

                let conversation = await ConversationModel.findOne({
                    $or: [
                        { sender, receiver },
                        { sender: receiver, receiver: sender }
                    ]
                })

                if (!conversation) {
                    conversation = new ConversationModel({
                        sender,
                        receiver,
                        messages: [savedMessage._id]
                    })
                    await conversation.save()
                } else {
                    // Add message to existing conversation
                    await ConversationModel.findByIdAndUpdate(
                        conversation._id,
                        { 
                            $push: { messages: savedMessage._id },
                            $set: { updatedAt: new Date() }
                        }
                    )
                }

                // Get updated conversation with populated messages
                const updatedConversation = await ConversationModel.findById(conversation._id)
                    .populate('messages')
                    .populate('sender')
                    .populate('receiver')
                    .exec()

                // Send messages to both users
                const receiverSocket = onlineUsers.get(receiver.toString())
                if (receiverSocket) {
                    io.to(receiverSocket).emit('message', {
                        messages: updatedConversation.messages,
                        conversationId: conversation._id,
                        withUserId: sender
                    })
                }
                
                socket.emit('message', {
                    messages: updatedConversation.messages,
                    conversationId: conversation._id,
                    withUserId: receiver
                })

                // Update conversation lists for both users immediately
                await Promise.all([
                    updateConversationList(sender.toString()),
                    updateConversationList(receiver.toString())
                ])

            } catch (error) {
                console.error('New message error:', error)
                socket.emit('message_error', { message: 'Failed to send message' })
            }
        })
        
        // Handle get_message_requests
        socket.on('get_message_requests', async () => {
            try {
                const requests = await MessageRequestModel.find({
                    receiver: userId,
                    status: 'pending'
                }).populate('sender', '-password')

                socket.emit('message_requests', requests)
            } catch (error) {
                console.error('Get message requests error:', error)
                socket.emit('message_error', { message: 'Failed to fetch message requests' })
            }
        })

        // Handle message request response
        socket.on('handle_message_request', async ({ requestId, action }, callback) => {
            try {
                const request = await MessageRequestModel.findById(requestId)
                    .populate('sender', '-password')
                    .populate('receiver', '-password');

                if (!request) {
                    socket.emit('message_error', { message: 'Message request not found' });
                    return;
                }

                if (request.status !== 'pending') {
                    socket.emit('message_error', { message: 'This request has already been handled' });
                    return;
                }

                if (request.receiver._id.toString() !== userId) {
                    socket.emit('message_error', { message: 'Not authorized to handle this request' });
                    return;
                }

                if (action === 'accept') {
                    const message = new MessageModel({
                        text: request.firstMessage.text,
                        imageUrl: request.firstMessage.imageUrl,
                        videoUrl: request.firstMessage.videoUrl,
                        msgByUserId: request.sender._id
                    });
                    const savedMessage = await message.save();

                    const conversation = new ConversationModel({
                        sender: request.sender._id,
                        receiver: request.receiver._id,
                        messages: [savedMessage._id]
                    });
                    await conversation.save();

                    await MessageRequestModel.findByIdAndUpdate(requestId, {
                        status: 'accepted'
                    });

                    const populatedConversation = await ConversationModel.findById(conversation._id)
                        .populate({
                            path: 'messages',
                            populate: {
                                path: 'msgByUserId',
                                select: 'name profile_pic'
                            }
                        })
                        .exec();

                    // Notify both users
                    const senderSocket = onlineUsers.get(request.sender._id.toString());
                    if (senderSocket) {
                        io.to(senderSocket).emit('message_request_handled', {
                            requestId,
                            action: 'accepted'
                        });
                        io.to(senderSocket).emit('message', {
                            messages: populatedConversation.messages,
                            conversationId: conversation._id,
                            withUserId: request.receiver._id
                        });
                    }

                    socket.emit('message_request_handled', {
                        requestId,
                        action: 'accepted'
                    });
                    socket.emit('message', {
                        messages: populatedConversation.messages,
                        conversationId: conversation._id,
                        withUserId: request.sender._id
                    });

                    // Update conversation lists
                    await Promise.all([
                        updateConversationList(request.sender._id),
                        updateConversationList(request.receiver._id)
                    ]);

                } else if (action === 'reject') {
                    await MessageRequestModel.findByIdAndUpdate(requestId, {
                        status: 'rejected'
                    });

                    const senderSocket = onlineUsers.get(request.sender._id.toString());
                    if (senderSocket) {
                        io.to(senderSocket).emit('message_request_handled', {
                            requestId,
                            action: 'rejected'
                        });
                    }

                    socket.emit('message_request_handled', {
                        requestId,
                        action: 'rejected'
                    });
                }

                // Get updated requests list
                const requests = await MessageRequestModel.find({
                    receiver: userId,
                    status: 'pending'
                }).populate('sender', '-password');

                socket.emit('message_requests', requests);

                if (callback) callback();

            } catch (error) {
                console.error('Handle message request error:', error);
                socket.emit('message_error', { message: 'Failed to process message request' });
            }
        })

        // Handle sidebar updates
        socket.on('sidebar', async () => {
            try {
                console.log(`Updating sidebar for user ${userId}`);
                await updateConversationList(userId);
            } catch (error) {
                console.error('Sidebar update error:', error);
                socket.emit('message_error', { message: 'Failed to update conversation list' });
            }
        });

        // Handle seen messages
        socket.on('seen', async (msgByUserId) => {
            try {
                const conversation = await ConversationModel.findOne({
                    $or: [
                        { sender: userId, receiver: msgByUserId },
                        { sender: msgByUserId, receiver: userId }
                    ]
                }).populate('messages');

                if (conversation) {
                    // Update seen status for messages from the other user
                    await MessageModel.updateMany(
                        {
                            _id: { $in: conversation.messages.map(m => m._id) },
                            msgByUserId: msgByUserId,
                            seen: false
                        },
                        { $set: { seen: true } }
                    );

                    // Get updated conversation with populated messages
                    const updatedConversation = await ConversationModel.findById(conversation._id)
                        .populate('messages')
                        .populate('sender', 'name profile_pic')
                        .populate('receiver', 'name profile_pic')
                        .populate('messages.msgByUserId', 'name profile_pic')
                        .exec();

                    // Send updated messages to both users
                    const receiverSocket = onlineUsers.get(msgByUserId);
                    if (receiverSocket) {
                        io.to(receiverSocket).emit('message', {
                            messages: updatedConversation.messages,
                            conversationId: conversation._id,
                            withUserId: userId
                        });
                    }
                    
                    socket.emit('message', {
                        messages: updatedConversation.messages,  
                        conversationId: conversation._id,
                        withUserId: msgByUserId
                    });

                    // Update conversation lists for both users
                    await Promise.all([
                        updateConversationList(userId),
                        updateConversationList(msgByUserId)
                    ]);
                }
            } catch (error) {
                console.error('Mark seen error:', error);
                socket.emit('message_error', { message: 'Failed to mark messages as seen' });
            }
        });

        // Handle blocking/unblocking users
        socket.on('toggle_block_user', async ({ targetUserId }, callback) => {
            try {
                const currentUser = await UserModel.findById(userId)
                const targetUser = await UserModel.findById(targetUserId)

                if (!currentUser || !targetUser) {
                    socket.emit('message_error', { message: 'User not found' })
                    return
                }

                const isBlocked = currentUser.blockedUsers?.includes(targetUserId)

                if (isBlocked) {
                    // Unblock user
                    await UserModel.findByIdAndUpdate(userId, {
                        $pull: { blockedUsers: targetUserId }
                    })
                } else {
                    // Block user
                    await UserModel.findByIdAndUpdate(userId, {
                        $addToSet: { blockedUsers: targetUserId }
                    })
                }

                // Notify both users about the block status change
                const receiverSocket = onlineUsers.get(targetUserId)
                if (receiverSocket) {
                    io.to(receiverSocket).emit('block_status_updated', {
                        targetUserId: userId,
                        isBlockedBy: !isBlocked
                    })
                }

                socket.emit('block_status_updated', {
                    targetUserId,
                    isBlocked: !isBlocked
                })

                if (callback) callback()

            } catch (error) {
                console.error('Block/unblock error:', error)
                socket.emit('message_error', { message: 'Failed to update block status' })
            }
        })

        // Handle user availability check for video calls
        socket.on('check_user_availability', async ({ userId, callerName }) => {
            try {
                // Check if target user exists
                const targetUser = await UserModel.findById(userId);
                if (!targetUser) {
                    socket.emit('user_availability_response', { 
                        available: false, 
                        message: 'User not found' 
                    });
                    return;
                }

                // Check if target user is online
                const isOnline = onlineUsers.has(userId.toString());
                if (!isOnline) {
                    socket.emit('user_availability_response', { 
                        available: false, 
                        message: 'User is not online' 
                    });
                    return;
                }

                // Check if either user has blocked the other
                const currentUser = await UserModel.findById(socket.user._id);
                const isBlocked = currentUser.blockedUsers?.includes(userId) || 
                                targetUser.blockedUsers?.includes(socket.user._id.toString());
                
                if (isBlocked) {
                    socket.emit('user_availability_response', { 
                        available: false, 
                        message: 'Cannot start call with this user' 
                    });
                    return;
                }

                // If all checks pass, user is available
                socket.emit('user_availability_response', { 
                    available: true 
                });

            } catch (error) {
                console.error('Check user availability error:', error);
                socket.emit('user_availability_response', { 
                    available: false, 
                    message: 'Error checking user availability' 
                });
            }
        });

        // Video call handlers
        socket.on('video_call_offer', ({ userId, offer }) => {
            const targetSocket = onlineUsers.get(userId.toString());
            if (targetSocket) {
                const callerUser = socket.user;
                io.to(targetSocket).emit('video_call_incoming', {
                    from: callerUser._id,
                    userName: callerUser.name,
                    offer
                });
            }
        });

        socket.on('video_call_accept', ({ userId, answer }) => {
            const targetSocket = onlineUsers.get(userId.toString());
            if (targetSocket) {
                io.to(targetSocket).emit('video_call_accepted', { answer });
            }
        });

        socket.on('video_call_reject', ({ userId }) => {
            const targetSocket = onlineUsers.get(userId.toString());
            if (targetSocket) {
                io.to(targetSocket).emit('video_call_rejected');
            }
        });

        socket.on('end_video_call', ({ userId }) => {
            const targetSocket = onlineUsers.get(userId.toString());
            if (targetSocket) {
                io.to(targetSocket).emit('video_call_ended');
            }
        });

        socket.on('ice_candidate', ({ userId, candidate }) => {
            const targetSocket = onlineUsers.get(userId.toString());
            if (targetSocket) {
                io.to(targetSocket).emit('ice_candidate', { candidate });
            }
        });

    } catch (error) {
        console.error('Socket connection error:', error)
        socket.disconnect()
    }
})

module.exports = {
    app,
    server
}

