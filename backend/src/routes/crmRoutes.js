import express from 'express'
import { crmController } from '../controllers/crmController.js'

const router = express.Router()

router.get('/leads', crmController.getAll)
router.post('/leads', crmController.create)
router.patch('/leads/:id', crmController.update)
router.delete('/leads/:id', crmController.delete)
router.post('/dispatch-all', crmController.dispatchAll)
router.post('/run-cadence', crmController.runCadence)
router.post('/clear', crmController.clear)

export default router
