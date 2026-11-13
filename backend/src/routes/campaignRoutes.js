import express from 'express'
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '../controllers/campaignController.js'
import { validateObjectId } from '../middleware/validateId.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All campaign CRM routes require authentication and Agent/Admin role
router.use(authenticate)
router.use(requireRole(['Agent', 'Admin']))

router.route('/')
  .post(requireRole(['Admin']), createCampaign)
  .get(getCampaigns)

router.route('/:id')
  .get(validateObjectId('id'), getCampaignById)
  .patch(validateObjectId('id'), requireRole(['Admin']), updateCampaign)
  .delete(validateObjectId('id'), requireRole(['Admin']), deleteCampaign)

export default router
