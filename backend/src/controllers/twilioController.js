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
  twimlEmpty,
  twimlMessage,
} from '../services/twilioService.js'
import { conversationMutex } from '../utils/conversationMutex.js'

/**
 * Handle incoming WhatsApp message webhook from Twilio
 * Route: POST /api/webhooks/twilio/whatsapp or POST /api/twilio/whatsapp or /webhooks/whatsapp/twilio
 */
export const handleIncomingWhatsApp = async (req, res, next) => {
  try {
    const {
      From,
      To,
      Body,
      ProfileName,
      MessageSid,
    } = req.body || {}

    if (!From || !Body) {
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      return res.end(buildTwiMLResponse(''))
    }

    const trimmedBody = Body.trim()
    const phoneVariants = normalizePhoneNumber(From)
    const lockKey = `whatsapp_${phoneVariants.clean}`

    await conversationMutex.run(lockKey, async () => {
      const isDbConnected = mongoose.connection.readyState === 1

      // 1. Check Opt-out Keywords
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
        const optOutReply = 'Aapko MerchantConnect WhatsApp updates se unsubscribe kar diya gaya hai. Dobara shuru karne ke liye "START" likhein.'
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
        const optInReply = 'Namaste! MerchantConnect AI updates me aapka swagat hai. Smart payment solutions ke baare me koi bhi sawaal poochhein.'
        res.writeHead(200, { 'Content-Type': 'text/xml' })
        return res.end(buildTwiMLResponse(optInReply))
      }

      // 2. Identify or Auto-provision Shopkeeper
      let shopkeeper = null
      if (isDbConnected) {
        shopkeeper = await Shopkeeper.findOne({
          phoneNumber: { $in: phoneVariants.searchQueries },
        })

        if (!shopkeeper) {
          const autoName = ProfileName ? ProfileName.trim() : 'Retail Merchant'
          shopkeeper = await Shopkeeper.create({
            name: autoName,
            shopName: `${autoName}'s Store`,
            phoneNumber: phoneVariants.clean,
            category: 'Kirana / Grocery',
            address: {
              city: 'Jaipur',
              state: 'Rajasthan',
            },
            preferredLanguage: 'Hindi',
            whatsappOptIn: true,
            status: 'New',
          })
        }
      }

      // 3. Load past message history for context
      let history = []
      let conversationDoc = null

      if (isDbConnected && shopkeeper) {
        conversationDoc = await Conversation.findOne({ shopkeeperId: shopkeeper._id })
        if (conversationDoc && Array.isArray(conversationDoc.messages)) {
          history = conversationDoc.messages.slice(-8).map((m) => ({
            sender: m.sender === 'Shopkeeper' ? 'Shopkeeper' : 'AI',
            text: m.text,
          }))
        }
      }

      // 4. Generate AI Sales Response
      let aiResponseText = ''
      try {
        const aiResult = await generateSalesResponse({
          merchant: shopkeeper,
          history,
          message: trimmedBody,
          modelName: 'gemini-2.5-flash',
        })
        aiResponseText = aiResult.reply || 'Namaste ji! Main MerchantConnect AI se bol raha hoon. Kya aapke store ke liye Soundbox demo arrange karein?'
      } catch (aiErr) {
        aiResponseText = 'Namaste ji! MerchantConnect AI me aapka swagat hai. Soundbox se aapko instant audio alert milta hai. Kya aapki shop par counter demonstration arrange karein?'
      }

      // 5. Persist messages in database
      if (isDbConnected && shopkeeper) {
        if (!conversationDoc) {
          conversationDoc = new Conversation({
            shopkeeperId: shopkeeper._id,
            channel: 'WhatsApp',
            messages: [],
            extractedIntent: 'Information_Request',
            sentimentScore: 0.8,
          })
        }

        conversationDoc.messages.push({
          sender: 'Shopkeeper',
          text: trimmedBody,
          timestamp: new Date(),
          sentiment: 'Neutral',
        })

        conversationDoc.messages.push({
          sender: 'AI',
          text: aiResponseText,
          timestamp: new Date(),
          sentiment: 'Positive',
        })

        await conversationDoc.save()

        // Sync with CRM Lead
        try {
          let crmLead = await CrmLead.findOne({ phone: { $in: phoneVariants.searchQueries } })
          if (crmLead) {
            crmLead.conversation_history.push({
              role: 'user',
              message: trimmedBody,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            crmLead.conversation_history.push({
              role: 'agent',
              message: aiResponseText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            if (crmLead.status === 'new') crmLead.status = 'in_progress'
            await crmLead.save()
          }
        } catch {}
      }

      // 6. Return TwiML XML
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      return res.end(buildTwiMLResponse(aiResponseText))
    })
  } catch (error) {
    console.error('Twilio incoming webhook error:', error)
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    return res.end(buildTwiMLResponse(''))
  }
}

export const receiveTwilioWebhook = handleIncomingWhatsApp

export const sendOutboundWhatsApp = async (req, res, next) => {
  try {
    const { to, message, shopkeeperId } = req.body
    if (!to || !message) {
      return res.status(400).json({ status: 'fail', message: 'Parameters "to" and "message" are required.' })
    }

    const deliveryResult = await sendWhatsAppMessage({ to, body: message })

    res.status(200).json({
      status: 'success',
      data: deliveryResult,
    })
  } catch (error) {
    next(error)
  }
}

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

export const getTwilioConnectionStatus = (req, res) => {
  const status = getTwilioStatus()
  res.status(200).json({
    status: 'success',
    data: status,
  })
}

export default {
  handleIncomingWhatsApp,
  receiveTwilioWebhook,
  sendOutboundWhatsApp,
  simulateIncomingWhatsApp,
  getTwilioConnectionStatus,
}
