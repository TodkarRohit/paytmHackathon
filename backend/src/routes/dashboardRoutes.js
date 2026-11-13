import express from 'express'
import { getDashboardStats } from '../controllers/dashboardController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)
router.get('/stats', requireRole(['Agent', 'Admin']), getDashboardStats)

export default router
