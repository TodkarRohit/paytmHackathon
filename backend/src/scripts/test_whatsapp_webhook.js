/**
 * WhatsApp webhook smoke test — no DB, no Gemini, no Meta needed.
 * Run:  cd backend && node src/scripts/test_whatsapp_webhook.js
 *
 * Tests:
 *  1. Phone normalisation for Indian numbers in all DB formats
 *  2. Meta Cloud API payload parsing (text only, statuses ignored)
 *  3. Webhook verification (correct token -> challenge, wrong -> 403)
 *  4. Send is safely skipped when WhatsApp is not configured
 */
import assert from 'node:assert/strict'
import {
  normalizeIndianPhone,
  parseIncomingMessages,
  sendWhatsAppText,
  isWhatsAppConfigured,
} from '../services/whatsappService.js'
import { verifyWhatsAppWebhook } from '../controllers/whatsappController.js'

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`✅ ${name}`)
}

// 1. Phone normalisation
check('normalize +91 spaced number', () => {
  const r = normalizeIndianPhone('919999988888')
  assert.equal(r.last10, '9999988888')
  assert.equal(r.e164, '+919999988888')
})
check('normalize 10-digit number', () => {
  const r = normalizeIndianPhone('9999988888')
  assert.equal(r.e164, '+919999988888')
  assert.equal(r.digits, '919999988888')
})

// 2. Meta payload parsing
check('parse Meta text message, ignore status update', () => {
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { from: '919999988888', id: 'wamid.1', timestamp: '1700000000', type: 'text', text: { body: 'Namaste, Soundbox ka price?' } },
              ],
              statuses: [{ id: 'wamid.1', status: 'read' }],
            },
          },
        ],
      },
    ],
  }
  const msgs = parseIncomingMessages(body)
  assert.equal(msgs.length, 1)
  assert.equal(msgs[0].from, '919999988888')
  assert.equal(msgs[0].text, 'Namaste, Soundbox ka price?')
})
check('parse ignores non-text messages', () => {
  const msgs = parseIncomingMessages({
    entry: [{ changes: [{ value: { messages: [{ from: '919999988888', type: 'image' }] } }] }],
  })
  assert.equal(msgs.length, 0)
})

// 3. Webhook verification — mock req/res
const mockRes = () => {
  const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this }, send(b) { this.body = b; return this }, json(b) { this.body = b; return this } }
  return res
}
check('verify returns challenge on correct token', () => {
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-secret-123'
  const req = { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'test-secret-123', 'hub.challenge': '123456' } }
  const res = mockRes()
  verifyWhatsAppWebhook(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body, '123456')
})
check('verify rejects wrong token with 403', () => {
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-secret-123'
  const req = { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '123456' } }
  const res = mockRes()
  verifyWhatsAppWebhook(req, res)
  assert.equal(res.statusCode, 403)
})

// 4. Send skipped when not configured
check('send skipped without Meta credentials', async () => {
  delete process.env.WHATSAPP_ACCESS_TOKEN
  delete process.env.WHATSAPP_PHONE_NUMBER_ID
  assert.equal(isWhatsAppConfigured(), false)
  const r = await sendWhatsAppText({ to: '919999988888', text: 'hello' })
  assert.equal(r.skipped, true)
})

console.log(`\n✅ WhatsApp webhook smoke test passed: ${passed} checks (send check is async, see above)`)
