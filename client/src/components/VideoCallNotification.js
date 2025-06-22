import React from 'react';
import { FaVideo, FaPhoneSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const VideoCallNotification = ({ caller, onReject, onAccept }) => {
  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 min-w-[300px]">
      <div className="flex items-center gap-4">
        <div className="bg-primary bg-opacity-10 p-3 rounded-full">
          <FaVideo className="text-primary text-xl" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Incoming Video Call</h3>
          <p className="text-sm text-gray-600">{caller}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onReject}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
        >
          <FaPhoneSlash />
          <span>Decline</span>
        </button>
        <button
          onClick={onAccept}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90"
        >
          <FaVideo />
          <span>Accept</span>
        </button>
      </div>
    </div>
  );
};

export default VideoCallNotification;