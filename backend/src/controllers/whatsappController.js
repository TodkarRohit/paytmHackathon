/**
 * WhatsApp Webhook Controller — Meta WhatsApp Cloud API
 *
 * GET  /webhooks/whatsapp  — Meta verification (hub.mode / hub.verify_token / hub.challenge)
 * POST /webhooks/whatsapp  — incoming messages from shopkeepers
 *
 * Flow for each incoming text message:
 *  1. Find Shopkeeper by phone (WhatsApp `from` id).
 *     Unknown number -> log + ignore (no unsolicited AI reply).
 *  2. If shopkeeper.whatsappOptIn is false -> log + ignore.
 *     Opt-in is consent; the bot must not message people who opted out.
 *  3. Find/create their Active WhatsApp Conversation, reuse the
 *     existing Gemini AI service (generateSalesResponse) with history,
 *     save both messages, then send the AI reply back on WhatsApp.
 *
 * This route has NO JWT auth — Meta calls it with the verify token
 * on GET and with the webhook payload on POST. Do not put it behind
 * the /api auth middleware.
 */

import { Conversation } from '../models/index.js'
import { generateSalesResponse } from '../services/aiAgentService.js'
import { conversationMutex } from '../utils/conversationMutex.js'
import {
  getWhatsAppConfig,
  findShopkeeperByWhatsAppId,
  parseIncomingMessages,
  sendWhatsAppText,
  markWhatsAppRead,
} from '../services/whatsappService.js'

const FALLBACK_REPLY =
  'Namaste, main Paytm AI Assistant hoon. Abhi main aapki madad nahi kar pa raha hoon, kripya thodi der baad phir se message karein.'

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
 * Handle one incoming WhatsApp text message end-to-end.
 * Exported for unit tests / reuse. Returns { handled, reason?, reply? }.
 */
export async function handleWhatsAppTextMessage({ from, text, messageId }) {
  const shopkeeper = await findShopkeeperByWhatsAppId(from)
  if (!shopkeeper) {
    console.warn(`[whatsapp] Ignoring message from unknown number ${from}`)
    return { handled: false, reason: 'unknown_shopkeeper' }
  }

  if (!shopkeeper.whatsappOptIn) {
    console.warn(`[whatsapp] Ignoring message from ${shopkeeper._id}: whatsappOptIn is false`)
    return { handled: false, reason: 'opted_out' }
  }

  return conversationMutex.run(`whatsapp_${shopkeeper._id}`, async () => {
    let conversation = await Conversation.findOne({
      shopkeeperId: shopkeeper._id,
      channel: 'WhatsApp',
      status: 'Active',
    })

    if (!conversation) {
      conversation = await Conversation.create({
        shopkeeperId: shopkeeper._id,
        channel: 'WhatsApp',
        status: 'Active',
        messages: [],
      })
    }

    let reply
    let intent = 'General_Dialogue'
    let sentiment = 'Neutral'
    try {
      const result = await generateSalesResponse({
        merchant: shopkeeper,
        history: conversation.messages,
        message: text.trim(),
      })
      reply = result.reply
      intent = result.intent
      sentiment = result.sentiment
    } catch (err) {
      console.error(`[whatsapp] AI error for ${shopkeeper._id}:`, err.message)
      reply = FALLBACK_REPLY
    }

    const userTimestamp = new Date()
    const aiTimestamp = new Date(userTimestamp.getTime() + 100)

    conversation.messages.push({
      sender: 'Shopkeeper',
      text: text.trim(),
      timestamp: userTimestamp,
      intentDetected: intent,
      sentiment,
    })
    conversation.messages.push({
      sender: 'AI',
      text: reply.trim(),
      timestamp: aiTimestamp,
      intentDetected: intent,
      sentiment: 'Positive',
    })

    if (intent === 'Purchase_Intent' || intent === 'Pricing_Inquiry') {
      conversation.detectedInterest = true
    }
    conversation.aiSummary = `Latest topic: ${intent} (${sentiment} sentiment)`
    await conversation.save()

    // Send the reply back on WhatsApp. If Meta isn't configured
    // (local dev), sendWhatsAppText logs + skips instead of crashing.
    try {
      await sendWhatsAppText({ to: from, text: reply })
    } catch (sendErr) {
      console.error(`[whatsapp] Send failed to ${from}:`, sendErr.message)
      // Message is already saved in the conversation, so the human
      // agent can see it in the dashboard even if WhatsApp send failed.
    }

    return { handled: true, reply, conversationId: conversation._id }
  })
}

export const receiveWhatsAppWebhook = async (req, res, next) => {
  try {
    // Meta requires a fast 200. Process after acknowledging when possible.
    // Here we process inline but always answer 200 — a single text
    // reply is fast; long Gemini calls are the only slow part and
    // Meta allows up to ~20s. For production scale, move this to a queue.
    const messages = parseIncomingMessages(req.body)

    // Acknowledge immediately if there's nothing to do (e.g. status updates)
    if (!messages.length) {
      return res.status(200).json({ status: 'success', received: 0 })
    }

    // Mark read + handle each message (usually 1 per webhook call)
    for (const msg of messages) {
      if (msg.messageId) markWhatsAppRead(msg.messageId).catch(() => {})
      await handleWhatsAppTextMessage(msg)
    }

    return res.status(200).json({ status: 'success', received: messages.length })
  } catch (error) {
    // Never return 5xx to Meta for a malformed payload — log and ack.
    console.error('[whatsapp] Webhook error:', error.message)
    return res.status(200).json({ status: 'success', received: 0, error: 'logged' })
  }
}

export default {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
  handleWhatsAppTextMessage,
}
