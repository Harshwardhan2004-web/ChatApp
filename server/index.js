const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/connectDB')
const router = require('./routes/index')
const cookiesParser = require('cookie-parser')
const { app, server } = require('./socket/index')

const allowedOrigins = ['http://localhost:3000', process.env.FRONTEND_URL];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(cookiesParser())

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

async function startServer() {
    try {
        // Connect to MongoDB first
        await connectDB()
        
        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`)
        })

    } catch (err) {
        console.error('Failed to start server:', err)
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
    process.exit(1)
})

startServer()
