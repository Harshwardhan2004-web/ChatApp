import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IoClose } from "react-icons/io5";

const LogoutModal = ({ isOpen, onClose, onLogout }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      
      // Verify password
      const verifyResponse = await axios({
        method: 'post',
        url: `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/api/verify-password`,
        data: { password },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (verifyResponse?.data?.success) {
        // Password verified, proceed with logout
        const logoutResponse = await axios({
          method: 'get',
          url: `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/api/logout`,
          withCredentials: true
        });
        
        if (logoutResponse?.data?.success) {
          // Clear all stored data
          localStorage.clear();
          setPassword('');
          onLogout();
          toast.success('Logged out successfully');
        }
      } else {
        toast.error(verifyResponse?.data?.message || 'Password verification failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else if (error.response?.status === 401) {
        toast.error(error.response?.data?.message || 'Authentication failed');
      } else if (error.response?.status === 404) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to verify password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Confirm Logout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoClose size={24} />
          </button>
        </div>
        
        <p className="mb-4 text-gray-600">Please enter your password to confirm logout.</p>
        
        <form onSubmit={handleLogout}>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-primary mb-4"
            required
            autoFocus
          />
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Confirm Logout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogoutModal;