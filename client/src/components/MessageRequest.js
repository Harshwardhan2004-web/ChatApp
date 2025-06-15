import React from 'react'
import Avatar from './Avatar'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const MessageRequest = ({ request, onAction }) => {
    const socketConnection = useSelector(state => state?.user?.socketConnection)

    const handleAction = (action) => {
        if (!socketConnection) {
            toast.error('Connection error. Please try again.')
            return
        }

        socketConnection.emit('handle_message_request', {
            requestId: request._id,
            action
        })
        
        if (onAction) {
            onAction(action)
        }
    }

    return (
        <div className='bg-white p-4 rounded-lg shadow mb-2'>
            <div className='flex items-center gap-3'>
                <Avatar
                    width={40}
                    height={40}
                    name={request.sender.name}
                    imageUrl={request.sender.profile_pic}
                    userId={request.sender._id}
                />
                <div className='flex-1'>
                    <h4 className='font-semibold'>{request.sender.name}</h4>
                    <p className='text-sm text-gray-600'>wants to send you a message</p>
                </div>
            </div>
            
            <div className='mt-2'>
                <p className='text-sm text-gray-700 bg-gray-50 p-2 rounded'>
                    {request.firstMessage.text}
                    {request.firstMessage.imageUrl && <span className='ml-2'>📷 Image</span>}
                    {request.firstMessage.videoUrl && <span className='ml-2'>🎥 Video</span>}
                </p>
            </div>

            <div className='flex justify-end gap-2 mt-3'>
                <button 
                    onClick={() => handleAction('reject')}
                    className='px-4 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50'
                >
                    Decline
                </button>
                <button 
                    onClick={() => handleAction('accept')}
                    className='px-4 py-1 text-sm bg-primary text-white rounded hover:bg-secondary'
                >
                    Accept
                </button>
            </div>
        </div>
    )
}

export default MessageRequest