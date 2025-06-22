import React, { useEffect, useState, useRef } from 'react'
import { IoChatbubbleEllipses } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa";
import { NavLink, useNavigate } from 'react-router-dom';
import { BiLogOut } from "react-icons/bi";
import Avatar from './Avatar'
import { useDispatch, useSelector } from 'react-redux';
import EditUserDetails from './EditUserDetails';
import Divider from './Divider';
import { FiArrowUpLeft } from "react-icons/fi";
import SearchUser from './SearchUser';
import { FaImage } from "react-icons/fa6";
import { FaVideo } from "react-icons/fa6";
import { logout } from '../redux/userSlice';
import LogoutModal from './LogoutModal';
import MessageRequest from './MessageRequest';
import { IoNotifications } from "react-icons/io5";
import toast from 'react-hot-toast';

const Sidebar = () => {
    const user = useSelector(state => state?.user)
    const [editUserOpen,setEditUserOpen] = useState(false)
    const [allUser,setAllUser] = useState([])
    const [openSearchUser,setOpenSearchUser] = useState(false)
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [messageRequests, setMessageRequests] = useState([])
    const [showRequests, setShowRequests] = useState(false)
    const notificationAudio = useRef(null)
    const socketConnection = useSelector(state => state?.user?.socketConnection)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        // Initialize audio reference
        notificationAudio.current = document.getElementById('notification-sound')
    }, [])

    useEffect(() => {
        if(socketConnection && user?._id) {
            // Request initial conversation list
            socketConnection.emit('sidebar', user._id);
            socketConnection.emit('get_message_requests');
            
            const updateSidebar = () => {
                socketConnection.emit('sidebar', user._id);
            };
            
            socketConnection.on('conversation', (data) => {
                if (!Array.isArray(data)) return;
                
                const uniqueUserMap = new Map();
                
                data.forEach(conv => {
                    if (conv && conv.sender && conv.receiver) {
                        const otherUser = conv.sender._id.toString() === user._id.toString() 
                            ? conv.receiver 
                            : conv.sender;
                            
                        const userData = {
                            _id: conv._id,
                            userDetails: {
                                _id: otherUser._id,
                                name: otherUser.name || 'Deleted User',
                                profile_pic: otherUser.profile_pic || '',
                                online: otherUser.online || false
                            },
                            lastMsg: conv.lastMsg,
                            unseenMsg: conv.unseenMsg || 0,
                            lastActivity: conv.updatedAt || conv.lastMsg?.createdAt || new Date()
                        };
                        
                        const userId = otherUser._id.toString();
                        if (!uniqueUserMap.has(userId) || 
                            new Date(userData.lastActivity) > new Date(uniqueUserMap.get(userId).lastActivity)) {
                            uniqueUserMap.set(userId, userData);
                        }
                    }
                });

                const conversationUserData = Array.from(uniqueUserMap.values())
                    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

                setAllUser(conversationUserData);
            });

            // Update sidebar on various events
            socketConnection.on('message', updateSidebar);
            socketConnection.on('block_status_updated', updateSidebar);
            socketConnection.on('message_request_handled', updateSidebar);

            // Handle message requests
            socketConnection.on('message_requests', (requests) => {
                setMessageRequests(requests || []);
            });

            socketConnection.on('new_message_request', ({ request }) => {
                setMessageRequests(prev => [...prev, request]);
                if (notificationAudio.current) {
                    notificationAudio.current.play().catch(err => console.error('Error playing sound:', err));
                }
                toast.success(`New message request from ${request.sender.name}`);
            });

            // Clean up event listeners
            return () => {
                socketConnection.off('conversation');
                socketConnection.off('message');
                socketConnection.off('block_status_updated');
                socketConnection.off('message_requests');
                socketConnection.off('new_message_request');
                socketConnection.off('message_request_handled');
            };
        }
    }, [socketConnection, user?._id])

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const handleLogoutConfirm = async () => {
        dispatch(logout());
        navigate("/email");
        localStorage.clear();
    };

    const handleRequestAction = (action) => {
        // Request will be removed by socket update
        setShowRequests(false)
    }

  return (
    <div className='w-full h-full grid grid-cols-[48px,1fr] bg-white'>
            <div className='bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between'>
                <div>
                    <NavLink className={({isActive})=>`w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded ${isActive && "bg-slate-200"}`} title='chat'>
                        <IoChatbubbleEllipses
                            size={20}
                        />
                    </NavLink>

                    <div title='add friend' onClick={()=>setOpenSearchUser(true)} className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded' >
                        <FaUserPlus size={20}/>
                    </div>

                    <div 
                        title='Message Requests' 
                        onClick={() => setShowRequests(true)} 
                        className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded relative'
                    >
                        <IoNotifications size={20}/>
                        {messageRequests.length > 0 && (
                            <span className='absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                                {messageRequests.length}
                            </span>
                        )}
                    </div>
                </div>

                <div className='flex flex-col items-center'>
                    <button className='mx-auto' title={user?.name} onClick={()=>setEditUserOpen(true)}>
                        <Avatar
                            width={40}
                            height={40}
                            name={user?.name}
                            imageUrl={user?.profile_pic}
                            userId={user?._id}
                        />
                    </button>
                    <button 
                        title='logout' 
                        className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded' 
                        onClick={handleLogoutClick}
                    >
                        <span className='-ml-2'>
                            <BiLogOut size={20}/>
                        </span>
                    </button>
                </div>
            </div>

            <div className='w-full'>
                <div className='h-16 flex items-center'>
                    <h2 className='text-xl font-bold p-4 text-slate-800'>
                        {showRequests ? 'Message Requests' : 'Messages'}
                    </h2>
                </div>
                <div className='bg-slate-200 p-[0.5px]'></div>

                <div className='h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar'>
                    {showRequests ? (
                        messageRequests.length > 0 ? (
                            <div className='p-4'>
                                {messageRequests.map(request => (
                                    <MessageRequest 
                                        key={request._id} 
                                        request={request} 
                                        onAction={handleRequestAction}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className='flex items-center justify-center h-full text-gray-500'>
                                No pending message requests
                            </div>
                        )
                    ) : allUser.length === 0 ? (
                        <div className='mt-12'>
                            <div className='flex justify-center items-center my-4 text-slate-500'>
                                <FiArrowUpLeft size={50}/>
                            </div>
                            <p className='text-lg text-center text-slate-400'>
                                Explore users to start a conversation with.
                            </p>    
                        </div>
                    ) : (
                        allUser.map((conv) => (
                            <NavLink 
                                to={"/"+conv?.userDetails?._id} 
                                key={conv?._id} 
                                className='flex items-center gap-2 py-3 px-2 border border-transparent hover:border-primary rounded hover:bg-slate-100 cursor-pointer'
                            >
                                <div>
                                    <Avatar
                                        imageUrl={conv?.userDetails?.profile_pic}
                                        name={conv?.userDetails?.name}
                                        width={40}
                                        height={40}
                                        userId={conv?.userDetails?._id}
                                    />    
                                </div>
                                <div>
                                    <h3 className='text-ellipsis line-clamp-1 font-semibold text-base'>
                                        {conv?.userDetails?.name}
                                    </h3>
                                    <div className='text-slate-500 text-xs flex items-center gap-1'>
                                        <div className='flex items-center gap-1'>
                                            {conv?.lastMsg?.imageUrl && (
                                                <div className='flex items-center gap-1'>
                                                    <span><FaImage/></span>
                                                    {!conv?.lastMsg?.text && <span>Image</span>}
                                                </div>
                                            )}
                                            {conv?.lastMsg?.videoUrl && (
                                                <div className='flex items-center gap-1'>
                                                    <span><FaVideo/></span>
                                                    {!conv?.lastMsg?.text && <span>Video</span>}
                                                </div>
                                            )}
                                        </div>
                                        <p className='text-ellipsis line-clamp-1'>
                                            {conv?.lastMsg?.text}
                                        </p>
                                    </div>
                                </div>
                                {Boolean(conv?.unseenMsg) && (
                                    <p className='text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-primary text-white font-semibold rounded-full'>
                                        {conv?.unseenMsg}
                                    </p>
                                )}
                            </NavLink>
                        ))
                    )}
                </div>
            </div>

            {editUserOpen && (
                <EditUserDetails onClose={()=>setEditUserOpen(false)} user={user}/>
            )}

            {openSearchUser && (
                <SearchUser onClose={()=>setOpenSearchUser(false)}/>
            )}

            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onLogout={handleLogoutConfirm}
            />

            <audio id="notification-sound" src="/notification.mp3" preload="auto" style={{ display: 'none' }} />
    </div>
  )
}

export default Sidebar
