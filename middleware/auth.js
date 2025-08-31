const { getSession, validateSessionId } = require('../utils/sessionUtils');

/**
 * Middleware to authenticate requests using device-based sessions
 * This middleware checks for a valid session and ensures the user is authenticated
 */
const authenticateSession = async (req, res, next) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    // Check if session ID exists in the request
    if (!sessionId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No active session found. Please create a session first.',
        code: 'NO_SESSION'
      });
    }

    // Validate session ID format
    if (!validateSessionId(sessionId)) {
      return res.status(401).json({ 
        error: 'Invalid session format',
        message: 'The session ID format is invalid.',
        code: 'INVALID_SESSION_FORMAT'
      });
    }

    // Retrieve session from storage
    const session = await getSession(sessionId);
    
    if (!session) {
      // Clear invalid session from express session
      delete req.session.deviceSessionId;
      
      return res.status(401).json({ 
        error: 'Invalid or expired session',
        message: 'Your session has expired or is invalid. Please create a new session.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check if session is active
    if (!session.is_active) {
      return res.status(401).json({ 
        error: 'Inactive session',
        message: 'Your session is inactive. Please create a new session.',
        code: 'SESSION_INACTIVE'
      });
    }

    // Attach session information to request object
    req.deviceSession = session;
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error('Session authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication. Please try again.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to optionally authenticate requests
 * This middleware adds session information if available but doesn't require authentication
 */
const optionalAuthentication = async (req, res, next) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (sessionId && validateSessionId(sessionId)) {
      const session = await getSession(sessionId);
      
      if (session && session.is_active) {
        req.deviceSession = session;
        req.sessionId = sessionId;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Don't fail the request for optional authentication
    next();
  }
};

/**
 * Middleware to check if user has specific permissions (placeholder for future use)
 * In a real implementation, this would check user roles or permissions
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.deviceSession) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
          code: 'AUTH_REQUIRED'
        });
      }

      // In a real implementation, check permissions based on user roles
      // For now, all authenticated users have all permissions
      const hasPermission = true; // Placeholder logic
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `You don't have permission to ${permission}.`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions.',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if session is still valid and active
 * This can be used for endpoints that require fresh sessions
 */
const requireFreshSession = (maxAgeMinutes = 60) => {
  return async (req, res, next) => {
    try {
      if (!req.deviceSession) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'You must be authenticated to access this resource.',
          code: 'AUTH_REQUIRED'
        });
      }

      const session = req.deviceSession;
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      
      if (now - lastActivity > maxAge) {
        return res.status(401).json({ 
          error: 'Session too old',
          message: `Your session is older than ${maxAgeMinutes} minutes. Please refresh your session.`,
          code: 'SESSION_TOO_OLD'
        });
      }

      next();
    } catch (error) {
      console.error('Fresh session check error:', error);
      res.status(500).json({ 
        error: 'Session validation failed',
        message: 'An error occurred while validating your session.',
        code: 'SESSION_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Middleware to log authentication events
 */
const logAuth = (req, res, next) => {
  const sessionId = req.session.deviceSessionId;
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`AUTH LOG: ${method} ${path} - Session: ${sessionId || 'none'} - IP: ${ip}`);
  
  next();
};

module.exports = {
  authenticateSession,
  optionalAuthentication,
  requirePermission,
  requireFreshSession,
  logAuth
};