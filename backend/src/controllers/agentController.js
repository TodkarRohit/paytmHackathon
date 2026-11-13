import { Agent, Assignment, Lead } from '../models/index.js'

/**
 * POST /api/agents
 * Create a new sales agent record.
 */
export const createAgent = async (req, res, next) => {
  try {
    const { name, email, phone, territory, status } = req.body

    const agent = await Agent.create({
      name,
      email,
      phone,
      territory,
      status,
    })

    res.status(201).json({
      status: 'success',
      message: 'Sales agent created successfully',
      data: agent,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/agents
 * Get all sales agents with live active leads count and pagination.
 */
export const getAgents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const { status, territory } = req.query
    const query = {}

    if (status) {
      query.status = status
    }
    if (territory) {
      query.territory = new RegExp(territory.trim(), 'i')
    }

    const [agents, total] = await Promise.all([
      Agent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Agent.countDocuments(query),
    ])

    // Compute live active leads count for each agent
    const agentIds = agents.map((a) => a._id)
    const activeAssignments = await Assignment.aggregate([
      { $match: { agentId: { $in: agentIds }, isActive: true } },
      { $group: { _id: '$agentId', count: { $sum: 1 } } },
    ])

    const countMap = new Map()
    activeAssignments.forEach((item) => {
      countMap.set(item._id.toString(), item.count)
    })

    const enrichedAgents = agents.map((agent) => ({
      ...agent,
      activeLeadsCount: countMap.get(agent._id.toString()) || 0,
    }))

    const totalPages = Math.ceil(total / limit) || 1

    res.status(200).json({
      status: 'success',
      data: enrichedAgents,
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
 * GET /api/agents/:id
 * Get a single agent by ID with live active leads count.
 */
export const getAgentById = async (req, res, next) => {
  try {
    // If caller is an Agent, restrict access strictly to their own profile
    if (req.user?.role === 'Agent') {
      const currentAgentId = (req.user.agentId || req.user.userId)?.toString()
      if (req.params.id !== currentAgentId) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You can only view your own agent profile',
        })
      }
    }

    const [agent, activeCount] = await Promise.all([
      Agent.findById(req.params.id),
      Assignment.countDocuments({ agentId: req.params.id, isActive: true }),
    ])

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Sales agent not found',
      })
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...agent.toObject(),
        activeLeadsCount: activeCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/agents/:id/leads
 * Track and list all active leads assigned to this specific agent.
 */
export const getAgentLeads = async (req, res, next) => {
  try {
    // If caller is an Agent, restrict to their own assigned leads
    if (req.user?.role === 'Agent') {
      const currentAgentId = (req.user.agentId || req.user.userId)?.toString()
      if (req.params.id !== currentAgentId) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You can only view your own assigned leads',
        })
      }
    }

    const agent = await Agent.findById(req.params.id)
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Sales agent not found',
      })
    }

    const assignments = await Assignment.find({
      agentId: req.params.id,
      isActive: true,
    })
      .populate({
        path: 'leadId',
        populate: {
          path: 'shopkeeperId',
          select: 'name shopName phoneNumber address category status',
        },
      })
      .sort({ assignedAt: -1 })

    res.status(200).json({
      status: 'success',
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          territory: agent.territory,
        },
        totalAssignedLeads: assignments.length,
        assignedLeads: assignments,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/agents/:id
 * Update an existing sales agent.
 */
export const updateAgent = async (req, res, next) => {
  try {
    const currentAgentId = (req.user.agentId || req.user.userId)?.toString()
    let updateData = req.body

    // If caller is an Agent, enforce self-modification and prevent role escalation
    if (req.user?.role === 'Agent') {
      if (req.params.id !== currentAgentId) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: You cannot modify another agent account',
        })
      }
      // Agents can only update their availability status or phone
      const { status, phone } = req.body
      updateData = {}
      if (status) updateData.status = status
      if (phone) updateData.phone = phone
    }

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Sales agent not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Sales agent updated successfully',
      data: agent,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/agents/:id
 * Delete a sales agent with relational protection against active assignments.
 */
export const deleteAgent = async (req, res, next) => {
  try {
    // Relational protection: check for active lead assignments
    const activeAssignmentsCount = await Assignment.countDocuments({
      agentId: req.params.id,
      isActive: true,
    })

    if (activeAssignmentsCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete sales agent: ${activeAssignmentsCount} active lead assignment(s) are currently allocated to this agent. Please reassign leads before deleting.`,
      })
    }

    const agent = await Agent.findByIdAndDelete(req.params.id)

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Sales agent not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Sales agent deleted successfully',
      data: { id: req.params.id },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/agents/assign
 * Assign or reassign a lead to an agent using the atomic Assignment.reassignLead transaction.
 */
export const assignLeadToAgent = async (req, res, next) => {
  try {
    const { leadId, agentId, assignedBy, priority, notes } = req.body

    if (!leadId || !agentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Both leadId and agentId are required to assign a lead',
      })
    }

    // Verify lead and agent exist
    const [lead, agent] = await Promise.all([
      Lead.findById(leadId),
      Agent.findById(agentId),
    ])

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: `Lead not found with ID: ${leadId}`,
      })
    }

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: `Sales agent not found with ID: ${agentId}`,
      })
    }

    // Use atomic transaction on Assignment model
    const newAssignment = await Assignment.reassignLead({
      leadId,
      newAgentId: agentId,
      assignedBy: assignedBy || 'Admin',
      priority: priority || 'Standard',
      notes,
    })

    // Update lead stage to 'Agent Assigned' if currently 'Identified'
    if (lead.stage === 'Identified') {
      await Lead.findByIdAndUpdate(leadId, { $set: { stage: 'Agent Assigned' } })
    }

    const populatedAssignment = await Assignment.findById(newAssignment._id)
      .populate('agentId', 'name email phone territory status')
      .populate('leadId', 'shopkeeperId leadStatus stage priority')

    res.status(200).json({
      status: 'success',
      message: `Lead successfully assigned to agent: ${agent.name}`,
      data: populatedAssignment,
    })
  } catch (error) {
    next(error)
  }
}

