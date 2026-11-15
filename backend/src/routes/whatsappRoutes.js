import express from 'express'
import {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
} from '../controllers/whatsappController.js'
import { receiveTwilioWebhook } from '../controllers/twilioController.js'

const router = express.Router()

// No JWT auth here — Meta verifies with hub.verify_token on GET.
// POST is called by Meta's servers with the webhook payload.
router.get('/', verifyWhatsAppWebhook)
router.post('/', receiveWhatsAppWebhook)

// Twilio Sandbox: POST /webhooks/whatsapp/twilio
// Twilio sends form-encoded bodies (express.urlencoded in app.js).
router.post('/twilio', receiveTwilioWebhook)

export default router
