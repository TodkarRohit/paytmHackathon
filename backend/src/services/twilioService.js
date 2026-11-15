/**
 * Twilio WhatsApp Service — Twilio WhatsApp Sandbox (demo) / WhatsApp API
 *
 * Twilio is different from Meta Cloud API in two ways:
 *  1. Webhook payload is form-encoded, not JSON:
 *     From=whatsapp:+919999988888, To=whatsapp:+14155238886,
 *     Body=<text>, MessageSid=SM..., NumMedia=0
 *  2. Replies can be sent two ways:
 *     a) TwiML in the webhook response: <Response><Message>...</Message></Response>
 *        — no API credentials needed for the reply itself, Twilio delivers it.
 *     b) Twilio Messages API: POST /2010-04-01/Accounts/{SID}/Messages.json
 *        with Basic Auth (AccountSid:AuthToken). Used when credentials are set.
 *
 * Env vars (see backend/.env.example):
 *  TWILIO_ACCOUNT_SID
 *  TWILIO_AUTH_TOKEN
 *  TWILIO_WHATSAPP_FROM  — e.g. whatsapp:+14155238886 (Sandbox number)
 *
 * The Twilio controller uses (a) by default and (b) when configured,
 * so the demo works with just a webhook URL, and production can use the API.
 */

export function getTwilioConfig() {
  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886').trim(),
  }
}

export function isTwilioConfigured() {
  const { accountSid, authToken, from } = getTwilioConfig()
  return Boolean(accountSid && authToken && from)
}

/** Strip the "whatsapp:" prefix Twilio adds: "whatsapp:+919999988888" -> "+919999988888" */
export function stripWhatsAppPrefix(value = '') {
  return String(value || '').replace(/^whatsapp:/i, '').trim()
}

/**
 * Parse a Twilio WhatsApp webhook body (form-encoded, already parsed
 * by express.urlencoded into req.body).
 * Returns { from, text, messageId } or null when there is no text message.
 */
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

/** Escape text for safe inclusion in TwiML XML. */
export function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function twimlMessage(text) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`
}

export function twimlEmpty() {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
}

/**
 * Send a WhatsApp text via Twilio Messages API.
 * Returns { skipped: true } when not configured — the caller can
 * then fall back to TwiML in the webhook response instead.
 */
export async function sendTwilioWhatsAppText({ to, text }) {
  const cleanText = String(text || '').trim()
  if (!cleanText) throw new Error('Twilio WhatsApp text is required')

  const { accountSid, authToken, from } = getTwilioConfig()
  if (!accountSid || !authToken || !from) {
    console.warn('[twilio] Not configured — skipping API send. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, or rely on TwiML reply.')
    return { skipped: true, reason: 'not_configured' }
  }

  const toNumber = stripWhatsAppPrefix(to)
  const toWa = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber.startsWith('+') ? toNumber : `+${toNumber}`}`
  const fromWa = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams()
  params.append('From', fromWa)
  params.append('To', toWa)
  params.append('Body', cleanText.slice(0, 1600))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || `Twilio send failed with HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.code = data?.code
    throw err
  }
  return { skipped: false, messageSid: data?.sid || null, raw: data }
}

export default {
  getTwilioConfig,
  isTwilioConfigured,
  stripWhatsAppPrefix,
  parseTwilioMessage,
  escapeXml,
  twimlMessage,
  twimlEmpty,
  sendTwilioWhatsAppText,
}
