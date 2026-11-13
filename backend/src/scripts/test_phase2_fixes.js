/**
 * Dedicated Unit & Regression Test Suite for Phase 2 Gemini AI Fixes
 * 
 * Verifies:
 * 1. History beginning with a model turn (leading model turns stripped; starts with 'user')
 * 2. Consecutive user turns (safely merged with newline, preserving meaning)
 * 3. Consecutive model turns (safely merged with newline)
 * 4. Empty history (cleanly produces single 'user' turn)
 * 5. Normal alternating conversation (preserved in order)
 * 6. Current message appended correctly (always final 'user' turn)
 * 7. System and Agent sender handling (Agent attributed to [Paytm Field Executive], System captured in notices)
 * 8. Knowledge-base information actually appears in generated system instruction
 * 9. generateSalesResponse execution with mock GenAI client
 */

import {
  formatConversationContents,
  buildSalesSystemInstruction,
  generateSalesResponse,
  setGenAIClient,
} from '../services/aiAgentService.js'
import { VERIFIED_SOUNDBOX_KNOWLEDGE } from '../config/soundboxKnowledge.js'

function runFixesTestSuite() {
  console.log('====================================================')
  console.log('      GEMINI AI FIXES 1 & 2 VERIFICATION SUITE      ')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition, testName, detail = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passed++
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  // ----------------------------------------------------
  // TEST 1: History beginning with a model turn
  // ----------------------------------------------------
  {
    const history = [
      { sender: 'AI', text: 'Namaste! Welcome to Paytm.' },
      { sender: 'Shopkeeper', text: 'Kitne ka soundbox hai?' },
      { sender: 'AI', text: 'Humare alag alag plans hain.' },
    ]
    const { contents } = formatConversationContents({
      history,
      message: 'Batayein please.',
    })

    assert(
      contents[0].role === 'user' && contents[0].parts[0].text === 'Kitne ka soundbox hai?',
      'Test 1: History beginning with a model turn has leading model turn stripped and begins with "user"',
      JSON.stringify(contents)
    )
  }

  // ----------------------------------------------------
  // TEST 2: Consecutive user turns in history
  // ----------------------------------------------------
  {
    const history = [
      { sender: 'Shopkeeper', text: 'Pehla sawal: Battery kitni chalegi?' },
      { sender: 'Shopkeeper', text: 'Dusra sawal: Charging time kitna hai?' },
      { sender: 'AI', text: 'Battery kai din chalti hai.' },
    ]
    const { contents } = formatConversationContents({
      history,
      message: 'Theek hai.',
    })

    assert(
      contents[0].role === 'user' &&
        contents[0].parts[0].text ===
          'Pehla sawal: Battery kitni chalegi?\nDusra sawal: Charging time kitna hai?',
      'Test 2: Consecutive user turns are safely merged into a single user turn with newline',
      JSON.stringify(contents[0])
    )
  }

  // ----------------------------------------------------
  // TEST 3: Consecutive model turns in history
  // ----------------------------------------------------
  {
    const history = [
      { sender: 'Shopkeeper', text: 'QR code hai mere paas.' },
      { sender: 'AI', text: 'Paper QR par fraud ho sakta hai.' },
      { sender: 'AI', text: 'Soundbox se aawaz aati hai.' },
    ]
    const { contents } = formatConversationContents({
      history,
      message: 'Achha samajh gaya.',
    })

    assert(
      contents[1].role === 'model' &&
        contents[1].parts[0].text ===
          'Paper QR par fraud ho sakta hai.\nSoundbox se aawaz aati hai.',
      'Test 3: Consecutive model turns are safely merged into a single model turn with newline',
      JSON.stringify(contents[1])
    )
  }

  // ----------------------------------------------------
  // TEST 4: Empty conversation history
  // ----------------------------------------------------
  {
    const { contents, systemNotices } = formatConversationContents({
      history: [],
      message: 'Hello!',
    })

    assert(
      contents.length === 1 &&
        contents[0].role === 'user' &&
        contents[0].parts[0].text === 'Hello!' &&
        systemNotices.length === 0,
      'Test 4: Empty history produces exactly 1 turn with role "user" and current message',
      JSON.stringify(contents)
    )
  }

  // ----------------------------------------------------
  // TEST 5: Normal alternating conversation
  // ----------------------------------------------------
  {
    const history = [
      { sender: 'Shopkeeper', text: 'Q1: What is Soundbox?' },
      { sender: 'AI', text: 'A1: Instant audio alert device.' },
      { sender: 'Shopkeeper', text: 'Q2: Does it support Google Pay?' },
      { sender: 'AI', text: 'A2: Yes, all UPI apps are supported.' },
    ]
    const { contents } = formatConversationContents({
      history,
      message: 'Q3: What about battery?',
    })

    assert(
      contents.length === 5 &&
        contents[0].role === 'user' &&
        contents[1].role === 'model' &&
        contents[2].role === 'user' &&
        contents[3].role === 'model' &&
        contents[4].role === 'user' &&
        contents[4].parts[0].text === 'Q3: What about battery?',
      'Test 5: Normal alternating conversation preserves all turns in order with strict role alternation',
      `Length: ${contents.length}`
    )
  }

  // ----------------------------------------------------
  // TEST 6: Current message appended correctly
  // ----------------------------------------------------
  {
    // Case 6A: Preceding turn was model -> appended as new user turn
    const resA = formatConversationContents({
      history: [
        { sender: 'Shopkeeper', text: 'Hi' },
        { sender: 'AI', text: 'Hello' },
      ],
      message: 'Can I get a demo?',
    })
    assert(
      resA.contents.length === 3 &&
        resA.contents[2].role === 'user' &&
        resA.contents[2].parts[0].text === 'Can I get a demo?',
      'Test 6A: Current message appended as new user turn when preceding turn was model'
    )

    // Case 6B: Preceding turn was user -> merged with preceding user turn
    const resB = formatConversationContents({
      history: [
        { sender: 'Shopkeeper', text: 'First user line' },
      ],
      message: 'Second user line',
    })
    assert(
      resB.contents.length === 1 &&
        resB.contents[0].role === 'user' &&
        resB.contents[0].parts[0].text === 'First user line\nSecond user line',
      'Test 6B: Current message safely merged into preceding user turn to avoid consecutive user turns'
    )
  }

  // ----------------------------------------------------
  // TEST 7: System and Agent sender handling
  // ----------------------------------------------------
  {
    const history = [
      { sender: 'Shopkeeper', text: 'Interested in Soundbox' },
      { sender: 'System', text: 'Lead priority updated to High by system' },
      { sender: 'Agent', text: 'Namaste ji, I am your local area sales representative.' },
      { sender: 'AI', text: 'We are here to assist with your store setup.' },
      { sender: 'System', text: 'Shop category verified as Kirana' },
    ]
    const { contents, systemNotices } = formatConversationContents({
      history,
      message: 'When can someone visit my store?',
    })

    // Verify System messages are NOT in contents as ordinary AI turns
    const systemInContents = contents.some((c) =>
      c.parts[0].text.includes('Lead priority updated') ||
      c.parts[0].text.includes('category verified')
    )
    assert(
      !systemInContents && systemNotices.length === 2,
      'Test 7A: System messages are captured in systemNotices and never placed into contents as ordinary AI responses',
      `Notices count: ${systemNotices.length}`
    )

    // Verify Agent message is labeled and mapped to model
    const agentTurn = contents.find((c) => c.parts[0].text.includes('[Paytm Field Executive]'))
    assert(
      agentTurn && agentTurn.role === 'model',
      'Test 7B: Agent message is attributed to [Paytm Field Executive] with role "model"',
      JSON.stringify(agentTurn)
    )
  }

  // ----------------------------------------------------
  // TEST 8: Knowledge-base information in buildSalesSystemInstruction
  // ----------------------------------------------------
  {
    const sampleMerchant = {
      name: 'Ramesh Gupta',
      shopName: 'Gupta Kirana',
      category: 'Kirana / Grocery',
      address: { city: 'Jaipur' },
      preferredLanguage: 'Hindi',
      currentDevices: ['Paytm QR'],
    }
    const sampleNotices = ['Merchant expressed high interest yesterday']

    const instruction = buildSalesSystemInstruction(sampleMerchant, sampleNotices)

    assert(
      instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.product.name) &&
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.product.primaryPurpose) &&
        instruction.includes('Google Pay') &&
        instruction.includes('Hindi') &&
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.unverifiedInformationPolicy.pricing) &&
        instruction.includes(VERIFIED_SOUNDBOX_KNOWLEDGE.unverifiedInformationPolicy.promotions) &&
        instruction.includes('Ramesh Gupta') &&
        instruction.includes('Gupta Kirana') &&
        instruction.includes('Merchant expressed high interest yesterday'),
      'Test 8: System instruction dynamically uses VERIFIED_SOUNDBOX_KNOWLEDGE and unverified policies',
      'Missing expected knowledge base text'
    )
  }

  // ----------------------------------------------------
  // TEST 9: Full generateSalesResponse execution with Mock Client
  // ----------------------------------------------------
  let capturedPayload = null
  const mockClient = {
    models: {
      generateContent: async (payload) => {
        capturedPayload = payload
        return { text: 'Namaste Ramesh ji! Paytm Soundbox aapki dukaan ke liye best hai.' }
      },
    },
  }

  setGenAIClient(mockClient)

  generateSalesResponse({
    merchant: { name: 'Ramesh Gupta', shopName: 'Gupta Kirana' },
    history: [
      { sender: 'AI', text: 'Old AI message' },
      { sender: 'Shopkeeper', text: 'Soundbox ki aawaz kitni tez hai?' },
    ],
    message: 'Market me sunai dega?',
  })
    .then((result) => {
      const startsWithUser = capturedPayload.contents[0].role === 'user'
      const hasSystemInstruction = typeof capturedPayload.config.systemInstruction === 'string'
      const replyReturned = result.reply.includes('Paytm Soundbox')

      assert(
        startsWithUser && hasSystemInstruction && replyReturned,
        'Test 9: generateSalesResponse executes cleanly with mock client and formatted turns',
        `Result: ${JSON.stringify(result)}`
      )

      console.log('\n====================================================')
      console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
      console.log('====================================================\n')

      if (failed > 0) {
        process.exit(1)
      }
    })
    .catch((err) => {
      console.error('Test 9 execution failed:', err)
      process.exit(1)
    })
}

runFixesTestSuite()

