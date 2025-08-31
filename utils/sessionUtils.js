const crypto = require('crypto');

// In-memory session storage for development
// In production, use a database like PostgreSQL or Redis
const sessions = new Map();

/**
 * Generate a cryptographically secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session
 * @param {string} sessionId - The session ID
 * @param {object} deviceInfo - Device information
 * @returns {Promise<object>} Session object
 */
async function createSession(sessionId, deviceInfo) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

  const session = {
    session_id: sessionId,
    device_info: {
      userAgent: deviceInfo.userAgent,
      platform: deviceInfo.platform || 'unknown',
      screenResolution: deviceInfo.screenResolution || 'unknown',
      timezone: deviceInfo.timezone || 'unknown',
      language: deviceInfo.language || 'en',
      deviceType: detectDeviceType(deviceInfo.userAgent)
    },
    created_at: now.toISOString(),
    last_activity: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_active: true
  };

  // Store in memory (use database in production)
  sessions.set(sessionId, session);

  console.log(`Session created: ${sessionId} for device: ${session.device_info.deviceType}`);
  
  return session;
}

/**
 * Retrieve a session by ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<object|null>} Session object or null if not found/expired
 */
async function getSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session is expired
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  
  if (now > expiresAt) {
    // Session expired, remove it
    sessions.delete(sessionId);
    console.log(`Session expired and removed: ${sessionId}`);
    return null;
  }

  // Check if session is inactive (no activity for 7 days)
  const lastActivity = new Date(session.last_activity);
  const inactiveThreshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  if (lastActivity < inactiveThreshold) {
    // Session inactive, mark as such but don't delete yet
    session.is_active = false;
    sessions.set(sessionId, session);
  }

  return session;
}

/**
 * Update the last activity timestamp for a session
 * @param {string} sessionId - The session ID
 * @returns {Promise<boolean>} Success status
 */
async function updateLastActivity(sessionId) {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return false;
  }

  session.last_activity = new Date().toISOString();
  session.is_active = true;
  sessions.set(sessionId, session);
  
  return true;
}

/**
 * Delete a session
 * @param {string} sessionId - The session ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteSession(sessionId) {
  const existed = sessions.has(sessionId);
  sessions.delete(sessionId);
  
  if (existed) {
    console.log(`Session deleted: ${sessionId}`);
  }
  
  return existed;
}

/**
 * Get all active sessions (for admin purposes)
 * @returns {Promise<Array>} Array of session objects
 */
async function getActiveSessions() {
  const now = new Date();
  const activeSessions = [];
  
  for (const [sessionId, session] of sessions.entries()) {
    const expiresAt = new Date(session.expires_at);
    
    if (now <= expiresAt && session.is_active) {
      activeSessions.push(session);
    }
  }
  
  return activeSessions;
}

/**
 * Cleanup expired sessions
 * @returns {Promise<number>} Number of sessions cleaned up
 */
async function cleanupExpiredSessions() {
  const now = new Date();
  let cleanedUp = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      sessions.delete(sessionId);
      cleanedUp++;
    }
  }
  
  if (cleanedUp > 0) {
    console.log(`Cleaned up ${cleanedUp} expired sessions`);
  }
  
  return cleanedUp;
}

/**
 * Get session statistics
 * @returns {Promise<object>} Session statistics
 */
async function getSessionStats() {
  const now = new Date();
  let totalSessions = 0;
  let activeSessions = 0;
  let expiredSessions = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    totalSessions++;
    
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      expiredSessions++;
    } else if (session.is_active) {
      activeSessions++;
    }
  }
  
  return {
    total: totalSessions,
    active: activeSessions,
    expired: expiredSessions,
    inactive: totalSessions - activeSessions - expiredSessions
  };
}

/**
 * Detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Device type
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Validate session ID format
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} Validation result
 */
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a valid hex string of expected length (64 characters for 32 bytes)
  return /^[a-f0-9]{64}$/.test(sessionId);
}

/**
 * Create session middleware for Express
 * @returns {Function} Express middleware function
 */
function sessionMiddleware() {
  return async (req, res, next) => {
    const sessionId = req.session.deviceSessionId;
    
    if (sessionId) {
      const session = await getSession(sessionId);
      
      if (session) {
        req.deviceSession = session;
        await updateLastActivity(sessionId);
      } else {
        // Invalid session, clear it from express session
        delete req.session.deviceSessionId;
      }
    }
    
    next();
  };
}

// Schedule periodic cleanup of expired sessions (every hour)
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
}

module.exports = {
  generateSessionId,
  createSession,
  getSession,
  updateLastActivity,
  deleteSession,
  getActiveSessions,
  cleanupExpiredSessions,
  getSessionStats,
  detectDeviceType,
  validateSessionId,
  sessionMiddleware
};