import express from 'express'
import { login, demoLogin, getMe } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', login)
router.post('/demo-login', demoLogin)
router.get('/me', authenticate, getMe)

export default router

