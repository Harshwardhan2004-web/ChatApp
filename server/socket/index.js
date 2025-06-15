const express = require('express')
const { Server } = require('socket.io')
const http  = require('http')
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken')
const UserModel = require('../models/UserModel')
const { ConversationModel, MessageModel } = require('../models/ConversationModel')
const MessageRequestModel = require('../models/MessageRequestModel')
const getConversation = require('../helpers/getConversation')

const app = express()

/***socket connection */
const server = http.createServer(app)
const io = new Server(server,{
    cors : {
        origin: ['http://localhost:3000', process.env.FRONTEND_URL],
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
})

/***
 * socket running at http://localhost:8080/
 */

//online user
const onlineUser = new Set()

io.on('connection',async(socket)=>{
    console.log("connect User ", socket.id)

    const token = socket.handshake.auth.token 

    //current user details 
    const user = await getUserDetailsFromToken(token)
    
    if (!user || !user._id) {
        console.log("Invalid user token or user not found")
        socket.emit('auth_error', { message: 'Authentication failed' })
        return
    }

    //create a room
    socket.join(user._id.toString())
    onlineUser.add(user._id.toString())

    io.emit('onlineUser',Array.from(onlineUser))

    // Get pending message requests
    socket.on('get_message_requests', async () => {
        const requests = await MessageRequestModel.find({
            receiver: user._id,
            status: 'pending'
        }).populate('sender', '-password')
        socket.emit('message_requests', requests)
    })

    // Handle message request response
    socket.on('handle_message_request', async ({ requestId, action }) => {
        const request = await MessageRequestModel.findById(requestId)
        if (!request) return

        if (action === 'accept') {
            request.status = 'accepted'
            await request.save()

            // Create conversation with the first message
            let conversation = new ConversationModel({
                sender: request.sender,
                receiver: request.receiver
            })
            conversation = await conversation.save()

            // Add the first message
            if (request.firstMessage) {
                const message = new MessageModel({
                    text: request.firstMessage.text,
                    imageUrl: request.firstMessage.imageUrl,
                    videoUrl: request.firstMessage.videoUrl,
                    msgByUserId: request.sender
                })
                const savedMessage = await message.save()
                
                await ConversationModel.updateOne(
                    { _id: conversation._id },
                    { $push: { messages: savedMessage._id }}
                )
            }

            io.to(request.sender.toString()).emit('message_request_accepted', {
                receiverId: request.receiver
            })
        } else {
            request.status = 'rejected'
            await request.save()
        }

        // Refresh message requests
        const updatedRequests = await MessageRequestModel.find({
            receiver: user._id,
            status: 'pending'
        }).populate('sender', '-password')
        socket.emit('message_requests', updatedRequests)
    })

    // Block/Unblock user
    socket.on('toggle_block_user', async ({ targetUserId }, callback) => {
        try {
            const currentUser = await UserModel.findById(user._id)
            if (!currentUser) {
                socket.emit('message_error', { message: 'User not found' })
                return
            }

            const isBlocked = currentUser.blockedUsers.includes(targetUserId)
            const targetUser = await UserModel.findById(targetUserId)
            
            if (!targetUser) {
                socket.emit('message_error', { message: 'Target user not found' })
                return
            }

            if (isBlocked) {
                await UserModel.findByIdAndUpdate(user._id, {
                    $pull: { blockedUsers: targetUserId }
                })
            } else {
                await UserModel.findByIdAndUpdate(user._id, {
                    $push: { blockedUsers: targetUserId }
                })
            }

            // Send acknowledgment if callback exists
            if (typeof callback === 'function') {
                callback()
            }

            // Emit to current user
            socket.emit('block_status_updated', {
                targetUserId,
                isBlocked: !isBlocked
            })

            // Emit to target user
            io.to(targetUserId.toString()).emit('block_status_updated', {
                targetUserId: user._id.toString(),
                isBlockedBy: !isBlocked
            })

        } catch (error) {
            console.error('Block user error:', error)
            socket.emit('message_error', { 
                message: 'Failed to update block status' 
            })
        }
    })

    socket.on('message-page', async(userId) => {
        const userDetails = await UserModel.findById(userId).select("-password")
        const currentUser = await UserModel.findById(user._id)
        
        const isBlocked = currentUser.blockedUsers.includes(userId)
        const isBlockedBy = (await UserModel.findById(userId)).blockedUsers.includes(user._id)
        
        const payload = {
            _id: userDetails?._id,
            name: userDetails?.name,
            email: userDetails?.email,
            profile_pic: userDetails?.profile_pic,
            online: onlineUser.has(userId),
            isBlocked,
            isBlockedBy
        }
        socket.emit('message-user', payload)

        // Get previous messages only if not blocked
        if (!isBlocked && !isBlockedBy) {
            const getConversationMessage = await ConversationModel.findOne({
                "$or": [
                    { sender: user?._id, receiver: userId },
                    { sender: userId, receiver: user?._id }
                ]
            }).populate('messages').sort({ updatedAt: -1 })

            socket.emit('message', getConversationMessage?.messages || [])
        }
    })


    //new message
    socket.on('new message',async(data)=>{

        const isBlocked = (await UserModel.findById(data.receiver)).blockedUsers.includes(data.sender)
        const isBlockedBy = (await UserModel.findById(data.sender)).blockedUsers.includes(data.receiver)
        
        if (isBlocked || isBlockedBy) {
            socket.emit('message_error', { message: 'Unable to send message - user is blocked' })
            return
        }

        //check conversation is available both user

        let conversation = await ConversationModel.findOne({
            "$or" : [
                { sender : data?.sender, receiver : data?.receiver },
                { sender : data?.receiver, receiver :  data?.sender}
            ]
        })

        //if conversation is not available
        if(!conversation){
            // Create message request
            const messageRequest = new MessageRequestModel({
                sender: data.sender,
                receiver: data.receiver,
                firstMessage: {
                    text: data.text,
                    imageUrl: data.imageUrl,
                    videoUrl: data.videoUrl
                }
            })
            await messageRequest.save()

            // Notify receiver about new message request
            io.to(data.receiver).emit('new_message_request', {
                request: await MessageRequestModel.findById(messageRequest._id).populate('sender', '-password')
            })

            socket.emit('message_pending', {
                receiverId: data.receiver
            })
            return
        }
        
        // If conversation exists, proceed with normal message
        const message = new MessageModel({
          text : data.text,
          imageUrl : data.imageUrl,
          videoUrl : data.videoUrl,
          msgByUserId :  data?.msgByUserId,
        })
        const saveMessage = await message.save()

        const updateConversation = await ConversationModel.updateOne({ _id : conversation?._id },{
            "$push" : { messages : saveMessage?._id }
        })

        const getConversationMessage = await ConversationModel.findOne({
            "$or" : [
                { sender : data?.sender, receiver : data?.receiver },
                { sender : data?.receiver, receiver :  data?.sender}
            ]
        }).populate('messages').sort({ updatedAt : -1 })


        io.to(data?.sender).emit('message',getConversationMessage?.messages || [])
        io.to(data?.receiver).emit('message',getConversationMessage?.messages || [])

        //send conversation
        const conversationSender = await getConversation(data?.sender)
        const conversationReceiver = await getConversation(data?.receiver)

        io.to(data?.sender).emit('conversation',conversationSender)
        io.to(data?.receiver).emit('conversation',conversationReceiver)
    })


    //sidebar
    socket.on('sidebar',async(currentUserId)=>{
        console.log("current user",currentUserId)

        const conversation = await getConversation(currentUserId)

        socket.emit('conversation',conversation)
        
    })

    socket.on('seen',async(msgByUserId)=>{
        
        let conversation = await ConversationModel.findOne({
            "$or" : [
                { sender : user?._id, receiver : msgByUserId },
                { sender : msgByUserId, receiver :  user?._id}
            ]
        })

        const conversationMessageId = conversation?.messages || []

        const updateMessages  = await MessageModel.updateMany(
            { _id : { "$in" : conversationMessageId }, msgByUserId : msgByUserId },
            { "$set" : { seen : true }}
        )

        //send conversation
        const conversationSender = await getConversation(user?._id?.toString())
        const conversationReceiver = await getConversation(msgByUserId)

        io.to(user?._id?.toString()).emit('conversation',conversationSender)
        io.to(msgByUserId).emit('conversation',conversationReceiver)
    })

    //disconnect
    socket.on('disconnect',()=>{
        onlineUser.delete(user?._id?.toString())
        console.log('disconnect user ',socket.id)
    })
})

module.exports = {
    app,
    server
}

