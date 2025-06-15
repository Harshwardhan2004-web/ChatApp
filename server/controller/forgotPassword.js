const UserModel = require('../models/UserModel')
const jwt = require('jsonwebtoken')

async function forgotPassword(request, response) {
    try {
        const { email } = request.body

        if (!email) {
            return response.status(400).json({
                message: "Email is required",
                success: false
            })
        }

        // Find user by email
        const user = await UserModel.findOne({ email })
        if (!user) {
            return response.status(404).json({
                message: "User not found",
                success: false
            })
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECREAT_KEY,
            { expiresIn: '1h' }
        )

        // In a production environment, you would send this token via email
        // For this demo, we'll return it directly
        return response.status(200).json({
            message: "Reset token generated successfully",
            resetToken,
            userId: user._id,
            success: true
        })

    } catch (error) {
        console.error('Forgot password error:', error)
        return response.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

module.exports = forgotPassword