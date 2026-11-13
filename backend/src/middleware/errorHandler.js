/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  let statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode)
  let message = err.message || 'Internal Server Error'
  let errors = null

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation failed'
    errors = {}
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message
    })
  }

  // Handle Mongoose CastError (invalid ObjectId or type casting)
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid value for ${err.path}: ${err.value}`
  }

  // Handle MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409
    const fields = Object.keys(err.keyValue || {})
    const fieldName = fields.join(', ')
    message = `Duplicate value entered for ${fieldName}. Value already in use.`
    errors = err.keyValue
  }

  // Handle MongoDB Atlas connection / server selection / buffering errors
  if (
    err.name === 'MongooseServerSelectionError' ||
    (err.name === 'MongooseError' && err.message.includes('buffering timed out'))
  ) {
    statusCode = 503
    message =
      'Database connection is temporarily unavailable. If connecting to MongoDB Atlas, ensure your current IP address is whitelisted in Atlas Network Access.'
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
