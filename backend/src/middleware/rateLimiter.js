/**
 * In-Memory Rate Limiter for AI Chat Endpoint
 * 
 * Enforces a maximum of 10 requests per minute per authenticated user identity
 * (falling back to client IP address if unauthenticated).
 * 
 * Architecture Note:
 * This in-memory implementation is designed for the current single-server deployment.
 * For horizontal multi-instance scaling, a distributed memory store (such as Redis)
 * should back the rate limit counter.
 */

export const chatRateLimiter = ({
  windowMs = 60 * 1000,
  max = 10,
  message = 'Rate limit exceeded. You can send up to 10 messages per minute. Please wait a moment before trying again.',
} = {}) => {
  const hits = new Map()

  return (req, res, next) => {
    // Key strictly by authenticated user ID if present; fallback to IP
    const key = req.user?.userId || req.user?.shopkeeperId || req.ip || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()

    let record = hits.get(key)
    if (!record || now - record.resetTime > windowMs) {
      record = { count: 1, resetTime: now }
      hits.set(key, record)
    } else {
      record.count++
    }

    // Periodic sweep to prevent unbounded memory growth
    if (hits.size > 5000) {
      for (const [k, v] of hits.entries()) {
        if (now - v.resetTime > windowMs) {
          hits.delete(k)
        }
      }
    }

    const remaining = Math.max(0, max - record.count)
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', remaining)

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime + windowMs - now) / 1000)
      res.setHeader('Retry-After', retryAfterSeconds)
      return res.status(429).json({
        status: 'error',
        message: `${message} (Retry after ${retryAfterSeconds}s)`,
        retryAfter: retryAfterSeconds,
      })
    }

    next()
  }
}

export default chatRateLimiter

