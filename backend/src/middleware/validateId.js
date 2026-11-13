import mongoose from 'mongoose'

/**
 * Middleware to validate MongoDB ObjectId format in request route parameters.
 * Prevents Mongoose CastError and returns a clean 400 Bad Request.
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName]
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid ID format for parameter '${paramName}': ${id}`,
      })
    }
    next()
  }
}
