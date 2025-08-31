const express = require('express');
const router = express.Router();
const bookSpineRecognition = require('../services/bookSpineRecognition');
const recommendationEngine = require('../services/recommendationEngine');

// Test enhanced Day 4 AI pipeline with comprehensive preferences and Goodreads data
router.post('/ai-pipeline-day4', async (req, res) => {
  try {
    console.log('🧪 Testing Day 4 Enhanced AI pipeline with comprehensive preferences and Goodreads integration...');

    // Mock detected books with more variety for better testing
    const mockDetectedBooks = [
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        genre: "Literary Fiction",
        confidence: 0.95,
        position: "top shelf, center"
      },
      {
        title: "To Kill a Mockingbird",
        author: "Harper Lee", 
        genre: "Literary Fiction",
        confidence: 0.88,
        position: "top shelf, right"
      },
      {
        title: "1984",
        author: "George Orwell",
        genre: "Dystopian Fiction",
        confidence: 0.92,
        position: "middle shelf, left"
      },
      {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        genre: "Romance",
        confidence: 0.85,
        position: "middle shelf, center"
      },
      {
        title: "The Catcher in the Rye",
        author: "J.D. Salinger",
        genre: "Literary Fiction", 
        confidence: 0.91,
        position: "bottom shelf, left"
      },
      {
        title: "Dune",
        author: "Frank Herbert",
        genre: "Science Fiction",
        confidence: 0.87,
        position: "bottom shelf, center"
      },
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        genre: "Fantasy",
        confidence: 0.93,
        position: "bottom shelf, right"
      }
    ];

    // Enhanced Day 4 preferences with all new features
    const mockPreferences = {
      favoriteGenres: ["Literary Fiction", "Science Fiction", "Fantasy"],
      avoidGenres: ["Horror"],
      preferredAuthors: ["Ursula K. Le Guin", "Margaret Atwood"],
      avoidAuthors: [],
      readingLevel: "advanced",
      ratingThresholds: {
        minimumRating: 4.0,
        minimumReviewCount: 500,
        preferHighlyRated: true
      },
      contentPreferences: {
        violence: "limit",
        profanity: "any",
        adult: "limit",
        religiousContent: "any",
        politicalContent: "any"
      },
      discoverySettings: {
        includeNewReleases: true,
        includeClassics: true,
        includeDiverseAuthors: true,
        includeTranslations: true,
        experimentWithGenres: true
      },
      recommendations: {
        maxResults: 12,
        includePopular: true,
        includeSimilar: true,
        includeAwards: true,
        diversityLevel: "balanced"
      },
      readingGoals: {
        booksPerMonth: 4,
        pagesPerDay: 50,
        preferredLength: "medium",
        seriesPreference: "mixed"
      },
      goodreadsIntegration: {
        enabled: true,
        importToRead: true,
        importRatings: true,
        syncProgress: false
      }
    };

    console.log('🎯 Testing enhanced recommendation engine with Goodreads integration...');
    
    const recommendations = await recommendationEngine.generateRecommendations(
      mockDetectedBooks,
      mockPreferences,
      'test-day4-session-' + Date.now(),
      {
        maxRecommendations: 12,
        includeMetadata: true,
        aiModel: 'gpt-4o-mini'
      }
    );

    // Get service statistics
    const recognitionStats = bookSpineRecognition.getStats();
    const recommendationStats = recommendationEngine.getStats();
    const goodreadsStats = require('../services/goodreadsIntegration').getStats();

    // Test Goodreads integration endpoints
    const goodreadsTests = {
      search: null,
      popularBooks: null,
      highlyRated: null
    };

    try {
      const goodreadsService = require('../services/goodreadsIntegration');
      goodreadsTests.search = await goodreadsService.searchBooks('The Seven Husbands of Evelyn Hugo');
      goodreadsTests.popularBooks = await goodreadsService.getPopularBooksByGenre('Fiction', { limit: 5 });
      goodreadsTests.highlyRated = await goodreadsService.getHighlyRatedBooks({ minimumRating: 4.2, limit: 5 });
    } catch (error) {
      console.error('Goodreads integration test failed:', error);
    }

    res.json({
      success: true,
      message: 'Day 4 Enhanced AI Pipeline Test Completed Successfully! 🎉',
      testType: 'Enhanced Day 4 with Goodreads Integration',
      test: {
        detectedBooks: {
          count: mockDetectedBooks.length,
          books: mockDetectedBooks,
          averageConfidence: mockDetectedBooks.reduce((sum, book) => sum + book.confidence, 0) / mockDetectedBooks.length,
          genreDistribution: mockDetectedBooks.reduce((dist, book) => {
            dist[book.genre] = (dist[book.genre] || 0) + 1;
            return dist;
          }, {})
        },
        preferences: {
          applied: mockPreferences,
          ratingThresholds: mockPreferences.ratingThresholds,
          discoverySettings: mockPreferences.discoverySettings,
          goodreadsIntegration: mockPreferences.goodreadsIntegration
        },
        recommendations: {
          count: recommendations.recommendations.length,
          recommendations: recommendations.recommendations,
          readingProfile: recommendations.readingProfile,
          explanation: recommendations.explanations.why,
          metadata: recommendations.metadata,
          qualityMetrics: {
            averageConfidence: recommendations.recommendations.reduce((sum, rec) => sum + (rec.finalScore || rec.confidence), 0) / recommendations.recommendations.length,
            goodreadsEnhanced: recommendations.recommendations.filter(rec => rec.goodreadsData).length,
            aiGenerated: recommendations.recommendations.filter(rec => rec.source === 'ai-generated').length,
            genreVariety: new Set(recommendations.recommendations.map(rec => rec.genre)).size
          }
        },
        goodreadsIntegration: {
          tests: goodreadsTests,
          stats: goodreadsStats,
          integrated: recommendations.metadata?.goodreadsIntegrated || false
        },
        serviceStats: {
          bookRecognition: recognitionStats,
          recommendations: recommendationStats,
          goodreads: goodreadsStats
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Day 4 AI pipeline test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Day 4 AI pipeline test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test AI pipeline with mock data (original)
router.post('/ai-pipeline', async (req, res) => {
  try {
    console.log('🧪 Testing AI pipeline with mock data...');

    // Mock detected books (as if they were extracted from an image)
    const mockDetectedBooks = [
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        genre: "Literary Fiction",
        confidence: 0.95,
        position: "top shelf, center"
      },
      {
        title: "To Kill a Mockingbird",
        author: "Harper Lee", 
        genre: "Literary Fiction",
        confidence: 0.88,
        position: "top shelf, right"
      },
      {
        title: "1984",
        author: "George Orwell",
        genre: "Dystopian Fiction",
        confidence: 0.92,
        position: "middle shelf, left"
      },
      {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        genre: "Romance",
        confidence: 0.85,
        position: "middle shelf, center"
      },
      {
        title: "The Catcher in the Rye",
        author: "J.D. Salinger",
        genre: "Literary Fiction", 
        confidence: 0.91,
        position: "bottom shelf, left"
      }
    ];

    // Test recommendation engine
    console.log('🎯 Testing recommendation engine...');
    
    const mockPreferences = {
      favoriteGenres: ["Literary Fiction", "Mystery"],
      readingLevel: "advanced",
      contentPreferences: {
        violence: false,
        profanity: false,
        adult: false
      }
    };

    const recommendations = await recommendationEngine.generateRecommendations(
      mockDetectedBooks,
      mockPreferences,
      'test-session-' + Date.now(),
      {
        maxRecommendations: 5,
        includeMetadata: false // Skip Google Books API for test
      }
    );

    // Get service statistics
    const recognitionStats = bookSpineRecognition.getStats();
    const recommendationStats = recommendationEngine.getStats();

    res.json({
      success: true,
      message: 'AI Pipeline Test Completed Successfully! 🎉',
      test: {
        detectedBooks: {
          count: mockDetectedBooks.length,
          books: mockDetectedBooks,
          averageConfidence: mockDetectedBooks.reduce((sum, book) => sum + book.confidence, 0) / mockDetectedBooks.length
        },
        recommendations: {
          count: recommendations.recommendations.length,
          recommendations: recommendations.recommendations,
          readingProfile: recommendations.readingProfile,
          explanation: recommendations.explanations.why
        },
        serviceStats: {
          bookRecognition: recognitionStats,
          recommendations: recommendationStats
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI pipeline test failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI pipeline test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test individual services
router.get('/services', async (req, res) => {
  try {
    const serviceTests = {};

    // Test OpenAI service availability
    try {
      const openaiVision = require('../services/openaiVision');
      serviceTests.openaiVision = { 
        available: true, 
        configured: !!process.env.OPENAI_API_KEY 
      };
    } catch (error) {
      serviceTests.openaiVision = { 
        available: false, 
        error: error.message 
      };
    }

    // Test Google Vision service availability
    try {
      const googleVision = require('../services/googleVision');
      serviceTests.googleVision = { 
        available: true, 
        configured: !!process.env.GOOGLE_VISION_API_KEY 
      };
    } catch (error) {
      serviceTests.googleVision = { 
        available: false, 
        error: error.message 
      };
    }

    // Test image processor
    try {
      const imageProcessor = require('../services/imageProcessor');
      const stats = imageProcessor.getStats();
      serviceTests.imageProcessor = { 
        available: true, 
        stats: stats 
      };
    } catch (error) {
      serviceTests.imageProcessor = { 
        available: false, 
        error: error.message 
      };
    }

    // Test recommendation engine
    try {
      const stats = recommendationEngine.getStats();
      serviceTests.recommendationEngine = { 
        available: true, 
        stats: stats 
      };
    } catch (error) {
      serviceTests.recommendationEngine = { 
        available: false, 
        error: error.message 
      };
    }

    res.json({
      success: true,
      message: 'Service availability test completed',
      services: serviceTests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service test error:', error);
    res.status(500).json({
      success: false,
      error: 'Service test failed',
      details: error.message
    });
  }
});

// Performance benchmark
router.post('/benchmark', async (req, res) => {
  try {
    console.log('⚡ Running performance benchmark...');
    
    const startTime = Date.now();
    const iterations = req.body.iterations || 3;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      
      // Mock a simple recommendation request
      const mockBooks = [
        { title: "Test Book " + i, author: "Test Author", genre: "Fiction", confidence: 0.8 }
      ];
      
      const recommendation = await recommendationEngine.generateRecommendations(
        mockBooks,
        {},
        `benchmark-${i}-${Date.now()}`,
        { maxRecommendations: 3, includeMetadata: false }
      );
      
      results.push({
        iteration: i + 1,
        processingTime: Date.now() - iterationStart,
        recommendationsGenerated: recommendation.recommendations.length
      });
    }

    const totalTime = Date.now() - startTime;
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

    res.json({
      success: true,
      message: 'Performance benchmark completed',
      benchmark: {
        iterations: iterations,
        totalTime: totalTime,
        averageTime: avgTime,
        results: results,
        performance: {
          requestsPerSecond: (iterations / (totalTime / 1000)).toFixed(2),
          status: avgTime < 1000 ? 'excellent' : avgTime < 3000 ? 'good' : 'needs_optimization'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({
      success: false,
      error: 'Benchmark failed',
      details: error.message
    });
  }
});

module.exports = router;