import express from 'express'
import {
  createAgent,
  getAgents,
  getAgentById,
  getAgentLeads,
  updateAgent,
  deleteAgent,
  assignLeadToAgent,
} from '../controllers/agentController.js'
import { validateObjectId } from '../middleware/validateId.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All sales agent CRM routes require authentication and Agent/Admin role
router.use(authenticate)
router.use(requireRole(['Agent', 'Admin']))

router.route('/')
  .post(requireRole(['Admin']), createAgent)
  .get(getAgents)

router.post('/assign', requireRole(['Admin']), assignLeadToAgent)

router.route('/:id')
  .get(validateObjectId('id'), getAgentById)
  .patch(validateObjectId('id'), updateAgent)
  .delete(validateObjectId('id'), requireRole(['Admin']), deleteAgent)

router.get('/:id/leads', validateObjectId('id'), getAgentLeads)

export default router
