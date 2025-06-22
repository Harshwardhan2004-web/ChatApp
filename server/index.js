const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/connectDB')
const router = require('./routes/index')
const cookiesParser = require('cookie-parser')
const { app, server } = require('./socket/index')
const UserModel = require('./models/UserModel')

app.use(cookiesParser())
app.use(express.json())

// Updated CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', process.env.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: true
}))

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

//api endpoints
app.use('/api', router)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack)
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: true
    })
})

const PORT = process.env.PORT || 8080

// Initialize server function
async function initServer() {
    try {
        // Connect to MongoDB first
        const connection = await connectDB()
        
        if (!connection) {
            throw new Error('Failed to establish MongoDB connection')
        }

        // Reset all users' online status to false on server start
        await UserModel.updateMany({}, { online: false })

        // Start server after successful DB connection
        server.listen(PORT, () => {
            console.log(`✅ Server running at http://localhost:${PORT}`)
        })

        // Handle graceful shutdown
        const cleanup = async () => {
            console.log('Cleaning up before shutdown...')
            try {
                // Reset all users' online status to false
                await UserModel.updateMany({}, { online: false })
                console.log('Successfully reset all user online statuses')
                
                // Close MongoDB connection
                await connection.close()
                console.log('MongoDB connection closed')
                
                // Close server
                server.close(() => {
                    console.log('Server closed')
                    process.exit(0)
                })
            } catch (error) {
                console.error('Cleanup error:', error)
                process.exit(1)
            }
        }

        // Register cleanup handlers
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
        process.on('SIGQUIT', cleanup)

    } catch (error) {
        console.error('Failed to start server:', error.message)
        process.exit(1)
    }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})

// Start the server
initServer()
