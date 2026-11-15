/**
 * WhatsApp Service — Meta WhatsApp Cloud API
 *
 * Sends and receives WhatsApp messages for the Paytm AI Sales bot.
 * No WhatsApp library is required: the Cloud API is plain HTTPS (Graph API).
 *
 * Env vars (see backend/.env.example):
 *  WHATSAPP_ACCESS_TOKEN       — permanent (or test) token from Meta Developer
 *  WHATSAPP_PHONE_NUMBER_ID    — Phone Number ID from Meta WhatsApp Manager
 *  WHATSAPP_VERIFY_TOKEN       — any secret string you choose; Meta sends it back on verify
 *  WHATSAPP_API_VERSION        — optional, defaults to v21.0
 *
 * Twilio note: Twilio's WhatsApp API uses a different webhook payload
 * (form-encoded) and send endpoint. This service is for Meta Cloud API.
 * If the team switches to Twilio Sandbox for a demo, add a second
 * parser/sender there — the AI + Conversation logic in the controller
 * is provider-agnostic and can be reused.
 */

import { Shopkeeper } from '../models/index.js'

export function getWhatsAppConfig() {
  return {
    accessToken: (process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    verifyToken: (process.env.WHATSAPP_VERIFY_TOKEN || '').trim(),
    apiVersion: (process.env.WHATSAPP_API_VERSION || 'v21.0').trim(),
  }
}

export function isWhatsAppConfigured() {
  const { accessToken, phoneNumberId } = getWhatsAppConfig()
  return Boolean(accessToken && phoneNumberId)
}

/**
 * Normalise a WhatsApp sender id to Indian E.164.
 * Meta sends `from` as digits, e.g. "919999988888".
 * Shopkeeper.phoneNumber in the DB is inconsistent: "+91 99999 88888",
 * "+919999988888", "9999988888" all occur in tests/seed data.
 * We normalise to the last 10 digits and rebuild E.164.
 */
export function normalizeIndianPhone(waId = '') {
  const digits = String(waId || '').replace(/\D/g, '')
  if (!digits) return { digits: '', last10: '', e164: '' }
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits
  return {
    digits: digits.length === 12 && digits.startsWith('91') ? digits : `91${last10}`,
    last10,
    e164: `+91${last10}`,
  }
}

/** Build a Mongo regex that matches a phone number ignoring spaces/dashes. */
export function buildPhoneRegex(last10) {
  // e.g. last10 "9999988888" -> /9[^0-9]*9[^0-9]*9[^0-9]*9[^0-9]*9[^0-9]*8[^0-9]*8[^0-9]*8[^0-9]*8[^0-9]*8$/  (with 91 prefix optional)
  const escaped = last10
    .split('')
    .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^0-9]*')
  return new RegExp(`(91[^0-9]*)?${escaped}$`)
}

export async function findShopkeeperByWhatsAppId(waId) {
  const { last10 } = normalizeIndianPhone(waId)
  if (!last10 || last10.length !== 10) return null
  return Shopkeeper.findOne({ phoneNumber: buildPhoneRegex(last10) }).exec()
}

/**
 * Parse a Meta Cloud API webhook body.
 * Returns [{ from, text, messageId, timestamp, type }] for text messages only.
 * Status updates, reactions, media, etc. are ignored by design for now.
 */
export function parseIncomingMessages(body = {}) {
  const out = []
  const entries = Array.isArray(body?.entry) ? body.entry : []
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change?.value || {}
      const messages = Array.isArray(value?.messages) ? value.messages : []
      for (const m of messages) {
        if (m?.type !== 'text') continue
        const text = m?.text?.body?.trim()
        if (!text) continue
        out.push({
          from: String(m.from || ''),
          text,
          messageId: String(m.id || ''),
          timestamp: m.timestamp ? Number(m.timestamp) : Date.now() / 1000,
          type: 'text',
        })
      }
    }
  }
  return out
}

/**
 * Send a WhatsApp text via Meta Cloud API.
 * `to` is a WhatsApp id / digits, e.g. "919999988888" (no "+").
 * Returns { skipped: true } when not configured, so local dev / tests
 * without Meta credentials don't crash — the message is logged instead.
 */
export async function sendWhatsAppText({ to, text }) {
  const cleanText = String(text || '').trim()
  if (!cleanText) throw new Error('WhatsApp text is required')

  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig()
  if (!accessToken || !phoneNumberId) {
    console.warn('[whatsapp] Not configured — skipping send. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.')
    console.warn(`[whatsapp] Would send to ${to}: ${cleanText.slice(0, 200)}`)
    return { skipped: true, reason: 'not_configured' }
  }

  const toDigits = String(to || '').replace(/\D/g, '')
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toDigits,
      type: 'text',
      text: { preview_url: false, body: cleanText.slice(0, 4000) },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `WhatsApp send failed with HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.code = data?.error?.code
    throw err
  }
  return { skipped: false, messageId: data?.messages?.[0]?.id || null, raw: data }
}

/** Best-effort blue-tick / read receipt. Never throws. */
export async function markWhatsAppRead(messageId) {
  try {
    const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig()
    if (!accessToken || !phoneNumberId || !messageId) return
    await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch {
    // Read receipts are best-effort only.
  }
}

export default {
  getWhatsAppConfig,
  isWhatsAppConfigured,
  normalizeIndianPhone,
  buildPhoneRegex,
  findShopkeeperByWhatsAppId,
  parseIncomingMessages,
  sendWhatsAppText,
  markWhatsAppRead,
}
