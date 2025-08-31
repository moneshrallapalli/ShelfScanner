const express = require('express');
const router = express.Router();
const bookSpineRecognition = require('../services/bookSpineRecognition');
const recommendationEngine = require('../services/recommendationEngine');
const imageProcessor = require('../services/imageProcessor');
const { getStats: getDbStats } = require('../utils/database');
const { getSessionStats } = require('../utils/sessionUtils');

// Get comprehensive system statistics
router.get('/stats', async (req, res) => {
  try {
    // Collect stats from all services
    const stats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      bookRecognition: bookSpineRecognition.getStats(),
      recommendations: recommendationEngine.getStats(),
      imageProcessing: imageProcessor.getStats(),
      database: await getDbStats(),
      sessions: await getSessionStats()
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Stats collection error:', error);
    res.status(500).json({ 
      error: 'Failed to collect system statistics',
      details: error.message
    });
  }
});

// Health check with detailed service status
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check OpenAI API
  try {
    const openai = require('openai');
    const client = new openai({ apiKey: process.env.OPENAI_API_KEY });
    health.services.openai = { status: 'configured', hasKey: !!process.env.OPENAI_API_KEY };
  } catch (error) {
    health.services.openai = { status: 'error', error: error.message };
    health.status = 'degraded';
  }

  // Check Google Vision API
  try {
    health.services.googleVision = { status: 'configured', hasKey: !!process.env.GOOGLE_VISION_API_KEY };
  } catch (error) {
    health.services.googleVision = { status: 'error', error: error.message };
  }

  // Check Google Books API
  health.services.googleBooks = { status: 'configured', hasKey: !!process.env.GOOGLE_BOOKS_API_KEY };

  // Check database
  try {
    const dbStats = await getDbStats();
    health.services.database = { 
      status: dbStats.error ? 'error' : 'healthy',
      ...dbStats
    };
    if (dbStats.error) health.status = 'degraded';
  } catch (error) {
    health.services.database = { status: 'error', error: error.message };
    health.status = 'degraded';
  }

  // Check file system
  try {
    const fs = require('fs');
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    health.services.filesystem = { status: 'healthy' };
  } catch (error) {
    health.services.filesystem = { status: 'error', error: error.message };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Clear caches
router.post('/clear-cache', (req, res) => {
  try {
    const recognitionCleared = bookSpineRecognition.clearCache();
    const recommendationCleared = recommendationEngine.clearCache();

    res.json({
      success: true,
      message: 'Caches cleared successfully',
      cleared: {
        bookRecognition: recognitionCleared,
        recommendations: recommendationCleared
      }
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ 
      error: 'Failed to clear caches',
      details: error.message
    });
  }
});

// Get processing queue status
router.get('/queue', (req, res) => {
  try {
    const recognitionStats = bookSpineRecognition.getStats();
    const recommendationStats = recommendationEngine.getStats();

    res.json({
      success: true,
      queue: {
        activeRecognitionRequests: recognitionStats.activeRequests || 0,
        recognitionCacheSize: recognitionStats.cacheSize || 0,
        recommendationCacheSize: recommendationStats.cacheSize || 0,
        totalProcessed: recognitionStats.totalProcessed || 0,
        totalRecommendations: recommendationStats.totalRecommendations || 0
      }
    });

  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue status',
      details: error.message
    });
  }
});

module.exports = router;