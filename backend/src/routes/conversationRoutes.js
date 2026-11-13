import express from 'express'
import {
  chatWithAgent,
  getConversations,
  getConversationById,
} from '../controllers/conversationController.js'
import { validateObjectId } from '../middleware/validateId.js'
import { authenticate } from '../middleware/auth.js'
import { chatRateLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// All conversation endpoints require authentication
router.use(authenticate)

// AI Chat endpoint with 10 req/min rate limiter per user
router.post('/chat', chatRateLimiter({ windowMs: 60 * 1000, max: 10 }), chatWithAgent)
router.get('/', getConversations)
router.get('/:id', validateObjectId('id'), getConversationById)

export default router
