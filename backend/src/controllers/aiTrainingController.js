import mongoose from 'mongoose'
import { AiTrainingConfig } from '../models/index.js'
import { getGenAIClient } from '../services/aiAgentService.js'

const DEFAULT_CONFIG = {
  brandName: 'MerchantConnect AI',
  industryVertical: 'Retail & Fintech Payment Solutions',
  salesPersona: 'Consultative & Respectful Assistant',
  primaryLanguages: ['Hindi', 'Hinglish', 'English'],
  companyTagline:
    'Empowering local Indian merchants with seamless payment intelligence & smart business devices.',
  products: [
    {
      name: 'MerchantConnect Smart Soundbox 4.0',
      description: 'Portable wireless audio payment confirmation device for retail counters.',
      pitchSnippet:
        'Hear instant voice payment alerts in Hindi, Hinglish, and 10 regional Indian languages as soon as customer scans your QR code.',
    },
    {
      name: 'All-in-One EDC Card Machine',
      description: 'Debit/Credit card swipe & contactless tap terminal with integrated QR printer.',
      pitchSnippet:
        'Accept all Visa, RuPay, Mastercard debit/credit cards with zero-wait settlement and fast paper receipt printing.',
    },
    {
      name: 'Instant Merchant Business Loan',
      description: 'Collateral-free working capital financing based on daily digital payment turnover.',
      pitchSnippet:
        'Get up to ₹5,00,000 credit line with automated daily repayments directly from your UPI settlements.',
    },
  ],
  valuePropositions: [
    'Instant audio voice payment confirmation in local languages',
    'Protects against fake payment screenshots and digital payment fraud',
    'Zero manual SMS checking during busy counter rush hours',
    'All-in-one payment reconciliation via business app',
  ],
  objectionPlaybook: [
    {
      objection: 'Already have a paper QR standee',
      rebuttal:
        'A paper QR only shows static details. During rush hours, customers can show fake screenshots. Our smart audio speaker announces payment receipt aloud immediately so you never lose money.',
    },
    {
      objection: 'Shop is too small or low footfall',
      rebuttal:
        'Even for small shops, missing even one ₹500 payment hurts profitability. The smart audio alert frees you from checking your personal phone repeatedly.',
    },
    {
      objection: 'Rental fee inquiry or pricing concern',
      rebuttal:
        'Our pricing plans are customized based on your shop category and monthly volume with promotional waivers. Our field rep will visit to demonstrate and share the best active offer.',
    },
  ],
  complianceRules: [
    'Never invent unverified monthly rental fees or hardware costs without official rate card.',
    'Never make absolute fraud prevention claims (explain that audio alert helps verify receipt immediately).',
    'Always address shopkeepers respectfully with [Name] ji.',
    'If customer requests an on-site visit or customized commercial quote, assign to a field representative.',
  ],
}

let activeMemoryConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

export const aiTrainingController = {
  // GET /api/ai-training
  getConfig: async (req, res) => {
    try {
      const isDbConnected = mongoose.connection.readyState === 1
      if (isDbConnected) {
        let config = await AiTrainingConfig.findOne().sort({ updatedAt: -1 }).lean()
        if (!config) {
          config = await AiTrainingConfig.create(DEFAULT_CONFIG)
        }
        return res.status(200).json({
          status: 'success',
          data: config,
          database: { connected: true },
        })
      }

      res.status(200).json({
        status: 'success',
        data: activeMemoryConfig,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/ai-training
  saveConfig: async (req, res) => {
    try {
      const body = req.body
      const isDbConnected = mongoose.connection.readyState === 1

      if (isDbConnected) {
        let config = await AiTrainingConfig.findOne().sort({ updatedAt: -1 })
        if (config) {
          Object.assign(config, body)
          await config.save()
        } else {
          config = await AiTrainingConfig.create(body)
        }

        activeMemoryConfig = config.toObject()
        return res.status(200).json({
          status: 'success',
          message: 'AI Training knowledge base updated and saved to database.',
          data: config,
          database: { connected: true },
        })
      }

      activeMemoryConfig = { ...activeMemoryConfig, ...body }
      res.status(200).json({
        status: 'success',
        message: 'AI Training knowledge base updated.',
        data: activeMemoryConfig,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/ai-training/test-chat
  // Live simulation testbench for the sales person to test their trained AI
  testChat: async (req, res) => {
    try {
      const { userMessage, history = [], trainingConfig = activeMemoryConfig } = req.body
      if (!userMessage || !userMessage.trim()) {
        return res.status(400).json({ status: 'fail', message: 'Message cannot be empty.' })
      }

      // Build system prompt strictly from the sales person's customized training parameters
      const systemPrompt = `You are the official ${trainingConfig.brandName} sales representative assistant.
Industry: ${trainingConfig.industryVertical}.
Sales Persona & Tone: ${trainingConfig.salesPersona}.
Languages Supported: ${(trainingConfig.primaryLanguages || []).join(', ')}.
Tagline: ${trainingConfig.companyTagline || ''}.

PRODUCTS OFFERED:
${(trainingConfig.products || [])
  .map((p) => `- ${p.name}: ${p.description} (Pitch: ${p.pitchSnippet})`)
  .join('\n')}

KEY VALUE PROPOSITIONS:
${(trainingConfig.valuePropositions || []).map((v) => `* ${v}`).join('\n')}

OBJECTION HANDLING PLAYBOOK:
${(trainingConfig.objectionPlaybook || [])
  .map((o) => `When customer says "${o.objection}": Rebuttal: "${o.rebuttal}"`)
  .join('\n')}

COMPLIANCE & GUARDRAILS:
${(trainingConfig.complianceRules || []).map((r) => `- ${r}`).join('\n')}

INSTRUCTIONS:
1. Respond politely in the language used by the shopkeeper (Hindi, English, or conversational Hinglish).
2. Keep responses brief (2 to 3 sentences maximum), practical, and business-focused.
3. Address the shopkeeper respectfully (e.g. "Namaste ji").`

      // Try running through Gemini if key is configured
      try {
        const client = getGenAIClient()
        const contents = []

        // Format history
        if (Array.isArray(history)) {
          for (const item of history) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.message }],
            })
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: userMessage.trim() }],
        })

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.6,
            maxOutputTokens: 250,
          },
        })

        const reply = response.text || 'Namaste ji! How can I assist your business today?'
        return res.status(200).json({
          status: 'success',
          reply,
          model: 'gemini-2.5-flash',
        })
      } catch (geminiError) {
        // Fallback simulation based on trained playbook if Gemini API key not yet set in .env
        const lower = userMessage.toLowerCase()
        let simulatedReply = `Namaste ji! Welcome to ${trainingConfig.brandName}. We help retail stores like yours with ${trainingConfig.industryVertical}.`

        // Check objection matches
        for (const o of trainingConfig.objectionPlaybook || []) {
          if (lower.includes(o.objection.toLowerCase()) || lower.includes('qr') || lower.includes('already')) {
            simulatedReply = o.rebuttal
            break
          }
        }

        if (lower.includes('price') || lower.includes('cost') || lower.includes('rent') || lower.includes('kitna')) {
          simulatedReply = `Namaste ji! Official pricing and rental plans for ${trainingConfig.brandName} devices depend on your store transaction volume. Our field executive can visit for a live demo and provide the best available plan.`
        }

        return res.status(200).json({
          status: 'success',
          reply: simulatedReply,
          model: 'simulated_fallback',
          note: geminiError.message ? 'Simulated response (Configure GEMINI_API_KEY in .env for live AI model)' : undefined,
        })
      }
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/ai-training/reset
  resetDefaults: async (req, res) => {
    try {
      const isDbConnected = mongoose.connection.readyState === 1
      if (isDbConnected) {
        let config = await AiTrainingConfig.findOne().sort({ updatedAt: -1 })
        if (config) {
          Object.assign(config, DEFAULT_CONFIG)
          await config.save()
        } else {
          config = await AiTrainingConfig.create(DEFAULT_CONFIG)
        }
        activeMemoryConfig = config.toObject()
      } else {
        activeMemoryConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
      }

      res.status(200).json({
        status: 'success',
        message: 'AI Training knowledge base reset to MerchantConnect AI default template.',
        data: activeMemoryConfig,
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },
}
