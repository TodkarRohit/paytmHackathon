/**
 * End-to-end HTTP integration test for Twilio WhatsApp Webhooks
 */

import http from 'node:http'
import assert from 'node:assert/strict'
import { createApp } from '../app.js'

async function runServerTest() {
  console.log('🚀 Running Twilio WhatsApp HTTP Integration Tests...')

  const app = createApp()
  const server = http.createServer(app)

  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // 1. Test GET /api/webhooks/twilio/whatsapp (Documentation & ping)
    console.log('👉 Test 1: GET /api/webhooks/twilio/whatsapp')
    const getRes = await fetch(`${baseUrl}/api/webhooks/twilio/whatsapp`)
    const getData = await getRes.json()
    assert.equal(getRes.status, 200)
    assert.equal(getData.status, 'ok')
    assert(getData.instructions)
    console.log('   ✅ Webhook info endpoint returned 200 OK')

    // 2. Test GET /api/twilio/status
    console.log('👉 Test 2: GET /api/twilio/status')
    const statusRes = await fetch(`${baseUrl}/api/twilio/status`)
    const statusData = await statusRes.json()
    assert.equal(statusRes.status, 200)
    assert.equal(statusData.status, 'success')
    assert(statusData.data.whatsappNumber)
    console.log('   ✅ Twilio status endpoint returned 200 OK')

    // 3. Test POST /api/webhooks/twilio/whatsapp with urlencoded payload
    console.log('👉 Test 3: POST /api/webhooks/twilio/whatsapp (Incoming WhatsApp message)')
    const urlParams = new URLSearchParams()
    urlParams.append('From', 'whatsapp:+919876543210')
    urlParams.append('To', 'whatsapp:+14155238886')
    urlParams.append('Body', 'Namaste, Soundbox ka price kitna hai?')
    urlParams.append('ProfileName', 'Ramesh Kirana Store')
    urlParams.append('MessageSid', 'SM_TEST_12345')

    const postRes = await fetch(`${baseUrl}/api/webhooks/twilio/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: urlParams.toString(),
    })

    assert.equal(postRes.status, 200)
    const xml = await postRes.text()
    assert(xml.includes('<Response>'), 'Response contains <Response>')
    assert(xml.includes('<Message>'), 'Response contains <Message>')
    assert(xml.includes('</Message>'), 'Response contains </Message>')
    console.log('   ✅ Inbound WhatsApp webhook handled and returned valid TwiML!')

    // 4. Test Opt-Out command (STOP)
    console.log('👉 Test 4: Incoming STOP (WhatsApp Opt-Out compliance)')
    const stopParams = new URLSearchParams()
    stopParams.append('From', 'whatsapp:+919876543210')
    stopParams.append('Body', 'STOP')
    const stopRes = await fetch(`${baseUrl}/api/webhooks/twilio/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: stopParams.toString(),
    })
    const stopXml = await stopRes.text()
    assert(stopXml.includes('unsubscribe') || stopXml.includes('START'))
    console.log('   ✅ Opt-out STOP command correctly handled!')

    // 5. Test POST /api/twilio/send (Outbound message dispatch)
    console.log('👉 Test 5: Outbound dispatch via POST /api/twilio/send')
    const sendRes = await fetch(`${baseUrl}/api/twilio/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+919876543210',
        message: 'Namaste Ramesh ji! Paytm Soundbox demonstration ready.',
      }),
    })
    assert.equal(sendRes.status, 200)
    const sendData = await sendRes.json()
    assert.equal(sendData.status, 'success')
    assert(sendData.data.to.includes('whatsapp:'))
    console.log('   ✅ Outbound dispatch endpoint responded 200 OK')

    console.log('\n🎉 ALL HTTP TWILIO ENDPOINT TESTS PASSED!')
  } finally {
    server.close()
  }
}

runServerTest().catch((err) => {
  console.error('❌ Server test failed:', err)
  process.exit(1)
})
