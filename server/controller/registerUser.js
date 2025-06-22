const UserModel = require("../models/UserModel")
const bcryptjs = require('bcryptjs')

async function registerUser(request, response) {
    try {
        const { name, email, password, profile_pic } = request.body

        // Validate required fields
        if (!name || !email || !password) {
            return response.status(400).json({
                message: "Name, email and password are required",
                error: true,
            })
        }

        // Validate email format (lowercase only)
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
        if (!emailRegex.test(email)) {
            return response.status(400).json({
                message: "Invalid email format. Please use lowercase letters only",
                error: true,
            })
        }

        // Validate password (letters, numbers, and special characters)
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        if (!passwordRegex.test(password)) {
            return response.status(400).json({
                message: "Password must be at least 8 characters long and include letters, numbers, and special characters",
                error: true,
            })
        }

        const checkEmail = await UserModel.findOne({ email })

        if (checkEmail) {
            return response.status(400).json({
                message: "Email already exists",
                error: true,
            })
        }

        //password into hashpassword
        const salt = await bcryptjs.genSalt(10)
        const hashpassword = await bcryptjs.hash(password, salt)

        const payload = {
            name,
            email,
            password: hashpassword,
            ...(profile_pic && { profile_pic }) // Only add profile_pic if it exists
        }

        const user = new UserModel(payload)
        const userSave = await user.save()

        // Don't send password back to client
        const userResponse = {
            _id: userSave._id,
            name: userSave.name,
            email: userSave.email,
            profile_pic: userSave.profile_pic
        }

        return response.status(201).json({
            message: "User created successfully",
            data: userResponse,
            success: true
        })

    } catch (error) {
        console.error('Registration error:', error)
        return response.status(500).json({
            message: "Internal server error",
            error: true
        })
    }
}

module.exports = registerUser