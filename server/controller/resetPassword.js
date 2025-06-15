const UserModel = require('../models/UserModel')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')

async function resetPassword(request, response) {
    try {
        const { resetToken, newPassword } = request.body

        if (!resetToken || !newPassword) {
            return response.status(400).json({
                message: "Reset token and new password are required",
                success: false
            })
        }

        // Verify reset token
        const decoded = jwt.verify(resetToken, process.env.JWT_SECREAT_KEY)
        if (!decoded || !decoded.id) {
            return response.status(401).json({
                message: "Invalid or expired reset token",
                success: false
            })
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword, salt)

        // Update user password
        const user = await UserModel.findByIdAndUpdate(
            decoded.id,
            { password: hashPassword },
            { new: true }
        ).select('-password')

        if (!user) {
            return response.status(404).json({
                message: "User not found",
                success: false
            })
        }

        return response.status(200).json({
            message: "Password reset successful",
            success: true
        })

    } catch (error) {
        console.error('Reset password error:', error)
        if (error.name === 'JsonWebTokenError') {
            return response.status(401).json({
                message: "Invalid reset token",
                success: false
            })
        } else if (error.name === 'TokenExpiredError') {
            return response.status(401).json({
                message: "Reset token has expired",
                success: false
            })
        }
        return response.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

module.exports = resetPassword