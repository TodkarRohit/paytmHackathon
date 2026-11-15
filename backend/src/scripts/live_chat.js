import dotenv from 'dotenv'
import { generateSalesResponse } from '../services/aiAgentService.js'

dotenv.config()

async function testDialogue() {
  console.log('='.repeat(65))
  console.log('🤖 PAYTM AI SALES TEAMMATE - LIVE AI DEMO')
  console.log('='.repeat(65))

  const merchant = {
    name: 'Rohit Todkar',
    shopName: 'Todkar General Stores',
    category: 'Kirana / Grocery',
    address: { city: 'Pune', state: 'Maharashtra' },
    preferredLanguage: 'Hindi / Hinglish',
    currentDevices: ['PhonePe QR sticker'],
  }

  console.log('\n🏪 Merchant Profile Context:')
  console.log(`- Merchant: ${merchant.name} (${merchant.shopName})`)
  console.log(`- Category: ${merchant.category}`)
  console.log(`- Current Setup: ${merchant.currentDevices.join(', ')}`)
  console.log('- Language: Hindi / Hinglish\n')

  const sampleMessages = [
    'Bhaiya, ye Paytm Soundbox ka price kya hai aur monthly charge kitna lagega?',
    'Lekin mere paas toh pehle se PhonePe QR code hai, mujhe Paytm Soundbox kyu lena chahiye?',
    'Dukan par kabhi light chali jati hai, iski battery kitne ghante chalti hai?',
    'Theek hai bhaiya, mujhe meri shop ke liye ek soundbox lagwana hai. Process kya hai?'
  ]

  const history = []

  for (const userMsg of sampleMessages) {
    console.log('-'.repeat(65))
    console.log(`👤 Merchant (${merchant.name}): "${userMsg}"`)
    console.log('⏳ AI Sales Agent is thinking...')

    const t0 = Date.now()
    const result = await generateSalesResponse({
      merchant,
      history,
      message: userMsg,
      modelName: 'gemini-3.8-flash',
    })
    const duration = ((Date.now() - t0) / 1000).toFixed(1)

    console.log(`\n💬 Paytm AI Agent (${duration}s | Intent: ${result.intent} | Sentiment: ${result.sentiment}):`)
    console.log(`"${result.reply}"\n`)

    // Append to conversation history for realistic multi-turn context
    history.push({ sender: 'Shopkeeper', text: userMsg })
    history.push({ sender: 'AI', text: result.reply })
  }

  console.log('='.repeat(65))
  console.log('✅ Multi-turn dialogue completed successfully!')
  console.log('='.repeat(65))
}

testDialogue()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error during dialogue:', err.message)
    process.exit(1)
  })
