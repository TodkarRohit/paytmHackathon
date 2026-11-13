/**
 * Step 1 Consolidated Corrections Verification Suite
 * 
 * Verifies all 6 audit corrections using 100% isolated test database & ephemeral test server:
 * 1. Authentication & RBAC (JWT, ownership enforcement, cross-tenant 403 isolation)
 * 2. Message length validation (reject empty, reject >1,000 chars)
 * 3. Rate limiting (10 req/min per user, 429 + Retry-After)
 * 4. Soundbox pricing knowledge verification (official cautious wording)
 * 5. Concurrent conversation mutex (FIFO queue serialization)
 * 6. Test DB isolation & production DB safety guard
 */

import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { getDatabaseURI, connectDB } from '../config/db.js'
import { createApp } from '../app.js'
import { VERIFIED_SOUNDBOX_KNOWLEDGE } from '../config/soundboxKnowledge.js'
import { conversationMutex } from '../utils/conversationMutex.js'
import { signToken, verifyToken } from '../utils/jwt.js'
import { Shopkeeper, Agent, Lead, Assignment, Conversation } from '../models/index.js'

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Force isolated test environment
process.env.NODE_ENV = 'test'

const results = []

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`)
    results.push({ name: message, passed: false })
    throw new Error(message)
  } else {
    console.log(`  ✅ PASSED: ${message}`)
    results.push({ name: message, passed: true })
  }
}

async function runTests() {
  console.log('='.repeat(70))
  console.log('🧪 RUNNING STEP 1 AUDIT CORRECTIONS TEST SUITE (ISOLATED)')
  console.log('='.repeat(70))

  // -------------------------------------------------------------
  // TEST SUITE 1: Test Database Safety Guard (Correction 6)
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Database Isolation & Safety Guard ---')

  const originalTestUri = process.env.MONGODB_TEST_URI

  try {
    // 1.1 When NODE_ENV=test and MONGODB_TEST_URI is missing, must throw
    delete process.env.MONGODB_TEST_URI
    let threwOnMissing = false
    try {
      getDatabaseURI()
    } catch (err) {
      threwOnMissing = err.message.includes('MONGODB_TEST_URI is required')
    }
    assert(threwOnMissing, 'getDatabaseURI() aborts when NODE_ENV=test and MONGODB_TEST_URI is missing')

    // 1.2 When MONGODB_TEST_URI points to production 'paytm_sales', must throw
    process.env.MONGODB_TEST_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/paytm_sales?retryWrites=true'
    let threwOnProdMatch = false
    try {
      getDatabaseURI()
    } catch (err) {
      threwOnProdMatch = err.message.includes('must not point to production database')
    }
    assert(threwOnProdMatch, 'getDatabaseURI() strictly rejects test URI pointing to production "paytm_sales"')

    // 1.3 When MONGODB_TEST_URI points to 'paytm_sales_test', must succeed
    process.env.MONGODB_TEST_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/paytm_sales_test?retryWrites=true'
    const allowedUri = getDatabaseURI()
    assert(allowedUri.includes('paytm_sales_test'), 'getDatabaseURI() accepts isolated test database paytm_sales_test')
  } finally {
    process.env.MONGODB_TEST_URI = originalTestUri
  }

  // Connect to isolated test database
  await connectDB()
  assert(mongoose.connection.readyState === 1, 'Mongoose connected successfully')
  assert(
    mongoose.connection.name === 'paytm_sales_test',
    `Verified database is isolated test database "${mongoose.connection.name}"`
  )

  // Start in-process ephemeral test server
  const testApp = createApp()
  const testServer = await new Promise((resolve) => {
    const srv = testApp.listen(0, () => resolve(srv))
  })
  const testPort = testServer.address().port
  const BASE_URL = `http://localhost:${testPort}`
  console.log(`  ℹ️  Isolated test server listening on ephemeral port ${testPort}`)

  try {
    // -------------------------------------------------------------
    // TEST SUITE 2: Soundbox Pricing Knowledge (Correction 4)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Soundbox Pricing Knowledge ---')

    const pricingPolicy = VERIFIED_SOUNDBOX_KNOWLEDGE.unverifiedInformationPolicy?.pricing || ''
    const pricingObjection = VERIFIED_SOUNDBOX_KNOWLEDGE.objectionGuidelines?.find(
      (o) => o.objection === 'Pricing and cost inquiries'
    )

    const expectedExact =
      'Official pricing, rental plans, and promotional fee waivers should be confirmed through an authorized Paytm sales representative or the Paytm for Business app. I do not want to give you an incorrect price.'

    assert(
      pricingPolicy.includes(expectedExact),
      'unverifiedInformationPolicy.pricing contains approved cautious disclaimer'
    )

    assert(
      pricingObjection && pricingObjection.rebuttal === expectedExact,
      'objectionGuidelines "Pricing and cost inquiries" contains exact approved rebuttal'
    )

    const rawJson = JSON.stringify(VERIFIED_SOUNDBOX_KNOWLEDGE)
    assert(
      !rawJson.includes('flexible merchant plans based on your shop category'),
      'Unverified text "flexible merchant plans based on your shop category" is completely absent'
    )

    // -------------------------------------------------------------
    // TEST SUITE 3: Mutex Concurrency Safety (Correction 5)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Mutex FIFO Queue Serialization ---')

    const executionLog = []
    const task1 = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          executionLog.push('task1-finish')
          resolve('task1')
        }, 50)
      })

    const task2 = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          executionLog.push('task2-finish')
          resolve('task2')
        }, 10)
      })

    const lockKey = 'test_conversation_123'
    await Promise.all([
      conversationMutex.run(lockKey, task1),
      conversationMutex.run(lockKey, task2),
    ])

    assert(
      executionLog[0] === 'task1-finish' && executionLog[1] === 'task2-finish',
      'Mutex serializes concurrent tasks in strict FIFO order for the same conversation'
    )

    // -------------------------------------------------------------
    // TEST SUITE 4: Authentication & Authorization (Correction 1)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Authentication & RBAC Endpoints ---')

    // 4.1 Unauthenticated requests to /api/conversations must be rejected with 401
    const unauthGet = await fetch(`${BASE_URL}/api/conversations`)
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/conversations returns 401')

    const unauthChat = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    })
    assert(unauthChat.status === 401, 'Unauthenticated POST /api/conversations/chat returns 401')

    // 4.2 Demo login as Shopkeeper
    const demoShopkeeperRes = await fetch(`${BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Shopkeeper' }),
    })
    assert(demoShopkeeperRes.status === 200, 'POST /api/auth/demo-login (Shopkeeper) returns 200')
    const demoShopkeeperJson = await demoShopkeeperRes.json()
    const shopkeeperToken = demoShopkeeperJson.data.token
    const shopkeeperUser = demoShopkeeperJson.data.user
    assert(!!shopkeeperToken, 'Shopkeeper demo login returned JWT token')
    assert(shopkeeperUser.role === 'Shopkeeper', 'Shopkeeper demo user has role Shopkeeper')
    assert(!!shopkeeperUser.shopkeeperId, 'Shopkeeper demo user has shopkeeperId')

    // 4.3 Demo login as Agent
    const demoAgentRes = await fetch(`${BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Agent' }),
    })
    assert(demoAgentRes.status === 200, 'POST /api/auth/demo-login (Agent) returns 200')
    const demoAgentJson = await demoAgentRes.json()
    const agentToken = demoAgentJson.data.token
    assert(!!agentToken, 'Agent demo login returned JWT token')

    // 4.4 GET /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${shopkeeperToken}` },
    })
    assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returns 200')
    const meJson = await meRes.json()
    assert(meJson.data.role === 'Shopkeeper', 'GET /api/auth/me returns valid authenticated profile')

    // 4.5 Cross-tenant authorization check:
    const fakeShopkeeperBId = new mongoose.Types.ObjectId().toString()
    const tokenShopkeeperB = signToken({
      userId: fakeShopkeeperBId,
      shopkeeperId: fakeShopkeeperBId,
      role: 'Shopkeeper',
      name: 'Merchant B',
    })

    const spoofChatRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenShopkeeperB}`,
      },
      body: JSON.stringify({
        shopkeeperId: shopkeeperUser.shopkeeperId,
        message: 'Trying to impersonate Merchant A',
      }),
    })
    assert(
      spoofChatRes.status === 403,
      'Shopkeeper B attempting to chat as Shopkeeper A is rejected with 403 Forbidden'
    )

    // -------------------------------------------------------------
    // TEST SUITE 5: Message Length Validation (Correction 2)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Message Length Validation ---')

    // 5.1 Empty / whitespace message
    const emptyRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopkeeperToken}`,
      },
      body: JSON.stringify({ message: '   ' }),
    })
    assert(emptyRes.status === 400, 'Empty or whitespace message returns 400')

    // 5.2 Message exceeding 1,000 characters
    const longMsg = 'P'.repeat(1001)
    const longRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopkeeperToken}`,
      },
      body: JSON.stringify({ message: longMsg }),
    })
    assert(longRes.status === 400, 'Message with 1,001 characters returns 400')
    const longJson = await longRes.json()
    assert(
      longJson.message.includes('1,000 characters'),
      'Error message explicitly specifies maximum permitted length of 1,000 characters'
    )

    // -------------------------------------------------------------
    // TEST SUITE 6: Rate Limiter (Correction 3)
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Rate Limiting (10 req/min per user) ---')

    const rateLimitUserToken = signToken({
      userId: new mongoose.Types.ObjectId().toString(),
      shopkeeperId: shopkeeperUser.shopkeeperId,
      role: 'Shopkeeper',
      name: 'Rate Limit Test User',
    })

    let rateLimitHit = false
    let retryAfterHeader = null

    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${BASE_URL}/api/conversations/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rateLimitUserToken}`,
        },
        body: JSON.stringify({ message: 'P'.repeat(1001) }),
      })

      if (res.status === 429) {
        rateLimitHit = true
        retryAfterHeader = res.headers.get('Retry-After')
        break
      }
    }

    assert(rateLimitHit, 'Requests exceeding 10 per minute trigger HTTP 429 Too Many Requests')
    assert(!!retryAfterHeader, '429 response includes Retry-After header')

    // Clean test records in paytm_sales_test only
    await Shopkeeper.deleteMany({ phoneNumber: '+919999900000' })
    await Agent.deleteMany({ email: 'demo.agent@paytm-demo.local' })
  } finally {
    testServer.close()
    await mongoose.disconnect()
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(70))
  console.log(`🎉 TEST SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} TESTS PASSED`)
  console.log('='.repeat(70))
}

runTests()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Aborted with Error:', err.message)
    process.exit(1)
  })
