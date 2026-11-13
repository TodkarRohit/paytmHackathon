/**
 * Authentication & Authorization Middleware
 * 
 * Extracts and verifies signed JWT tokens from 'Authorization: Bearer <token>'.
 * Independently establishes authenticated user identity on `req.user`.
 * Enforces role-based permissions.
 */

import { verifyToken } from '../utils/jwt.js'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required: Missing or invalid Authorization Bearer token header',
    })
  }

  const token = authHeader.split(' ')[1]?.trim()
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required: Token is empty',
    })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: `Authentication failed: ${err.message}`,
    })
  }
}

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]`,
      })
    }
    next()
  }
}

export default {
  authenticate,
  requireRole,
}

