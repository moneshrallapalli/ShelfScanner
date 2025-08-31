const express = require('express');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');

// Get user preferences
router.get('/', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Default preferences structure
    const defaultPreferences = {
      genres: [],
      authors: [],
      themes: [],
      readingLevel: 'any',
      contentFilters: {
        violence: false,
        profanity: false,
        adult: false
      },
      recommendations: {
        maxResults: 10,
        includePopular: true,
        includeSimilar: true,
        includeNewReleases: false
      },
      privacy: {
        shareReadingHistory: false,
        allowDataCollection: false
      }
    };

    // For now, return default preferences
    // In a real implementation, you would fetch from database based on session
    res.json({
      success: true,
      preferences: defaultPreferences,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to retrieve preferences' });
  }
});

// Update user preferences
router.put('/', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences data required' });
    }

    // Validate preferences structure
    const validFields = ['genres', 'authors', 'themes', 'readingLevel', 'contentFilters', 'recommendations', 'privacy'];
    const receivedFields = Object.keys(preferences);
    const invalidFields = receivedFields.filter(field => !validFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        error: `Invalid preference fields: ${invalidFields.join(', ')}` 
      });
    }

    // In a real implementation, you would save to database here
    // For now, just acknowledge the update
    console.log(`Preferences updated for session ${sessionId}:`, preferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Update specific preference category
router.patch('/:category', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { category } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const validCategories = ['genres', 'authors', 'themes', 'readingLevel', 'contentFilters', 'recommendations', 'privacy'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid preference category. Valid categories: ${validCategories.join(', ')}` 
      });
    }

    const updateData = req.body;
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data required' });
    }

    // In a real implementation, you would update the specific category in the database
    console.log(`Preference category '${category}' updated for session ${sessionId}:`, updateData);

    res.json({
      success: true,
      message: `${category} preferences updated successfully`,
      category: category,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update preference category error:', error);
    res.status(500).json({ error: 'Failed to update preference category' });
  }
});

// Reset preferences to default
router.post('/reset', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // In a real implementation, you would reset preferences in the database
    console.log(`Preferences reset to default for session ${sessionId}`);

    res.json({
      success: true,
      message: 'Preferences reset to default successfully',
      resetAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset preferences error:', error);
    res.status(500).json({ error: 'Failed to reset preferences' });
  }
});

module.exports = router;