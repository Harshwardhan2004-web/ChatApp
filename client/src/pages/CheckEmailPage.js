import React, { useState } from 'react'
import { IoClose } from "react-icons/io5";
import { PiUserCircle } from "react-icons/pi";
import { Link, useNavigate } from 'react-router-dom';
import uploadFile from '../helpers/uploadFile';
import axios from 'axios'
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const CheckEmailPage = () => {
  const [data,setData] = useState({
    email : "",
  })
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()

  const handleOnChange = (e)=>{
    const { name, value} = e.target

    setData((preve)=>{
      return{
          ...preve,
          [name] : value
      }
    })
  }

  const handleSubmit = async(e)=>{
    e.preventDefault()
    e.stopPropagation()

    if (!data.email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Checking email...');

    try {
        const URL = `${process.env.REACT_APP_BACKEND_URL}/api/email`
        const response = await axios({
          method: 'post',
          url: URL,
          data: data,
          withCredentials: true,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500
          }
        });

        toast.dismiss(loadingToast);

        if(response.data.success){
            setData({
              email : "",
            })
            navigate('/password',{
              state : response?.data?.data
            })
            toast.success(response.data.message)
        } else {
            toast.error(response.data.message || 'Email verification failed')
        }
    } catch (error) {
        toast.dismiss(loadingToast);
        console.error('Connection error:', error);
        
        if (error.code === 'ECONNABORTED') {
            toast.error('Request timed out. Please try again.');
        } else if (!error.response) {
            toast.error('Unable to connect to server. Please check if the server is running.');
        } else if (error.response.status === 404) {
            toast.error('Server endpoint not found. Please check server URL.');
        } else if (error.response.status >= 500) {
            toast.error('Internal server error. Please try again later.');
        } else {
            toast.error(error.response?.data?.message || 'An error occurred');
        }
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className='mt-5'>
        <div className='bg-white w-full max-w-md  rounded overflow-hidden p-4 mx-auto'>

            <div className='w-fit mx-auto mb-2'>
                <PiUserCircle
                  size={80}
                />
            </div>

          <h3>Welcome to Chat app!</h3>

          <form className='grid gap-4 mt-3' onSubmit={handleSubmit}>
              

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
                  disabled={loading}
                  required
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='bg-primary text-lg  px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50'
              >
                {loading ? (
                  <div className='flex items-center justify-center'>
                    <Loading />
                    <span className='ml-2'>Checking...</span>
                  </div>
                ) : (
                  "Let's Go"
                )}
              </button>

          </form>

          <p className='my-3 text-center'>New User ? <Link to={"/register"} className='hover:text-primary font-semibold'>Register</Link></p>
        </div>
    </div>
  )
}

export default CheckEmailPage
