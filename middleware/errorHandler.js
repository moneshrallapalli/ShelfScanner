/**
 * Comprehensive error handling middleware for the Shelf Scanner API
 */

/**
 * Error logger middleware
 */
const errorLogger = (err, req, res, next) => {
  // Log error details
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    sessionId: req.session?.deviceSessionId || 'none',
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  };

  // Different log levels based on error type
  if (err.status >= 500 || !err.status) {
    console.error('🚨 Server Error:', JSON.stringify(errorDetails, null, 2));
  } else if (err.status >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify(errorDetails, null, 2));
  }

  next(err);
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Set default error status and message
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorType = err.name || 'UnknownError';
  let details = null;

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      status = 400;
      message = 'Invalid request data';
      details = err.details || err.message;
      break;

    case 'CastError':
      status = 400;
      message = 'Invalid data format';
      break;

    case 'JsonWebTokenError':
      status = 401;
      message = 'Invalid authentication token';
      break;

    case 'TokenExpiredError':
      status = 401;
      message = 'Authentication token expired';
      break;

    case 'MulterError':
      status = 400;
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'File too large';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Too many files';
          break;
        case 'LIMIT_FIELD_KEY':
          message = 'Field name too long';
          break;
        case 'LIMIT_FIELD_VALUE':
          message = 'Field value too long';
          break;
        case 'LIMIT_FIELD_COUNT':
          message = 'Too many fields';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Unexpected file field';
          break;
        default:
          message = 'File upload error';
      }
      break;

    case 'SyntaxError':
      if (err.message.includes('JSON')) {
        status = 400;
        message = 'Invalid JSON in request body';
      }
      break;

    case 'TypeError':
      if (err.message.includes('Cannot read property')) {
        status = 400;
        message = 'Missing required data';
      }
      break;

    default:
      // Handle specific application errors
      if (err.message.includes('OpenAI')) {
        status = 503;
        errorType = 'AIServiceError';
        if (err.message.includes('quota') || err.message.includes('billing')) {
          message = 'AI service quota exceeded. Please try again later.';
        } else if (err.message.includes('rate limit')) {
          message = 'AI service rate limit exceeded. Please try again later.';
        } else if (err.message.includes('API key')) {
          message = 'AI service configuration error. Please contact support.';
        } else {
          message = 'AI service temporarily unavailable. Please try again later.';
        }
      } else if (err.message.includes('Google Vision') || err.message.includes('Google Books')) {
        status = 503;
        errorType = 'ExternalServiceError';
        message = 'External service temporarily unavailable. Please try again later.';
      } else if (err.message.includes('database') || err.code?.startsWith('42')) {
        status = 503;
        errorType = 'DatabaseError';
        message = 'Database temporarily unavailable. Please try again later.';
      } else if (err.message.includes('Image') && err.message.includes('processing')) {
        status = 400;
        errorType = 'ImageProcessingError';
        message = 'Image processing failed. Please check your image format and try again.';
      }
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      type: errorType,
      message: message,
      status: status,
      timestamp: new Date().toISOString(),
      requestId: req.id || req.session?.deviceSessionId || 'unknown'
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = details || err.stack;
    errorResponse.error.originalMessage = err.message;
  }

  // Add helpful suggestions based on error type
  if (status === 400) {
    errorResponse.error.suggestion = 'Please check your request data and try again.';
  } else if (status === 401) {
    errorResponse.error.suggestion = 'Please create a new session or check your authentication.';
  } else if (status === 403) {
    errorResponse.error.suggestion = 'You do not have permission to access this resource.';
  } else if (status === 404) {
    errorResponse.error.suggestion = 'The requested resource was not found.';
  } else if (status === 429) {
    errorResponse.error.suggestion = 'You are making too many requests. Please slow down.';
  } else if (status >= 500) {
    errorResponse.error.suggestion = 'This is a server issue. Please try again later or contact support.';
  }

  // Send error response
  res.status(status).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout handler
 */
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    // Set request timeout
    const timer = setTimeout(() => {
      const error = new Error('Request timeout');
      error.status = 408;
      next(error);
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};

/**
 * Rate limit error handler
 */
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err && err.message && err.message.includes('Too many requests')) {
    return res.status(429).json({
      success: false,
      error: {
        type: 'RateLimitError',
        message: 'Too many requests. Please try again later.',
        status: 429,
        timestamp: new Date().toISOString(),
        retryAfter: err.retryAfter || '15 minutes'
      }
    });
  }
  next(err);
};

/**
 * CORS error handler
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: {
        type: 'CORSError',
        message: 'Cross-origin request blocked',
        status: 403,
        timestamp: new Date().toISOString()
      }
    });
  }
  next(err);
};

/**
 * Database error handler
 */
const databaseErrorHandler = (err, req, res, next) => {
  // PostgreSQL specific error codes
  const pgErrors = {
    '23505': { status: 409, message: 'Duplicate entry' },
    '23503': { status: 400, message: 'Referenced record does not exist' },
    '23502': { status: 400, message: 'Required field missing' },
    '23514': { status: 400, message: 'Data constraint violation' },
    '42703': { status: 500, message: 'Database schema error' },
    '42P01': { status: 500, message: 'Database table not found' },
    'ECONNREFUSED': { status: 503, message: 'Database connection failed' },
    'ETIMEDOUT': { status: 503, message: 'Database timeout' }
  };

  if (err.code && pgErrors[err.code]) {
    const pgError = pgErrors[err.code];
    err.status = pgError.status;
    err.message = pgError.message;
    err.name = 'DatabaseError';
  }

  next(err);
};

module.exports = {
  errorLogger,
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  timeoutHandler,
  rateLimitErrorHandler,
  corsErrorHandler,
  databaseErrorHandler
};