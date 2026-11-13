import express from 'express'
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
} from '../controllers/leadController.js'
import { validateObjectId } from '../middleware/validateId.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All lead CRM routes require authentication and Agent/Admin role
router.use(authenticate)
router.use(requireRole(['Agent', 'Admin']))

router.route('/')
  .post(createLead)
  .get(getLeads)

router.route('/:id')
  .get(validateObjectId('id'), getLeadById)
  .patch(validateObjectId('id'), updateLead)
  .delete(validateObjectId('id'), requireRole(['Admin']), deleteLead)

router.patch('/:id/status', validateObjectId('id'), updateLeadStatus)

export default router
