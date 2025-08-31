const express = require('express');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');
const rateLimit = require('../middleware/rateLimitMiddleware');

// Apply read-only rate limiting for book queries
router.use(rateLimit.readOnly);

// Search for books (placeholder for external API integration)
router.get('/search', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { query, genre, author, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Placeholder for book search logic
    // In a real implementation, this would call external APIs like Google Books, Open Library, etc.
    
    const mockResults = [
      {
        id: 'book_1',
        title: `${query} - Example Book 1`,
        author: 'Sample Author',
        isbn: '9781234567890',
        genre: genre || 'Fiction',
        publishedDate: '2023-01-01',
        description: `A fascinating book about ${query} that explores various themes and concepts.`,
        pageCount: 320,
        rating: 4.2,
        coverUrl: 'https://example.com/cover1.jpg',
        previewUrl: 'https://example.com/preview1'
      },
      {
        id: 'book_2',
        title: `Advanced ${query} Concepts`,
        author: author || 'Expert Author',
        isbn: '9781234567891',
        genre: genre || 'Non-fiction',
        publishedDate: '2023-06-15',
        description: `An in-depth exploration of ${query} for advanced readers.`,
        pageCount: 450,
        rating: 4.7,
        coverUrl: 'https://example.com/cover2.jpg',
        previewUrl: 'https://example.com/preview2'
      }
    ];

    // Log the search query
    console.log(`Book search: "${query}" by session ${sessionId}`);

    res.json({
      success: true,
      results: mockResults.slice(0, parseInt(limit)),
      metadata: {
        query: query,
        totalResults: mockResults.length,
        limit: parseInt(limit),
        searchedAt: new Date().toISOString(),
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
});

// Get book details by ID or ISBN
router.get('/details/:identifier', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { identifier } = req.params;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Book identifier is required' });
    }

    // Placeholder for book details lookup
    // In a real implementation, this would call external APIs
    
    const mockBookDetails = {
      id: identifier,
      title: 'Sample Book Title',
      author: 'Sample Author',
      isbn: identifier.startsWith('978') ? identifier : '9781234567890',
      genre: 'Fiction',
      publishedDate: '2023-01-01',
      publisher: 'Sample Publisher',
      description: 'A comprehensive description of this fascinating book that covers various topics and themes.',
      pageCount: 320,
      rating: 4.2,
      ratingsCount: 1250,
      language: 'en',
      coverUrl: 'https://example.com/cover.jpg',
      previewUrl: 'https://example.com/preview',
      buyLinks: {
        amazon: 'https://amazon.com/book',
        googleBooks: 'https://books.google.com/book',
        goodreads: 'https://goodreads.com/book'
      },
      categories: ['Fiction', 'Literary Fiction', 'Contemporary'],
      awards: ['Sample Literary Award 2023']
    };

    console.log(`Book details requested: ${identifier} by session ${sessionId}`);

    res.json({
      success: true,
      book: mockBookDetails,
      requestedAt: new Date().toISOString(),
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Book details error:', error);
    res.status(500).json({ error: 'Failed to retrieve book details' });
  }
});

// Get popular books by genre
router.get('/popular', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { genre = 'all', limit = 20 } = req.query;

    // Placeholder for popular books logic
    const mockPopularBooks = [
      {
        id: 'pop_1',
        title: 'The Bestseller Novel',
        author: 'Popular Author',
        isbn: '9781111111111',
        genre: 'Fiction',
        rating: 4.8,
        coverUrl: 'https://example.com/popular1.jpg',
        rank: 1
      },
      {
        id: 'pop_2',
        title: 'Trending Non-Fiction',
        author: 'Expert Writer',
        isbn: '9782222222222',
        genre: 'Non-fiction',
        rating: 4.6,
        coverUrl: 'https://example.com/popular2.jpg',
        rank: 2
      }
    ];

    const filteredBooks = genre === 'all' 
      ? mockPopularBooks 
      : mockPopularBooks.filter(book => book.genre.toLowerCase() === genre.toLowerCase());

    console.log(`Popular books requested: genre=${genre}, limit=${limit} by session ${sessionId}`);

    res.json({
      success: true,
      books: filteredBooks.slice(0, parseInt(limit)),
      metadata: {
        genre: genre,
        totalBooks: filteredBooks.length,
        limit: parseInt(limit),
        requestedAt: new Date().toISOString(),
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('Popular books error:', error);
    res.status(500).json({ error: 'Failed to retrieve popular books' });
  }
});

// Get books by author
router.get('/author/:authorName', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { authorName } = req.params;
    const { limit = 10 } = req.query;
    
    if (!authorName) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    // Placeholder for author books lookup
    const mockAuthorBooks = [
      {
        id: 'auth_1',
        title: `${authorName}'s First Book`,
        author: authorName,
        isbn: '9783333333333',
        genre: 'Fiction',
        publishedDate: '2020-01-01',
        rating: 4.3,
        coverUrl: 'https://example.com/author1.jpg'
      },
      {
        id: 'auth_2',
        title: `${authorName}'s Latest Work`,
        author: authorName,
        isbn: '9784444444444',
        genre: 'Fiction',
        publishedDate: '2023-01-01',
        rating: 4.7,
        coverUrl: 'https://example.com/author2.jpg'
      }
    ];

    console.log(`Author books requested: ${authorName} by session ${sessionId}`);

    res.json({
      success: true,
      author: authorName,
      books: mockAuthorBooks.slice(0, parseInt(limit)),
      metadata: {
        authorName: authorName,
        totalBooks: mockAuthorBooks.length,
        limit: parseInt(limit),
        requestedAt: new Date().toISOString(),
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('Author books error:', error);
    res.status(500).json({ error: 'Failed to retrieve books by author' });
  }
});

// Get books by genre
router.get('/genre/:genreName', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { genreName } = req.params;
    const { limit = 20, sortBy = 'rating' } = req.query;
    
    if (!genreName) {
      return res.status(400).json({ error: 'Genre name is required' });
    }

    // Placeholder for genre books lookup
    const mockGenreBooks = [
      {
        id: 'genre_1',
        title: `Excellent ${genreName} Book`,
        author: 'Genre Expert',
        isbn: '9785555555555',
        genre: genreName,
        rating: 4.5,
        publishedDate: '2023-01-01',
        coverUrl: 'https://example.com/genre1.jpg'
      },
      {
        id: 'genre_2',
        title: `Classic ${genreName} Tale`,
        author: 'Renowned Author',
        isbn: '9786666666666',
        genre: genreName,
        rating: 4.2,
        publishedDate: '2022-06-01',
        coverUrl: 'https://example.com/genre2.jpg'
      }
    ];

    // Sort books based on sortBy parameter
    const sortedBooks = mockGenreBooks.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'date') return new Date(b.publishedDate) - new Date(a.publishedDate);
      return 0;
    });

    console.log(`Genre books requested: ${genreName} by session ${sessionId}`);

    res.json({
      success: true,
      genre: genreName,
      books: sortedBooks.slice(0, parseInt(limit)),
      metadata: {
        genreName: genreName,
        totalBooks: sortedBooks.length,
        limit: parseInt(limit),
        sortBy: sortBy,
        requestedAt: new Date().toISOString(),
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('Genre books error:', error);
    res.status(500).json({ error: 'Failed to retrieve books by genre' });
  }
});

module.exports = router;