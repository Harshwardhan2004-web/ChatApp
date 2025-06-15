const express = require('express')
const registerUser = require('../controller/registerUser')
const checkEmail = require('../controller/checkEmail')
const checkPassword = require('../controller/checkPassword')
const userDetails = require('../controller/userDetails')
const logout = require('../controller/logout')
const updateUserDetails = require('../controller/updateUserDetails')
const searchUser = require('../controller/searchUser')
const verifyPassword = require('../controller/verifyPassword')
const forgotPassword = require('../controller/forgotPassword')
const resetPassword = require('../controller/resetPassword')

const router = express.Router()

// Authentication routes
router.post('/register', registerUser)
router.post('/email', checkEmail)
router.post('/password', checkPassword)
router.get('/user-details', userDetails)
router.get('/logout', logout)
router.post('/verify-password', verifyPassword)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// User management routes
router.post('/update-user', updateUserDetails)
router.post('/search-user', searchUser)

module.exports = router