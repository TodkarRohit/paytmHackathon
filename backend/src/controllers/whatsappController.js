/**
 * WhatsApp Webhook Controller — Meta WhatsApp Cloud API
 *
 * GET  /webhooks/whatsapp  — Meta verification (hub.mode / hub.verify_token / hub.challenge)
 * POST /webhooks/whatsapp  — incoming messages from shopkeepers
 *
 * The Paytm-specific chat work (shopkeeper lookup, opt-in, Gemini,
 * Conversation save) lives in services/whatsappChatService.js and is
 * shared with the Twilio controller. This controller only does the
 * Meta-specific parts: verify, parse, mark-read, send via Meta.
 *
 * This route has NO JWT auth — Meta calls it with the verify token
 * on GET and with the webhook payload on POST. Do not put it behind
 * the /api auth middleware.
 */

import { getWhatsAppConfig, parseIncomingMessages, sendWhatsAppText, markWhatsAppRead } from '../services/whatsappService.js'
import { processShopkeeperWhatsAppMessage } from '../services/whatsappChatService.js'

export const verifyWhatsAppWebhook = (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const { verifyToken } = getWhatsAppConfig()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken && challenge) {
    return res.status(200).send(challenge)
  }
  return res.status(403).json({ status: 'error', message: 'Webhook verification failed' })
}

/**
 * Handle one incoming WhatsApp text message end-to-end via Meta.
 * Exported for unit tests / reuse. Returns { handled, reason?, reply? }.
 */
export async function handleWhatsAppTextMessage({ from, text, messageId }) {
  return processShopkeeperWhatsAppMessage({
    from,
    text,
    sendText: sendWhatsAppText,
  })
}

export const receiveWhatsAppWebhook = async (req, res, next) => {
  try {
    const messages = parseIncomingMessages(req.body)

    if (!messages.length) {
      return res.status(200).json({ status: 'success', received: 0 })
    }

    for (const msg of messages) {
      if (msg.messageId) markWhatsAppRead(msg.messageId).catch(() => {})
      await handleWhatsAppTextMessage(msg)
    }

    return res.status(200).json({ status: 'success', received: messages.length })
  } catch (error) {
    console.error('[whatsapp] Webhook error:', error.message)
    return res.status(200).json({ status: 'success', received: 0, error: 'logged' })
  }
}

export default {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
  handleWhatsAppTextMessage,
}
