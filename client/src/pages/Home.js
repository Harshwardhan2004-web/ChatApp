import axios from 'axios'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, setOnlineUser, setSocketConnection, setUser } from '../redux/userSlice'
import Sidebar from '../components/Sidebar'
import logo from '../assets/logo.png'
import io from 'socket.io-client'
import toast from 'react-hot-toast'

const Home = () => {
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const fetchUserDetails = async() => {
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/user-details`
      const response = await axios({
        url: URL,
        withCredentials: true
      })

      const userData = response.data.data
      if (!userData) {
        dispatch(logout())
        navigate("/email")
        return
      }

      dispatch(setUser(userData))
      if (userData.logout) {
        dispatch(logout())
        navigate("/email")
      }
    } catch (error) {
      console.error("Connection error:", error)
      if (!error.response) {
        toast.error('Unable to connect to server. Please check if the server is running.')
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch user details')
      }
      dispatch(logout())
      navigate("/email")
    }
  }

  useEffect(() => {
    fetchUserDetails()
  }, [])

  useEffect(() => {
    try {
      const socketConnection = io(process.env.REACT_APP_BACKEND_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socketConnection.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        toast.error('Unable to establish real-time connection')
      })

      socketConnection.on('onlineUser', (data) => {
        dispatch(setOnlineUser(data))
      })

      socketConnection.on('connect', () => {
        console.log('Socket connected successfully')
      })

      dispatch(setSocketConnection(socketConnection))

      return () => {
        socketConnection.disconnect()
      }
    } catch (error) {
      console.error('Socket initialization error:', error)
      toast.error('Failed to initialize real-time connection')
    }
  }, [])

  const basePath = location.pathname === '/'
  return (
    <div className='grid lg:grid-cols-[300px,1fr] h-screen max-h-screen'>
        <section className={`bg-white ${!basePath && "hidden"} lg:block`}>
           <Sidebar/>
        </section>

        {/**message component**/}
        <section className={`${basePath && "hidden"}`} >
            <Outlet/>
        </section>


        <div className={`justify-center items-center flex-col gap-2 hidden ${!basePath ? "hidden" : "lg:flex" }`}>
            <div>
              <img
                src={logo}
                width={250}
                alt='logo'
              />
            </div>
            <p className='text-lg mt-2 text-slate-500'>Select user to send message</p>
        </div>
    </div>
  )
}

export default Home
