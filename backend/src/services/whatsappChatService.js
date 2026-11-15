/**
 * WhatsApp Chat Core — provider-agnostic
 *
 * Shared by the Meta Cloud API controller and the Twilio Sandbox
 * controller. Both providers deliver the same thing: a shopkeeper's
 * phone number + a text message. This module does the Paytm-specific
 * work once:
 *  1. Find Shopkeeper by phone, unknown -> ignore (no unsolicited reply)
 *  2. whatsappOptIn === false -> ignore (opt-in is consent)
 *  3. Find/create Active WhatsApp Conversation, call Gemini
 *     (generateSalesResponse) with history, save both messages
 *  4. Deliver the reply via the caller-supplied `sendText` function,
 *     if one is given. If `sendText` is omitted, the caller is
 *     responsible for delivery (e.g. Twilio TwiML in the webhook response).
 */

import { Conversation } from '../models/index.js'
import { generateSalesResponse } from './aiAgentService.js'
import { conversationMutex } from '../utils/conversationMutex.js'
import { findShopkeeperByWhatsAppId } from './whatsappService.js'

export const WHATSAPP_FALLBACK_REPLY =
  'Namaste, main Paytm AI Assistant hoon. Abhi main aapki madad nahi kar pa raha hoon, kripya thodi der baad phir se message karein.'

export async function processShopkeeperWhatsAppMessage({ from, text, sendText = null }) {
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
      reply = WHATSAPP_FALLBACK_REPLY
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

    if (sendText) {
      try {
        await sendText({ to: from, text: reply })
      } catch (sendErr) {
        console.error(`[whatsapp] Send failed to ${from}:`, sendErr.message)
        // Message is already saved, so a human agent can see it
        // in the dashboard even if the WhatsApp send failed.
      }
    }

    return { handled: true, reply, conversationId: conversation._id }
  })
}

export default { processShopkeeperWhatsAppMessage, WHATSAPP_FALLBACK_REPLY }
