const { ConversationModel } = require("../models/ConversationModel")
const MessageRequestModel = require("../models/MessageRequestModel")

const getConversation = async(currentUserId) => {
    if(!currentUserId) {
        return []
    }

    try {
        // Get all conversations with populated messages
        const currentUserConversation = await ConversationModel.find({
            "$or": [
                { sender: currentUserId },
                { receiver: currentUserId }
            ]
        })
        .sort({ updatedAt: -1 })
        .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'msgByUserId',
                select: 'name profile_pic'
            }
        })
        .populate('sender', '-password -blockedUsers')
        .populate('receiver', '-password -blockedUsers')
        .lean()

        // Get pending message requests
        const pendingRequests = await MessageRequestModel.find({
            "$or": [
                { sender: currentUserId, status: 'pending' },
                { receiver: currentUserId, status: 'pending' }
            ]
        })

        // Create a Set of user IDs with pending requests
        const pendingUserIds = new Set()
        pendingRequests.forEach(request => {
            if (request.sender.toString() === currentUserId) {
                pendingUserIds.add(request.receiver.toString())
            } else {
                pendingUserIds.add(request.sender.toString())
            }
        })

        // Create a map to track unique conversations by participant
        const uniqueConversations = new Map()

        // Filter and deduplicate conversations
        currentUserConversation
            .filter(conv => {
                if (!conv.sender || !conv.receiver) return false
                const otherUserId = conv.sender._id.toString() === currentUserId 
                    ? conv.receiver._id.toString()
                    : conv.sender._id.toString()
                return !pendingUserIds.has(otherUserId)
            })
            .forEach(conv => {
                const otherUserId = conv.sender._id.toString() === currentUserId 
                    ? conv.receiver._id.toString() 
                    : conv.sender._id.toString()
                
                // If we already have a conversation with this user, keep the most recent one
                if (!uniqueConversations.has(otherUserId) || 
                    new Date(conv.updatedAt) > new Date(uniqueConversations.get(otherUserId).updatedAt)) {
                    uniqueConversations.set(otherUserId, conv)
                }
            })

        // Convert map values to array and process each conversation
        return Array.from(uniqueConversations.values())
            .map(conv => {
                const messages = conv.messages || []
                // Count unseen messages only from the other user
                const countUnseenMsg = messages.reduce((prev, curr) => {
                    const msgByUserId = curr?.msgByUserId?._id?.toString()
                    if (msgByUserId && msgByUserId !== currentUserId) {
                        return prev + (curr?.seen ? 0 : 1)
                    }
                    return prev
                }, 0)

                // Get the last message
                const lastMsg = messages[0] || null

                return {
                    _id: conv._id,
                    sender: conv.sender,
                    receiver: conv.receiver,
                    unseenMsg: countUnseenMsg,
                    messages: messages.reverse(),
                    lastMsg,
                    updatedAt: conv.updatedAt || lastMsg?.createdAt || new Date()
                }
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    } catch (error) {
        console.error('Get conversation error:', error)
        return []
    }
}

module.exports = getConversation