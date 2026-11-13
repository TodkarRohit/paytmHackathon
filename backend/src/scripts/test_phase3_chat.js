/**
 * Phase 3 — Frontend AI Sales Agent Chat Interface Verification Suite
 * 
 * STRICT TEST ISOLATION:
 * - Executes in NODE_ENV='test'.
 * - Connects strictly to MONGODB_TEST_URI ('paytm_sales_test').
 * - Spawns an in-process ephemeral test server on listen(0).
 * - ZERO network calls or modifications to production 'paytm_sales'.
 */

import path from 'node:path'
import dns from 'node:dns'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { createApp } from '../app.js'
import {
  signToken,
  generateSalt,
  hashPassword,
} from '../utils/jwt.js'
import { setGenAIClient } from '../services/aiAgentService.js'
import { Shopkeeper, Agent, Lead, Assignment, Conversation } from '../models/index.js'

// DNS setup for Atlas resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Force test environment
process.env.NODE_ENV = 'test'

const testResults = []

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`)
    testResults.push({ name: message, passed: false })
    throw new Error(message)
  } else {
    console.log(`  ✅ PASSED: ${message}`)
    testResults.push({ name: message, passed: true })
  }
}

async function runPhase3Tests() {
  console.log('='.repeat(75))
  console.log('🤖  RUNNING PHASE 3 — FRONTEND AI CHAT INTERFACE & BACKEND INTEGRATION SUITE')
  console.log('='.repeat(75))

  // -------------------------------------------------------------
  // SUITE 1: TEST ISOLATION & EPHEMERAL SERVER SETUP
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Database & Server Isolation ---')

  await connectDB()
  assert(mongoose.connection.readyState === 1, 'Mongoose connected successfully')

  const activeDbName = mongoose.connection.name
  assert(
    activeDbName === 'paytm_sales_test',
    `Connected database is confirmed to be isolated "${activeDbName}" (not paytm_sales)`
  )

  const testApp = createApp()
  const testServer = await new Promise((resolve) => {
    const srv = testApp.listen(0, () => resolve(srv))
  })
  const testPort = testServer.address().port
  const BASE_URL = `http://localhost:${testPort}`
  console.log(`  ℹ️  Ephemeral test server listening on port ${testPort}`)

  try {
    // -------------------------------------------------------------
    // SUITE 2: SEED TEST MERCHANT, ASSIGNMENT & ADMIN IDENTITIES
    // -------------------------------------------------------------
    console.log('\n--- 2. Setting Up Test Identities in paytm_sales_test ---')

    // Clean test collections
    await Promise.all([
      Shopkeeper.deleteMany({ phoneNumber: /^\+91777/ }),
      Agent.deleteMany({ email: /@test-phase3\.local$/ }),
      Lead.deleteMany({ customerName: /Phase3 Test/ }),
      Assignment.deleteMany({ notes: /Phase3 Test/ }),
      Conversation.deleteMany({ channel: 'Web Chat', status: 'Active' }),
    ])

    // Create Test Admin
    const adminSalt = generateSalt()
    const adminHash = await hashPassword('TestAdmin@2026', adminSalt)
    const testAdmin = await Agent.create({
      name: 'Phase3 Operations Admin',
      email: 'admin.phase3@test-phase3.local',
      phone: '+917770000001',
      territory: 'HQ',
      role: 'Admin',
      status: 'Available',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    })
    const adminToken = signToken({
      userId: testAdmin._id.toString(),
      role: 'Admin',
      name: testAdmin.name,
      agentId: testAdmin._id.toString(),
    })

    // Create Test Merchant 1 (Kirana Store, Hindi preferred, no Soundbox)
    const merchantSalt = generateSalt()
    const merchantHash = await hashPassword('merchantPass123', merchantSalt)
    const testMerchant = await Shopkeeper.create({
      name: 'Rameshwar Lal',
      shopName: 'Shri Ram Kirana Store',
      phoneNumber: '+917771234567',
      category: 'Kirana / Grocery',
      address: { street: 'Main Bazaar', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      preferredLanguage: 'Hindi',
      currentDevices: ['Paytm QR'],
      passwordSalt: merchantSalt,
      passwordHash: merchantHash,
    })
    const merchantToken = signToken({
      userId: testMerchant._id.toString(),
      role: 'Shopkeeper',
      name: testMerchant.name,
      shopkeeperId: testMerchant._id.toString(),
    })

    // Create Test Merchant 2 (Electronics Store, English preferred, with Soundbox)
    const testMerchant2 = await Shopkeeper.create({
      name: 'Vikram Mehta',
      shopName: 'Mehta Digital Electronics',
      phoneNumber: '+917779876543',
      category: 'Electronics',
      address: { street: 'MI Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302002' },
      preferredLanguage: 'English',
      currentDevices: ['Paytm QR', 'Paytm Soundbox'],
      passwordSalt: merchantSalt,
      passwordHash: merchantHash,
    })

    // Create Test Agent with assignment to Merchant 1
    const testAgent = await Agent.create({
      name: 'Suresh Field Agent',
      email: 'suresh.field@test-phase3.local',
      phone: '+917775550001',
      territory: 'Jaipur Central',
      role: 'Agent',
      status: 'Available',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    })
    const testLead = await Lead.create({
      shopkeeperId: testMerchant._id,
      customerName: 'Phase3 Test Lead - Rameshwar',
      interestedProducts: ['Paytm Soundbox 4.0'],
      leadStatus: 'Warm',
      stage: 'Agent Assigned',
      priority: 'High',
    })
    await Assignment.create({
      leadId: testLead._id,
      agentId: testAgent._id,
      isActive: true,
      notes: 'Phase3 Test Active Assignment',
    })
    const agentToken = signToken({
      userId: testAgent._id.toString(),
      role: 'Agent',
      name: testAgent.name,
      agentId: testAgent._id.toString(),
    })

    assert(testAdmin && testMerchant && testAgent, 'Test identities created successfully')

    // -------------------------------------------------------------
    // SUITE 3: CONVERSATION INITIALIZATION & MULTILINGUAL AI TURNS
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing AI Conversation Endpoints (POST /api/conversations/chat) ---')

    // 3.0 Verify missing API key returns HTTP 503
    setGenAIClient(null)
    const noKeyRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        message: 'Hello, what is the Soundbox price?',
        channel: 'Web Chat',
      }),
    })
    const noKeyData = await noKeyRes.json()
    assert(
      noKeyRes.status === 503 && noKeyData.message.includes('GEMINI_API_KEY is not configured'),
      'Missing Gemini API key returns HTTP 503 with descriptive message'
    )

    // Set up verified mock Gemini client for multi-turn testing
    const mockSalesClient = {
      models: {
        generateContent: async ({ contents }) => {
          const lastMsg = contents[contents.length - 1].parts[0].text

          if (/rental|battery|backup|price|charge/i.test(lastMsg)) {
            return {
              text: 'Official Paytm Soundbox pricing and rental plans depend on the applicable plan for your store. Please verify current pricing through the Paytm for Business app or an authorized Paytm sales representative.',
            }
          } else if (/सभी|ऐप्स|PhonePe|Google Pay|भाषा/i.test(lastMsg)) {
            return {
              text: 'जी हाँ! पेटीएम साउंडबॉक्स सभी प्रमुख UPI ऐप्स (Paytm, PhonePe, Google Pay, BHIM) से प्राप्त पेमेंट्स की तुरंत 11 भारतीय भाषाओं में साफ आवाज़ में पुष्टि करता है।',
            }
          } else if (/zyada|discount|fayda|objection/i.test(lastMsg)) {
            return {
              text: 'Paytm Soundbox dukaan par audible payment confirmation deta hai taaki bheed ke waqt customer screen par nirbhar na rehna pade. Badi ya sandighd payments ke liye aap Paytm for Business app par turant verify kar sakte hain.',
            }
          } else {
            return {
              text: 'Namaste! Paytm Soundbox aapki dukaan me har UPI payment ki instant audio confirmation deta hai.',
            }
          }
        },
      },
    }
    setGenAIClient(mockSalesClient)

    // 3.1 First message: English query
    const chatRes1 = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        message: 'How do I check the official pricing and audible payment alerts of the Paytm Soundbox?',
        channel: 'Web Chat',
      }),
    })
    const chatData1 = await chatRes1.json()
    assert(chatRes1.status === 200, 'First AI chat turn succeeded with HTTP 200')
    assert(chatData1.status === 'success', 'Response status is "success"')
    assert(chatData1.data?.conversationId, 'Response returned valid conversationId')
    assert(chatData1.data?.reply && typeof chatData1.data.reply === 'string', 'AI reply is non-empty string')
    assert(chatData1.data?.messageCount === 2, 'Message count is 2 (Shopkeeper + AI)')
    assert(chatData1.data?.channel === 'Web Chat', 'Channel is "Web Chat"')

    const conversationId = chatData1.data.conversationId

    // 3.2 Second turn: Hindi query (Devanagari) continuing conversation
    const chatRes2 = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        conversationId,
        message: 'क्या यह सभी UPI ऐप्स जैसे PhonePe और Google Pay की पेमेंट बोलता है?',
        channel: 'Web Chat',
      }),
    })
    const chatData2 = await chatRes2.json()
    assert(chatRes2.status === 200, 'Hindi Devanagari AI chat turn succeeded with HTTP 200')
    assert(chatData2.data?.conversationId === conversationId, 'Conversation ID preserved across turns')
    assert(chatData2.data?.messageCount === 4, 'Message count incremented to 4')
    assert(chatData2.data?.reply.length > 10, 'Hindi reply received with meaningful content')

    // 3.3 Third turn: Hinglish objection handling
    const chatRes3 = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        conversationId,
        message: 'Monthly rental bohot zyada hai, discount milega kya?',
        channel: 'Web Chat',
      }),
    })
    const chatData3 = await chatRes3.json()
    assert(chatRes3.status === 200, 'Hinglish objection turn succeeded with HTTP 200')
    assert(chatData3.data?.messageCount === 6, 'Message count incremented to 6')

    // -------------------------------------------------------------
    // SUITE 4: CONVERSATION LIST & TRANSCRIPT RETRIEVAL
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing GET /api/conversations and GET /api/conversations/:id ---')

    // 4.1 Admin retrieves conversations list
    const listRes = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const listData = await listRes.json()
    assert(listRes.status === 200, 'GET /api/conversations returns HTTP 200')
    assert(Array.isArray(listData.data), 'Conversations data is an array')
    assert(listData.data.some((c) => c._id === conversationId), 'Created conversation is listed')
    const listedConv = listData.data.find((c) => c._id === conversationId)
    assert(listedConv.shopkeeperId?.name === 'Rameshwar Lal', 'Populated shopkeeper name is present in list item')

    // 4.2 Retrieve single conversation by ID with populated assignment
    const getRes = await fetch(`${BASE_URL}/api/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const getData = await getRes.json()
    assert(getRes.status === 200, 'GET /api/conversations/:id returns HTTP 200')
    assert(getData.data?._id === conversationId, 'Conversation ID matches requested ID')
    assert(getData.data?.messages?.length === 6, 'Full transcript of 6 messages returned')
    assert(getData.data?.shopkeeperId?.category === 'Kirana / Grocery', 'Populated merchant category present')
    assert(getData.data?.shopkeeperId?.preferredLanguage === 'Hindi', 'Preferred language present')
    assert(getData.data?.assignment?.agentId?.name === 'Suresh Field Agent', 'Populated active assignment with Agent name present')
    assert(getData.data?.assignment?.status === 'Pending', 'Assignment status is present')

    // -------------------------------------------------------------
    // SUITE 5: VALIDATION, CONSTRAINTS & SECURITY
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Message Constraints & Authorization Safety ---')

    // 5.1 Empty message rejected with 400
    const emptyRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        message: '   ',
        channel: 'Web Chat',
      }),
    })
    assert(emptyRes.status === 400, 'Empty message rejected with HTTP 400')

    // 5.2 Message exceeding 1,000 characters rejected with 400
    const longMessage = 'A'.repeat(1001)
    const longRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant._id.toString(),
        message: longMessage,
        channel: 'Web Chat',
      }),
    })
    assert(longRes.status === 400, 'Message exceeding 1,000 characters rejected with HTTP 400')

    // 5.3 Agent cannot chat with unassigned merchant (Merchant 2)
    const unassignedRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant2._id.toString(),
        message: 'Hello unassigned merchant',
        channel: 'Web Chat',
      }),
    })
    assert(unassignedRes.status === 403, 'Agent rejected with HTTP 403 when trying to chat with unassigned merchant')

    // 5.4 Shopkeeper cannot chat under another merchant ID
    const spoofRes = await fetch(`${BASE_URL}/api/conversations/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        shopkeeperId: testMerchant2._id.toString(),
        message: 'Trying to impersonate another shopkeeper',
        channel: 'Web Chat',
      }),
    })
    assert(spoofRes.status === 403, 'Shopkeeper rejected with HTTP 403 when attempting IDOR on another merchant ID')

    // -------------------------------------------------------------
    // SUITE 6: FRONTEND COMPONENT & BUILD VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 6. Verifying Frontend Components & Build Artifacts ---')

    const compDir = path.resolve(__dirname, '../../../frontend/src/components/conversations')

    // 6.1 ConversationList component
    const listFile = path.join(compDir, 'ConversationList.jsx')
    assert(fs.existsSync(listFile), 'ConversationList.jsx component exists (Panel A)')
    const listCode = fs.readFileSync(listFile, 'utf8')
    assert(listCode.includes('Search merchants or conversations'), 'ConversationList implements search placeholder')
    assert(listCode.includes('AI Active'), 'ConversationList implements AI Active filter')
    assert(listCode.includes('Human Assigned'), 'ConversationList implements Human Assigned filter')

    // 6.2 ConversationCard component
    const cardFile = path.join(compDir, 'ConversationCard.jsx')
    assert(fs.existsSync(cardFile), 'ConversationCard.jsx component exists')
    const cardCode = fs.readFileSync(cardFile, 'utf8')
    assert(cardCode.includes('formatWhatsAppTime'), 'ConversationCard formats WhatsApp relative timestamp')

    // 6.3 ChatHeader component
    const headerFile = path.join(compDir, 'ChatHeader.jsx')
    assert(fs.existsSync(headerFile), 'ChatHeader.jsx component exists')
    const headerCode = fs.readFileSync(headerFile, 'utf8')
    assert(headerCode.includes('onTogglePanelC'), 'ChatHeader implements Panel C toggle button')

    // 6.4 MessageBubble component
    const bubbleFile = path.join(compDir, 'MessageBubble.jsx')
    assert(fs.existsSync(bubbleFile), 'MessageBubble.jsx component exists')
    const bubbleCode = fs.readFileSync(bubbleFile, 'utf8')
    assert(bubbleCode.includes('justify-start') && bubbleCode.includes('justify-end'), 'MessageBubble visually distinguishes merchant left from AI right')
    assert(bubbleCode.includes('Sales Agent:'), 'MessageBubble distinctly styles Human Sales Agent messages')

    // 6.5 MessageList component
    const msgListFile = path.join(compDir, 'MessageList.jsx')
    assert(fs.existsSync(msgListFile), 'MessageList.jsx component exists')
    const msgListCode = fs.readFileSync(msgListFile, 'utf8')
    assert(msgListCode.includes('messagesEndRef'), 'MessageList manages auto-scroll ref')
    assert(msgListCode.includes('formatDateDivider'), 'MessageList displays WhatsApp date dividers')

    // 6.6 MessageComposer component
    const composerFile = path.join(compDir, 'MessageComposer.jsx')
    assert(fs.existsSync(composerFile), 'MessageComposer.jsx component exists')
    const composerCode = fs.readFileSync(composerFile, 'utf8')
    assert(composerCode.includes('QUICK_PROMPTS'), 'MessageComposer defines multilingual quick prompts')
    assert(composerCode.includes('charCount') && composerCode.includes('/1000'), 'MessageComposer displays 1,000 char counter')
    assert(composerCode.includes('cooldownSeconds'), 'MessageComposer implements 429 rate limit cooldown')

    // 6.7 MerchantInfoPanel component
    const infoFile = path.join(compDir, 'MerchantInfoPanel.jsx')
    assert(fs.existsSync(infoFile), 'MerchantInfoPanel.jsx component exists (Panel C)')
    const infoCode = fs.readFileSync(infoFile, 'utf8')
    assert(infoCode.includes('Sales Lead Status'), 'MerchantInfoPanel displays Lead CRM status')
    assert(infoCode.includes('Assigned Field Agent'), 'MerchantInfoPanel displays Assigned Field Agent')

    // 6.8 StartConversationModal component
    const modalFile = path.join(compDir, 'StartConversationModal.jsx')
    assert(fs.existsSync(modalFile), 'StartConversationModal.jsx component exists')
    const modalCode = fs.readFileSync(modalFile, 'utf8')
    assert(modalCode.includes('Resume Chat') && modalCode.includes('Start Chat'), 'StartConversationModal supports resuming and starting new conversations')

    // 6.9 Main Conversations Page Orchestrator
    const conversationsFile = path.resolve(__dirname, '../../../frontend/src/pages/Conversations.jsx')
    assert(fs.existsSync(conversationsFile), 'Conversations.jsx orchestrator exists')
    const convCode = fs.readFileSync(conversationsFile, 'utf8')
    assert(convCode.includes('STORAGE_KEY_CONV_ID'), 'Conversations.jsx implements sessionStorage persistence')
    assert(convCode.includes('isPanelCOpen'), 'Conversations.jsx manages collapsible Panel C state')
    assert(convCode.includes('mobileView'), 'Conversations.jsx implements mobile navigation states')

    const appFile = path.resolve(__dirname, '../../../frontend/src/App.jsx')
    const appCode = fs.readFileSync(appFile, 'utf8')
    assert(appCode.includes("import Conversations from './pages/Conversations'"), 'App.jsx imports Conversations page')
    assert(appCode.includes("case 'conversations':"), 'App.jsx routes to Conversations page')

    const distIndex = path.resolve(__dirname, '../../../frontend/dist/index.html')
    assert(fs.existsSync(distIndex), 'Frontend production build exists at dist/index.html')

    console.log('\n' + '='.repeat(75))
    console.log(`🎉 ALL ${testResults.length} PHASE 3 TESTS PASSED SUCCESSFULLY!`)
    console.log('='.repeat(75))

  } finally {
    testServer.close()
    await mongoose.connection.close()
  }
}

runPhase3Tests().catch((err) => {
  console.error('\n💥 Suite execution terminated unexpectedly:', err)
  process.exit(1)
})
