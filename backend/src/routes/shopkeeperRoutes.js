import express from 'express'
import {
  createShopkeeper,
  getShopkeepers,
  getShopkeeperById,
  updateShopkeeper,
  deleteShopkeeper,
} from '../controllers/shopkeeperController.js'
import { validateObjectId } from '../middleware/validateId.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All shopkeeper CRM routes require authentication and Agent/Admin role
router.use(authenticate)
router.use(requireRole(['Agent', 'Admin']))

router.route('/')
  .post(createShopkeeper)
  .get(getShopkeepers)

router.route('/:id')
  .get(validateObjectId('id'), getShopkeeperById)
  .patch(validateObjectId('id'), updateShopkeeper)
  .delete(validateObjectId('id'), requireRole(['Admin']), deleteShopkeeper)

export default router
