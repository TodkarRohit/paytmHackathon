/**
 * Cryptographic Authentication Helper (Node.js native crypto)
 * 
 * Provides:
 * - RFC 7519 compliant HMAC-SHA256 JWT signing and verification
 * - NIST/OWASP compliant scrypt asynchronous password hashing with per-user cryptographic salt
 * - Constant-time signature and hash comparisons to prevent side-channel timing attacks
 * - Strict environment secret enforcement (no hardcoded fallback)
 * 
 * Zero external package dependencies.
 */

import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(crypto.scrypt)

const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf8')
}

/**
 * Retrieve and validate JWT signing secret from environment.
 * Strict: Fails safely with an exception if secret is missing or weak (<32 chars).
 * Never falls back to an insecure default secret.
 */
export const getSecretKey = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT Security Error: JWT_SECRET environment variable is missing. Refusing to operate without an explicit cryptographic secret.'
    )
  }
  if (secret.trim().length < 32) {
    throw new Error(
      'JWT Security Error: JWT_SECRET must be at least 32 characters long to ensure adequate cryptographic security.'
    )
  }
  return secret.trim()
}

/**
 * Generate a cryptographically random salt (16 bytes = 32 hex chars)
 */
export const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Hash password asynchronously with scrypt and salt.
 * Uses Node.js thread pool to avoid blocking the main event loop.
 */
export const hashPassword = async (password, salt) => {
  if (!password || !salt) {
    throw new Error('Password and salt are required for hashing')
  }
  const derivedKey = await scryptAsync(password, salt, 64)
  return derivedKey.toString('hex')
}

/**
 * Verify password against salt and stored hash using timing-safe comparison.
 * Asynchronous to prevent event loop blocking.
 */
export const verifyPassword = async (password, salt, storedHash) => {
  if (!password || !salt || !storedHash) return false
  const computedHash = await hashPassword(password, salt)
  const a = Buffer.from(computedHash, 'hex')
  const b = Buffer.from(storedHash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Sign payload into HS256 JWT
 * @param {Object} payload
 * @param {number} [expiresInSeconds=86400] 24 hours default
 */
export const signToken = (payload, expiresInSeconds = 86400) => {
  const secret = getSecretKey()
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${signature}`
}

/**
 * Verify and decode an HS256 JWT.
 * Strict checks:
 * - 3-part structure
 * - Timing-safe HMAC-SHA256 signature match
 * - alg header must strictly be 'HS256'
 * - Non-expired exp timestamp
 * 
 * @param {string} token
 * @returns {Object} decoded payload
 */
export const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or not a string')
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed token structure')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const secret = getSecretKey()
  const data = `${encodedHeader}.${encodedPayload}`

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expectedSignature)

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid token signature')
  }

  let header
  let payload
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader))
    payload = JSON.parse(base64UrlDecode(encodedPayload))
  } catch {
    throw new Error('Invalid token payload or header encoding')
  }

  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported token algorithm: ${header.alg}`)
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    throw new Error('Token has expired')
  }

  return payload
}

export default {
  getSecretKey,
  generateSalt,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
}
