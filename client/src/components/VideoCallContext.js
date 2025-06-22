import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import VideoCallNotification from './VideoCallNotification';

const VideoCallContext = createContext();

export const VideoCallProvider = ({ children }) => {
  const socketConnection = useSelector(state => state?.user?.socketConnection);
  const user = useSelector(state => state?.user);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (socketConnection) {
      // Listen for incoming call notifications globally
      socketConnection.on('incoming_video_call', ({ callerId, callerName, offer }) => {
        if (!user) return;
        
        // Show incoming call notification
        setIncomingCall({
          callerId,
          callerName,
          offer
        });

        // Auto-reject call if not answered within 30 seconds
        setTimeout(() => {
          setIncomingCall(prev => {
            if (prev && prev.callerId === callerId) {
              socketConnection.emit('video_call_rejected', {
                userId: callerId,
                reason: 'Call timed out'
              });
              return null;
            }
            return prev;
          });
        }, 30000);
      });

      // Handle call cancellation
      socketConnection.on('video_call_cancelled', () => {
        setIncomingCall(null);
        toast.error('Caller cancelled the call');
      });

      return () => {
        socketConnection.off('incoming_video_call');
        socketConnection.off('video_call_cancelled');
      };
    }
  }, [socketConnection, user]);

  const handleRejectCall = () => {
    if (incomingCall && socketConnection) {
      socketConnection.emit('video_call_rejected', {
        userId: incomingCall.callerId,
        reason: 'Call rejected by user'
      });
      setIncomingCall(null);
    }
  };

  return (
    <VideoCallContext.Provider value={{ incomingCall, setIncomingCall }}>
      {children}
      {incomingCall && (
        <VideoCallNotification
          caller={incomingCall.callerName}
          onReject={handleRejectCall}
        />
      )}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};