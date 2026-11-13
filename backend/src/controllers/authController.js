import mongoose from 'mongoose'
import { Shopkeeper, Agent } from '../models/index.js'
import { signToken, verifyPassword, hashPassword, generateSalt } from '../utils/jwt.js'

/**
 * POST /api/auth/login
 * Authenticate existing Agent, Admin, or Shopkeeper using verified credentials.
 * Asynchronous, timing-safe scrypt verification.
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, email, phoneNumber, phone, password } = req.body
    const loginId = (identifier || email || phoneNumber || phone || '').trim()

    if (!loginId || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Identifier (email or phone) and password are required',
      })
    }

    let user = null
    let role = null

    // 1. Check Agent collection (by email or phone)
    const agent = await Agent.findOne({
      $or: [{ email: loginId.toLowerCase() }, { phone: loginId }],
    }).select('+passwordHash +passwordSalt')

    if (agent) {
      user = agent
      role = agent.role || 'Agent'
    } else {
      // 2. Check Shopkeeper collection (by phone or email)
      const shopkeeper = await Shopkeeper.findOne({
        $or: [{ phoneNumber: loginId }, { email: loginId.toLowerCase() }],
      }).select('+passwordHash +passwordSalt')

      if (shopkeeper) {
        user = shopkeeper
        role = 'Shopkeeper'
      }
    }

    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials or user password not configured',
      })
    }

    const isValid = await verifyPassword(password, user.passwordSalt, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      })
    }

    const payload = {
      userId: user._id.toString(),
      role,
      name: user.name,
      ...(role === 'Shopkeeper' ? { shopkeeperId: user._id.toString() } : { agentId: user._id.toString() }),
    }

    const token = signToken(payload)

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          role,
          email: user.email,
          phone: user.phone || user.phoneNumber,
          ...(role === 'Shopkeeper' ? { shopName: user.shopName, shopkeeperId: user._id } : { agentId: user._id }),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/auth/demo-login
 * Restricted demo evaluator login for development/evaluation only.
 * 
 * STRICT SECURITY CONSTRAINTS:
 * 1. Disabled in production (HTTP 403).
 * 2. Admin demo login is strictly PROHIBITED (HTTP 400). Admin accounts MUST use POST /api/auth/login.
 * 3. Never binds to or exposes real merchant or customer records.
 * 4. Binds exclusively to isolated, synthetic sandbox identities ('Shopkeeper', 'Agent').
 */
export const demoLogin = async (req, res, next) => {
  try {
    // 1. Strictly disabled in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Demo login is strictly disabled in production environments.',
      })
    }

    const requestedRole = req.body?.role || 'Shopkeeper'

    // 2. Reject any attempt to claim the Admin role
    if (requestedRole === 'Admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Admin demo login is prohibited. Admin accounts require verified credentials via POST /api/auth/login.',
      })
    }

    // 3. Only non-privileged roles are allowed in demo mode
    if (!['Shopkeeper', 'Agent'].includes(requestedRole)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid demo role. Only non-privileged roles (Shopkeeper, Agent) are permitted in demo mode.',
      })
    }

    let user = null

    if (requestedRole === 'Shopkeeper') {
      // Find or provision isolated synthetic demo merchant (does not touch real merchants)
      user = await Shopkeeper.findOne({ phoneNumber: '+919999900000' })
      if (!user) {
        const salt = generateSalt()
        const hash = await hashPassword('demo1234', salt)
        user = await Shopkeeper.create({
          name: 'Demo Merchant (Sandbox)',
          shopName: 'Demo Store',
          phoneNumber: '+919999900000',
          email: 'demo.merchant@paytm-demo.local',
          category: 'Kirana / Grocery',
          role: 'Shopkeeper',
          passwordSalt: salt,
          passwordHash: hash,
        })
      }
    } else {
      // Find or provision isolated synthetic demo agent (has NO active assignments to real merchants)
      user = await Agent.findOne({ email: 'demo.agent@paytm-demo.local' })
      if (!user) {
        const salt = generateSalt()
        const hash = await hashPassword('demo1234', salt)
        user = await Agent.create({
          name: 'Demo Sales Agent (Sandbox)',
          email: 'demo.agent@paytm-demo.local',
          phone: '+918888800000',
          territory: 'Sandbox Territory',
          role: 'Agent',
          status: 'Available',
          passwordSalt: salt,
          passwordHash: hash,
        })
      }
    }

    const payload = {
      userId: user._id.toString(),
      role: requestedRole,
      name: user.name,
      isDemo: true,
      ...(requestedRole === 'Shopkeeper' ? { shopkeeperId: user._id.toString() } : { agentId: user._id.toString() }),
    }

    const token = signToken(payload)

    res.status(200).json({
      status: 'success',
      message: `Demo login successful as ${requestedRole} (Sandbox)`,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          role: requestedRole,
          email: user.email,
          phone: user.phone || user.phoneNumber,
          isDemo: true,
          ...(requestedRole === 'Shopkeeper' ? { shopName: user.shopName, shopkeeperId: user._id } : { agentId: user._id }),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/auth/me
 * Return current authenticated user profile based on JWT token.
 */
export const getMe = async (req, res, next) => {
  try {
    const { userId, role } = req.user

    let profile = null
    if (role === 'Shopkeeper') {
      profile = await Shopkeeper.findById(userId).lean()
    } else {
      profile = await Agent.findById(userId).lean()
    }

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found',
      })
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...profile,
        role,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Seed an authorized operations Admin user if none exists (for development & demo).
 * Called safely during startup.
 * 
 * Strict Security:
 * - Never contains hardcoded default passwords.
 * - Reads exclusively from ADMIN_INITIAL_PASSWORD environment variable.
 * - Enforces minimum 10 characters with mixed alphanumeric content.
 * - If admin exists, preserves existing account untouched.
 */
export const seedAdminUserIfMissing = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@paytm-sales.local'
  const existingAdmin = await Agent.findOne({ email: adminEmail })

  if (existingAdmin) {
    // Existing admin account preserved untouched; never overwrite
    return
  }

  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!adminPassword || adminPassword.trim() === '') {
    throw new Error(
      'Admin Configuration Error: ADMIN_INITIAL_PASSWORD environment variable is missing. Initial Admin cannot be provisioned without an explicit credential.'
    )
  }

  const trimmed = adminPassword.trim()
  if (trimmed.length < 10 || !/\d/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
    throw new Error(
      'Admin Configuration Error: ADMIN_INITIAL_PASSWORD does not meet strength requirements (must be at least 10 characters long and include letters and numbers).'
    )
  }

  const salt = generateSalt()
  const hash = await hashPassword(trimmed, salt)

  await Agent.create({
    name: 'Operations Sales Admin',
    email: adminEmail,
    phone: '+919000000000',
    territory: 'HQ - Central Operations',
    role: 'Admin',
    status: 'Available',
    passwordSalt: salt,
    passwordHash: hash,
  })
  console.log(`🔐 Seeded initial Admin user: ${adminEmail}`)
}
