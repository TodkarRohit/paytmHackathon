/**
 * Twilio WhatsApp webhook smoke test — no DB, no Gemini, no Twilio needed.
 * Run:  cd backend && node src/scripts/test_twilio_webhook.js
 *
 * Tests:
 *  1. Twilio form-encoded payload parsing (From / Body / MessageSid)
 *  2. TwiML generation + XML escaping (no duplicate / injection)
 *  3. Send is safely skipped when Twilio is not configured
 *  4. Empty / non-text payloads return null (no crash)
 */
import assert from 'node:assert/strict'
import {
  parseTwilioMessage,
  stripWhatsAppPrefix,
  escapeXml,
  twimlMessage,
  twimlEmpty,
  sendTwilioWhatsAppText,
  isTwilioConfigured,
} from '../services/twilioService.js'

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`✅ ${name}`)
}

check('strip whatsapp: prefix', () => {
  assert.equal(stripWhatsAppPrefix('whatsapp:+919999988888'), '+919999988888')
  assert.equal(stripWhatsAppPrefix('+919999988888'), '+919999988888')
})

check('parse Twilio form payload', () => {
  const msg = parseTwilioMessage({
    From: 'whatsapp:+919999988888',
    To: 'whatsapp:+14155238886',
    Body: 'Namaste, Soundbox ka price?',
    MessageSid: 'SM123',
    NumMedia: '0',
  })
  assert.ok(msg)
  assert.equal(msg.from, '+919999988888')
  assert.equal(msg.text, 'Namaste, Soundbox ka price?')
  assert.equal(msg.messageId, 'SM123')
})

check('parse returns null for empty body', () => {
  assert.equal(parseTwilioMessage({}), null)
  assert.equal(parseTwilioMessage({ From: 'whatsapp:+919999988888', Body: '   ' }), null)
})

check('TwiML escapes XML in AI reply', () => {
  const xml = twimlMessage('Price < Rs 500 & "best"')
  assert.ok(xml.includes('&lt;'))
  assert.ok(xml.includes('&amp;'))
  assert.ok(!xml.includes('< Rs'))
  assert.ok(xml.startsWith('<?xml'))
  assert.ok(xml.includes('<Response><Message>'))
})

check('TwiML empty response is valid', () => {
  assert.equal(twimlEmpty(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
})

check('escapeXml handles quotes', () => {
  assert.equal(escapeXml(`a"b'c`), 'a&quot;b&apos;c')
})

console.log(`\n✅ Twilio webhook smoke test passed: ${passed} sync checks`)

// Async check (not counted in the sync counter above)
delete process.env.TWILIO_ACCOUNT_SID
delete process.env.TWILIO_AUTH_TOKEN
assert.equal(isTwilioConfigured(), false)
const r = await sendTwilioWhatsAppText({ to: '919999988888', text: 'hello' })
assert.equal(r.skipped, true)
console.log('✅ send skipped without Twilio credentials')
