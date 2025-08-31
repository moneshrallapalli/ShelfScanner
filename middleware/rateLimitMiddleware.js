const rateLimit = require('express-rate-limit');

// Create rate limiter middleware with configurable options
const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 'Please wait before making another request.'
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    },
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.connection.remoteAddress;
    }
  };

  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

// Default rate limiter for general API routes
const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 minutes
});

// Strict rate limiter for sensitive operations (uploads, sessions)
const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: {
    error: 'Too many sensitive requests from this IP, please try again later.',
    retryAfter: 'Please wait before making another sensitive request.'
  }
});

// Very strict rate limiter for authentication-related endpoints
const authRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: 'Account temporarily locked due to too many attempts.'
  }
});

// Lenient rate limiter for read-only operations
const readOnlyRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300 // 300 requests per 15 minutes
});

// Upload-specific rate limiter
const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    error: 'Upload limit exceeded. Please try again later.',
    retryAfter: 'You can upload again in an hour.'
  }
});

// Recommendation request rate limiter (for AI API calls)
const recommendationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 recommendation requests per hour
  message: {
    error: 'Recommendation request limit exceeded. Please try again later.',
    retryAfter: 'You have reached your hourly recommendation limit.'
  }
});

// Session management rate limiter
const sessionRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 session operations per hour
  message: {
    error: 'Session management limit exceeded. Please try again later.',
    retryAfter: 'Too many session operations. Please wait.'
  }
});

// Export the default general rate limiter and specific ones
module.exports = generalRateLimit;

// Export specific rate limiters as named exports
module.exports.general = generalRateLimit;
module.exports.strict = strictRateLimit;
module.exports.auth = authRateLimit;
module.exports.readOnly = readOnlyRateLimit;
module.exports.upload = uploadRateLimit;
module.exports.recommendation = recommendationRateLimit;
module.exports.session = sessionRateLimit;
module.exports.createRateLimit = createRateLimit;