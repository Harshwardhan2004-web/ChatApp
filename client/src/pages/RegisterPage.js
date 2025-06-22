import React, { useState } from 'react'
import { IoClose } from "react-icons/io5";
import { Link, useNavigate } from 'react-router-dom';
import uploadFile from '../helpers/uploadFile';
import axios from 'axios'
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    profile_pic: ""
  })
  const [uploadPhoto, setUploadPhoto] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleOnChange = (e) => {
    const { name, value } = e.target
    setData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUploadPhoto = async(e) => {
    try {
      const file = e.target.files[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }

      const uploadPhoto = await uploadFile(file)
      setUploadPhoto(file)

      setData(prev => ({
        ...prev,
        profile_pic: uploadPhoto?.url || ""
      }))
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    }
  }

  const handleClearUploadPhoto = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setUploadPhoto(null)
    setData(prev => ({
      ...prev,
      profile_pic: ""
    }))
  }

  const validateData = () => {
    if (!data.name.trim()) {
      toast.error('Name is required')
      return false
    }
    
    // Email validation: only lowercase allowed
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
    if (!emailRegex.test(data.email)) {
      toast.error('Please use lowercase letters only in email')
      return false
    }

    // Password validation: require letters, numbers, and special characters
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(data.password)) {
      toast.error('Password must be at least 8 characters long and include letters, numbers, and special characters')
      return false
    }
    
    return true
  }

  const handleSubmit = async(e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateData()) return

    setLoading(true)
    try {
      const URL = `${process.env.REACT_APP_BACKEND_URL}/api/register`
      const response = await axios.post(URL, data)

      if (response.data.success) {
        toast.success(response.data.message)
        setData({
          name: "",
          email: "",
          password: "",
          profile_pic: ""
        })
        setUploadPhoto("")
        navigate('/email')
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Registration failed'
      toast.error(message)
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mt-5'>
      <div className='bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto'>
        <h3>Welcome to Chat app!</h3>

        <form className='grid gap-4 mt-5' onSubmit={handleSubmit}>
          <div className='flex flex-col gap-1'>
            <label htmlFor='name'>Name :</label>
            <input
              type='text'
              id='name'
              name='name'
              placeholder='enter your name' 
              className='bg-slate-100 px-2 py-1 focus:outline-primary'
              value={data.name}
              onChange={handleOnChange}
              required
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label htmlFor='email'>Email :</label>
            <input
              type='email'
              id='email'
              name='email'
              placeholder='enter your email' 
              className='bg-slate-100 px-2 py-1 focus:outline-primary'
              value={data.email}
              onChange={handleOnChange}
              required
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label htmlFor='password'>Password :</label>
            <input
              type='password'
              id='password'
              name='password'
              placeholder='enter your password' 
              className='bg-slate-100 px-2 py-1 focus:outline-primary'
              value={data.password}
              onChange={handleOnChange}
              required
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label htmlFor='profile_pic'>Photo :

              <div className='h-14 bg-slate-200 flex justify-center items-center border rounded hover:border-primary cursor-pointer'>
                  <p className='text-sm max-w-[300px] text-ellipsis line-clamp-1'>
                    {
                      uploadPhoto?.name ? uploadPhoto?.name : "Upload profile photo"
                    }
                  </p>
                  {
                    uploadPhoto?.name && (
                      <button className='text-lg ml-2 hover:text-red-600' onClick={handleClearUploadPhoto}>
                        <IoClose/>
                      </button>
                    )
                  }
                  
              </div>
            
            </label>
            
            <input
              type='file'
              id='profile_pic'
              name='profile_pic'
              className='bg-slate-100 px-2 py-1 focus:outline-primary hidden'
              onChange={handleUploadPhoto}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className='bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50'
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className='my-3 text-center'>
          Already have account? <Link to="/email" className='hover:text-primary font-semibold'>Login</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
