import express from 'express'
import authRoutes from './authRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import shopkeeperRoutes from './shopkeeperRoutes.js'
import leadRoutes from './leadRoutes.js'
import campaignRoutes from './campaignRoutes.js'
import agentRoutes from './agentRoutes.js'
import conversationRoutes from './conversationRoutes.js'

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/shopkeepers', shopkeeperRoutes)
router.use('/leads', leadRoutes)
router.use('/campaigns', campaignRoutes)
router.use('/agents', agentRoutes)
router.use('/conversations', conversationRoutes)

export default router

