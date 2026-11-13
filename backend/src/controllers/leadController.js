import { Lead, Shopkeeper, Campaign, Assignment } from '../models/index.js'

/**
 * POST /api/leads
 * Create a new lead for a shopkeeper.
 */
export const createLead = async (req, res, next) => {
  try {
    const {
      shopkeeperId,
      interestedProducts,
      leadStatus,
      campaignId,
      aiSummary,
      confidenceScore,
      stage,
      priority,
      lastContactedAt,
    } = req.body

    // Relational validation: ensure shopkeeper exists
    if (!shopkeeperId) {
      return res.status(400).json({
        status: 'error',
        message: 'shopkeeperId is required to create a lead',
      })
    }

    const shopkeeper = await Shopkeeper.findById(shopkeeperId)
    if (!shopkeeper) {
      return res.status(404).json({
        status: 'error',
        message: `Shopkeeper not found with ID: ${shopkeeperId}`,
      })
    }

    // Optional campaign verification
    if (campaignId) {
      const campaign = await Campaign.findById(campaignId)
      if (!campaign) {
        return res.status(404).json({
          status: 'error',
          message: `Campaign not found with ID: ${campaignId}`,
        })
      }
    }

    const lead = await Lead.create({
      shopkeeperId,
      interestedProducts,
      leadStatus,
      campaignId,
      aiSummary,
      confidenceScore,
      stage,
      priority,
      lastContactedAt,
    })

    const populatedLead = await Lead.findById(lead._id)
      .populate('shopkeeperId', 'name shopName phoneNumber address.city category status')
      .populate('campaignId', 'campaignName productFocus channel')

    res.status(201).json({
      status: 'success',
      message: 'Lead created successfully',
      data: populatedLead,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/leads
 * Get all leads with pagination, filtering by status (Hot/Warm/Cold), stage, priority, and populated agent assignments.
 */
export const getLeads = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const { leadStatus, stage, priority, campaignId, shopkeeperId } = req.query
    const query = {}

    if (leadStatus) {
      query.leadStatus = leadStatus
    }
    if (stage) {
      query.stage = stage
    }
    if (priority) {
      query.priority = priority
    }
    if (campaignId) {
      query.campaignId = campaignId
    }
    if (shopkeeperId) {
      query.shopkeeperId = shopkeeperId
    }

    // Role-based scoping: Agents only see leads assigned to them
    if (req.user?.role === 'Agent') {
      const activeAssignments = await Assignment.find({
        agentId: req.user.agentId || req.user.userId,
        isActive: true,
      }).select('leadId').lean()
      const assignedLeadIds = activeAssignments.map((a) => a.leadId)
      query._id = { $in: assignedLeadIds }
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('shopkeeperId', 'name shopName phoneNumber address.city category status')
        .populate('campaignId', 'campaignName productFocus channel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ])

    // Attach active assignment & agent info for each lead
    const leadIds = leads.map((l) => l._id)
    const activeAssignments = await Assignment.find({
      leadId: { $in: leadIds },
      isActive: true,
    })
      .populate('agentId', 'name email phone territory status')
      .lean()

    const assignmentMap = new Map()
    activeAssignments.forEach((assign) => {
      assignmentMap.set(assign.leadId.toString(), assign)
    })

    const enrichedLeads = leads.map((lead) => {
      const activeAssign = assignmentMap.get(lead._id.toString()) || null
      return {
        ...lead,
        activeAssignment: activeAssign,
        assignedAgent: activeAssign?.agentId || null,
      }
    })

    const totalPages = Math.ceil(total / limit) || 1

    res.status(200).json({
      status: 'success',
      data: enrichedLeads,
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
 * GET /api/leads/:id
 * Get a single lead by ID with populated merchant, campaign, and assignment history.
 */
export const getLeadById = async (req, res, next) => {
  try {
    const [lead, assignments] = await Promise.all([
      Lead.findById(req.params.id)
        .populate('shopkeeperId', 'name shopName phoneNumber address.city category status currentDevices preferredLanguage')
        .populate('campaignId', 'campaignName productFocus channel campaignStatus'),
      Assignment.find({ leadId: req.params.id })
        .populate('agentId', 'name email phone territory status')
        .sort({ assignedAt: -1 }),
    ])

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found',
      })
    }

    const activeAssignment = assignments.find((a) => a.isActive) || null

    // Role-based authorization: Agent can only view leads actively assigned to them
    if (req.user?.role === 'Agent') {
      const currentAgentId = (req.user.agentId || req.user.userId)?.toString()
      const isAssigned = activeAssignment && activeAssignment.agentId?._id?.toString() === currentAgentId
      if (!isAssigned) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have an active assignment for this lead',
        })
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...lead.toObject(),
        activeAssignment,
        assignedAgent: activeAssignment?.agentId || null,
        assignmentHistory: assignments,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/leads/:id
 * Update an existing lead.
 */
export const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('shopkeeperId', 'name shopName phoneNumber address.city category status')
      .populate('campaignId', 'campaignName productFocus channel')

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Lead updated successfully',
      data: lead,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/leads/:id/status
 * Specifically update lead status (Hot, Warm, Cold).
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { leadStatus } = req.body

    if (!leadStatus || !['Hot', 'Warm', 'Cold'].includes(leadStatus)) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid lead status. Must be one of: 'Hot', 'Warm', 'Cold'",
      })
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $set: { leadStatus } },
      { new: true, runValidators: true }
    )
      .populate('shopkeeperId', 'name shopName phoneNumber address.city category status')

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: `Lead status updated to ${leadStatus}`,
      data: lead,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/leads/:id
 * Delete a lead and cleanly clean up associated assignments.
 */
export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id)

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found',
      })
    }

    // Clean up associated assignments
    await Assignment.deleteMany({ leadId: req.params.id })

    res.status(200).json({
      status: 'success',
      message: 'Lead and associated assignments deleted successfully',
      data: { id: req.params.id },
    })
  } catch (error) {
    next(error)
  }
}

