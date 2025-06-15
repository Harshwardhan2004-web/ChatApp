const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken")
const UserModel = require("../models/UserModel")

async function verifyPassword(request, response) {
    try {
        const token = request.cookies.token
        const { password } = request.body

        if (!token) {
            return response.status(401).json({
                message: "Please log in first",
                success: false
            })
        }

        if (!password) {
            return response.status(400).json({
                message: "Password is required",
                success: false
            })
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECREAT_KEY)
        if (!decoded || !decoded.id) {
            return response.status(401).json({
                message: "Invalid session",
                success: false
            })
        }

        // Get user from database
        const user = await UserModel.findById(decoded.id)
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                success: false
            })
        }

        // Verify password
        const isPasswordValid = await bcryptjs.compare(password, user.password)
        if (!isPasswordValid) {
            return response.status(401).json({
                message: "Incorrect password",
                success: false
            })
        }

        return response.status(200).json({
            message: "Password verified successfully",
            success: true
        })

    } catch (error) {
        console.error('Password verification error:', error)
        if (error.name === 'JsonWebTokenError') {
            return response.status(401).json({
                message: "Invalid token",
                success: false
            })
        } else if (error.name === 'TokenExpiredError') {
            return response.status(401).json({
                message: "Session expired",
                success: false
            })
        }
        return response.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

module.exports = verifyPassword