/**
 * Twilio WhatsApp Integration Service
 * 
 * Manages Twilio client initialization, outbound WhatsApp message delivery,
 * phone number normalization, and TwiML response generation.
 */

import twilio from 'twilio'

let twilioClientInstance = null

export function getTwilioConfig() {
  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886').trim(),
  }
}

export function isTwilioConfigured() {
  const { accountSid, authToken, from } = getTwilioConfig()
  return Boolean(
    accountSid &&
    authToken &&
    from &&
    accountSid !== 'your_twilio_account_sid_here' &&
    authToken !== 'your_twilio_auth_token_here'
  )
}

export function getTwilioClient() {
  if (twilioClientInstance) {
    return twilioClientInstance
  }

  const { accountSid, authToken } = getTwilioConfig()
  if (isTwilioConfigured()) {
    twilioClientInstance = twilio(accountSid, authToken)
    return twilioClientInstance
  }

  return null
}

export function setTwilioClient(client) {
  twilioClientInstance = client
}

export function stripWhatsAppPrefix(value = '') {
  return String(value || '').replace(/^whatsapp:/i, '').trim()
}

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

export function parseTwilioMessage(body = {}) {
  const fromRaw = stripWhatsAppPrefix(body.From || body.from || '')
  const text = String(body.Body || body.body || '').trim()
  if (!fromRaw || !text) return null
  return {
    from: fromRaw,
    text,
    messageId: String(body.MessageSid || body.SmsSid || body.messageSid || ''),
  }
}

export function escapeXml(s = '') {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function twimlMessage(text = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapeXml(text)}</Message>\n</Response>`
}

export function twimlEmpty() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response/>'
}

export const buildTwiMLResponse = twimlMessage

export async function sendWhatsAppMessage({ to, body, from }) {
  if (!to || !body) {
    throw new Error('Both "to" and "body" parameters are required to send a WhatsApp message.')
  }

  const normalizedTo = normalizePhoneNumber(to)
  const defaultSender = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
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

export async function sendTwilioWhatsAppText({ to, text }) {
  return sendWhatsAppMessage({ to, body: text })
}

export function getTwilioStatus() {
  const sid = process.env.TWILIO_ACCOUNT_SID || ''
  const isConfigured = isTwilioConfigured()
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  return {
    configured: isConfigured,
    accountSidMasked: sid.length > 8 ? `${sid.slice(0, 4)}...${sid.slice(-4)}` : (sid ? '***' : null),
    whatsappNumber,
    webhookPath: '/api/webhooks/twilio/whatsapp',
    sandboxJoinInstructions: 'To test via Twilio Sandbox, send "join <sandbox-code>" to +1 415 523 8886 on WhatsApp.',
  }
}

export default {
  getTwilioConfig,
  isTwilioConfigured,
  getTwilioClient,
  setTwilioClient,
  stripWhatsAppPrefix,
  normalizePhoneNumber,
  parseTwilioMessage,
  escapeXml,
  twimlMessage,
  twimlEmpty,
  buildTwiMLResponse,
  sendWhatsAppMessage,
  sendTwilioWhatsAppText,
  getTwilioStatus,
}
