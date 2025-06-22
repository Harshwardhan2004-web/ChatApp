import React, { useState } from 'react'
import Avatar from './Avatar'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const MessageRequest = ({ request, onAction }) => {
    const socketConnection = useSelector(state => state?.user?.socketConnection)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleAction = (action) => {
        if (!socketConnection) {
            toast.error('Connection error. Please try again.')
            return
        }

        if (isProcessing) {
            return;
        }

        setIsProcessing(true)
        toast.loading(action === 'accept' ? 'Accepting request...' : 'Declining request...')

        socketConnection.emit('handle_message_request', {
            requestId: request._id,
            action
        }, () => {
            toast.dismiss()
            toast.success(action === 'accept' ? 'Message request accepted' : 'Message request declined')
            setIsProcessing(false)
            if (onAction) {
                onAction(action)
            }
        })
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
                    disabled={isProcessing}
                    className='px-4 py-1 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    Decline
                </button>
                <button 
                    onClick={() => handleAction('accept')}
                    disabled={isProcessing}
                    className='px-4 py-1 text-sm bg-primary text-white rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    Accept
                </button>
            </div>
        </div>
    )
}

export default MessageRequest