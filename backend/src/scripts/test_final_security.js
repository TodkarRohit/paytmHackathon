/**
 * Step 1 Final Targeted Security & Regression Verification Suite
 * 
 * 100% ISOLATED TEST HARNESS:
 * - Executes in NODE_ENV='test'.
 * - Connects strictly to MONGODB_TEST_URI ('paytm_sales_test').
 * - Starts an in-process ephemeral test server on a free port (listen(0)).
 * - Positively verifies database isolation before running tests.
 * - ZERO network calls to the external port 5000 development server.
 * - ZERO modifications or cleanups against production 'paytm_sales'.
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
import {
  signToken,
  verifyToken,
  getSecretKey,
  hashPassword,
  verifyPassword,
  generateSalt,
} from '../utils/jwt.js'
import { seedAdminUserIfMissing } from '../controllers/authController.js'
import { Shopkeeper, Agent, Lead, Assignment, Conversation } from '../models/index.js'

// Configure DNS for Atlas resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Force test environment
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

async function runTestSuite() {
  console.log('='.repeat(75))
  console.log('🛡️  RUNNING STEP 1 TARGETED SECURITY VERIFICATION SUITE')
  console.log('='.repeat(75))

  // -------------------------------------------------------------
  // SUITE 1: TEST DATABASE & SERVER ISOLATION VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Database & Server Isolation ---')

  // 1.1 Verify connectDB rejects production paytm_sales in test mode
  let rejectedProd = false
  try {
    await connectDB('mongodb+srv://user:pass@cluster.mongodb.net/paytm_sales?retryWrites=true')
  } catch (err) {
    rejectedProd = err.message.includes('Integration tests cannot connect to production database')
  }
  assert(rejectedProd, 'connectDB() strictly rejects connection targeting production "paytm_sales"')

  // 1.2 Connect strictly to test database paytm_sales_test
  await connectDB()
  assert(mongoose.connection.readyState === 1, 'Mongoose connected successfully')

  const activeDbName = mongoose.connection.name
  assert(
    activeDbName === 'paytm_sales_test',
    `Connected database is confirmed to be isolated "${activeDbName}" (not paytm_sales)`
  )

  // 1.3 Start isolated in-process ephemeral test server
  const testApp = createApp()
  const testServer = await new Promise((resolve) => {
    const srv = testApp.listen(0, () => resolve(srv))
  })
  const testPort = testServer.address().port
  const BASE_URL = `http://localhost:${testPort}`
  console.log(`  ℹ️  Isolated test server listening on ephemeral port ${testPort}`)

  try {
    // -------------------------------------------------------------
    // SUITE 2: ADMIN PROVISIONING & CREDENTIAL HARDENING
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Admin Provisioning & Credential Safety ---')

    // Clean test database agents collection before provisioning tests
    await Agent.deleteMany({ email: /@test-admin\.local$/ })

    // 2.1 Missing ADMIN_INITIAL_PASSWORD must throw configuration error
    const origAdminPass = process.env.ADMIN_INITIAL_PASSWORD
    const origAdminEmail = process.env.ADMIN_EMAIL

    try {
      process.env.ADMIN_EMAIL = 'prov-test@test-admin.local'
      delete process.env.ADMIN_INITIAL_PASSWORD
      let threwOnMissingPass = false
      try {
        await seedAdminUserIfMissing()
      } catch (err) {
        threwOnMissingPass = err.message.includes('ADMIN_INITIAL_PASSWORD environment variable is missing')
      }
      assert(threwOnMissingPass, 'seedAdminUserIfMissing() fails safely when ADMIN_INITIAL_PASSWORD is missing')

      // 2.2 Weak password (<10 chars or all letters) must be rejected
      process.env.ADMIN_INITIAL_PASSWORD = 'short'
      let threwOnWeakPass = false
      try {
        await seedAdminUserIfMissing()
      } catch (err) {
        threwOnWeakPass = err.message.includes('does not meet strength requirements')
      }
      assert(threwOnWeakPass, 'seedAdminUserIfMissing() strictly rejects weak/short passwords')

      // 2.3 Valid password successfully provisions admin without any hardcoded fallback
      process.env.ADMIN_INITIAL_PASSWORD = 'ValidSecurePassword@2026'
      await seedAdminUserIfMissing()
      const createdAdmin = await Agent.findOne({ email: 'prov-test@test-admin.local' }).select('+passwordHash +passwordSalt')
      assert(!!createdAdmin, 'Admin successfully provisioned with environment password')
      assert(createdAdmin.role === 'Admin', 'Provisioned user has verified Admin role')

      const verifyHash = await verifyPassword('ValidSecurePassword@2026', createdAdmin.passwordSalt, createdAdmin.passwordHash)
      assert(verifyHash === true, 'Admin password hash verified using timing-safe asynchronous scrypt')

      // 2.4 Existing Admin is NOT overwritten
      process.env.ADMIN_INITIAL_PASSWORD = 'NewAttemptedPassword@2026'
      await seedAdminUserIfMissing()
      const afterAdmin = await Agent.findOne({ email: 'prov-test@test-admin.local' }).select('+passwordHash +passwordSalt')
      assert(afterAdmin.passwordHash === createdAdmin.passwordHash, 'Existing Admin account is preserved untouched (never overwritten)')
    } finally {
      process.env.ADMIN_INITIAL_PASSWORD = origAdminPass
      process.env.ADMIN_EMAIL = origAdminEmail
      await Agent.deleteMany({ email: 'prov-test@test-admin.local' })
    }

    // 2.5 Verify no hardcoded default password in source
    assert(
      !seedAdminUserIfMissing.toString().includes('PaytmAdmin@2026'),
      'seedAdminUserIfMissing() contains zero hardcoded fallback credentials'
    )

    // -------------------------------------------------------------
    // SUITE 3: SHOPKEEPER DIRECTORY ASSIGNMENT-BASED AUTHORIZATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Shopkeeper Directory Assignment-Based Authorization ---')

    // Clean test records in paytm_sales_test
    await Assignment.deleteMany({})
    await Lead.deleteMany({})
    await Shopkeeper.deleteMany({})
    await Agent.deleteMany({})

    // Provision Test Data in paytm_sales_test:
    // Admin user
    const adminSalt = generateSalt()
    const adminHash = await hashPassword('AdminPass@2026', adminSalt)
    const testAdmin = await Agent.create({
      name: 'Test Administrator',
      email: 'admin@paytm-test.local',
      phone: '+919111111111',
      role: 'Admin',
      status: 'Available',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    })

    // Agent 1 (Assigned to Merchant 1)
    const testAgent1 = await Agent.create({
      name: 'Agent One',
      email: 'agent1@paytm-test.local',
      phone: '+919222222222',
      role: 'Agent',
      status: 'Available',
    })

    // Agent 2 (No assignments)
    const testAgent2 = await Agent.create({
      name: 'Agent Two',
      email: 'agent2@paytm-test.local',
      phone: '+919333333333',
      role: 'Agent',
      status: 'Available',
    })

    // Merchant 1 (Assigned to Agent 1)
    const merchant1 = await Shopkeeper.create({
      name: 'Assigned Merchant One',
      shopName: 'One Store',
      phoneNumber: '+919444444441',
      category: 'Kirana / Grocery',
    })

    // Merchant 2 (Unassigned / Not assigned to Agent 1 or Agent 2)
    const merchant2 = await Shopkeeper.create({
      name: 'Unassigned Merchant Two',
      shopName: 'Two Store',
      phoneNumber: '+919444444442',
      category: 'Electronics',
    })

    // Lead for Merchant 1
    const lead1 = await Lead.create({
      shopkeeperId: merchant1._id,
      leadStatus: 'Hot',
      stage: 'Agent Assigned',
    })

    // Active assignment linking Agent 1 to Lead 1 (Merchant 1)
    await Assignment.create({
      leadId: lead1._id,
      agentId: testAgent1._id,
      isActive: true,
      status: 'Accepted',
    })

    // Generate Tokens
    const adminToken = signToken({ userId: testAdmin._id.toString(), role: 'Admin', name: testAdmin.name })
    const agent1Token = signToken({ userId: testAgent1._id.toString(), agentId: testAgent1._id.toString(), role: 'Agent', name: testAgent1.name })
    const agent2Token = signToken({ userId: testAgent2._id.toString(), agentId: testAgent2._id.toString(), role: 'Agent', name: testAgent2.name })

    // 3.1 Admin can list all Shopkeepers
    const adminListRes = await fetch(`${BASE_URL}/api/shopkeepers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(adminListRes.status === 200, 'Admin can query GET /api/shopkeepers')
    const adminListJson = await adminListRes.json()
    assert(adminListJson.data.length === 2, 'Admin can view all shopkeepers across directory (both merchants returned)')

    // 3.2 Agent with active assignment sees ONLY assigned Shopkeepers
    const agent1ListRes = await fetch(`${BASE_URL}/api/shopkeepers`, {
      headers: { Authorization: `Bearer ${agent1Token}` },
    })
    assert(agent1ListRes.status === 200, 'Agent 1 can query GET /api/shopkeepers')
    const agent1ListJson = await agent1ListRes.json()
    assert(agent1ListJson.data.length === 1, 'Agent 1 directory view is scoped strictly to 1 assigned merchant')
    assert(
      agent1ListJson.data[0]._id === merchant1._id.toString(),
      'Agent 1 sees only Merchant 1 (Assigned) and cannot see Merchant 2'
    )

    // 3.3 Agent with NO active assignments receives an empty list
    const agent2ListRes = await fetch(`${BASE_URL}/api/shopkeepers`, {
      headers: { Authorization: `Bearer ${agent2Token}` },
    })
    assert(agent2ListRes.status === 200, 'Agent 2 with no assignments receives HTTP 200')
    const agent2ListJson = await agent2ListRes.json()
    assert(agent2ListJson.data.length === 0, 'Agent 2 with no assignments receives an empty list (data: [])')

    // 3.4 Agent 1 can retrieve assigned Shopkeeper by ID
    const agent1DetailRes = await fetch(`${BASE_URL}/api/shopkeepers/${merchant1._id}`, {
      headers: { Authorization: `Bearer ${agent1Token}` },
    })
    assert(agent1DetailRes.status === 200, 'Agent 1 can retrieve assigned Merchant 1 by ID (HTTP 200)')
    const agent1DetailJson = await agent1DetailRes.json()
    assert(agent1DetailJson.data._id === merchant1._id.toString(), 'Agent 1 receives correct Merchant 1 data')

    // 3.5 Agent 1 CANNOT retrieve unassigned Shopkeeper by ID (IDOR Prevention)
    const agent1IdorRes = await fetch(`${BASE_URL}/api/shopkeepers/${merchant2._id}`, {
      headers: { Authorization: `Bearer ${agent1Token}` },
    })
    assert(agent1IdorRes.status === 403, 'Agent 1 attempting to view unassigned Merchant 2 is rejected with HTTP 403 Forbidden')

    // 3.6 Non-existent shopkeeper returns 404
    const fakeId = new mongoose.Types.ObjectId().toString()
    const notFoundRes = await fetch(`${BASE_URL}/api/shopkeepers/${fakeId}`, {
      headers: { Authorization: `Bearer ${agent1Token}` },
    })
    assert(notFoundRes.status === 404, 'Non-existent shopkeeper ID returns HTTP 404 Not Found')

    // 3.7 Agent 1 CANNOT update unassigned Shopkeeper
    const agent1UpdateRes = await fetch(`${BASE_URL}/api/shopkeepers/${merchant2._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent1Token}`,
      },
      body: JSON.stringify({ shopName: 'Tampered Name' }),
    })
    assert(agent1UpdateRes.status === 403, 'Agent 1 attempting to PATCH unassigned Merchant 2 is rejected with HTTP 403 Forbidden')

    // 3.8 Filters combined safely with assignment restrictions
    const filterRes = await fetch(`${BASE_URL}/api/shopkeepers?category=Electronics`, {
      headers: { Authorization: `Bearer ${agent1Token}` },
    })
    const filterJson = await filterRes.json()
    assert(
      filterJson.data.length === 0,
      'Filter for Electronics returns 0 for Agent 1 because their only assigned merchant is Grocery'
    )

    // -------------------------------------------------------------
    // SUITE 4: DEMO LOGIN & AUTHENTICATION REGRESSIONS
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Demo Login Security & RBAC Regressions ---')

    // 4.1 Admin demo login remains prohibited
    const adminDemoRes = await fetch(`${BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Admin' }),
    })
    assert(adminDemoRes.status === 400, 'POST /api/auth/demo-login with role: Admin returns HTTP 400')

    // 4.2 Unauthenticated requests to CRM APIs return 401
    const unauthRes = await fetch(`${BASE_URL}/api/dashboard/stats`)
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/dashboard/stats returns HTTP 401')

    // 4.3 Expired token rejected
    const expiredTok = signToken({ userId: 'test', role: 'Agent' }, -10)
    const expiredRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${expiredTok}` },
    })
    assert(expiredRes.status === 401, 'Expired token rejected with HTTP 401')

    // 4.4 Rate limiter: 10 req/min enforced
    let hitRateLimit = false
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${BASE_URL}/api/conversations/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${agent1Token}`,
        },
        body: JSON.stringify({ message: 'P'.repeat(1001) }), // invalid length to test rate limiter without Gemini
      })
      if (res.status === 429) {
        hitRateLimit = true
        break
      }
    }
    assert(hitRateLimit, 'Rate limiter on /chat triggers HTTP 429 after 10 requests')

    // 4.5 Mutex concurrency serialization
    const executionOrder = []
    const mTask1 = () => new Promise((res) => setTimeout(() => { executionOrder.push(1); res(1) }, 20))
    const mTask2 = () => new Promise((res) => setTimeout(() => { executionOrder.push(2); res(2) }, 5))
    await Promise.all([
      conversationMutex.run('test_fifo', mTask1),
      conversationMutex.run('test_fifo', mTask2),
    ])
    assert(executionOrder[0] === 1 && executionOrder[1] === 2, 'ConversationMutex maintains strict FIFO order')

    // 4.6 Clean test records in paytm_sales_test only
    await Assignment.deleteMany({})
    await Lead.deleteMany({})
    await Shopkeeper.deleteMany({})
    await Agent.deleteMany({})
  } finally {
    testServer.close()
    await mongoose.disconnect()
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(75))
  console.log(`🎉 ALL TESTS PASSED: ${results.filter((r) => r.passed).length}/${results.length}`)
  console.log('='.repeat(75))
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Aborted with Error:', err.message)
    process.exit(1)
  })
