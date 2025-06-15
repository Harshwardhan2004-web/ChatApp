const mongoose = require('mongoose')

const messageRequestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    firstMessage: {
        text: String,
        imageUrl: String,
        videoUrl: String
    }
}, {
    timestamps: true
})

const MessageRequestModel = mongoose.model('MessageRequest', messageRequestSchema)

module.exports = MessageRequestModel