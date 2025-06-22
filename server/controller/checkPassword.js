const UserModel = require("../models/UserModel")
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')

async function checkPassword(request, response) {
    try {
        const { password, userId } = request.body

        if (!password || !userId) {
            return response.status(400).json({
                message: "Password and userId are required",
                error: true
            })
        }

        const user = await UserModel.findById(userId)
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                error: true
            })
        }

        const verifyPassword = await bcryptjs.compare(password, user.password)
        if (!verifyPassword) {
            return response.status(400).json({
                message: "Invalid password",
                error: true
            })
        }

        const tokenData = {
            id: user._id,
            email: user.email
        }
        
        const token = jwt.sign(tokenData, process.env.JWT_SECREAT_KEY, { expiresIn: '24h' })

        // Set cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }

        return response
            .cookie('token', token, cookieOptions)
            .status(200)
            .json({
                message: "Login successful",
                token: token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profile_pic: user.profile_pic
                },
                success: true
            })

    } catch (error) {
        console.error('Login error:', error)
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true
        })
    }
}

module.exports = checkPassword