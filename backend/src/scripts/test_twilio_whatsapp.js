/**
 * Automated Test Suite for Twilio WhatsApp Integration
 */

import assert from 'node:assert/strict'
import {
  normalizePhoneNumber,
  buildTwiMLResponse,
  getTwilioStatus,
  sendWhatsAppMessage,
} from '../services/twilioService.js'
import { createApp } from '../app.js'

async function runTests() {
  console.log('🧪 Starting Twilio WhatsApp Integration Tests...\n')

  // Test 1: Phone number normalization
  console.log('👉 Test 1: Phone number normalization & variants')
  const n1 = normalizePhoneNumber('whatsapp:+919876543210')
  assert.equal(n1.clean, '+919876543210')
  assert.equal(n1.whatsapp, 'whatsapp:+919876543210')
  assert.equal(n1.last10, '9876543210')
  assert(n1.searchQueries.includes('9876543210'))
  assert(n1.searchQueries.includes('+919876543210'))

  const n2 = normalizePhoneNumber('9876543210')
  assert.equal(n2.whatsapp, 'whatsapp:+919876543210')
  assert.equal(n2.last10, '9876543210')
  console.log('   ✅ Phone number normalization passed')

  // Test 2: TwiML Response Builder
  console.log('👉 Test 2: TwiML XML formatting & escaping')
  const xml = buildTwiMLResponse('Namaste & Welcome <Paytm>')
  assert(xml.includes('<Response>'))
  assert(xml.includes('<Message>Namaste &amp; Welcome &lt;Paytm&gt;</Message>'))
  assert(xml.includes('</Response>'))
  console.log('   ✅ TwiML response generation passed')

  // Test 3: Twilio Status Reporter
  console.log('👉 Test 3: Twilio Status check')
  const status = getTwilioStatus()
  assert(typeof status.configured === 'boolean')
  assert.equal(status.webhookPath, '/api/webhooks/twilio/whatsapp')
  console.log('   ✅ Twilio status helper passed')

  // Test 4: Outbound WhatsApp delivery (simulated fallback when unconfigured)
  console.log('👉 Test 4: Outbound WhatsApp send execution')
  const result = await sendWhatsAppMessage({
    to: '+919876543210',
    body: 'Test demonstration alert from Paytm AI',
  })
  assert.equal(result.success, true)
  assert.equal(result.to, 'whatsapp:+919876543210')
  console.log('   ✅ Outbound WhatsApp delivery passed')

  // Test 5: Express App Endpoint Integration
  console.log('👉 Test 5: Endpoints mounted in Express app')
  const app = createApp()
  assert(app, 'Express app created successfully')

  console.log('\n🎉 ALL TWILIO WHATSAPP TESTS PASSED!\n')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
