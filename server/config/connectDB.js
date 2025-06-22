const mongoose = require('mongoose')

async function connectDB() {
    try {
        const options = {
            serverSelectionTimeoutMS: 10000,
            family: 4
        }

        console.log('Attempting to connect to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI, options)

        const connection = mongoose.connection

        connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully')
            console.log(`Connected to database: ${connection.name}`)
        })

        connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error)
            console.log('Please make sure MongoDB is running and accessible')
        })

        connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB connection lost. Attempting to reconnect...')
        })

        return connection

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message)
        console.log('Possible issues:')
        console.log('1. MongoDB is not running')
        console.log('2. MongoDB connection string is incorrect')
        console.log('3. Network connectivity issues')
        
        throw error
    }
}

module.exports = connectDB