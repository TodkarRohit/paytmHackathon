/**
 * Seed a test Shopkeeper for the WhatsApp demo.
 * The WhatsApp webhook ignores unknown numbers and numbers with
 * whatsappOptIn === false, so the demo phone MUST exist in MongoDB
 * with whatsappOptIn: true — this script creates / updates it.
 *
 * Run:  cd backend && node src/scripts/seed_whatsapp_test_shopkeeper.js +919999988888 "Test Shopkeeper"
 *   Phone can also come from TEST_SHOPKEEPER_PHONE in backend/.env.
 *   Name is optional, defaults to "Test Shopkeeper".
 *
 * Requires MONGODB_URI in backend/.env. No Gemini / Twilio / Meta needed.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Shopkeeper } from '../models/Shopkeeper.js'

dotenv.config()

const rawPhone = process.argv[2] || process.env.TEST_SHOPKEEPER_PHONE || ''
const name = process.argv[3] || process.env.TEST_SHOPKEEPER_NAME || 'Test Shopkeeper'

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  const last10 = digits.slice(-10)
  if (last10.length !== 10) throw new Error(`Phone must have 10 digits, got: ${value}`)
  return `+91${last10}`
}

const phone = normalizePhone(rawPhone)
if (!phone) {
  console.error('Usage: node src/scripts/seed_whatsapp_test_shopkeeper.js +919999988888 "Test Shopkeeper"')
  console.error('  Or set TEST_SHOPKEEPER_PHONE in backend/.env')
  process.exit(1)
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is missing in backend/.env')
  process.exit(1)
}

await mongoose.connect(uri)

const shopkeeper = await Shopkeeper.findOneAndUpdate(
  { phoneNumber: phone },
  {
    $set: {
      whatsappOptIn: true,
      consentAt: new Date(),
      optOutAt: undefined,
      status: 'New',
    },
    $setOnInsert: {
      name,
      shopName: `${name} Store`,
      phoneNumber: phone,
      category: 'Kirana / Grocery',
      preferredLanguage: 'Hindi',
    },
  },
  { new: true, upsert: true, runValidators: true }
)

console.log('✅ Test shopkeeper ready for WhatsApp demo:')
console.log(`   id: ${shopkeeper._id}`)
console.log(`   name: ${shopkeeper.name}`)
console.log(`   shop: ${shopkeeper.shopName}`)
console.log(`   phone: ${shopkeeper.phoneNumber}`)
console.log(`   whatsappOptIn: ${shopkeeper.whatsappOptIn}`)
console.log('')
console.log('Now WhatsApp the Sandbox / Meta number from this phone — the AI should reply.')

await mongoose.disconnect()
process.exit(0)
