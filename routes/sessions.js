const express = require('express');
const router = express.Router();
const { generateSessionId, createSession, getSession, updateLastActivity } = require('../utils/sessionUtils');
const rateLimit = require('../middleware/rateLimitMiddleware');

// Apply rate limiting to all session routes
router.use(rateLimit);

// Create new session (device-based)
router.post('/create', async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    
    if (!deviceInfo || !deviceInfo.userAgent) {
      return res.status(400).json({ error: 'Device information required' });
    }

    const sessionId = generateSessionId();
    const session = await createSession(sessionId, deviceInfo);
    
    // Store session in express-session
    req.session.deviceSessionId = sessionId;
    req.session.save();
    
    res.status(201).json({
      success: true,
      sessionId: sessionId,
      expiresAt: session.expires_at
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get current session
router.get('/current', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(404).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Update last activity
    await updateLastActivity(sessionId);
    
    res.json({
      sessionId: session.session_id,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      deviceInfo: session.device_info
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// Update session activity (heartbeat)
router.post('/heartbeat', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(404).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    await updateLastActivity(sessionId);
    
    res.json({ success: true, lastActivity: new Date().toISOString() });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update session activity' });
  }
});

// End session
router.delete('/end', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (sessionId) {
      // Note: In a real app, you might want to mark the session as ended in the database
      // rather than deleting it for audit purposes
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ error: 'Failed to end session' });
        }
        
        res.clearCookie('connect.sid'); // Default express-session cookie name
        res.json({ success: true, message: 'Session ended successfully' });
      });
    } else {
      res.status(404).json({ error: 'No active session to end' });
    }
  } catch (error) {
    console.error('Session end error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

module.exports = router;