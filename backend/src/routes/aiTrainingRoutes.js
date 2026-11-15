import express from 'express'
import { aiTrainingController } from '../controllers/aiTrainingController.js'

const router = express.Router()

router.get('/', aiTrainingController.getConfig)
router.post('/', aiTrainingController.saveConfig)
router.post('/test-chat', aiTrainingController.testChat)
router.post('/reset', aiTrainingController.resetDefaults)

export default router
