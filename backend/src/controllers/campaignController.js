import { Campaign, Lead } from '../models/index.js'

/**
 * POST /api/campaigns
 * Create a new outreach campaign.
 */
export const createCampaign = async (req, res, next) => {
  try {
    const {
      campaignName,
      productFocus,
      channel,
      targetAudience,
      startDate,
      endDate,
      campaignStatus,
    } = req.body

    const campaign = await Campaign.create({
      campaignName,
      productFocus,
      channel,
      targetAudience,
      startDate,
      endDate,
      campaignStatus,
    })

    res.status(201).json({
      status: 'success',
      message: 'Campaign created successfully',
      data: campaign,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/campaigns
 * Get all campaigns with pagination and status filter.
 */
export const getCampaigns = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const { status, channel, productFocus } = req.query
    const query = {}

    if (status) {
      query.campaignStatus = status
    }
    if (channel) {
      query.channel = channel
    }
    if (productFocus) {
      query.productFocus = productFocus
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Campaign.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit) || 1

    res.status(200).json({
      status: 'success',
      data: campaigns,
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
 * GET /api/campaigns/:id
 * Get a single campaign by ID.
 */
export const getCampaignById = async (req, res, next) => {
  try {
    const [campaign, associatedLeadsCount] = await Promise.all([
      Campaign.findById(req.params.id),
      Lead.countDocuments({ campaignId: req.params.id }),
    ])

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      })
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...campaign.toObject(),
        associatedLeadsCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/campaigns/:id
 * Update an existing campaign.
 */
export const updateCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Campaign updated successfully',
      data: campaign,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign with relational reference safeguards.
 */
export const deleteCampaign = async (req, res, next) => {
  try {
    // Relational protection: check if any leads are linked to this campaign
    const linkedLeadsCount = await Lead.countDocuments({ campaignId: req.params.id })
    if (linkedLeadsCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete campaign: ${linkedLeadsCount} lead(s) are sourced from this campaign. Please reassign or delete linked leads first.`,
      })
    }

    const campaign = await Campaign.findByIdAndDelete(req.params.id)

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      })
    }

    res.status(200).json({
      status: 'success',
      message: 'Campaign deleted successfully',
      data: { id: req.params.id },
    })
  } catch (error) {
    next(error)
  }
}

