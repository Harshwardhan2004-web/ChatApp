const mongoose = require('mongoose')

async function connectDB() {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 1000,
            maxPoolSize: 10,
            family: 4 // Use IPv4, skip trying IPv6
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
            process.exit(1)
        })

        connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB connection lost. Attempting to reconnect...')
        })

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await connection.close()
                console.log('MongoDB connection closed through app termination')
                process.exit(0)
            } catch (err) {
                console.error('Error during connection closure:', err)
                process.exit(1)
            }
        })

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message)
        console.log('Possible issues:')
        console.log('1. MongoDB is not running')
        console.log('2. MongoDB is not installed')
        console.log('3. MongoDB connection string is incorrect')
        console.log('\nPlease make sure MongoDB is installed and running')
        process.exit(1)
    }
}

module.exports = connectDB