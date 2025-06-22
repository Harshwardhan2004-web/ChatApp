import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// ...existing imports...
import VideoCall from '../components/VideoCall';
import { setIncomingCall, startCall, endCall, rejectCall } from '../redux/slices/videoCallSlice';

const MessagePage = () => {
    // ...existing state and hooks...
    const { isInCall, incomingCall, activeCallUserId } = useSelector((state) => state.videoCall);
    
    useEffect(() => {
        if (!socket) return;

        socket.on('video_call_incoming', ({ from, userName, offer }) => {
            dispatch(setIncomingCall({ from, userName, offer }));
        });

        return () => {
            socket.off('video_call_incoming');
        };
    }, [socket]);

    const handleStartCall = (userId) => {
        dispatch(startCall(userId));
    };

    const handleAcceptCall = () => {
        if (!incomingCall) return;
        dispatch(startCall(incomingCall.from));
    };

    const handleRejectCall = () => {
        if (!incomingCall) return;
        socket.emit('video_call_rejected', { userId: incomingCall.from });
        dispatch(rejectCall());
    };

    const handleEndCall = () => {
        socket.emit('video_call_end', { userId: activeCallUserId });
        dispatch(endCall());
    };

    return (
        <div className="flex h-screen">
            {/* ...existing JSX... */}
            
            {/* Add video call button in the chat header */}
            {selectedUser && (
                <button
                    onClick={() => handleStartCall(selectedUser._id)}
                    className="ml-2 p-2 rounded-full bg-blue-500 text-white"
                    disabled={isInCall}
                >
                    <VideoCallIcon />
                </button>
            )}

            {/* Incoming call modal */}
            {incomingCall && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">
                            Incoming call from {incomingCall.userName}
                        </h3>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={handleAcceptCall}
                                className="bg-green-500 text-white px-4 py-2 rounded"
                            >
                                Accept
                            </button>
                            <button
                                onClick={handleRejectCall}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video call component */}
            {isInCall && (
                <VideoCall
                    socket={socket}
                    userId={activeCallUserId}
                    onEndCall={handleEndCall}
                />
            )}
        </div>
    );
};

export default MessagePage;