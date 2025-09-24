// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Copy the error object
  let error = { ...err };
  error.message = err.message || 'Server Error';

  console.error('🔥 Error:', err);

  // Handle Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    error.status = 404;
  }

  // Handle Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `Duplicate value for ${field} entered`;
    error.status = 400;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  const statusCode = error.status || 500;

  res.status(statusCode);

  // Respond differently based on request type
  if (req.accepts('html')) {
    res.render('error', {
      title: 'Error',
      statusCode,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : '',
      user: req.user || null, // pass user for navbar rendering
      success: null,
      error: error.message
    });
  } else {
    res.json({
      success: false,
      error: error.message
    });
  }
};

module.exports = errorHandler;
