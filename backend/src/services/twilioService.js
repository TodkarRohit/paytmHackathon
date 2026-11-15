/**
 * Twilio WhatsApp Integration Service
 * 
 * Manages Twilio client initialization, outbound WhatsApp message delivery,
 * phone number normalization, and TwiML response generation.
 */

import twilio from 'twilio'

let twilioClientInstance = null

/**
 * Check if real Twilio credentials are provided
 */
export function isTwilioConfigured() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  return Boolean(
    sid &&
    token &&
    sid.trim() !== '' &&
    token.trim() !== '' &&
    sid !== 'your_twilio_account_sid_here' &&
    token !== 'your_twilio_auth_token_here'
  )
}

/**
 * Get or initialize Twilio client instance
 */
export function getTwilioClient() {
  if (twilioClientInstance) {
    return twilioClientInstance
  }

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN

  if (isTwilioConfigured()) {
    twilioClientInstance = twilio(sid.trim(), token.trim())
    return twilioClientInstance
  }

  return null
}

/**
 * Allow injection of custom Twilio client (for testing/mocking)
 */
export function setTwilioClient(client) {
  twilioClientInstance = client
}

/**
 * Normalizes phone numbers to standard formats and WhatsApp address formats
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      raw: '',
      clean: '',
      whatsapp: '',
      last10: '',
      e164: '',
      searchQueries: [],
    }
  }

  const clean = rawPhone.replace(/^whatsapp:/i, '').trim()
  const digitsOnly = clean.replace(/\D/g, '')
  const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly

  let e164 = clean
  if (!clean.startsWith('+')) {
    e164 = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`
  }

  const whatsapp = `whatsapp:${e164}`

  const searchQueries = Array.from(
    new Set([clean, last10, `+91${last10}`, `91${last10}`, `0${last10}`].filter(Boolean))
  )

  return {
    raw: rawPhone,
    clean,
    whatsapp,
    last10,
    e164,
    searchQueries,
  }
}

/**
 * Send an outbound WhatsApp message via Twilio REST API
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient phone number (e.g. +919876543210 or whatsapp:+919876543210)
 * @param {string} options.body - Message text content
 * @param {string} [options.from] - Sender WhatsApp number (defaults to TWILIO_WHATSAPP_NUMBER or Twilio Sandbox)
 * @returns {Promise<Object>}
 */
export async function sendWhatsAppMessage({ to, body, from }) {
  if (!to || !body) {
    throw new Error('Both "to" and "body" parameters are required to send a WhatsApp message.')
  }

  const normalizedTo = normalizePhoneNumber(to)
  const defaultSender = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
  const sender = from
    ? (from.startsWith('whatsapp:') ? from : `whatsapp:${from}`)
    : (defaultSender.startsWith('whatsapp:') ? defaultSender : `whatsapp:${defaultSender}`)

  const client = getTwilioClient()

  if (!client) {
    console.warn(`[Twilio Warning] Twilio credentials not configured. Simulating outbound WhatsApp message to ${normalizedTo.whatsapp}`)
    return {
      success: true,
      simulated: true,
      messageSid: `SM_SIMULATED_${Date.now()}`,
      to: normalizedTo.whatsapp,
      from: sender,
      body,
      status: 'simulated',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    const response = await client.messages.create({
      from: sender,
      to: normalizedTo.whatsapp,
      body: body.trim(),
    })

    return {
      success: true,
      simulated: false,
      messageSid: response.sid,
      to: response.to,
      from: response.from,
      status: response.status,
      dateCreated: response.dateCreated,
    }
  } catch (error) {
    console.error(`[Twilio Error] Failed to send WhatsApp message to ${normalizedTo.whatsapp}:`, error.message)
    throw error
  }
}

/**
 * Generate standard TwiML XML to respond immediately to Twilio WhatsApp Webhooks
 * 
 * @param {string} replyText
 * @returns {string} XML string
 */
export function buildTwiMLResponse(replyText) {
  const escapedText = String(replyText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapedText}</Message>\n</Response>`
}

/**
 * Return current Twilio configuration status and details
 */
export function getTwilioStatus() {
  const sid = process.env.TWILIO_ACCOUNT_SID || ''
  const isConfigured = isTwilioConfigured()
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

  return {
    configured: isConfigured,
    accountSidMasked: sid.length > 8 ? `${sid.slice(0, 4)}...${sid.slice(-4)}` : (sid ? '***' : null),
    whatsappNumber,
    webhookPath: '/api/webhooks/twilio/whatsapp',
    sandboxJoinInstructions: 'To test via Twilio Sandbox, send "join <sandbox-code>" to +1 415 523 8886 on WhatsApp.',
  }
}

export default {
  isTwilioConfigured,
  getTwilioClient,
  setTwilioClient,
  normalizePhoneNumber,
  sendWhatsAppMessage,
  buildTwiMLResponse,
  getTwilioStatus,
}
