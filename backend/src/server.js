import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { seedAdminUserIfMissing } from './controllers/authController.js'
import { createApp } from './app.js'

// Load environment variables from backend/.env file
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = createApp()
const PORT = process.env.PORT || 5000

// Connect to MongoDB Atlas and safely seed initial admin user if configured
connectDB().then(() => {
  if (mongoose.connection.readyState === 1) {
    seedAdminUserIfMissing().catch((err) => {
      console.warn(`⚠️ Admin seed notice: ${err.message}`)
    })
  } else {
    console.log('ℹ️ Running in offline/development mode without active MongoDB Atlas connection')
  }
}).catch((err) => {
  console.warn(`⚠️ Database connection warning: ${err.message}`)
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`)
})

export default app
