import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import Avatar from './Avatar'
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft, FaBan, FaUnlock } from "react-icons/fa6";
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
import toast from 'react-hot-toast';

const MessagePage = () => {
  const params = useParams()
  const socketConnection = useSelector(state => state?.user?.socketConnection)
  const user = useSelector(state => state?.user)
  const [dataUser,setDataUser] = useState({
    name: "",
    email: "",
    profile_pic: "",
    online: false,
    _id: "",
    isBlocked: false,
    isBlockedBy: false
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
      isBlockedBy: false
    });
    setAllMessage([]);
    setMessagePending(false);

    if (socketConnection) {
      socketConnection.emit('message-page', params.userId);
      socketConnection.emit('seen', params.userId);

      socketConnection.on('message-user', (data) => {
        if (data._id === params.userId) { // Only update if it's for the current user
          setDataUser(data);
        }
      });
      
      socketConnection.on('message', (data) => {
        setAllMessage(data);
        setMessagePending(false);
      });

      socketConnection.on('message_error', (data) => {
        toast.error(data.message);
      });

      socketConnection.on('message_pending', () => {
        setMessagePending(true);
        toast.success('Message request sent');
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off('message-user');
        socketConnection.off('message');
        socketConnection.off('message_error');
        socketConnection.off('message_pending');
      }
    }
  }, [socketConnection, params.userId])

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

    if (message.text || message.imageUrl || message.videoUrl) {
      if (socketConnection) {
        socketConnection.emit('new message', {
          sender: user?._id,
          receiver: params.userId,
          text: message.text,
          imageUrl: message.imageUrl,
          videoUrl: message.videoUrl,
          msgByUserId: user?._id
        })
        setMessage({
          text: "",
          imageUrl: "",
          videoUrl: ""
        })
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

  return (
    <div style={{ backgroundImage: `url(${backgroundImage})` }} className='bg-no-repeat bg-cover relative'>
      <header className='sticky top-0 h-16 bg-white flex justify-between items-center px-4 z-50'>
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

        <div className='relative'>
          <button 
            className='cursor-pointer hover:text-primary p-2'
            onClick={() => setShowOptions(!showOptions)}
          >
            <HiDotsVertical size={20}/>
          </button>

          {showOptions && dataUser._id && dataUser._id !== user._id && (
            <div className='absolute right-0 top-12 bg-white shadow-lg rounded-lg py-2 min-w-[200px] z-[100]'>
              <button
                onClick={handleToggleBlock}
                className='w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-slate-100 active:bg-slate-200 transition-all duration-200'
                type="button"
              >
                {dataUser.isBlocked ? (
                  <>
                    <FaUnlock className="text-primary text-lg"/>
                    <span className="font-medium">Unblock User</span>
                  </>
                ) : (
                  <>
                    <FaBan className="text-red-500 text-lg"/>
                    <span className="font-medium">Block User</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      <section className='h-[calc(100vh-128px)] overflow-x-hidden overflow-y-scroll scrollbar relative bg-slate-200 bg-opacity-50'>
        {(dataUser.isBlocked || dataUser.isBlockedBy) ? (
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
        ) : messagePending ? (
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
              const isMyMessage = user._id === msg?.msgByUserId;
              return (
                <div 
                  key={msg._id || `${msg.createdAt}-${index}`} 
                  className={`p-1 py-1 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                    isMyMessage ? "ml-auto bg-teal-100" : "bg-white"
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
                  <p className='px-2'>{msg.text}</p>
                  <p className='text-xs ml-auto w-fit'>{moment(msg.createdAt).format('hh:mm')}</p>
                </div>
              )
            })}
          </div>
        )}

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

        {loading && (
          <div className='w-full h-full flex sticky bottom-0 justify-center items-center'>
            <Loading/>
          </div>
        )}
      </section>

      {!(dataUser.isBlocked || dataUser.isBlockedBy || messagePending) && (
        <section className='h-16 bg-white flex items-center px-4'>
          <div className='relative'>
            <button onClick={handleUploadImageVideoOpen} className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white'>
              <FaPlus size={20}/>
            </button>

            {openImageVideoUpload && (
              <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
                <form>
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
                  />

                  <input 
                    type='file'
                    id='uploadVideo'
                    onChange={handleUploadVideo}
                    className='hidden'
                  />
                </form>
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
