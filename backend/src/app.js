import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import apiRoutes from './routes/index.js'
import whatsappRoutes from './routes/whatsappRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

/**
 * Express application factory.
 * Separates app configuration from server socket listening,
 * allowing isolated ephemeral test servers to run without port conflicts
 * or production database coupling.
 */
export const createApp = () => {
  const app = express()

  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean)

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`))
        }
      },
      credentials: true,
    })
  )
  app.use(express.json())
  // Twilio sends form-encoded webhooks, Meta sends JSON.
  // Both are needed for /webhooks/whatsapp and /webhooks/whatsapp/twilio.
  app.use(express.urlencoded({ extended: true }))

  // Health-check endpoint
  app.get('/api/health', (req, res) => {
    const dbStatusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }

    const dbState = mongoose.connection.readyState
    const dbStatus = dbStatusMap[dbState] || 'unknown'
    const dbName = mongoose.connection.name || 'unknown'

    res.status(200).json({
      status: 'ok',
      message: 'MerchantConnect AI API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        readyState: dbState,
        name: dbName,
      },
    })
  })

  // Root route
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'MerchantConnect AI API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        dashboard: '/api/dashboard',
        shopkeepers: '/api/shopkeepers',
        leads: '/api/leads',
        campaigns: '/api/campaigns',
        agents: '/api/agents',
        conversations: '/api/conversations',
        whatsappWebhook: '/webhooks/whatsapp',
        whatsappTwilioWebhook: '/webhooks/whatsapp/twilio',
        twilio: '/api/twilio',
        twilioWebhook: '/api/webhooks/twilio/whatsapp',
      },
    })
  })

  // WhatsApp webhooks — mounted BEFORE /api, no JWT auth.
  // Meta calls GET for verification and POST for incoming messages.
  // Twilio Sandbox calls POST /webhooks/whatsapp/twilio (form-encoded).
  app.use('/webhooks/whatsapp', whatsappRoutes)

  // Mount API Router
  app.use('/api', apiRoutes)

  // Fallback for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: `Route ${req.originalUrl} not found`,
    })
  })

  // Centralized Error Handling Middleware
  app.use(errorHandler)

  return app
}

export default createApp

