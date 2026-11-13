/**
 * Comprehensive Test Suite for Phase 2: Gemini AI Sales Agent Foundation
 * 
 * Tests:
 * 1. Missing GEMINI_API_KEY handling (HTTP 503) on live server
 * 2. Gemini API error sanitization on API failures (HTTP 400/500)
 * 3. Input validation: malformed shopkeeperId (400), non-existent shopkeeperId (404), empty message (400)
 * 4. Conversation ownership & security validation (cross-merchant tampering rejected with HTTP 403)
 * 5. Multilingual conversations: English, Hindi (Devanagari), and Hinglish (Latin) multi-turn dialogue
 * 6. Conversation persistence: 6 turns stored in MongoDB Atlas, verified via GET /api/conversations/:id & direct DB query
 * 7. Zero modifications to existing database records (Shopkeepers, Leads, Campaigns, Agents intact)
 * 8. All existing REST APIs continue to function cleanly (/health, /dashboard/stats, /shopkeepers, /campaigns, /leads, /agents)
 */

import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'
import { setGenAIClient, formatConversationContents, buildSalesSystemInstruction } from '../services/aiAgentService.js'
import { VERIFIED_SOUNDBOX_KNOWLEDGE } from '../config/soundboxKnowledge.js'
import conversationRoutes from '../routes/conversationRoutes.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { Shopkeeper, Conversation, Lead, Campaign, Agent } from '../models/index.js'

dns.setServers(['8.8.8.8', '8.8.4.4'])

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MAIN_SERVER_URL = 'http://localhost:5000/api'

async function runTestSuite() {
  console.log('====================================================')
  console.log('   PHASE 2: GEMINI AI SALES AGENT FOUNDATION TESTS  ')
  console.log('====================================================\n')

  let passedCount = 0
  let failedCount = 0

  const assert = (condition, testName, detail = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passedCount++
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`)
      failedCount++
    }
  }

  // Ensure integration test runs strictly against isolated test database
  process.env.NODE_ENV = 'test'
  const { connectDB } = await import('../config/db.js')
  await connectDB()

  // Start in-process ephemeral test server sharing the same Mongoose connection and AI client state
  const testApp = express()
  testApp.use(express.json())
  testApp.use('/api/conversations', conversationRoutes)
  testApp.use(errorHandler)

  const testServer = await new Promise((resolve) => {
    const srv = testApp.listen(0, () => resolve(srv))
  })
  const testPort = testServer.address().port
  const IN_PROCESS_URL = `http://localhost:${testPort}/api`

  let testConversationId = null
  let tempMerchantBId = null
  let tempConvoId = null

  try {
    // 0. Snapshot existing records to verify no data is modified or deleted
    const initialShopkeepers = await Shopkeeper.countDocuments()
    const initialLeads = await Lead.countDocuments()
    const initialCampaigns = await Campaign.countDocuments()
    const initialAgents = await Agent.countDocuments()
    const sampleMerchant = await Shopkeeper.findOne()

    console.log(
      `Initial DB State: ${initialShopkeepers} shopkeepers, ${initialLeads} leads, ${initialCampaigns} campaigns, ${initialAgents} agents.\n`
    )

    if (!sampleMerchant) {
      throw new Error('A sample shopkeeper is required to run conversation tests.')
    }

    // ----------------------------------------------------
    // UNIT VERIFICATIONS (FIX 1 & FIX 2)
    // ----------------------------------------------------
    {
      // 0A. History beginning with a model turn
      const histA = [
        { sender: 'AI', text: 'Namaste! Welcome to Paytm.' },
        { sender: 'Shopkeeper', text: 'Kitne ka soundbox hai?' },
        { sender: 'AI', text: 'Humare alag alag plans hain.' },
      ]
      const { contents: cA } = formatConversationContents({ history: histA, message: 'Details please' })
      assert(
        cA[0].role === 'user' && cA[0].parts[0].text === 'Kitne ka soundbox hai?',
        'Unit 0A: History beginning with a model turn strips leading model turn and starts with "user"'
      )

      // 0B. Consecutive user turns
      const histB = [
        { sender: 'Shopkeeper', text: 'Question 1' },
        { sender: 'Shopkeeper', text: 'Question 2' },
        { sender: 'AI', text: 'Answer 1' },
      ]
      const { contents: cB } = formatConversationContents({ history: histB, message: 'Next' })
      assert(
        cB[0].role === 'user' && cB[0].parts[0].text === 'Question 1\nQuestion 2',
        'Unit 0B: Consecutive user turns are merged into a single user turn with newline'
      )

      // 0C. Consecutive model turns
      const histC = [
        { sender: 'Shopkeeper', text: 'Question' },
        { sender: 'AI', text: 'Part 1' },
        { sender: 'AI', text: 'Part 2' },
      ]
      const { contents: cC } = formatConversationContents({ history: histC, message: 'Next' })
      assert(
        cC[1].role === 'model' && cC[1].parts[0].text === 'Part 1\nPart 2',
        'Unit 0C: Consecutive model turns are merged into a single model turn with newline'
      )

      // 0D. Empty history
      const { contents: cD, systemNotices: nD } = formatConversationContents({ history: [], message: 'Hello' })
      assert(
        cD.length === 1 && cD[0].role === 'user' && cD[0].parts[0].text === 'Hello' && nD.length === 0,
        'Unit 0D: Empty history cleanly produces 1 turn with role "user"'
      )

      // 0E. Normal alternating conversation
      const histE = [
        { sender: 'Shopkeeper', text: 'Q1' },
        { sender: 'AI', text: 'A1' },
        { sender: 'Shopkeeper', text: 'Q2' },
        { sender: 'AI', text: 'A2' },
      ]
      const { contents: cE } = formatConversationContents({ history: histE, message: 'Q3' })
      assert(
        cE.length === 5 && cE[0].role === 'user' && cE[1].role === 'model' && cE[2].role === 'user' && cE[3].role === 'model' && cE[4].role === 'user',
        'Unit 0E: Normal alternating conversation preserves strict role alternation and order'
      )

      // 0F. Current message appended correctly
      const histF = [{ sender: 'Shopkeeper', text: 'Line 1' }]
      const { contents: cF } = formatConversationContents({ history: histF, message: 'Line 2' })
      assert(
        cF.length === 1 && cF[0].role === 'user' && cF[0].parts[0].text === 'Line 1\nLine 2',
        'Unit 0F: Current message merged into preceding user turn to prevent consecutive user turns'
      )

      // 0G. System and Agent sender handling
      const histG = [
        { sender: 'Shopkeeper', text: 'Inquiry' },
        { sender: 'System', text: 'System notification event' },
        { sender: 'Agent', text: 'Human agent response' },
      ]
      const { contents: cG, systemNotices: nG } = formatConversationContents({ history: histG, message: 'Reply' })
      assert(
        nG.includes('System notification event') &&
        !cG.some((c) => c.parts[0].text.includes('System notification event')) &&
        cG.some((c) => c.parts[0].text.includes('[Paytm Field Executive]: Human agent response') && c.role === 'model'),
        'Unit 0G: Agent sender mapped to [Paytm Field Executive] model turn; System sender captured in systemNotices'
      )

      // 0H. Knowledge-base information in system instruction
      const instruction = buildSalesSystemInstruction(sampleMerchant, ['Test notice'])
      assert(
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.product.name) &&
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.product.primaryPurpose) &&
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.unverifiedInformationPolicy.pricing) &&
        instruction.includes('Test notice'),
        'Unit 0H: buildSalesSystemInstruction dynamically incorporates VERIFIED_SOUNDBOX_KNOWLEDGE and unverified policies'
      )
    }

    // ----------------------------------------------------
    // TEST 1: Missing API Key Handling (Live Server)
    // ----------------------------------------------------
    {
      const res = await fetch(`${MAIN_SERVER_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: sampleMerchant._id.toString(),
          message: 'Hello, what is Paytm Soundbox?',
        }),
      })
      const data = await res.json()

      assert(
        res.status === 503 &&
          data.status === 'error' &&
          data.message.includes('GEMINI_API_KEY is not configured'),
        'Test 1: Missing GEMINI_API_KEY returns HTTP 503 with descriptive error',
        JSON.stringify(data)
      )
    }

    // ----------------------------------------------------
    // TEST 2: Gemini API Error Handling & Sanitization
    // ----------------------------------------------------
    {
      // Mock client that simulates an upstream Gemini API error (e.g. invalid key or bad request)
      const mockErrorClient = {
        models: {
          generateContent: async () => {
            const apiErr = new Error(
              JSON.stringify({
                error: {
                  code: 400,
                  message: 'API key not valid. Please pass a valid API key.',
                  status: 'INVALID_ARGUMENT',
                },
              })
            )
            apiErr.status = 400
            throw apiErr
          },
        },
      }

      setGenAIClient(mockErrorClient)

      const res = await fetch(`${IN_PROCESS_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: sampleMerchant._id.toString(),
          message: 'What is the price?',
        }),
      })
      const data = await res.json()

      assert(
        res.status === 400 &&
          data.status === 'error' &&
          data.message.includes('AI Sales Agent error') &&
          data.message.includes('API key not valid'),
        'Test 2: Upstream Gemini API error is sanitized and returned with appropriate HTTP status code',
        JSON.stringify(data)
      )

      setGenAIClient(null)
    }

    // ----------------------------------------------------
    // TEST 3: Input Validation - Invalid & Non-existent Shopkeeper IDs
    // ----------------------------------------------------
    {
      // 3A. Malformed ObjectId
      const resMalformed = await fetch(`${MAIN_SERVER_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: 'invalid-id-xyz',
          message: 'Hello',
        }),
      })
      const dataMalformed = await resMalformed.json()
      assert(
        resMalformed.status === 400 && dataMalformed.message.includes('Invalid shopkeeperId format'),
        'Test 3A: Malformed shopkeeperId returns HTTP 400',
        JSON.stringify(dataMalformed)
      )

      // 3B. Non-existent valid ObjectId
      const nonExistentId = new mongoose.Types.ObjectId().toString()
      const resNonExistent = await fetch(`${MAIN_SERVER_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: nonExistentId,
          message: 'Hello',
        }),
      })
      const dataNonExistent = await resNonExistent.json()
      assert(
        resNonExistent.status === 404 && dataNonExistent.message.includes('Shopkeeper not found'),
        'Test 3B: Non-existent shopkeeperId returns HTTP 404',
        JSON.stringify(dataNonExistent)
      )

      // 3C. Empty or whitespace message text
      const resEmptyMsg = await fetch(`${MAIN_SERVER_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: sampleMerchant._id.toString(),
          message: '   ',
        }),
      })
      const dataEmptyMsg = await resEmptyMsg.json()
      assert(
        resEmptyMsg.status === 400 && dataEmptyMsg.message.includes('message text is required'),
        'Test 3C: Empty message text returns HTTP 400',
        JSON.stringify(dataEmptyMsg)
      )
    }

    // ----------------------------------------------------
    // TEST 4: Conversation Ownership & Security Validation
    // ----------------------------------------------------
    {
      // Create a temporary conversation for sampleMerchant
      const tempConvo = await Conversation.create({
        shopkeeperId: sampleMerchant._id,
        channel: 'Web Chat',
        status: 'Active',
        messages: [],
      })
      tempConvoId = tempConvo._id

      // Create a temporary merchant B
      const tempMerchantB = await Shopkeeper.create({
        name: 'TEST_TEMP_SECURITY_MERCHANT',
        shopName: 'TEST_TEMP_SECURITY_STORE',
        phoneNumber: '+91 99999 88888',
        category: 'Other',
      })
      tempMerchantBId = tempMerchantB._id

      // Attempt to access sampleMerchant's conversation using merchant B's identity
      const resUnauthorized = await fetch(`${MAIN_SERVER_URL}/conversations/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperId: tempMerchantB._id.toString(),
          conversationId: tempConvo._id.toString(),
          message: 'Unauthorized access test message',
        }),
      })
      const dataUnauthorized = await resUnauthorized.json()

      assert(
        resUnauthorized.status === 403 &&
          dataUnauthorized.message.includes('Unauthorized: Conversation does not belong'),
        'Test 4: Cross-shopkeeper conversation tampering returns HTTP 403 Forbidden',
        JSON.stringify(dataUnauthorized)
      )

      // Clean up Test 4 temporary records immediately
      await Conversation.findByIdAndDelete(tempConvoId)
      tempConvoId = null
      await Shopkeeper.findByIdAndDelete(tempMerchantBId)
      tempMerchantBId = null
    }

    // ----------------------------------------------------
    // TEST 5: Multilingual Conversations & Context Persistence
    // (Testing English, Hindi Devanagari, and Hinglish turns)
    // ----------------------------------------------------
    {
      // Mock client that returns grounded sales responses in matching languages
      const mockSalesClient = {
        models: {
          generateContent: async ({ contents }) => {
            const lastMsg = contents[contents.length - 1].parts[0].text

            if (/battery|backup|charge/i.test(lastMsg)) {
              return {
                text: 'Paytm Soundbox me powerful long-lasting battery milti hai jo normal dukaan usage par multiple days chalti hai. Aap Type-C charger se ise asaani se charge kar sakte hain.',
              }
            } else if (/आवाज़|पेमेंट|UPI|नमस्ते/i.test(lastMsg)) {
              return {
                text: 'जी हाँ! पेटीएम साउंडबॉक्स 4.0 में सभी प्रमुख UPI ऍप्स (Paytm, Google Pay, PhonePe, BHIM) के भुगतानों की तुरंत साफ़ हिंदी आवाज़ में पुष्टि होती है।',
              }
            } else {
              return {
                text: 'Hello! The Paytm Soundbox 4.0 provides instant audio confirmation for every UPI payment received, protecting your shop from fake payment screenshot fraud.',
              }
            }
          },
        },
      }

      setGenAIClient(mockSalesClient)

      // Turn 1: English Message
      {
        const res = await fetch(`${IN_PROCESS_URL}/conversations/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopkeeperId: sampleMerchant._id.toString(),
            message: 'Hello, what are the key benefits of Paytm Soundbox for my shop?',
            channel: 'Web Chat',
          }),
        })
        const data = await res.json()
        testConversationId = data.data?.conversationId

        assert(
          res.status === 200 &&
            data.status === 'success' &&
            data.data?.reply.includes('Paytm Soundbox') &&
            data.data?.messageCount === 2,
          'Test 5A: English turn processed and saved to conversation',
          JSON.stringify(data)
        )
      }

      // Turn 2: Hindi Message (Devanagari)
      {
        const res = await fetch(`${IN_PROCESS_URL}/conversations/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopkeeperId: sampleMerchant._id.toString(),
            conversationId: testConversationId,
            message: 'नमस्ते, क्या इसमें सभी UPI पेमेंट्स की तुरंत आवाज़ आएगी?',
          }),
        })
        const data = await res.json()

        assert(
          res.status === 200 &&
            data.status === 'success' &&
            data.data?.reply.includes('साफ़') &&
            data.data?.messageCount === 4,
          'Test 5B: Hindi turn processed and appended to conversation history (count: 4)',
          JSON.stringify(data)
        )
      }

      // Turn 3: Hinglish Message (Latin script)
      {
        const res = await fetch(`${IN_PROCESS_URL}/conversations/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopkeeperId: sampleMerchant._id.toString(),
            conversationId: testConversationId,
            message: 'Bhaiya Soundbox me battery backup kitna rehta hai?',
          }),
        })
        const data = await res.json()

        assert(
          res.status === 200 &&
            data.status === 'success' &&
            data.data?.reply.includes('battery') &&
            data.data?.messageCount === 6,
          'Test 5C: Hinglish turn processed with context and appended (count: 6)',
          JSON.stringify(data)
        )
      }

      // ----------------------------------------------------
      // TEST 6: Conversation Persistence & Retrieval
      // ----------------------------------------------------
      {
        // 6A. Verify via GET /api/conversations/:id on the LIVE MAIN SERVER (port 5000)
        const res = await fetch(`${MAIN_SERVER_URL}/conversations/${testConversationId}`)
        const data = await res.json()

        assert(
          res.status === 200 &&
            data.status === 'success' &&
            data.data?.messages?.length === 6 &&
            data.data.messages[0].sender === 'Shopkeeper' &&
            data.data.messages[1].sender === 'AI' &&
            data.data.messages[2].sender === 'Shopkeeper' &&
            data.data.messages[3].sender === 'AI' &&
            data.data.messages[4].sender === 'Shopkeeper' &&
            data.data.messages[5].sender === 'AI' &&
            data.data.messages[0].text.includes('benefits') &&
            data.data.messages[2].text.includes('आवाज़') &&
            data.data.messages[4].text.includes('battery'),
          'Test 6A: Conversation history retrieved from live server (port 5000) with all 6 turns',
          `Message count: ${data.data?.messages?.length}`
        )

        // 6B. Direct MongoDB verification
        const convoInDb = await Conversation.findById(testConversationId)
        assert(
          convoInDb &&
            convoInDb.messages.length === 6 &&
            convoInDb.shopkeeperId.toString() === sampleMerchant._id.toString() &&
            convoInDb.messages[0].intentDetected !== undefined &&
            convoInDb.messages[0].sentiment !== undefined,
          'Test 6B: Direct MongoDB document check confirms all 6 turns persisted in paytm_sales with metadata'
        )

        // Cleanup test conversation
        await Conversation.findByIdAndDelete(testConversationId)
        testConversationId = null
      }

      setGenAIClient(null)
    }

    // ----------------------------------------------------
    // TEST 7: Verify Existing Records Remain 100% Intact
    // ----------------------------------------------------
    {
      const finalShopkeepers = await Shopkeeper.countDocuments()
      const finalLeads = await Lead.countDocuments()
      const finalCampaigns = await Campaign.countDocuments()
      const finalAgents = await Agent.countDocuments()

      assert(
        finalShopkeepers === initialShopkeepers &&
          finalLeads === initialLeads &&
          finalCampaigns === initialCampaigns &&
          finalAgents === initialAgents,
        'Test 7: Zero modifications to existing records (Shopkeepers, Leads, Campaigns, Agents intact)',
        `Initial: (${initialShopkeepers}, ${initialLeads}, ${initialCampaigns}, ${initialAgents}) vs Final: (${finalShopkeepers}, ${finalLeads}, ${finalCampaigns}, ${finalAgents})`
      )
    }

    // ----------------------------------------------------
    // TEST 8: Verify Existing REST APIs Still Function Cleanly
    // ----------------------------------------------------
    {
      const [health, stats, shopkeepers, campaigns, leads, agents] = await Promise.all([
        fetch(`${MAIN_SERVER_URL}/health`).then((r) => r.json()),
        fetch(`${MAIN_SERVER_URL}/dashboard/stats`).then((r) => r.json()),
        fetch(`${MAIN_SERVER_URL}/shopkeepers`).then((r) => r.json()),
        fetch(`${MAIN_SERVER_URL}/campaigns`).then((r) => r.json()),
        fetch(`${MAIN_SERVER_URL}/leads`).then((r) => r.json()),
        fetch(`${MAIN_SERVER_URL}/agents`).then((r) => r.json()),
      ])

      assert(
        health.database?.status === 'connected',
        'Test 8A: GET /api/health returns database.status === "connected"'
      )
      assert(
        stats.status === 'success' && stats.data?.overview?.totalShopkeepers === initialShopkeepers,
        'Test 8B: GET /api/dashboard/stats returns accurate real metrics'
      )
      assert(
        shopkeepers.status === 'success' && Array.isArray(shopkeepers.data),
        'Test 8C: GET /api/shopkeepers returns array of merchants'
      )
      assert(
        campaigns.status === 'success' && Array.isArray(campaigns.data),
        'Test 8D: GET /api/campaigns returns array of campaigns'
      )
      assert(
        leads.status === 'success' && Array.isArray(leads.data),
        'Test 8E: GET /api/leads returns array of leads'
      )
      assert(
        agents.status === 'success' && Array.isArray(agents.data),
        'Test 8F: GET /api/agents returns array of sales agents'
      )
    }

    console.log('\n====================================================')
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`)
    console.log('====================================================\n')

    if (failedCount > 0) {
      process.exit(1)
    }
  } finally {
    // Ensure all test artifacts are cleaned up safely
    if (testConversationId) {
      await Conversation.findByIdAndDelete(testConversationId)
    }
    if (tempConvoId) {
      await Conversation.findByIdAndDelete(tempConvoId)
    }
    if (tempMerchantBId) {
      await Shopkeeper.findByIdAndDelete(tempMerchantBId)
    }
    await mongoose.disconnect()
    testServer.close()
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
