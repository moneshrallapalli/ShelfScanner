const express = require('express');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');
const { recommendation } = require('../middleware/rateLimitMiddleware');
const recommendationEngine = require('../services/recommendationEngine');
const { findById, insertOne, query } = require('../utils/database');

// Apply recommendation-specific rate limiting
router.use(recommendation);

// Get book recommendations based on uploaded bookshelf
router.post('/generate', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { imageId, uploadId, preferences = {}, options = {} } = req.body;
    
    if (!imageId && !uploadId) {
      return res.status(400).json({ error: 'Image ID or Upload ID required for recommendations' });
    }

    // Get detected books from upload
    let detectedBooks = [];
    let uploadRecord = null;

    if (uploadId) {
      uploadRecord = await findById('image_uploads', uploadId);
      if (!uploadRecord) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Check ownership
      if (uploadRecord.session_id !== sessionId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (uploadRecord.processing_status !== 'completed') {
        return res.status(400).json({ 
          error: 'Image not yet processed. Please analyze the image first.',
          status: uploadRecord.processing_status
        });
      }

      detectedBooks = uploadRecord.extracted_books || [];
    }

    if (detectedBooks.length === 0) {
      return res.status(400).json({ 
        error: 'No books detected in the uploaded image. Please ensure the image contains visible book spines.' 
      });
    }

    // Get user preferences from database
    const userPrefsResult = await query(
      'SELECT content_preferences, favorite_genres, preferred_authors FROM user_preferences WHERE session_id = $1',
      [sessionId]
    );

    const dbPreferences = userPrefsResult.rows[0] || {};
    const combinedPreferences = {
      ...dbPreferences,
      ...preferences, // Request preferences override DB preferences
      favoriteGenres: preferences.favoriteGenres || dbPreferences.favorite_genres || [],
      preferredAuthors: preferences.preferredAuthors || dbPreferences.preferred_authors || []
    };

    console.log(`🎯 Generating AI recommendations for ${detectedBooks.length} detected books`);

    // Generate AI-powered recommendations
    const recommendationOptions = {
      maxRecommendations: options.maxRecommendations || 10,
      includeMetadata: options.includeMetadata !== false,
      model: options.aiModel || 'gpt-4'
    };

    const aiRecommendations = await recommendationEngine.generateRecommendations(
      detectedBooks,
      combinedPreferences,
      sessionId,
      recommendationOptions
    );

    // Save recommendations to database
    const recommendationRecord = await insertOne('recommendations', {
      session_id: sessionId,
      image_upload_id: uploadRecord?.id || null,
      recommended_books: aiRecommendations.recommendations,
      reasoning: aiRecommendations.explanations.why
    });

    console.log(`✅ Generated ${aiRecommendations.recommendations.length} AI recommendations for session ${sessionId}`);

    res.json({
      success: true,
      recommendations: aiRecommendations.recommendations,
      readingProfile: aiRecommendations.readingProfile,
      explanations: aiRecommendations.explanations,
      metadata: {
        ...aiRecommendations.metadata,
        recommendationId: recommendationRecord.id,
        uploadId: uploadRecord?.id || null,
        basedOnBooks: detectedBooks.map(book => ({ 
          title: book.title, 
          author: book.author, 
          confidence: book.confidence 
        }))
      }
    });

  } catch (error) {
    console.error('AI recommendation generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: error.message,
      type: error.name
    });
  }
});

// Get recommendation history for current session
router.get('/history', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // In a real implementation, fetch from database
    res.json({
      success: true,
      history: [],
      totalCount: 0,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Recommendation history error:', error);
    res.status(500).json({ error: 'Failed to retrieve recommendation history' });
  }
});

// Save/favorite a recommendation
router.post('/:recommendationId/save', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { recommendationId } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // In a real implementation, save to database
    console.log(`Recommendation ${recommendationId} saved for session ${sessionId}`);

    res.json({
      success: true,
      message: 'Recommendation saved successfully',
      recommendationId: recommendationId,
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Save recommendation error:', error);
    res.status(500).json({ error: 'Failed to save recommendation' });
  }
});

// Get saved recommendations
router.get('/saved', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // In a real implementation, fetch from database
    res.json({
      success: true,
      savedRecommendations: [],
      totalCount: 0,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Saved recommendations error:', error);
    res.status(500).json({ error: 'Failed to retrieve saved recommendations' });
  }
});

// Rate a recommendation
router.post('/:recommendationId/rate', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { recommendationId } = req.params;
    const { rating, feedback } = req.body;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // In a real implementation, save rating to database for ML improvement
    console.log(`Recommendation ${recommendationId} rated ${rating}/5 by session ${sessionId}`);
    if (feedback) {
      console.log(`Feedback: ${feedback}`);
    }

    res.json({
      success: true,
      message: 'Recommendation rated successfully',
      recommendationId: recommendationId,
      rating: rating,
      ratedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate recommendation error:', error);
    res.status(500).json({ error: 'Failed to rate recommendation' });
  }
});

module.exports = router;