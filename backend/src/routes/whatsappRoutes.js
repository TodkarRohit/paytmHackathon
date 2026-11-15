import express from 'express'
import {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
} from '../controllers/whatsappController.js'

const router = express.Router()

// No JWT auth here — Meta verifies with hub.verify_token on GET.
// POST is called by Meta's servers with the webhook payload.
router.get('/', verifyWhatsAppWebhook)
router.post('/', receiveWhatsAppWebhook)

export default router
