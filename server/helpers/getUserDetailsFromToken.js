const jwt = require('jsonwebtoken')
const UserModel = require('../models/UserModel')

const getUserDetailsFromToken = async(token)=>{
    
    if(!token){
        return null
    }

    try {
        const decode = await jwt.verify(token, process.env.JWT_SECREAT_KEY)
        if (!decode || !decode.id) {
            return null
        }

        const user = await UserModel.findById(decode.id).select('-password')
        return user || null
    } catch (error) {
        console.error('Token verification failed:', error.message)
        return null
    }
}

module.exports = getUserDetailsFromToken