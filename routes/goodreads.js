const express = require('express');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');
const goodreadsIntegration = require('../services/goodreadsIntegration');

// Search books on Goodreads
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = await goodreadsIntegration.searchBooks(query, { limit: parseInt(limit) });

    res.json({
      success: true,
      query: query,
      results: results,
      count: results.length,
      searchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Goodreads search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
});

// Get book details by Goodreads ID
router.get('/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const bookDetails = await goodreadsIntegration.getBookDetails(bookId);

    if (!bookDetails) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({
      success: true,
      book: bookDetails,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get book details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get book details',
      details: error.message
    });
  }
});

// Get popular books by genre
router.get('/popular/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    const { limit = 20 } = req.query;
    
    if (!genre) {
      return res.status(400).json({ error: 'Genre is required' });
    }

    const books = await goodreadsIntegration.getPopularBooksByGenre(
      decodeURIComponent(genre), 
      { limit: parseInt(limit) }
    );

    res.json({
      success: true,
      genre: genre,
      books: books,
      count: books.length,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get popular books error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular books',
      details: error.message
    });
  }
});

// Get highly rated books with filters
router.post('/highly-rated', async (req, res) => {
  try {
    const {
      minimumRating = 4.0,
      minimumReviews = 1000,
      genres = [],
      publicationYearAfter = null,
      limit = 50
    } = req.body;

    // Validate input
    if (typeof minimumRating !== 'number' || minimumRating < 1 || minimumRating > 5) {
      return res.status(400).json({ error: 'Minimum rating must be between 1 and 5' });
    }

    if (typeof minimumReviews !== 'number' || minimumReviews < 0) {
      return res.status(400).json({ error: 'Minimum reviews must be a positive number' });
    }

    if (!Array.isArray(genres)) {
      return res.status(400).json({ error: 'Genres must be an array' });
    }

    const books = await goodreadsIntegration.getHighlyRatedBooks({
      minimumRating,
      minimumReviews,
      genres,
      publicationYearAfter,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      filters: { minimumRating, minimumReviews, genres, publicationYearAfter },
      books: books,
      count: books.length,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get highly rated books error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get highly rated books',
      details: error.message
    });
  }
});

// Import user's Goodreads shelf
router.post('/import-shelf', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { goodreadsUserId, shelf = 'to-read' } = req.body;
    
    if (!goodreadsUserId) {
      return res.status(400).json({ error: 'Goodreads user ID is required' });
    }

    const validShelves = ['to-read', 'read', 'currently-reading'];
    if (!validShelves.includes(shelf)) {
      return res.status(400).json({ 
        error: `Invalid shelf. Must be one of: ${validShelves.join(', ')}` 
      });
    }

    const books = await goodreadsIntegration.importUserShelf(goodreadsUserId, shelf);

    // In a real implementation, you would save these books to the user's profile
    console.log(`Imported ${books.length} books from ${shelf} shelf for session ${sessionId}`);

    res.json({
      success: true,
      message: `Successfully imported ${books.length} books from ${shelf} shelf`,
      shelf: shelf,
      books: books,
      importedAt: new Date().toISOString(),
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Import shelf error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import shelf',
      details: error.message
    });
  }
});

// Get Goodreads-based recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { 
      preferences = {},
      readBooks = [],
      limit = 20 
    } = req.body;

    const recommendations = await goodreadsIntegration.getRecommendations(
      preferences, 
      readBooks
    );

    const limitedRecommendations = recommendations.slice(0, parseInt(limit));

    res.json({
      success: true,
      recommendations: limitedRecommendations,
      totalFound: recommendations.length,
      returnedCount: limitedRecommendations.length,
      basedOnPreferences: preferences,
      excludedBooks: readBooks.length,
      generatedAt: new Date().toISOString(),
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Get Goodreads recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
});

// Get genre statistics
router.get('/genres/stats', async (req, res) => {
  try {
    const stats = goodreadsIntegration.getGenreStatistics();

    res.json({
      success: true,
      ...stats,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get genre statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get genre statistics',
      details: error.message
    });
  }
});

// Validate book data
router.post('/validate-book', async (req, res) => {
  try {
    const { book } = req.body;
    
    if (!book) {
      return res.status(400).json({ error: 'Book data is required' });
    }

    const validation = goodreadsIntegration.validateBookData(book);

    res.json({
      success: true,
      validation: validation,
      book: book,
      validatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Validate book error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate book data',
      details: error.message
    });
  }
});

// Get Goodreads service statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = goodreadsIntegration.getStats();

    res.json({
      success: true,
      service: 'Goodreads Integration',
      stats: stats,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Goodreads stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics',
      details: error.message
    });
  }
});

// Clear Goodreads cache
router.post('/clear-cache', async (req, res) => {
  try {
    const cleared = goodreadsIntegration.clearCache();

    res.json({
      success: true,
      message: 'Goodreads cache cleared successfully',
      entriesCleared: cleared,
      clearedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Clear Goodreads cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

module.exports = router;