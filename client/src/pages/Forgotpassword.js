import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const Forgotpassword = () => {
  const [step, setStep] = useState(1) // 1: email, 2: new password
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [resetToken, setResetToken] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!data.email) {
      toast.error('Please enter your email')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/forgot-password`,
        { email: data.email }
      )

      if (response.data.success) {
        setResetToken(response.data.resetToken)
        setStep(2)
        toast.success('Please enter your new password')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    
    if (!data.newPassword || !data.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (data.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/reset-password`,
        {
          resetToken,
          newPassword: data.newPassword
        }
      )

      if (response.data.success) {
        toast.success('Password reset successful')
        navigate('/email')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mt-5'>
      <div className='bg-white w-full max-w-md rounded overflow-hidden p-4 mx-auto'>
        <h3 className='text-xl font-semibold mb-4'>Reset Password</h3>

        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className='grid gap-4'>
            <div className='flex flex-col gap-1'>
              <label htmlFor='email'>Email:</label>
              <input
                type='email'
                id='email'
                name='email'
                value={data.email}
                onChange={handleChange}
                placeholder='Enter your email'
                className='bg-slate-100 px-2 py-1 focus:outline-primary'
                required
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50'
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className='grid gap-4'>
            <div className='flex flex-col gap-1'>
              <label htmlFor='newPassword'>New Password:</label>
              <input
                type='password'
                id='newPassword'
                name='newPassword'
                value={data.newPassword}
                onChange={handleChange}
                placeholder='Enter new password'
                className='bg-slate-100 px-2 py-1 focus:outline-primary'
                required
              />
            </div>

            <div className='flex flex-col gap-1'>
              <label htmlFor='confirmPassword'>Confirm Password:</label>
              <input
                type='password'
                id='confirmPassword'
                name='confirmPassword'
                value={data.confirmPassword}
                onChange={handleChange}
                placeholder='Confirm new password'
                className='bg-slate-100 px-2 py-1 focus:outline-primary'
                required
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='bg-primary text-lg px-4 py-1 hover:bg-secondary rounded mt-2 font-bold text-white leading-relaxed tracking-wide disabled:opacity-50'
            >
              {loading ? 'Resetting...' : 'Save New Password'}
            </button>
          </form>
        )}

        <p className='my-3 text-center'>
          <Link to="/email" className='hover:text-primary font-semibold'>Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Forgotpassword
