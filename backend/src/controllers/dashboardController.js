import { Shopkeeper, Lead, Campaign, Agent, Assignment } from '../models/index.js'

/**
 * GET /api/dashboard/stats
 * Computes live dashboard metrics directly from MongoDB Atlas records.
 * Role-scoped:
 * - Admin: Full platform oversight across all merchants, leads, and agents.
 * - Agent: Scoped strictly to the agent's actively assigned leads and merchants.
 * - Shopkeeper: Forbidden (HTTP 403).
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userRole = req.user?.role
    const agentId = req.user?.agentId || req.user?.userId

    if (userRole === 'Shopkeeper') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Access restricted to sales agents and administrators',
      })
    }

    if (userRole === 'Agent') {
      // Find leads actively assigned to this agent
      const activeAssignments = await Assignment.find({
        agentId,
        isActive: true,
      }).select('leadId').lean()

      const assignedLeadIds = activeAssignments.map((a) => a.leadId)

      const [
        assignedLeadsDocs,
        hotLeads,
        warmLeads,
        coldLeads,
        identifiedCount,
        agentAssignedCount,
        demoScheduledCount,
        wonCount,
        lostCount,
        totalCampaigns,
        activeCampaigns,
      ] = await Promise.all([
        Lead.find({ _id: { $in: assignedLeadIds } }).select('shopkeeperId').lean(),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatus: 'Hot' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatus: 'Warm' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatus: 'Cold' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, stage: 'Identified' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, stage: 'Agent Assigned' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, stage: 'Demo Scheduled' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, stage: 'Won' }),
        Lead.countDocuments({ _id: { $in: assignedLeadIds }, stage: 'Lost' }),
        Campaign.countDocuments(),
        Campaign.countDocuments({ campaignStatus: 'Active' }),
      ])

      const totalLeads = assignedLeadIds.length
      const assignedShopkeeperCount = new Set(
        assignedLeadsDocs.map((l) => l.shopkeeperId?.toString()).filter(Boolean)
      ).size

      const conversionRate =
        totalLeads > 0 ? Number(((wonCount / totalLeads) * 100).toFixed(1)) : 0

      return res.status(200).json({
        status: 'success',
        data: {
          overview: {
            totalShopkeepers: assignedShopkeeperCount,
            totalLeads,
            hotLeads,
            warmLeads,
            coldLeads,
            totalCampaigns,
            activeCampaigns,
            totalAgents: 1,
            availableAgents: 1,
          },
          conversion: {
            won: wonCount,
            lost: lostCount,
            conversionRate,
            pipeline: {
              identified: identifiedCount,
              agentAssigned: agentAssignedCount,
              demoScheduled: demoScheduledCount,
              won: wonCount,
              lost: lostCount,
            },
          },
        },
      })
    }

    // Admin Role: Full platform metrics
    const [
      totalShopkeepers,
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      totalCampaigns,
      activeCampaigns,
      totalAgents,
      availableAgents,
      identifiedCount,
      agentAssignedCount,
      demoScheduledCount,
      wonCount,
      lostCount,
    ] = await Promise.all([
      Shopkeeper.countDocuments(),
      Lead.countDocuments(),
      Lead.countDocuments({ leadStatus: 'Hot' }),
      Lead.countDocuments({ leadStatus: 'Warm' }),
      Lead.countDocuments({ leadStatus: 'Cold' }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ campaignStatus: 'Active' }),
      Agent.countDocuments(),
      Agent.countDocuments({ status: 'Available' }),
      Lead.countDocuments({ stage: 'Identified' }),
      Lead.countDocuments({ stage: 'Agent Assigned' }),
      Lead.countDocuments({ stage: 'Demo Scheduled' }),
      Lead.countDocuments({ stage: 'Won' }),
      Lead.countDocuments({ stage: 'Lost' }),
    ])

    const conversionRate =
      totalLeads > 0 ? Number(((wonCount / totalLeads) * 100).toFixed(1)) : 0

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalShopkeepers,
          totalLeads,
          hotLeads,
          warmLeads,
          coldLeads,
          totalCampaigns,
          activeCampaigns,
          totalAgents,
          availableAgents,
        },
        conversion: {
          won: wonCount,
          lost: lostCount,
          conversionRate,
          pipeline: {
            identified: identifiedCount,
            agentAssigned: agentAssignedCount,
            demoScheduled: demoScheduledCount,
            won: wonCount,
            lost: lostCount,
          },
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
