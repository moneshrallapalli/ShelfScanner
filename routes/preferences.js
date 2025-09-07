const express = require('express');
const router = express.Router();
const { getSession, generateSessionId, createSession } = require('../utils/sessionUtils');

// Get user preferences
router.get('/', async (req, res) => {
  try {
    let sessionId = req.session.deviceSessionId;
    let session = null;
    
    // If no session exists, create one
    if (!sessionId) {
      sessionId = generateSessionId();
      const deviceInfo = {
        userAgent: req.get('User-Agent') || 'unknown',
        platform: 'web-preferences',
        screenResolution: 'unknown',
        timezone: 'unknown',
        language: req.get('Accept-Language') || 'en'
      };
      
      session = await createSession(sessionId, deviceInfo);
      req.session.deviceSessionId = sessionId;
      req.session.save();
    } else {
      session = await getSession(sessionId);
      
      // If session is invalid, create a new one
      if (!session) {
        sessionId = generateSessionId();
        const deviceInfo = {
          userAgent: req.get('User-Agent') || 'unknown',
          platform: 'web-preferences',
          screenResolution: 'unknown',
          timezone: 'unknown',
          language: req.get('Accept-Language') || 'en'
        };
        
        session = await createSession(sessionId, deviceInfo);
        req.session.deviceSessionId = sessionId;
        req.session.save();
      }
    }

    // Enhanced preferences structure for Day 4
    const defaultPreferences = {
      favoriteGenres: [],
      avoidGenres: [],
      preferredAuthors: [],
      avoidAuthors: [],
      themes: [],
      readingLevel: 'any', // beginner, intermediate, advanced, any
      ratingThresholds: {
        minimumRating: 3.0, // Minimum Goodreads/Google Books rating
        minimumReviewCount: 50, // Minimum number of reviews
        preferHighlyRated: true // Prioritize books with high ratings
      },
      contentPreferences: {
        violence: 'any', // avoid, limit, any
        profanity: 'any', // avoid, limit, any
        adult: 'any', // avoid, limit, any
        religiousContent: 'any',
        politicalContent: 'any'
      },
      discoverySettings: {
        includeNewReleases: true, // Include books from last 2 years
        includeClassics: true, // Include older acclaimed books
        includeDiverseAuthors: true, // Prioritize diverse voices
        includeTranslations: false, // Include translated works
        experimentWithGenres: true // Try genres outside preferences
      },
      recommendations: {
        maxResults: 10,
        includePopular: true, // Include bestsellers/popular books
        includeSimilar: true, // Include books similar to owned books
        includeAwards: true, // Include award-winning books
        diversityLevel: 'balanced' // conservative, balanced, adventurous
      },
      readingGoals: {
        booksPerMonth: null,
        pagesPerDay: null,
        preferredLength: 'any', // short, medium, long, any
        seriesPreference: 'mixed' // standalone, series, mixed
      },
      goodreadsIntegration: {
        enabled: false,
        importToRead: false,
        importRatings: false,
        syncProgress: false
      },
      privacy: {
        shareReadingHistory: false,
        allowDataCollection: false,
        anonymizeRecommendations: true
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
    let sessionId = req.session.deviceSessionId;
    
    // Create session if it doesn't exist
    if (!sessionId) {
      sessionId = generateSessionId();
      const deviceInfo = {
        userAgent: req.get('User-Agent') || 'unknown',
        platform: 'web-preferences-update',
        screenResolution: 'unknown',
        timezone: 'unknown',
        language: req.get('Accept-Language') || 'en'
      };
      
      await createSession(sessionId, deviceInfo);
      req.session.deviceSessionId = sessionId;
      req.session.save();
    }

    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences data required' });
    }

    // Validate preferences structure - Enhanced for Day 4
    const validFields = [
      'favoriteGenres', 'avoidGenres', 'preferredAuthors', 'avoidAuthors', 
      'themes', 'readingLevel', 'ratingThresholds', 'contentPreferences', 
      'discoverySettings', 'recommendations', 'readingGoals', 
      'goodreadsIntegration', 'privacy'
    ];
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

    const validCategories = [
      'favoriteGenres', 'avoidGenres', 'preferredAuthors', 'avoidAuthors',
      'themes', 'readingLevel', 'ratingThresholds', 'contentPreferences',
      'discoverySettings', 'recommendations', 'readingGoals',
      'goodreadsIntegration', 'privacy'
    ];
    
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

// Get available genres for selection
router.get('/genres/available', (req, res) => {
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Fantasy',
    'Science Fiction', 'Historical Fiction', 'Literary Fiction', 'Biography',
    'Memoir', 'Self-Help', 'Business', 'Psychology', 'Philosophy',
    'History', 'Science', 'Politics', 'Religion', 'Health',
    'Cooking', 'Travel', 'Art', 'Music', 'Sports', 'Technology',
    'Poetry', 'Drama', 'Horror', 'Adventure', 'Young Adult',
    'Children\'s', 'Graphic Novel', 'True Crime', 'Essays'
  ];

  res.json({
    success: true,
    genres: availableGenres.sort(),
    count: availableGenres.length
  });
});

// Get reading level options
router.get('/reading-levels', (req, res) => {
  const readingLevels = [
    { value: 'beginner', label: 'Beginner', description: 'Easy reads, shorter books' },
    { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity' },
    { value: 'advanced', label: 'Advanced', description: 'Complex, literary works' },
    { value: 'any', label: 'Any Level', description: 'No preference' }
  ];

  res.json({
    success: true,
    levels: readingLevels
  });
});

// Get content preference options
router.get('/content-options', (req, res) => {
  const contentOptions = {
    violence: [
      { value: 'avoid', label: 'Avoid', description: 'No violent content' },
      { value: 'limit', label: 'Limited', description: 'Mild violence only' },
      { value: 'any', label: 'Any', description: 'No restrictions' }
    ],
    profanity: [
      { value: 'avoid', label: 'Avoid', description: 'No strong language' },
      { value: 'limit', label: 'Limited', description: 'Occasional mild language' },
      { value: 'any', label: 'Any', description: 'No restrictions' }
    ],
    adult: [
      { value: 'avoid', label: 'Avoid', description: 'No adult content' },
      { value: 'limit', label: 'Limited', description: 'Mild adult themes' },
      { value: 'any', label: 'Any', description: 'No restrictions' }
    ]
  };

  res.json({
    success: true,
    options: contentOptions
  });
});

// Set reading goals
router.post('/goals', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const { booksPerMonth, pagesPerDay, preferredLength, seriesPreference } = req.body;
    
    // Validate input
    if (booksPerMonth && (typeof booksPerMonth !== 'number' || booksPerMonth < 0 || booksPerMonth > 100)) {
      return res.status(400).json({ error: 'Books per month must be a number between 0 and 100' });
    }
    
    if (pagesPerDay && (typeof pagesPerDay !== 'number' || pagesPerDay < 0 || pagesPerDay > 1000)) {
      return res.status(400).json({ error: 'Pages per day must be a number between 0 and 1000' });
    }

    const validLengths = ['short', 'medium', 'long', 'any'];
    if (preferredLength && !validLengths.includes(preferredLength)) {
      return res.status(400).json({ error: `Preferred length must be one of: ${validLengths.join(', ')}` });
    }

    const validSeriesPrefs = ['standalone', 'series', 'mixed'];
    if (seriesPreference && !validSeriesPrefs.includes(seriesPreference)) {
      return res.status(400).json({ error: `Series preference must be one of: ${validSeriesPrefs.join(', ')}` });
    }

    // In real implementation, save to database
    console.log(`Reading goals updated for session ${sessionId}:`, {
      booksPerMonth, pagesPerDay, preferredLength, seriesPreference
    });

    res.json({
      success: true,
      message: 'Reading goals updated successfully',
      goals: { booksPerMonth, pagesPerDay, preferredLength, seriesPreference },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set reading goals error:', error);
    res.status(500).json({ error: 'Failed to set reading goals' });
  }
});

// Quick preference setup for new users
router.post('/quick-setup', async (req, res) => {
  try {
    let sessionId = req.session.deviceSessionId;
    
    // Create session if it doesn't exist
    if (!sessionId) {
      sessionId = generateSessionId();
      const deviceInfo = {
        userAgent: req.get('User-Agent') || 'unknown',
        platform: 'web-quick-setup',
        screenResolution: 'unknown',
        timezone: 'unknown',
        language: req.get('Accept-Language') || 'en'
      };
      
      await createSession(sessionId, deviceInfo);
      req.session.deviceSessionId = sessionId;
      req.session.save();
    }

    const {
      favoriteGenres = [],
      readingLevel = 'any',
      minimumRating = 3.0,
      contentSensitivity = 'any' // conservative, moderate, any
    } = req.body;

    // Validate input
    if (!Array.isArray(favoriteGenres) || favoriteGenres.length === 0) {
      return res.status(400).json({ error: 'At least one favorite genre is required' });
    }

    if (typeof minimumRating !== 'number' || minimumRating < 1 || minimumRating > 5) {
      return res.status(400).json({ error: 'Minimum rating must be between 1 and 5' });
    }

    // Create quick setup preferences
    const quickPreferences = {
      favoriteGenres,
      readingLevel,
      ratingThresholds: {
        minimumRating,
        minimumReviewCount: contentSensitivity === 'conservative' ? 100 : 50,
        preferHighlyRated: true
      },
      contentPreferences: {
        violence: contentSensitivity === 'conservative' ? 'avoid' : 'any',
        profanity: contentSensitivity === 'conservative' ? 'avoid' : 'any',
        adult: contentSensitivity === 'conservative' ? 'avoid' : 'any'
      },
      discoverySettings: {
        experimentWithGenres: contentSensitivity !== 'conservative',
        includeNewReleases: true,
        includeClassics: true
      }
    };

    console.log(`Quick preferences setup for session ${sessionId}:`, quickPreferences);

    res.json({
      success: true,
      message: 'Preferences configured successfully',
      preferences: quickPreferences,
      setupAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Quick setup error:', error);
    res.status(500).json({ error: 'Failed to setup preferences' });
  }
});

module.exports = router;