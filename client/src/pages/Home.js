import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, setOnlineUser, setSocketConnection, setUser } from '../redux/userSlice'
import Sidebar from '../components/Sidebar'
import logo from '../assets/logo.png'
import io from 'socket.io-client'
import toast from 'react-hot-toast'
import Loading from '../components/Loading'

const Home = () => {
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const initializeSocket = (token) => {
    if (!token) return null;

    const socket = io(process.env.REACT_APP_BACKEND_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setReconnectAttempt(0);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (reconnectAttempt >= 5) {
        toast.error('Unable to maintain connection. Please refresh the page.');
        dispatch(logout());
        navigate("/email");
        return;
      }
      setReconnectAttempt(prev => prev + 1);
      toast.error('Connection lost. Attempting to reconnect...');
    });

    return socket;
  };

  const fetchUserDetails = async() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch(logout());
        navigate("/email");
        return;
      }

      const response = await axios({
        url: `${process.env.REACT_APP_BACKEND_URL}/api/user-details`,
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const userData = response.data.data;
      if (!userData) {
        throw new Error('No user data received');
      }

      dispatch(setUser(userData));
      
      // Initialize socket connection after successful user fetch
      const socket = initializeSocket(token);
      if (socket) {
        dispatch(setSocketConnection(socket));
      }

    } catch (error) {
      console.error("Connection error:", error);
      toast.error('Session expired. Please login again.');
      dispatch(logout());
      navigate("/email");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
    return () => {
      const socket = user?.socketConnection;
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const basePath = location.pathname === '/';

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!user?._id) {
    navigate("/email");
    return null;
  }

  return (
    <div className='grid lg:grid-cols-[300px,1fr] h-screen max-h-screen'>
      <section className={`bg-white ${!basePath && "hidden"} lg:block`}>
        <Sidebar/>
      </section>

      <section className={`${basePath && "hidden"}`}>
        <Outlet/>
      </section>

      <div className={`justify-center items-center flex-col gap-2 hidden ${!basePath ? "hidden" : "lg:flex"}`}>
        <div>
          <img src={logo} width={250} alt='logo'/>
        </div>
        <p className='text-lg mt-2 text-slate-500'>Select user to send message</p>
      </div>
    </div>
  );
}

export default Home;
