import express from 'express'
import {
  handleIncomingWhatsApp,
  sendOutboundWhatsApp,
  simulateIncomingWhatsApp,
  getTwilioConnectionStatus,
} from '../controllers/twilioController.js'

const router = express.Router()

// Incoming Twilio WhatsApp Webhook (called by Twilio servers when merchant messages)
router.post('/whatsapp', handleIncomingWhatsApp)

// Friendly GET info for Twilio Webhook URL in browser
router.get('/whatsapp', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Twilio WhatsApp Webhook endpoint is active and listening for HTTP POST payloads from Twilio.',
    instructions: {
      step1: 'In Twilio Console -> Messaging -> Senders -> WhatsApp Senders (or WhatsApp Sandbox)',
      step2: 'Set "WHEN A MESSAGE COMES IN" to Webhook URL: POST https://<your-public-url>/api/webhooks/twilio/whatsapp',
      step3: 'Send a message from WhatsApp to your Twilio number to start talking to the AI Sales Agent.',
    },
  })
})

// Outbound WhatsApp message sending API
router.post('/send', sendOutboundWhatsApp)

// Simulated incoming message (for testing/local development)
router.post('/simulate-incoming', simulateIncomingWhatsApp)

// Twilio connection status & configuration info
router.get('/status', getTwilioConnectionStatus)

export default router
