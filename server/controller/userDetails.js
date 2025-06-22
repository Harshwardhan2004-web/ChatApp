const jwt = require('jsonwebtoken')
const UserModel = require('../models/UserModel')

async function userDetails(request, response) {
    try {
        // Get token from cookie or Authorization header
        const token = request.cookies.token || request.headers.authorization?.split(' ')[1] || ""

        if (!token) {
            return response.status(401).json({
                message: "Authentication required",
                success: false
            })
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECREAT_KEY)
        if (!decoded || !decoded.id) {
            return response.status(401).json({
                message: "Invalid token",
                success: false
            })
        }

        // Get user details
        const user = await UserModel.findById(decoded.id).select('-password')
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                success: false
            })
        }

        return response.status(200).json({
            message: "User details retrieved successfully",
            data: user,
            success: true
        })
    } catch (error) {
        console.error('Get user details error:', error)
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
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

module.exports = userDetails