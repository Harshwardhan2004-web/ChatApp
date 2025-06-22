import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { endCall } from '../redux/slices/videoCallSlice';

const VideoCall = ({ localStream, remoteStream, onEndCall }) => {
  const dispatch = useDispatch();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { withUser } = useSelector(state => state.videoCall);
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    dispatch(endCall());
    if (onEndCall) onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl p-4">
        <div className="relative">
          {/* Remote Video (Full Size) */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
          ) : (
            <div className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-white">Connecting to {withUser?.name}...</p>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-4 right-4 w-48">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-black shadow-lg"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black bg-opacity-50 px-6 py-3 rounded-full">
            <button
              onClick={handleToggleAudio}
              className={`p-3 rounded-full ${
                isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isAudioEnabled ? (
                <FaMicrophone className="text-white" size={20} />
              ) : (
                <FaMicrophoneSlash className="text-white" size={20} />
              )}
            </button>

            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600"
            >
              <FaPhoneSlash className="text-white" size={20} />
            </button>

            <button
              onClick={handleToggleVideo}
              className={`p-3 rounded-full ${
                isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isVideoEnabled ? (
                <FaVideo className="text-white" size={20} />
              ) : (
                <FaVideoSlash className="text-white" size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;