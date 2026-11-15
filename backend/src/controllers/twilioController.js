/**
 * Twilio WhatsApp Webhook Controller — Twilio WhatsApp Sandbox (demo)
 *
 * POST /webhooks/whatsapp/twilio
 *
 * Twilio sends a form-encoded POST (express.urlencoded is enabled in app.js).
 * Reply delivery:
 *  - If Twilio API credentials are configured, the reply is sent via
 *    the Messages API and the webhook returns an empty TwiML <Response/>.
 *  - If not configured (Sandbox demo with only a webhook URL), the reply
 *    is returned as TwiML <Response><Message>...</Message></Response>
 *    and Twilio delivers it. No duplicate: only one path runs.
 *
 * No JWT auth here — Twilio calls this directly. In production, validate
 * the X-Twilio-Signature header with your Auth Token (see Twilio docs).
 * For a hackathon Sandbox demo, signature validation is optional and
 * deliberately not enforced here so the demo works out of the box.
 */

import { processShopkeeperWhatsAppMessage } from '../services/whatsappChatService.js'
import {
  parseTwilioMessage,
  sendTwilioWhatsAppText,
  isTwilioConfigured,
  twimlMessage,
  twimlEmpty,
} from '../services/twilioService.js'

const sendTwiml = (res, xml) => res.status(200).type('text/xml').send(xml)

export const receiveTwilioWebhook = async (req, res, next) => {
  try {
    const msg = parseTwilioMessage(req.body || {})
    if (!msg) {
      return sendTwiml(res, twimlEmpty())
    }

    const result = await processShopkeeperWhatsAppMessage({
      from: msg.from,
      text: msg.text,
      // Only use the API sender when configured; otherwise the
      // controller will deliver via TwiML below.
      sendText: isTwilioConfigured() ? sendTwilioWhatsAppText : null,
    })

    if (!result.handled) {
      // Unknown number / opted out — return empty TwiML, no reply.
      // Twilio treats an empty <Response/> as "do nothing".
      return sendTwiml(res, twimlEmpty())
    }

    if (isTwilioConfigured()) {
      // Reply already sent via the Messages API.
      return sendTwiml(res, twimlEmpty())
    }

    // Demo path: deliver the AI reply as TwiML.
    return sendTwiml(res, twimlMessage(result.reply))
  } catch (error) {
    console.error('[twilio] Webhook error:', error.message)
    // Never return 5xx to Twilio for a malformed payload — ack empty.
    return sendTwiml(res, twimlEmpty())
  }
}

export default { receiveTwilioWebhook }
