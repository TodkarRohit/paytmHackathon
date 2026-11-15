/**
 * Twilio WhatsApp Controller
 * 
 * Handles incoming webhooks from Twilio WhatsApp Sandbox / Production,
 * auto-provisions shopkeepers, runs AI Sales Agent reasoning, records
 * conversations, and formats TwiML XML responses.
 */

import mongoose from 'mongoose'
import { Shopkeeper, Conversation, CrmLead } from '../models/index.js'
import { generateSalesResponse } from '../services/aiAgentService.js'
import {
  sendWhatsAppMessage,
  normalizePhoneNumber,
  buildTwiMLResponse,
  getTwilioStatus,
} from '../services/twilioService.js'
import { conversationMutex } from '../utils/conversationMutex.js'

/**
 * Handle incoming WhatsApp message webhook from Twilio
 * Route: POST /api/webhooks/twilio/whatsapp or POST /api/twilio/whatsapp
 */
export const handleIncomingWhatsApp = async (req, res, next) => {
  try {
    // Twilio sends payload as application/x-www-form-urlencoded (or application/json)
    const {
      From,
      To,
      Body,
      ProfileName,
      MessageSid,
    } = req.body || {}

    if (!From || !Body) {
      // In case of ping or invalid body, return empty 200 TwiML response
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      return res.end(buildTwiMLResponse(''))
    }

    const trimmedBody = Body.trim()
    const phoneVariants = normalizePhoneNumber(From)
    const lockKey = `whatsapp_${phoneVariants.clean}`

    await conversationMutex.run(lockKey, async () => {
      const isDbConnected = mongoose.connection.readyState === 1

      // 1. Check Opt-out Keywords (Compliance with WhatsApp / Telecom standards)
      const upperBody = trimmedBody.toUpperCase()
      const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'STOPALL']
      const optInKeywords = ['START', 'JOIN', 'OPTIN', 'SUBSCRIBE', 'YES']

      if (optOutKeywords.includes(upperBody)) {
        if (isDbConnected) {
          await Shopkeeper.updateMany(
            { phoneNumber: { $in: phoneVariants.searchQueries } },
            { $set: { whatsappOptIn: false, optOutAt: new Date() } }
          )
        }
        const optOutReply = 'Aapko Paytm WhatsApp updates se unsubscribe kar diya gaya hai. Dobara shuru karne ke liye kisi bhi samay "START" likhkar bhejein.'
        res.writeHead(200, { 'Content-Type': 'text/xml' })
        return res.end(buildTwiMLResponse(optOutReply))
      }

      if (optInKeywords.includes(upperBody)) {
        if (isDbConnected) {
          await Shopkeeper.updateMany(
            { phoneNumber: { $in: phoneVariants.searchQueries } },
            { $set: { whatsappOptIn: true, consentAt: new Date() } }
          )
        }
        const optInReply = 'Namaste! Paytm Business updates me aapka swagat hai. Paytm Soundbox ke baare me koi bhi sawaal poochhein, hum aapki madad ke liye taiyaar hain.'
        res.writeHead(200, { 'Content-Type': 'text/xml' })
        return res.end(buildTwiMLResponse(optInReply))
      }

      // 2. Find or Auto-Create Shopkeeper
      let shopkeeper = null
      if (isDbConnected) {
        shopkeeper = await Shopkeeper.findOne({
          phoneNumber: { $in: phoneVariants.searchQueries },
        })

        if (!shopkeeper) {
          // Auto-provision merchant from WhatsApp caller details
          const merchantName = ProfileName || `Merchant ${phoneVariants.last10}`
          shopkeeper = await Shopkeeper.create({
            name: merchantName,
            shopName: ProfileName ? `${ProfileName}'s Store` : `Retail Store (${phoneVariants.last10})`,
            phoneNumber: phoneVariants.clean,
            category: 'Kirana / Grocery',
            preferredLanguage: 'Hindi',
            whatsappOptIn: true,
            consentAt: new Date(),
            status: 'Interested',
            address: { city: 'Jaipur' },
          })

          // Also mirror to CrmLead so merchant appears in Enterprise CRM
          try {
            await CrmLead.create({
              business: shopkeeper.shopName,
              name: shopkeeper.name,
              phone: shopkeeper.phoneNumber,
              business_type: 'Retail Kirana',
              city: 'Jaipur, Rajasthan',
              status: 'contacted',
              qualification: 'warm',
              conversation_history: [],
            })
          } catch {
            // Non-critical CRM sync catch
          }
        }
      } else {
        // Fallback merchant representation when DB is not connected
        shopkeeper = {
          name: ProfileName || 'Retail Merchant',
          shopName: 'Merchant Store',
          phoneNumber: phoneVariants.clean,
          category: 'Kirana / Grocery',
          preferredLanguage: 'Hindi',
          address: { city: 'Jaipur' },
        }
      }

      // 3. Find or Create Active WhatsApp Conversation
      let conversation = null
      let historyMessages = []

      if (isDbConnected && shopkeeper._id) {
        conversation = await Conversation.findOne({
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

        historyMessages = conversation.messages || []
      }

      // 4. Generate AI Sales Response via Gemini Sales Agent
      let reply = ''
      let intent = 'General_Inquiry'
      let sentiment = 'Neutral'

      try {
        const aiResult = await generateSalesResponse({
          merchant: shopkeeper,
          history: historyMessages,
          message: trimmedBody,
        })
        reply = aiResult.reply
        intent = aiResult.intent
        sentiment = aiResult.sentiment
      } catch (aiError) {
        console.warn(`[AI Warning] Gemini unavailable (${aiError.message}). Using intelligent offline sales rebuttal.`)
        // Grounded fallback response adhering to official Paytm Soundbox policy
        if (/price|cost|kitna|rupee|daam|rate/i.test(trimmedBody)) {
          reply = `Namaste ${shopkeeper.name || ''} ji! Paytm Soundbox ke plans aur special discounts aapki daily transaction volume par depend karte hain. Hamare field executive aapse call par baat karke best offer batayenge. Kya hum aapko call arrange karein?`
          intent = 'Pricing_Inquiry'
          sentiment = 'Positive'
        } else if (/order|chahiye|lena|buy|install/i.test(trimmedBody)) {
          reply = `Dhanyawaad ${shopkeeper.name || ''} ji! Hum aapke store (${shopkeeper.shopName || 'Retail Store'}) ke liye Paytm Soundbox installation process start kar rahe hain. Hamara agent jald aapse sampark karega.`
          intent = 'Purchase_Intent'
          sentiment = 'Positive'
        } else {
          reply = `Namaste ${shopkeeper.name || ''} ji! Hum Paytm Business team se hain. Paytm Soundbox se aapke store par har payment ka instant loud voice alert milta hai 11 bhashaon me. Kya aap iska demonstration dekhna chahenge?`
          intent = 'General_Inquiry'
          sentiment = 'Positive'
        }
      }

      // 5. Update Conversation in Database
      if (isDbConnected && conversation) {
        const now = new Date()
        conversation.messages.push({
          sender: 'Shopkeeper',
          text: trimmedBody,
          timestamp: now,
          intentDetected: intent,
          sentiment,
        })

        conversation.messages.push({
          sender: 'AI',
          text: reply.trim(),
          timestamp: new Date(now.getTime() + 50),
          intentDetected: intent,
          sentiment: 'Positive',
        })

        if (intent === 'Purchase_Intent' || intent === 'Pricing_Inquiry') {
          conversation.detectedInterest = true
        }
        conversation.aiSummary = `WhatsApp: ${intent} (${sentiment})`
        await conversation.save()

        // Also sync to CrmLead conversation history
        try {
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          await CrmLead.findOneAndUpdate(
            { phone: { $in: phoneVariants.searchQueries } },
            {
              $push: {
                conversation_history: {
                  $each: [
                    { role: 'user', message: trimmedBody, timestamp: timeStr },
                    { role: 'agent', message: reply.trim(), timestamp: timeStr },
                  ],
                },
              },
              $set: {
                status: 'in_progress',
                ...(intent === 'Purchase_Intent' ? { qualification: 'hot' } : {}),
              },
            }
          )
        } catch {
          // Ignore secondary CRM sync issue
        }
      }

      // 6. Return TwiML XML Response to Twilio
      const twiML = buildTwiMLResponse(reply)
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twiML)
    })
  } catch (error) {
    console.error('[Twilio Webhook Error]:', error)
    // Always return valid TwiML so Twilio does not show an error state to the merchant
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    res.end(buildTwiMLResponse('Namaste. Hum Paytm Business team se hain. Humara system jald aapse judega.'))
  }
}

/**
 * Send Outbound WhatsApp Message via Twilio REST API
 * Route: POST /api/twilio/send
 */
export const sendOutboundWhatsApp = async (req, res, next) => {
  try {
    const { to, message, shopkeeperId } = req.body

    if (!to || !message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Recipient "to" phone number and non-empty "message" text are required.',
      })
    }

    const deliveryResult = await sendWhatsAppMessage({
      to,
      body: message.trim(),
    })

    // If shopkeeperId provided and DB connected, record message in Conversation history
    if (mongoose.connection.readyState === 1 && shopkeeperId && mongoose.Types.ObjectId.isValid(shopkeeperId)) {
      try {
        let conv = await Conversation.findOne({
          shopkeeperId,
          channel: 'WhatsApp',
          status: 'Active',
        })
        if (!conv) {
          conv = await Conversation.create({
            shopkeeperId,
            channel: 'WhatsApp',
            status: 'Active',
            messages: [],
          })
        }
        conv.messages.push({
          sender: 'Agent',
          text: message.trim(),
          timestamp: new Date(),
          sentiment: 'Positive',
        })
        await conv.save()
      } catch (err) {
        console.warn('Could not record outbound message in conversation:', err.message)
      }
    }

    res.status(200).json({
      status: 'success',
      data: deliveryResult,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Simulate an incoming WhatsApp message (for automated testing or local UI testing)
 * Route: POST /api/twilio/simulate-incoming
 */
export const simulateIncomingWhatsApp = async (req, res, next) => {
  try {
    const { from = '+919876543210', body = 'Namaste, Soundbox ka price kya hai?', profileName = 'Rajesh Kumar' } = req.body

    const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`
    const fakeReq = {
      body: {
        From: formattedFrom,
        To: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
        Body: body,
        ProfileName: profileName,
        MessageSid: `SM_TEST_${Date.now()}`,
      },
    }

    let xmlOutput = ''
    const fakeRes = {
      writeHead: (code, headers) => {},
      end: (content) => {
        xmlOutput = content
      },
    }

    await handleIncomingWhatsApp(fakeReq, fakeRes, next)

    // Extract message from TwiML XML
    const match = xmlOutput.match(/<Message>([\s\S]*?)<\/Message>/)
    const replyText = match ? match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''

    res.status(200).json({
      status: 'success',
      simulated: true,
      input: { from: formattedFrom, body, profileName },
      reply: replyText,
      twiML: xmlOutput,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get Twilio Configuration and Webhook Setup Status
 * Route: GET /api/twilio/status
 */
export const getTwilioConnectionStatus = (req, res) => {
  const status = getTwilioStatus()
  res.status(200).json({
    status: 'success',
    data: status,
  })
}

export default {
  handleIncomingWhatsApp,
  sendOutboundWhatsApp,
  simulateIncomingWhatsApp,
  getTwilioConnectionStatus,
}
