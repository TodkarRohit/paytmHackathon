/**
 * Paytm AI Sales Agent Service
 * 
 * Powered by Google Gemini API (@google/genai).
 * Handles multilingual conversation (Hindi, English, Hinglish),
 * grounded Paytm Soundbox product knowledge, and objection handling.
 */

import { GoogleGenAI } from '@google/genai'
import { VERIFIED_SOUNDBOX_KNOWLEDGE } from '../config/soundboxKnowledge.js'

let aiClientInstance = null

/**
 * Safely retrieve or initialize the GoogleGenAI client.
 * Throws a descriptive error if the API key is not configured.
 */
export function getGenAIClient() {
  if (aiClientInstance) {
    return aiClientInstance
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    const error = new Error('GEMINI_API_KEY is not configured in backend environment.')
    error.code = 'GEMINI_KEY_MISSING'
    error.status = 503
    throw error
  }

  aiClientInstance = new GoogleGenAI({ apiKey: apiKey.trim() })
  return aiClientInstance
}

/**
 * Set custom GenAI client instance (useful for testing and dependency injection).
 */
export function setGenAIClient(client) {
  aiClientInstance = client
}

/**
 * Builds system instruction grounded strictly in verified product facts
 * and official unverified information policies from soundboxKnowledge.js.
 */
export function buildSalesSystemInstruction(merchant = null, systemNotices = []) {
  const merchantContext = merchant
    ? `
MERCHANT CONTEXT:
- Merchant Name: ${merchant.name || 'Merchant'}
- Shop Name: ${merchant.shopName || 'Retail Store'}
- Category: ${merchant.category || 'Retail'}
- City: ${merchant.address?.city || 'Jaipur'}
- Preferred Language: ${merchant.preferredLanguage || 'Hindi / Hinglish'}
- Existing Payment Devices: ${
        Array.isArray(merchant.currentDevices) && merchant.currentDevices.length > 0
          ? merchant.currentDevices.join(', ')
          : 'None'
      }
`
    : ''

  const systemContext =
    Array.isArray(systemNotices) && systemNotices.length > 0
      ? `
RECENT SYSTEM / PLATFORM NOTICES:
${systemNotices.map((n) => `- ${n}`).join('\n')}
`
      : ''

  const product = VERIFIED_SOUNDBOX_KNOWLEDGE.product
  const unverified = VERIFIED_SOUNDBOX_KNOWLEDGE.unverifiedInformationPolicy
  const objections = VERIFIED_SOUNDBOX_KNOWLEDGE.objectionGuidelines

  return `You are the official Paytm AI Sales Assistant, representing Paytm to Indian shopkeepers and retail merchants.
Your mission is to politely understand their business, explain how the ${product.name} helps their shop, answer questions, and address their concerns.

${merchantContext}${systemContext}
LANGUAGE & TONE GUIDELINES:
1. Support Hindi, English, and Hinglish (conversational mix of Hindi and English words written in Latin script, e.g., "Namaste Ramesh ji, Soundbox se aapko instant audio alert milta hai").
2. Always match the merchant's choice of language:
   - If the merchant writes in Hindi (Devanagari), respond in polite, clear Hindi.
   - If the merchant writes in Hinglish, respond naturally in Hinglish.
   - If the merchant writes in English, respond in professional, friendly English.
3. Keep answers concise, respectful, and practical for busy shopkeepers (2 to 4 sentences per turn). Avoid overly long corporate jargon.
4. Greet the merchant politely using their name when known (e.g., "Namaste [Name] ji").

VERIFIED PRODUCT KNOWLEDGE (${product.name}):
- Primary Purpose: ${product.primaryPurpose}
- Supported Payment Apps: ${product.supportedPaymentMethods.join(', ')}
- Supported Voice Alert Languages: ${product.supportedLanguages.join(', ')}
- Key Verified Benefits:
${product.keyBenefits.map((b) => `  * ${b}`).join('\n')}

STRICT UNVERIFIED INFORMATION POLICIES (DO NOT INVENT):
- Pricing: ${unverified.pricing}
- Promotions: ${unverified.promotions}
- Hardware Specs: ${unverified.hardwareSpecs}
- Guarantees: ${unverified.guarantees}

CRITICAL COMPLIANCE DIRECTIVES:
1. NEVER quote specific rental rates (e.g., ₹125/month or ₹4-5/day), purchase costs, or discounts. When asked about pricing, state that official pricing depends on the applicable Paytm plan for their store and recommend verifying via the Paytm for Business app or an authorized Paytm sales representative.
2. NEVER quote specific battery backup hours or multi-day durations. Describe it simply as battery-operated for counter mobility with standard charging.
3. NEVER make absolute fraud claims (e.g. "stops all fraud"). Accurately explain that instant audible confirmation announces payment receipts aloud so merchants do not rely solely on customer phone screens; for large or disputed amounts, merchants should confirm in the Paytm for Business app.

OBJECTION HANDLING MATRIX:
${objections.map((o) => `- When merchant says "${o.objection}": ${o.rebuttal}`).join('\n')}
`
}

/**
 * Heuristically detect basic intent from the user message for metadata logging.
 */
function detectIntent(text = '') {
  const lower = text.toLowerCase()
  if (lower.includes('price') || lower.includes('cost') || lower.includes('kitna') || lower.includes('rent') || lower.includes('fee')) {
    return 'Pricing_Inquiry'
  }
  if (lower.includes('battery') || lower.includes('sound') || lower.includes('language') || lower.includes('feature') || lower.includes('kaise')) {
    return 'Feature_Inquiry'
  }
  if (lower.includes('chahiye') || lower.includes('buy') || lower.includes('order') || lower.includes('install') || lower.includes('lagwana')) {
    return 'Purchase_Intent'
  }
  if (lower.includes('nahi') || lower.includes('no') || lower.includes('expensive') || lower.includes('already') || lower.includes('pehle se')) {
    return 'Objection_Raised'
  }
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('namaste') || lower.includes('kya')) {
    return 'Greeting_Or_General'
  }
  return 'General_Dialogue'
}

/**
 * Heuristically detect message sentiment.
 */
function detectSentiment(text = '') {
  const lower = text.toLowerCase()
  if (lower.includes('accha') || lower.includes('good') || lower.includes('thanks') || lower.includes('theek') || lower.includes('chahiye') || lower.includes('yes') || lower.includes('sahi')) {
    return 'Positive'
  }
  if (lower.includes('nahi') || lower.includes('bekar') || lower.includes('bad') || lower.includes('hate') || lower.includes('fraud') || lower.includes('no')) {
    return 'Negative'
  }
  return 'Neutral'
}

/**
 * Safely format conversation history and the current user message into
 * Gemini-compliant turns for the official @google/genai SDK.
 * 
 * Rules enforced:
 * 1. The first turn in contents always has role 'user'.
 * 2. Consecutive turns with the same role are merged to maintain strict alternation.
 * 3. Only valid messages with non-empty text are included.
 * 4. Senders are mapped deliberately:
 *    - 'Shopkeeper' -> role: 'user'
 *    - 'AI' -> role: 'model'
 *    - 'Agent' -> role: 'model', labeled as [Paytm Field Executive]
 *    - 'System' -> collected into systemNotices (never passed as ordinary AI response)
 * 5. Current shopkeeper message is appended with role 'user'.
 * 6. Empty history is supported cleanly.
 * 7. Existing limit of up to 10 recent messages is preserved.
 */
export function formatConversationContents({ history = [], message }) {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    throw new Error('Message text is required to generate AI response.')
  }

  const recentHistory = Array.isArray(history) ? history.slice(-10) : []
  const rawTurns = []
  const systemNotices = []

  for (const m of recentHistory) {
    if (!m || typeof m.text !== 'string' || m.text.trim() === '') {
      continue
    }

    const text = m.text.trim()

    if (m.sender === 'System') {
      systemNotices.push(text)
    } else if (m.sender === 'Shopkeeper') {
      rawTurns.push({ role: 'user', text })
    } else if (m.sender === 'AI') {
      rawTurns.push({ role: 'model', text })
    } else if (m.sender === 'Agent') {
      rawTurns.push({
        role: 'model',
        text: `[Paytm Field Executive]: ${text}`,
      })
    } else {
      // For any unrecognized sender, capture as system notice rather than guessing AI
      systemNotices.push(`[${m.sender || 'Notice'}]: ${text}`)
    }
  }

  // Merge consecutive turns with the same role to preserve conversational meaning and order
  const mergedTurns = []
  for (const turn of rawTurns) {
    const lastTurn = mergedTurns[mergedTurns.length - 1]
    if (lastTurn && lastTurn.role === turn.role) {
      lastTurn.text += `\n${turn.text}`
    } else {
      mergedTurns.push({ role: turn.role, text: turn.text })
    }
  }

  // Gemini API requires the dialogue to start with role 'user'
  while (mergedTurns.length > 0 && mergedTurns[0].role === 'model') {
    mergedTurns.shift()
  }

  // Append the current shopkeeper message (role: 'user')
  const currentMsgText = message.trim()
  const lastTurn = mergedTurns[mergedTurns.length - 1]
  if (lastTurn && lastTurn.role === 'user') {
    lastTurn.text += `\n${currentMsgText}`
  } else {
    mergedTurns.push({ role: 'user', text: currentMsgText })
  }

  const contents = mergedTurns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }))

  return {
    contents,
    systemNotices,
  }
}

/**
 * Generate an AI sales response using Google Gemini.
 * 
 * @param {Object} params
 * @param {Object} params.merchant - Mongoose Shopkeeper document or plain object
 * @param {Array} params.history - Array of past message objects ({ sender: 'Shopkeeper'|'AI', text: string })
 * @param {string} params.message - Current user message
 * @param {string} [params.modelName='gemini-2.5-flash'] - Model name
 * @returns {Promise<{ reply: string, intent: string, sentiment: string }>}
 */
export async function generateSalesResponse({
  merchant = null,
  history = [],
  message,
  modelName = 'gemini-2.5-flash',
}) {
  const { contents, systemNotices } = formatConversationContents({ history, message })
  const ai = getGenAIClient()
  const systemInstruction = buildSalesSystemInstruction(merchant, systemNotices)

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    })

    const reply = response.text?.trim() || 'Namaste. Mai Paytm AI Assistant hoon. Main aapki kaise madad kar sakta hoon?'
    const intent = detectIntent(message)
    const sentiment = detectSentiment(message)

    return {
      reply,
      intent,
      sentiment,
    }
  } catch (apiError) {
    // Sanitize API error to prevent leaking secrets or internal details
    let errorText = apiError.message || 'Gemini API processing failed'
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.error?.message) {
        errorText = parsed.error.message
      }
    } catch {
      // Not JSON string, keep original message
    }

    const err = new Error(`AI Sales Agent error: ${errorText}`)
    err.original = apiError
    err.status = apiError.status || 500
    throw err
  }
}

export default {
  getGenAIClient,
  setGenAIClient,
  buildSalesSystemInstruction,
  formatConversationContents,
  generateSalesResponse,
}
