import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avatar from './Avatar'
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft, FaBan, FaUnlock } from "react-icons/fa6";
import { FaEllipsisV } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { FaImage } from "react-icons/fa6";
import { FaVideo } from "react-icons/fa6";
import uploadFile from '../helpers/uploadFile';
import { IoClose } from "react-icons/io5";
import Loading from './Loading';
import backgroundImage from '../assets/wallapaper.jpeg'
import { IoMdSend } from "react-icons/io";
import moment from 'moment'
import MessageRequest from './MessageRequest';
import { toast } from 'react-hot-toast';
import { BsCheck, BsCheckAll } from "react-icons/bs";
import VideoCall from './VideoCall';
import { startCall, endCall, setVideoCall } from '../redux/slices/videoCallSlice';

const MessagePage = () => {
  const params = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const socketConnection = useSelector(state => state?.user?.socketConnection)
  const user = useSelector(state => state?.user)
  const { isInCall } = useSelector(state => state.videoCall)
  const [dataUser,setDataUser] = useState({
    name: "",
    email: "",
    profile_pic: "",
    online: false,
    _id: "",
    isBlocked: false,
    isBlockedBy: false,
    messagePending: false
  })
  const [openImageVideoUpload,setOpenImageVideoUpload] = useState(false)
  const [message,setMessage] = useState({
    text: "",
    imageUrl: "",
    videoUrl: ""
  })
  const [loading,setLoading] = useState(false)
  const [allMessage,setAllMessage] = useState([])
  const [showOptions, setShowOptions] = useState(false)
  const [messagePending, setMessagePending] = useState(false)
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const mediaLock = useRef(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const currentMessage = useRef(null)

  useEffect(()=>{
    if(currentMessage.current){
      currentMessage.current.scrollIntoView({behavior: 'smooth', block: 'end'})
    }
  },[allMessage])

  useEffect(() => {
    // Reset states when changing users
    setShowOptions(false);
    setDataUser({
      name: "",
      email: "",
      profile_pic: "",
      online: false,
      _id: "",
      isBlocked: false,
      isBlockedBy: false,
      messagePending: false
    });
    setAllMessage([]);

    if (socketConnection) {
      socketConnection.emit('message-page', params.userId);

      // Handle user data
      socketConnection.on('message-user', (data) => {
        setLoading(false);
        if (data.isDeleted) {
          toast.error('This user account has been deleted');
          setDataUser({
            ...data,
            name: 'Deleted User',
            profile_pic: '',
            online: false
          });
          setAllMessage([]);
          setTimeout(() => navigate('/'), 3000);
          return;
        }
        setDataUser(data);
      });
      
      // Handle incoming messages
      socketConnection.on('message', (data) => {
        // Handle both legacy and new message format
        if (typeof data === 'object' && 'messages' in data) {
          // New format with conversation context
          const { messages, withUserId } = data;
          if (withUserId === params.userId || withUserId === user._id) {
            // Make sure each message has the correct msgByUserId
            const formattedMessages = messages.map(msg => ({
              ...msg,
              msgByUserId: msg.msgByUserId?._id || msg.msgByUserId
            }));
            setAllMessage(formattedMessages);
            setMessagePending(false);
            socketConnection.emit('sidebar', user._id);
          }
        } else if (Array.isArray(data)) {
          // Legacy format (array of messages)
          const formattedMessages = data.map(msg => ({
            ...msg,
            msgByUserId: msg.msgByUserId?._id || msg.msgByUserId
          }));
          setAllMessage(formattedMessages);
          setMessagePending(false);
          socketConnection.emit('sidebar', user._id);
        }
      });

      socketConnection.on('message_error', (data) => {
        toast.error(data.message);
      });

      socketConnection.on('message_request_handled', ({ action }) => {
        if (action === 'accepted') {
          // Request was accepted, reload messages
          socketConnection.emit('message-page', params.userId);
        }
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off('message-user');
        socketConnection.off('message');
        socketConnection.off('message_error');
        socketConnection.off('message_request_handled');
      }
    }
  }, [socketConnection, params.userId, user._id]);

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload(prev => !prev)
  }

  const handleUploadImage = async(e) => {
    const file = e.target.files[0]

    setLoading(true)
    const uploadPhoto = await uploadFile(file)
    setLoading(false)
    setOpenImageVideoUpload(false)

    setMessage(prev => ({
      ...prev,
      imageUrl: uploadPhoto.url
    }))
  }

  const handleClearUploadImage = () => {
    setMessage(prev => ({
      ...prev,
      imageUrl: ""
    }))
  }

  const handleUploadVideo = async(e) => {
    const file = e.target.files[0]

    setLoading(true)
    const uploadPhoto = await uploadFile(file)
    setLoading(false)
    setOpenImageVideoUpload(false)

    setMessage(prev => ({
      ...prev,
      videoUrl: uploadPhoto.url
    }))
  }

  const handleClearUploadVideo = () => {
    setMessage(prev => ({
      ...prev,
      videoUrl: ""
    }))
  }

  const handleOnChange = (e) => {
    const { value } = e.target
    setMessage(prev => ({
      ...prev,
      text: value
    }))
  }

  const handleSendMessage = (e) => {
    e.preventDefault()

    if (!message.text && !message.imageUrl && !message.videoUrl) {
      return;
    }

    if (dataUser.messagePending || dataUser.isBlocked || dataUser.isBlockedBy) {
      toast.error('Cannot send messages until request is accepted');
      return;
    }

    if (socketConnection) {
      const messageData = {
        sender: user?._id,
        receiver: params.userId,
        text: message.text,
        imageUrl: message.imageUrl,
        videoUrl: message.videoUrl,
        msgByUserId: user?._id
      };

      // Clear input immediately to prevent duplicate sends
      setMessage({
        text: "",
        imageUrl: "",
        videoUrl: ""
      });

      // Add message to local state immediately for instant feedback
      const newMessage = {
        ...messageData,
        createdAt: new Date(),
        seen: false,
        _id: Date.now() // Temporary ID
      };
      setAllMessage(prev => [...prev, newMessage]);

      // Send message
      socketConnection.emit('new message', messageData);

      // Set message pending state immediately after first message
      if (!allMessage.length) {
        setDataUser(prev => ({
          ...prev,
          messagePending: true
        }));
      }
    }
  }

  const handleToggleBlock = () => {
    if (socketConnection) {
      // Immediately update UI to show loading state
      toast.loading('Processing request...')
      
      // Set a timeout to handle potential socket connection issues
      const timeoutId = setTimeout(() => {
        toast.error('Request timed out. Please try again.')
      }, 5000)

      socketConnection.emit('toggle_block_user', {
        targetUserId: params.userId
      }, () => {
        // Clear timeout when acknowledgment is received
        clearTimeout(timeoutId)
      })
      
      setShowOptions(false)
    } else {
      toast.error('Connection error. Please try again.')
    }
  }

  useEffect(() => {
    if (socketConnection) {
      socketConnection.on('block_status_updated', ({ targetUserId, isBlocked, isBlockedBy }) => {
        // Only update block status if it's for the current chat
        if (targetUserId === params.userId || targetUserId === user._id) {
          toast.dismiss();
          
          setDataUser(prev => ({
            ...prev,
            isBlocked: isBlocked !== undefined ? isBlocked : prev.isBlocked,
            isBlockedBy: isBlockedBy !== undefined ? isBlockedBy : prev.isBlockedBy
          }));

          if (isBlocked !== undefined) {
            toast.success(isBlocked ? 'User blocked successfully' : 'User unblocked successfully');
          } else if (isBlockedBy !== undefined) {
            toast.error('You have been blocked by this user');
          }

          if (isBlocked || isBlockedBy) {
            setAllMessage([]);
          } else {
            socketConnection.emit('message-page', params.userId);
          }
        }
      });

      socketConnection.on('message_error', (data) => {
        toast.dismiss();
        toast.error(data.message);
      });
    }
    return () => {
      if (socketConnection) {
        socketConnection.off('block_status_updated');
        socketConnection.off('message_error');
      }
    }
  }, [socketConnection, params.userId, user._id])

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit('message-page', params.userId)

      socketConnection.on('message-user', (data) => {
        if (data.isDeleted) {
          toast.error('This user account has been deleted')
          setDataUser({
            ...data,
            name: 'Deleted User',
            profile_pic: '',
            online: false
          })
          // Clear messages when user is deleted
          setAllMessage([])
          // Navigate back after a delay
          setTimeout(() => {
            navigate('/')
          }, 3000)
        } else {
          setDataUser(data)
        }
      })

      socketConnection.on('message', (data) => {
        // Handle both legacy and new message format
        if (typeof data === 'object' && 'messages' in data) {
          // New format with conversation context
          const { messages, withUserId } = data;
          if (withUserId === params.userId || withUserId === user._id) {
            // Make sure each message has the correct msgByUserId
            const formattedMessages = messages.map(msg => ({
              ...msg,
              msgByUserId: msg.msgByUserId?._id || msg.msgByUserId
            }));
            setAllMessage(formattedMessages);
            setMessagePending(false);
            socketConnection.emit('sidebar', user._id);
          }
        } else if (Array.isArray(data)) {
          // Legacy format (array of messages)
          const formattedMessages = data.map(msg => ({
            ...msg,
            msgByUserId: msg.msgByUserId?._id || msg.msgByUserId
          }));
          setAllMessage(formattedMessages);
          setMessagePending(false);
          socketConnection.emit('sidebar', user._id);
        }
      })

      socketConnection.on('message_error', (error) => {
        if (error.errorType === 'SESSION_ERROR') {
          navigate('/email')
          return
        }
        toast.error(error.message || 'Failed to load conversation')
      })
    }

    return () => {
      if (socketConnection) {
        socketConnection.off('message-user')
        socketConnection.off('message')
        socketConnection.off('message_error')
      }
    }
  }, [socketConnection, params.userId])

  useEffect(() => {
    if (socketConnection) {
      // Mark messages from other user as seen
      const otherUserMessages = allMessage.filter(msg => 
        msg.msgByUserId === params.userId && !msg.seen
      );
      
      if (otherUserMessages.length > 0) {
        socketConnection.emit('seen', params.userId);
        
        // Update local state to show messages as seen immediately
        setAllMessage(prevMessages => 
          prevMessages.map(msg => 
            msg.msgByUserId === params.userId 
              ? { ...msg, seen: true }
              : msg
          )
        );
      }
    }
  }, [allMessage, socketConnection, params.userId]);

  useEffect(() => {
    if (socketConnection && dataUser?._id) {
      // Mark messages from other user as seen when they appear in view
      const otherUserMessages = allMessage.filter(msg => 
        msg.msgByUserId === dataUser._id && !msg.seen
      );
      
      if (otherUserMessages.length > 0) {
        socketConnection.emit('seen', dataUser._id);
        
        // Update local state to show messages as seen immediately
        setAllMessage(prevMessages => 
          prevMessages.map(msg => 
            msg.msgByUserId === dataUser._id 
              ? { ...msg, seen: true }
              : msg
          )
        );
      }
    }
  }, [allMessage, socketConnection, dataUser._id]);

  useEffect(() => {
    if (socketConnection) {
      // Listen for online status updates
      socketConnection.on('onlineUser', (onlineUsers) => {
        if (dataUser?._id) {
          const isOnline = onlineUsers.includes(dataUser._id.toString());
          setDataUser(prev => ({
            ...prev,
            online: isOnline
          }));
        }
      });

      // Initial check for online status
      socketConnection.emit('message-page', params.userId);

      return () => {
        socketConnection.off('onlineUser');
      };
    }
  }, [socketConnection, dataUser?._id, params.userId]);

  useEffect(() => {
    if (socketConnection) {
      // Listen for message request handling responses
      socketConnection.on('message_request_handled', ({ action, requestId }) => {
        if (action === 'accepted') {
          setMessagePending(false);
          socketConnection.emit('message-page', params.userId);
        }
        // Clear any loading states
        toast.dismiss();
      });

      // Listen for message updates
      socketConnection.on('message', (data) => {
        if (typeof data === 'object' && 'messages' in data) {
          const { messages, withUserId } = data;
          if (withUserId === params.userId || withUserId === user._id) {
            const formattedMessages = messages.map(msg => ({
              ...msg,
              msgByUserId: msg.msgByUserId?._id || msg.msgByUserId
            }));
            setAllMessage(formattedMessages);
            
            // Check for unseen messages from the other user and mark them as seen
            const unseenMessages = formattedMessages.filter(msg => 
              msg.msgByUserId === params.userId && !msg.seen
            );
            if (unseenMessages.length > 0) {
              socketConnection.emit('seen', params.userId);
            }
          }
        }
      });

      return () => {
        socketConnection.off('message_request_handled');
        socketConnection.off('message');
      };
    }
  }, [socketConnection, params.userId, user._id]);

  const checkDeviceAvailability = async () => {
    try {
      // First check if the API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video calls');
      }

      // Check permissions status if possible
      if (navigator.permissions && navigator.permissions.query) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const micPermission = await navigator.permissions.query({ name: 'microphone' });

        if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
          throw new Error('Please allow camera and microphone access in your browser settings');
        }
      }

      // Try to enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found. Please connect a camera and try again');
      }
      
      if (audioDevices.length === 0) {
        throw new Error('No microphone found. Please connect a microphone and try again');
      }

      // Try to get permissions without actually acquiring the devices
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // If we got here, we have access. Clean up the test stream.
      stream.getTracks().forEach(track => track.stop());
      return true;

    } catch (error) {
      console.error('Device availability check failed:', error);
      
      // Convert technical error messages to user-friendly ones
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('Camera or microphone not found. Please check your device connections');
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Please allow camera and microphone access when prompted');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Your camera or microphone is being used by another application');
      }
      
      throw error;
    }
  };

  const forceStopAllMediaTracks = async () => {
    const stopTrack = async (track) => {
      return new Promise(resolve => {
        try {
          if (track && typeof track.stop === 'function') {
            track.enabled = false;
            track.stop();
            
            // Wait a bit to ensure the track is truly stopped
            setTimeout(() => resolve(true), 100);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.warn('Error stopping track:', e);
          resolve(false);
        }
      });
    };

    try {
      const tracksToStop = [];
      
      // Collect all tracks that need to be stopped
      if (localStreamRef.current) {
        tracksToStop.push(...localStreamRef.current.getTracks());
      }
      if (localStream) {
        tracksToStop.push(...localStream.getTracks());
      }
      
      // Stop all tracks with proper timing
      if (tracksToStop.length > 0) {
        await Promise.all(tracksToStop.map(track => stopTrack(track)));
        
        // Wait a bit after stopping tracks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Clear references
      localStreamRef.current = null;
      
      return true;
    } catch (error) {
      console.error('Error in forceStopAllMediaTracks:', error);
      return false;
    }
  };

  const cleanupMedia = async () => {
    console.log('Cleaning up media...');
    try {
      // First, check if we need to cleanup peer connection
      if (peerConnectionRef.current) {
        try {
          const senders = peerConnectionRef.current.getSenders();
          for (const sender of senders) {
            try {
              await peerConnectionRef.current.removeTrack(sender);
            } catch (e) {
              console.warn('Error removing track from peer connection:', e);
            }
          }
          peerConnectionRef.current.close();
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
        peerConnectionRef.current = null;
      }

      // Then stop all media tracks
      await forceStopAllMediaTracks();

      // Reset states
      setPeerConnection(null);
      setLocalStream(null);
      setRemoteStream(null);
      setIsVideoCallActive(false);
      mediaLock.current = false;

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Error in cleanupMedia:', error);
      return false;
    }
  };

  const handleVideoCallOffer = async (offer) => {
    if (mediaLock.current) {
      toast.error('Please wait, another media operation is in progress...');
      return;
    }
    
    mediaLock.current = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    try {
      // Always show a toast to indicate we're processing
      toast.loading('Preparing video call...');

      // First check if devices are available
      await checkDeviceAvailability().catch(error => {
        toast.dismiss();
        toast.error(error.message);
        throw error;
      });

      // Ensure thorough cleanup
      await cleanupMedia();
      
      console.log('Requesting user media for video call...');
      
      // Try to acquire media with constraints
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store stream reference
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Create and configure peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      peerConnectionRef.current = pc;
      setPeerConnection(pc);
      
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate && socketConnection) {
          socketConnection.emit('ice_candidate', {
            userId: params.userId,
            candidate: event.candidate
          });
        }
      };
      
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socketConnection) {
        socketConnection.emit('video_call_answer', {
          userId: params.userId,
          answer: pc.localDescription
        });
      }
      
      setIsVideoCallActive(true);
      toast.dismiss();
      toast.success('Video call connected!');
      
    } catch (error) {
      console.error('Video call error:', error);
      
      // Show appropriate error message
      const errorMessage = error.name === 'NotReadableError' 
        ? 'Your camera or microphone is being used by another application'
        : error.name === 'NotAllowedError'
        ? 'Please allow camera and microphone access when prompted'
        : error.message || 'Failed to setup video call';
      
      toast.dismiss();
      toast.error(errorMessage);
      
      if (socketConnection) {
        socketConnection.emit('video_call_rejected', { 
          userId: params.userId,
          reason: errorMessage
        });
      }
      
      // Cleanup on error
      await cleanupMedia();
      
    } finally {
      mediaLock.current = false;
    }
  };

  const endVideoCall = () => {
    cleanupMedia();
    if (socketConnection && isVideoCallActive) {
      socketConnection.emit('end_video_call', {
        userId: params.userId
      });
    }
    dispatch(endCall());
  };

  const handleEndCall = () => {
    endVideoCall();
  };
  
  const handleStartCall = async () => {
    if (dataUser.isBlocked || dataUser.isBlockedBy || dataUser.messagePending) {
      toast.error('Cannot start call with this user');
      return;
    }
    if (mediaLock.current) {
      toast.error('Media is busy, please wait...');
      return;
    }

    try {
      // Emit a pre-call check to see if user is available
      socketConnection.emit('check_user_availability', {
        userId: params.userId,
        callerName: user?.name
      });

      // Wait for availability response
      const availabilityCheck = new Promise((resolve, reject) => {
        socketConnection.once('user_availability_response', (response) => {
          if (response.available) {
            resolve();
          } else {
            reject(new Error(response.message || 'User is not available'));
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('User availability check timed out')), 5000);
      });

      await availabilityCheck;
      
      // If we get here, user is available, proceed with call setup
      mediaLock.current = true;
      await cleanupMedia();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });
      
      peerConnectionRef.current = pc;
      setPeerConnection(pc);
      setIsVideoCallActive(true);

      stream.getTracks().forEach(track => {
        track.enabled = true;
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketConnection.emit('ice_candidate', {
            userId: params.userId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketConnection.emit('video_call_offer', {
        userId: params.userId,
        offer: pc.localDescription,
        callerName: user?.name,
        callerId: user?._id
      });

      dispatch(startCall({ withUser: { _id: params.userId, name: dataUser.name } }));
      
    } catch (error) {
      toast.error(error.message || 'Failed to start video call');
      console.error('Video call error:', error);
      endVideoCall();
    } finally {
      mediaLock.current = false;
    }
  };

  return (
    <div style={{ backgroundImage: `url(${backgroundImage})` }} className='bg-no-repeat bg-cover relative'>
      {isVideoCallActive && (localStream || remoteStream) && (
        <VideoCall 
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endVideoCall}
        />
      )}

      <header className='sticky top-0 h-16 bg-white flex justify-between items-center px-4 z-40'>
        <div className='flex items-center gap-4'>
          <Link to={"/"} className='lg:hidden'>
            <FaAngleLeft size={25}/>
          </Link>
          <div>
            <Avatar
              width={50}
              height={50}
              imageUrl={dataUser?.profile_pic}
              name={dataUser?.name}
              userId={dataUser?._id}
            />
          </div>
          <div>
            <h3 className='font-semibold text-lg my-0 text-ellipsis line-clamp-1'>{dataUser?.name}</h3>
            <p className='-my-2 text-sm'>
              {dataUser.online ? (
                <span className='text-primary'>online</span>
              ) : (
                <span className='text-slate-400'>offline</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!dataUser.isBlocked && !dataUser.isBlockedBy && !dataUser.messagePending && (
            <button
              onClick={handleStartCall}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Start video call"
            >
              <FaVideo size={20} className="text-primary" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-full hover:bg-gray-100"
              title="More options"
            >
              <FaEllipsisV size={20} />
            </button>

            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                <button
                  onClick={handleToggleBlock}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  {dataUser.isBlocked ? (
                    <>
                      <FaUnlock className="text-primary" />
                      <span>Unblock User</span>
                    </>
                  ) : (
                    <>
                      <FaBan className="text-red-500" />
                      <span>Block User</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className='h-[calc(100vh-128px)] overflow-x-hidden overflow-y-scroll scrollbar relative bg-slate-200 bg-opacity-50'>
        {dataUser.isDeleted ? (
          <div className='flex items-center justify-center h-full'>
            <div className='bg-white p-4 rounded-lg shadow text-center'>
              <IoClose className="text-red-500 text-4xl mx-auto mb-2"/>
              <p className='text-gray-600'>This user account has been deleted</p>
            </div>
          </div>
        ) : (dataUser.isBlocked || dataUser.isBlockedBy) ? (
          <div className='flex items-center justify-center h-full'>
            <div className='bg-white p-4 rounded-lg shadow text-center'>
              <FaBan className="text-red-500 text-4xl mx-auto mb-2"/>
              <p className='text-gray-600'>
                {dataUser.isBlocked ? 
                  "You have blocked this user" : 
                  "You have been blocked by this user"}
              </p>
            </div>
          </div>
        ) : dataUser.messagePending ? (
          <div className='flex items-center justify-center h-full'>
            <div className='bg-white p-4 rounded-lg shadow text-center'>
              <p className='text-gray-600'>
                Waiting for {dataUser.name} to accept your message request
              </p>
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-2 py-2 mx-2' ref={currentMessage}>
            {allMessage.map((msg, index) => {
              const isMyMessage = msg.msgByUserId === user?._id;
              return (
                <div 
                  key={msg._id || `${msg.createdAt}-${index}`} 
                  className={`p-1 py-1 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                    isMyMessage ? "ml-auto bg-primary text-white" : "bg-white"
                  }`}
                >
                  <div className='w-full relative'>
                    {msg?.imageUrl && (
                      <img 
                        src={msg?.imageUrl}
                        alt={`Message image from ${isMyMessage ? 'you' : dataUser?.name}`}
                        className='w-full h-full object-scale-down'
                      />
                    )}
                    {msg?.videoUrl && (
                      <video
                        src={msg.videoUrl}
                        className='w-full h-full object-scale-down'
                        controls
                        title={`Message video from ${isMyMessage ? 'you' : dataUser?.name}`}
                      />
                    )}
                  </div>
                  <div className="flex items-end gap-1">
                    <p className='px-2 break-words'>{msg.text}</p>
                    <div className="flex items-center gap-1 ml-auto">
                      <p className='text-xs text-gray-500'>{moment(msg.createdAt).format('hh:mm A')}</p>
                      {isMyMessage && (
                        <span className={`text-xs ${msg.seen ? 'text-blue-500' : 'text-gray-400'}`}>
                          {msg.seen ? <BsCheckAll size={16} /> : <BsCheck size={16} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {message.imageUrl && (
        <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
          <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadImage}>
            <IoClose size={30}/>
          </div>
          <div className='bg-white p-3'>
            <img
              src={message.imageUrl}
              alt='Image to be sent'
              className='aspect-square w-full h-full max-w-sm m-2 object-scale-down'
            />
          </div>
        </div>
      )}

      {message.videoUrl && (
        <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
          <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadVideo}>
            <IoClose size={30}/>
          </div>
          <div className='bg-white p-3'>
            <video 
              src={message.videoUrl} 
              className='aspect-square w-full h-full max-w-sm m-2 object-scale-down'
              controls
              muted
              autoPlay
              title="Video to be sent"
            />
          </div>
        </div>
      )}

      {loading && !messagePending && !dataUser.isBlocked && !dataUser.isBlockedBy && (
        <div className='absolute inset-0 flex justify-center items-center bg-white bg-opacity-50'>
          <Loading/>
        </div>
      )}

      {!(dataUser.isBlocked || dataUser.isBlockedBy || messagePending) && (
        <section className='h-16 bg-white flex items-center px-4'>
          <div className='relative'>
            <button onClick={handleUploadImageVideoOpen} className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white'>
              <FaPlus size={20}/>
            </button>

            {openImageVideoUpload && (
              <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
                <div>
                  <label htmlFor='uploadImage' className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer'>
                    <div className='text-primary'>
                      <FaImage size={18}/>
                    </div>
                    <p>Image</p>
                  </label>
                  <label htmlFor='uploadVideo' className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer'>
                    <div className='text-purple-500'>
                      <FaVideo size={18}/>
                    </div>
                    <p>Video</p>
                  </label>

                  <input 
                    type='file'
                    id='uploadImage'
                    onChange={handleUploadImage}
                    className='hidden'
                    accept="image/*"
                  />

                  <input 
                    type='file'
                    id='uploadVideo'
                    onChange={handleUploadVideo}
                    className='hidden'
                    accept="video/*"
                  />
                </div>
              </div>
            )}
          </div>

          <form className='h-full w-full flex gap-2' onSubmit={handleSendMessage}>
            <input
              type='text'
              placeholder='Type here message...'
              className='py-1 px-4 outline-none w-full h-full'
              value={message.text}
              onChange={handleOnChange}
            />
            <button className='text-primary hover:text-secondary'>
              <IoMdSend size={28}/>
            </button>
          </form>
        </section>
      )}
    </div>
  )
}

export default MessagePage
