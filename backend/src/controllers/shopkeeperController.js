import { Shopkeeper, Lead, Assignment } from '../models/index.js'

/**
 * POST /api/shopkeepers
 * Create a new shopkeeper record with duplicate phone check.
 */
export const createShopkeeper = async (req, res, next) => {
  try {
    const {
      name,
      shopName,
      phoneNumber,
      category,
      address,
      currentDevices,
      preferredLanguage,
      dailyTransactionsEstimate,
      status,
      whatsappOptIn,
      consentAt,
      notes,
    } = req.body

    // Check for existing shopkeeper with same phone number
    if (phoneNumber) {
      const existing = await Shopkeeper.findOne({ phoneNumber: phoneNumber.trim() })
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: `A shopkeeper with phone number '${phoneNumber}' already exists.`,
          data: { id: existing._id },
        })
      }
    }

    const shopkeeper = await Shopkeeper.create({
      name,
      shopName,
      phoneNumber,
      category,
      address,
      currentDevices,
      preferredLanguage,
      dailyTransactionsEstimate,
      status,
      whatsappOptIn,
      consentAt,
      notes,
    })

    res.status(201).json({
      status: 'success',
      message: 'Shopkeeper created successfully',
      data: shopkeeper,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/shopkeepers
 * Get shopkeepers with search, filter, and assignment-based authorization.
 * 
 * - Admin: full directory access with all filters.
 * - Agent: scoped strictly to merchants connected via active assignments.
 * - Shopkeeper: forbidden (enforced by route middleware).
 */
export const getShopkeepers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const { search, category, city, status } = req.query
    const query = {}

    // Search filter across name, shopName, and phoneNumber
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      query.$or = [
        { name: searchRegex },
        { shopName: searchRegex },
        { phoneNumber: searchRegex },
      ]
    }

    // Explicit categorical filters
    if (category) {
      query.category = category
    }
    if (city) {
      query['address.city'] = new RegExp(`^${city.trim()}$`, 'i')
    }
    if (status) {
      query.status = status
    }

    // Assignment-based scoping for Agent role
    if (req.user?.role === 'Agent') {
      const agentId = req.user.agentId || req.user.userId

      // 1. Retrieve active assignments for this agent
      const activeAssignments = await Assignment.find({
        agentId,
        isActive: true,
      }).select('leadId').lean()

      if (!activeAssignments.length) {
        // Agent has no active assignments: return empty result safely
        return res.status(200).json({
          status: 'success',
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        })
      }

      const assignedLeadIds = activeAssignments.map((a) => a.leadId)

      // 2. Resolve assigned Lead records to associated shopkeeperIds
      const assignedLeads = await Lead.find({
        _id: { $in: assignedLeadIds },
      }).select('shopkeeperId').lean()

      const assignedShopkeeperIds = assignedLeads
        .map((l) => l.shopkeeperId)
        .filter(Boolean)

      if (!assignedShopkeeperIds.length) {
        return res.status(200).json({
          status: 'success',
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        })
      }

      // 3. Restrict query to assigned merchant IDs without overwriting existing filters
      if (query._id) {
        query._id = { $in: assignedShopkeeperIds, ...query._id }
      } else {
        query._id = { $in: assignedShopkeeperIds }
      }
    }

    const [shopkeepers, total] = await Promise.all([
      Shopkeeper.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Shopkeeper.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit) || 1

    res.status(200).json({
      status: 'success',
      data: shopkeepers,
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
 * GET /api/shopkeepers/:id
 * Get a single shopkeeper by ID with assignment-based authorization.
 * 
 * - Admin: full access.
 * - Agent: only if an active assignment connects the agent to a lead of this shopkeeper.
 */
export const getShopkeeperById = async (req, res, next) => {
  try {
    const shopkeeper = await Shopkeeper.findById(req.params.id)

    if (!shopkeeper) {
      return res.status(404).json({
        status: 'error',
        message: 'Shopkeeper not found',
      })
    }

    // Role-based authorization for Agent: verify active assignment
    if (req.user?.role === 'Agent') {
      const agentId = req.user.agentId || req.user.userId

      const leads = await Lead.find({ shopkeeperId: shopkeeper._id }).select('_id').lean()
      const leadIds = leads.map((l) => l._id)

      let hasActiveAssignment = false
      if (leadIds.length > 0) {
        const activeAssignment = await Assignment.findOne({
          agentId,
          leadId: { $in: leadIds },
          isActive: true,
        }).lean()
        hasActiveAssignment = !!activeAssignment
      }

      if (!hasActiveAssignment) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have an active assignment for this merchant',
        })
      }
    }

    const associatedLeadsCount = await Lead.countDocuments({ shopkeeperId: req.params.id })

    res.status(200).json({
      status: 'success',
      data: {
        ...shopkeeper.toObject(),
        associatedLeadsCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/shopkeepers/:id
 * Update an existing shopkeeper with assignment authorization.
 */
export const updateShopkeeper = async (req, res, next) => {
  try {
    const shopkeeper = await Shopkeeper.findById(req.params.id)

    if (!shopkeeper) {
      return res.status(404).json({
        status: 'error',
        message: 'Shopkeeper not found',
      })
    }

    // Role-based authorization for Agent
    if (req.user?.role === 'Agent') {
      const agentId = req.user.agentId || req.user.userId

      const leads = await Lead.find({ shopkeeperId: shopkeeper._id }).select('_id').lean()
      const leadIds = leads.map((l) => l._id)

      let hasActiveAssignment = false
      if (leadIds.length > 0) {
        const activeAssignment = await Assignment.findOne({
          agentId,
          leadId: { $in: leadIds },
          isActive: true,
        }).lean()
        hasActiveAssignment = !!activeAssignment
      }

      if (!hasActiveAssignment) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You do not have an active assignment for this merchant',
        })
      }
    }

    const updated = await Shopkeeper.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      status: 'success',
      message: 'Shopkeeper updated successfully',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/shopkeepers/:id
 * Delete a shopkeeper record with relational reference protection.
 * Restricted to Admin role.
 */
export const deleteShopkeeper = async (req, res, next) => {
  try {
    const leadsCount = await Lead.countDocuments({ shopkeeperId: req.params.id })
    if (leadsCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete shopkeeper: ${leadsCount} lead(s) are associated with this merchant. Please reassign or delete associated leads first.`,
      })
    }

    const shopkeeper = await Shopkeeper.findByIdAndDelete(req.params.id)

    if (!shopkeeper) {
      return res.status(404).json({
        status: 'error',
        message: 'Shopkeeper not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Shopkeeper deleted successfully',
      data: { id: req.params.id },
    })
  } catch (error) {
    next(error)
  }
}
