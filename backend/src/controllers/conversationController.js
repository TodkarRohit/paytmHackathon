import mongoose from 'mongoose'
import { Conversation, Shopkeeper, Assignment, Lead } from '../models/index.js'
import { generateSalesResponse, generateSupportResponse, isSupportDoubt } from '../services/aiAgentService.js'
import { conversationMutex } from '../utils/conversationMutex.js'

/**
 * Helper: Check if an agent has an active assignment for a given shopkeeper.
 * Traverses Assignment -> Lead -> Shopkeeper.
 */
async function isAgentAssignedToShopkeeper(agentId, shopkeeperId) {
  if (!agentId || !shopkeeperId) return false

  const merchantLeads = await Lead.find({ shopkeeperId }).select('_id').lean()
  if (!merchantLeads.length) return false
  const leadIds = merchantLeads.map((l) => l._id)

  const activeAssignment = await Assignment.findOne({
    agentId,
    leadId: { $in: leadIds },
    isActive: true,
  }).lean()

  return !!activeAssignment
}

/**
 * Helper: Retrieve all shopkeeper ObjectIds assigned to an agent via active assignments.
 */
async function getAssignedShopkeeperIdsForAgent(agentId) {
  if (!agentId) return []

  const activeAssignments = await Assignment.find({
    agentId,
    isActive: true,
  }).select('leadId').lean()

  if (!activeAssignments.length) return []
  const leadIds = activeAssignments.map((a) => a.leadId)

  const leads = await Lead.find({
    _id: { $in: leadIds },
  }).select('shopkeeperId').lean()

  return leads.map((l) => l.shopkeeperId)
}

/**
 * POST /api/conversations/chat
 * Multi-turn AI chat endpoint between merchant and Gemini AI Sales Agent.
 * 
 * Strict authorization:
 * - Shopkeeper: can only chat for their own authenticated shopkeeperId.
 * - Agent: can only chat for merchants they have an ACTIVE assignment for.
 * - Admin: authorized global sales oversight.
 * - All other roles: rejected with 403 Forbidden.
 */
export const chatWithAgent = async (req, res, next) => {
  try {
    const { message, conversationId, channel = 'Web Chat', mode = 'sales' } = req.body
    const bodyShopkeeperId = req.body.shopkeeperId

    let effectiveShopkeeperId = null
    const userRole = req.user?.role
    const agentId = req.user?.agentId || req.user?.userId

    if (userRole === 'Shopkeeper') {
      effectiveShopkeeperId = req.user.shopkeeperId
      if (bodyShopkeeperId && bodyShopkeeperId.toString() !== effectiveShopkeeperId.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You can only start or continue conversations for your own merchant account',
        })
      }
    } else if (userRole === 'Agent') {
      effectiveShopkeeperId = bodyShopkeeperId
      if (!effectiveShopkeeperId) {
        return res.status(400).json({
          status: 'error',
          message: 'shopkeeperId is required to start or continue a conversation',
        })
      }

      if (!mongoose.Types.ObjectId.isValid(effectiveShopkeeperId)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid shopkeeperId format: ${effectiveShopkeeperId}`,
        })
      }

      const isAssigned = await isAgentAssignedToShopkeeper(agentId, effectiveShopkeeperId)
      if (!isAssigned) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have an active assignment for this merchant',
        })
      }
    } else if (userRole === 'Admin') {
      effectiveShopkeeperId = bodyShopkeeperId
      if (!effectiveShopkeeperId) {
        return res.status(400).json({
          status: 'error',
          message: 'shopkeeperId is required to start or continue a conversation',
        })
      }
    } else {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Unauthorized role for conversation management',
      })
    }

    if (!mongoose.Types.ObjectId.isValid(effectiveShopkeeperId)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid shopkeeperId format: ${effectiveShopkeeperId}`,
      })
    }

    // Validation: message text and length constraint (max 1,000 characters)
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'message text is required and cannot be empty',
      })
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message exceeds maximum permitted length of 1,000 characters',
      })
    }

    // Concurrency Protection: Serialize concurrent requests to the same conversation / merchant
    const lockKey = conversationId ? String(conversationId) : `shopkeeper_${effectiveShopkeeperId}`

    await conversationMutex.run(lockKey, async () => {
      const shopkeeper = await Shopkeeper.findById(effectiveShopkeeperId)
      if (!shopkeeper) {
        return res.status(404).json({
          status: 'error',
          message: `Shopkeeper not found with ID: ${effectiveShopkeeperId}`,
        })
      }

      let conversation = null

      if (conversationId) {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid conversationId format: ${conversationId}`,
          })
        }

        conversation = await Conversation.findById(conversationId)
        if (!conversation) {
          return res.status(404).json({
            status: 'error',
            message: `Conversation not found with ID: ${conversationId}`,
          })
        }

        // Security check: verify conversation belongs to effective shopkeeper
        if (conversation.shopkeeperId.toString() !== effectiveShopkeeperId.toString()) {
          return res.status(403).json({
            status: 'error',
            message: 'Unauthorized: Conversation does not belong to the specified shopkeeper',
          })
        }
      } else {
        conversation = await Conversation.findOne({
          shopkeeperId: effectiveShopkeeperId,
          status: 'Active',
        })

        if (!conversation) {
          conversation = await Conversation.create({
            shopkeeperId: effectiveShopkeeperId,
            channel: ['WhatsApp', 'Voice Call', 'Web Chat'].includes(channel) ? channel : 'Web Chat',
            status: 'Active',
            messages: [],
          })
        }
      }

      // Check whether this turn is support/customer care or sales
      const isSupport = mode === 'support' || isSupportDoubt(message.trim())

      let reply, intent, sentiment
      let isEscalated = false

      if (isSupport) {
        const supportResult = await generateSupportResponse({
          merchant: shopkeeper,
          history: conversation.messages,
          message: message.trim(),
        })
        reply = supportResult.reply
        intent = 'Support_Request'
        sentiment = supportResult.sentiment || 'Neutral'
        isEscalated = supportResult.isEscalated
      } else {
        const salesResult = await generateSalesResponse({
          merchant: shopkeeper,
          history: conversation.messages,
          message: message.trim(),
        })
        reply = salesResult.reply
        intent = salesResult.intent
        sentiment = salesResult.sentiment
      }

      const userTimestamp = new Date()
      const aiTimestamp = new Date(userTimestamp.getTime() + 100)

      conversation.messages.push({
        sender: 'Shopkeeper',
        text: message.trim(),
        timestamp: userTimestamp,
        intentDetected: intent,
        sentiment,
      })

      conversation.messages.push({
        sender: 'AI',
        text: reply.trim(),
        timestamp: aiTimestamp,
        intentDetected: intent,
        sentiment: isSupport ? sentiment : 'Positive',
      })

      if (isSupport) {
        if (isEscalated) {
          conversation.escalatedToHuman = true
          conversation.status = 'Escalated to Agent'
        }
        conversation.aiSummary = `Latest topic: ${intent} (${sentiment} sentiment)`
      } else {
        if (intent === 'Purchase_Intent' || intent === 'Pricing_Inquiry') {
          conversation.detectedInterest = true
        }
        conversation.aiSummary = `Latest topic: ${intent} (${sentiment} sentiment)`
      }

      await conversation.save()

      res.status(200).json({
        status: 'success',
        data: {
          conversationId: conversation._id,
          reply,
          intentDetected: intent,
          sentiment,
          messageCount: conversation.messages.length,
          channel: conversation.channel,
          status: conversation.status,
        },
      })
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/conversations
 * Fetch conversations with pagination and assignment-based authorization.
 * 
 * - Shopkeeper: only their own conversations.
 * - Agent: only conversations of merchants actively assigned to this agent.
 * - Admin: all conversations.
 */
export const getConversations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const { status, support, search } = req.query
    const query = {}
    const userRole = req.user?.role
    const agentId = req.user?.agentId || req.user?.userId

    if (userRole === 'Shopkeeper') {
      query.shopkeeperId = req.user.shopkeeperId
    } else if (userRole === 'Agent') {
      const assignedShopkeeperIds = await getAssignedShopkeeperIdsForAgent(agentId)

      if (req.query.shopkeeperId) {
        const isAssigned = assignedShopkeeperIds.some(
          (id) => id.toString() === req.query.shopkeeperId.toString()
        )
        if (!isAssigned) {
          return res.status(403).json({
            status: 'error',
            message: 'Unauthorized: You do not have an active assignment for the requested merchant',
          })
        }
        query.shopkeeperId = req.query.shopkeeperId
      } else {
        query.shopkeeperId = { $in: assignedShopkeeperIds }
      }
    } else if (userRole === 'Admin') {
      if (req.query.shopkeeperId) {
        query.shopkeeperId = req.query.shopkeeperId
      }
    } else {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Unauthorized role for conversation management',
      })
    }

    if (status && status !== 'All') {
      if (status === 'Open') {
        query.status = 'Active'
      } else {
        query.status = status
      }
    }

    // Support doubt filter: conversations with support doubt or escalation
    if (support === 'true' || support === true) {
      query.$or = [
        { 'messages.intentDetected': 'Support_Request' },
        { escalatedToHuman: true },
        { status: 'Escalated to Agent' },
      ]
    }

    // Search filter: merchant name, shop name, or phone number
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      const matchedShopkeepers = await Shopkeeper.find({
        $or: [
          { name: searchRegex },
          { shopName: searchRegex },
          { phoneNumber: searchRegex },
        ],
      })
        .select('_id')
        .lean()

      const matchedIds = matchedShopkeepers.map((s) => s._id)

      if (query.shopkeeperId) {
        if (query.shopkeeperId.$in) {
          const allowedSet = new Set(query.shopkeeperId.$in.map((id) => id.toString()))
          query.shopkeeperId = { $in: matchedIds.filter((id) => allowedSet.has(id.toString())) }
        } else {
          const allowedStr = query.shopkeeperId.toString()
          if (!matchedIds.some((id) => id.toString() === allowedStr)) {
            query.shopkeeperId = new mongoose.Types.ObjectId()
          }
        }
      } else {
        query.shopkeeperId = { $in: matchedIds }
      }
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('shopkeeperId', 'name shopName phoneNumber category address.city preferredLanguage currentDevices')
        .populate('leadId', 'leadStatus stage priority')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit) || 1

    res.status(200).json({
      status: 'success',
      data: conversations,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/conversations/:id
 * Retrieve a single conversation transcript with populated relations.
 * 
 * Strict authorization:
 * - Shopkeeper: only their own conversation.
 * - Agent: only if they have an active assignment for the merchant in this conversation.
 * - Admin: global access.
 */
export const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('shopkeeperId', 'name shopName phoneNumber category address preferredLanguage currentDevices dailyTransactionsEstimate')
      .populate('leadId', 'leadStatus stage priority confidenceScore interestedProducts')
      .populate('campaignId', 'campaignName productFocus')

    if (!conversation) {
      return res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      })
    }

    const userRole = req.user?.role
    const agentId = req.user?.agentId || req.user?.userId
    const convShopkeeperId = conversation.shopkeeperId?._id || conversation.shopkeeperId

    if (userRole === 'Shopkeeper') {
      if (convShopkeeperId.toString() !== req.user.shopkeeperId?.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have permission to view this conversation',
        })
      }
    } else if (userRole === 'Agent') {
      const isAssigned = await isAgentAssignedToShopkeeper(agentId, convShopkeeperId)
      if (!isAssigned) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have an active assignment for this merchant conversation',
        })
      }
    } else if (userRole === 'Admin') {
      // Admin is authorized
    } else {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Unauthorized role for conversation management',
      })
    }

    const convData = conversation.toObject ? conversation.toObject() : conversation

    // Retrieve active assignment and lead info if available
    const leadId = convData.leadId?._id || convData.leadId
    let assignment = null
    if (leadId) {
      assignment = await Assignment.findOne({ leadId, isActive: true })
        .populate('agentId', 'name email phone territory status')
        .lean()
    } else {
      const merchantLead = await Lead.findOne({ shopkeeperId: convShopkeeperId })
        .select('leadStatus stage priority confidenceScore interestedProducts')
        .lean()
      if (merchantLead) {
        convData.leadId = merchantLead
        assignment = await Assignment.findOne({ leadId: merchantLead._id, isActive: true })
          .populate('agentId', 'name email phone territory status')
          .lean()
      }
    }
    convData.assignment = assignment

    res.status(200).json({
      status: 'success',
      data: convData,
    })
  } catch (error) {
    next(error)
  }
}
