require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios');
const goodreadsIntegration = require('./goodreadsIntegration');

/**
 * AI-powered book recommendation engine
 * Analyzes user's bookshelf and generates personalized recommendations
 */
class RecommendationEngine {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.recommendationCache = new Map();
    this.cacheTimeout = 2 * 60 * 60 * 1000; // 2 hours cache

    // Recommendation statistics
    this.stats = {
      totalRecommendations: 0,
      uniqueUsers: new Set(),
      averageBooks: 0,
      popularGenres: new Map(),
      successfulAPIcalls: 0,
      failedAPIcalls: 0
    };
  }

  /**
   * Generate personalized book recommendations based on bookshelf analysis
   * @param {Array} detectedBooks - Books detected from bookshelf
   * @param {object} userPreferences - User preferences (optional)
   * @param {string} sessionId - User session ID
   * @param {object} options - Recommendation options
   * @returns {Promise<object>} Recommendation results
   */
  async generateRecommendations(detectedBooks, userPreferences = {}, sessionId, options = {}) {
    const startTime = Date.now();
    console.log(`📚 Generating recommendations for ${detectedBooks.length} detected books`);

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(detectedBooks, userPreferences, options);
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('📋 Returning cached recommendations');
          return { ...cached.result, fromCache: true };
        }
      }

      // Step 1: Analyze reading profile
      const readingProfile = this.analyzeReadingProfile(detectedBooks);
      console.log('📊 Reading profile analyzed:', readingProfile.summary);

      // Step 2: Generate AI-powered recommendations
      const aiRecommendations = await this.generateAIRecommendations(
        detectedBooks, 
        readingProfile, 
        userPreferences, 
        options
      );

      // Step 3: Get Goodreads-enhanced recommendations
      const goodreadsRecommendations = await this.getGoodreadsRecommendations(
        detectedBooks,
        readingProfile,
        userPreferences,
        options
      );

      // Step 4: Combine AI and Goodreads recommendations
      const combinedRecommendations = this.combineRecommendations(
        aiRecommendations,
        goodreadsRecommendations,
        options
      );

      // Step 5: Fetch detailed book metadata for recommendations
      const enrichedRecommendations = await this.enrichRecommendations(
        combinedRecommendations, 
        options.includeMetadata !== false
      );

      // Step 6: Score and rank recommendations
      const rankedRecommendations = this.rankRecommendations(
        enrichedRecommendations,
        readingProfile,
        userPreferences
      );

      const processingTime = Date.now() - startTime;

      const result = {
        success: true,
        sessionId: sessionId,
        recommendations: rankedRecommendations.slice(0, options.maxRecommendations || 10),
        readingProfile: readingProfile,
        metadata: {
          totalRecommendations: rankedRecommendations.length,
          processingTime: processingTime,
          timestamp: new Date().toISOString(),
          confidence: this.calculateRecommendationConfidence(rankedRecommendations),
          basedOnBooks: detectedBooks.length,
          aiProvider: 'openai-gpt4',
          goodreadsIntegrated: true
        },
        explanations: {
          why: this.generateExplanation(detectedBooks, rankedRecommendations, readingProfile),
          topGenres: readingProfile.topGenres,
          readingStyle: readingProfile.readingStyle
        }
      };

      // Cache result
      this.recommendationCache.set(cacheKey, { result, timestamp: Date.now() });

      // Update statistics
      this.updateStats(result, sessionId);

      console.log(`✅ Generated ${rankedRecommendations.length} recommendations in ${processingTime}ms`);

      return result;

    } catch (error) {
      console.error('❌ Recommendation generation failed:', error);
      this.stats.failedAPIcalls++;
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze user's reading profile from detected books
   * @param {Array} books - Detected books
   * @returns {object} Reading profile analysis
   */
  analyzeReadingProfile(books) {
    const profile = {
      totalBooks: books.length,
      genres: new Map(),
      authors: new Map(),
      series: new Map(),
      averageConfidence: 0,
      topGenres: [],
      topAuthors: [],
      readingStyle: 'unknown',
      diversity: 0
    };

    // Analyze genres
    for (const book of books) {
      if (book.genre) {
        profile.genres.set(book.genre, (profile.genres.get(book.genre) || 0) + 1);
      }
      if (book.author) {
        profile.authors.set(book.author, (profile.authors.get(book.author) || 0) + 1);
      }
      if (book.series) {
        profile.series.set(book.series, (profile.series.get(book.series) || 0) + 1);
      }
      profile.averageConfidence += book.confidence || 0;
    }

    profile.averageConfidence /= books.length;

    // Get top genres and authors
    profile.topGenres = Array.from(profile.genres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count, percentage: (count / books.length * 100).toFixed(1) }));

    profile.topAuthors = Array.from(profile.authors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, count]) => ({ author, count }));

    // Determine reading style
    profile.readingStyle = this.determineReadingStyle(profile);

    // Calculate diversity (number of unique genres / total books)
    profile.diversity = profile.genres.size / books.length;

    profile.summary = this.createProfileSummary(profile);

    return profile;
  }

  /**
   * Generate AI-powered recommendations using OpenAI GPT-4
   * @param {Array} detectedBooks - User's books
   * @param {object} readingProfile - Reading profile analysis
   * @param {object} userPreferences - User preferences
   * @param {object} options - Generation options
   * @returns {Promise<Array>} AI recommendations
   */
  async generateAIRecommendations(detectedBooks, readingProfile, userPreferences, options) {
    try {
      console.log('🤖 Requesting AI recommendations from OpenAI');

      const prompt = this.createRecommendationPrompt(detectedBooks, readingProfile, userPreferences, options);

      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert book curator and recommendation specialist with deep knowledge of literature across all genres. Provide thoughtful, personalized book recommendations based on the user\'s reading history. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const aiResponse = JSON.parse(response.choices[0].message.content);
      this.stats.successfulAPIcalls++;

      return this.parseAIRecommendations(aiResponse);

    } catch (error) {
      console.error('AI recommendation request failed:', error);
      this.stats.failedAPIcalls++;
      
      // Fallback to rule-based recommendations
      console.log('🔄 Falling back to rule-based recommendations');
      return this.generateFallbackRecommendations(detectedBooks, readingProfile, options);
    }
  }

  /**
   * Create detailed prompt for AI recommendation generation
   * @param {Array} books - Detected books
   * @param {object} profile - Reading profile
   * @param {object} preferences - User preferences
   * @param {object} options - Options
   * @returns {string} Formatted prompt
   */
  createRecommendationPrompt(books, profile, preferences, options) {
    const bookList = books
      .filter(book => book.title && book.confidence > 0.5)
      .slice(0, 20) // Limit to top 20 books to avoid token limits
      .map(book => `"${book.title}"${book.author ? ` by ${book.author}` : ''}${book.genre ? ` (${book.genre})` : ''}`)
      .join(', ');

    const topGenres = profile.topGenres
      .map(g => `${g.genre} (${g.percentage}%)`)
      .join(', ');

    return `
Based on this user's bookshelf containing ${books.length} books, please provide ${options.maxRecommendations || 10} personalized book recommendations.

USER'S BOOKS: ${bookList}

READING PROFILE:
- Top genres: ${topGenres}
- Reading style: ${profile.readingStyle}
- Diversity score: ${(profile.diversity * 100).toFixed(1)}%
- Average detection confidence: ${(profile.averageConfidence * 100).toFixed(1)}%

USER PREFERENCES:
${preferences.favoriteGenres ? `- Favorite genres: ${preferences.favoriteGenres.join(', ')}` : '- No specific genre preferences stated'}
${preferences.avoidGenres ? `- Genres to avoid: ${preferences.avoidGenres.join(', ')}` : ''}
${preferences.readingLevel ? `- Reading level: ${preferences.readingLevel}` : ''}
${preferences.contentPreferences ? `- Content preferences: ${JSON.stringify(preferences.contentPreferences)}` : ''}

Please respond with a JSON object containing:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "genre": "Primary Genre",
      "reason": "Detailed explanation of why this book fits the user's reading profile",
      "confidence": 0.9,
      "themes": ["theme1", "theme2"],
      "similar_to": "Book from their collection this is similar to",
      "publication_year": 2023,
      "difficulty_level": "intermediate"
    }
  ],
  "reasoning": {
    "profile_analysis": "Brief analysis of the user's reading preferences",
    "recommendation_strategy": "Explanation of the strategy used for these recommendations"
  }
}

Focus on:
1. Books that complement their existing collection without being too repetitive
2. A mix of popular and lesser-known titles
3. Consider the diversity of their current collection
4. Provide clear, specific reasons for each recommendation
5. Include books from both their preferred genres and 1-2 suggestions for expanding their horizons
`.trim();
  }

  /**
   * Parse AI recommendations response
   * @param {object} aiResponse - Raw AI response
   * @returns {Array} Parsed recommendations
   */
  parseAIRecommendations(aiResponse) {
    try {
      const recommendations = aiResponse.recommendations || [];
      return recommendations.map(rec => ({
        title: rec.title,
        author: rec.author,
        genre: rec.genre,
        reason: rec.reason,
        confidence: Math.max(0.1, Math.min(1.0, rec.confidence || 0.7)),
        themes: rec.themes || [],
        similarTo: rec.similar_to,
        publicationYear: rec.publication_year,
        difficultyLevel: rec.difficulty_level,
        source: 'ai-generated',
        aiReasoning: aiResponse.reasoning
      }));
    } catch (error) {
      console.error('Failed to parse AI recommendations:', error);
      return [];
    }
  }

  /**
   * Generate fallback recommendations using rule-based approach
   * @param {Array} books - User's books
   * @param {object} profile - Reading profile
   * @param {object} options - Options
   * @returns {Array} Fallback recommendations
   */
  generateFallbackRecommendations(books, profile, options) {
    const recommendations = [];
    const maxRecs = options.maxRecommendations || 10;

    // Popular books by top genres
    const genreRecommendations = this.getPopularBooksByGenre(profile.topGenres, maxRecs * 0.6);
    recommendations.push(...genreRecommendations);

    // Books by favorite authors
    const authorRecommendations = this.getBooksByAuthors(profile.topAuthors, maxRecs * 0.3);
    recommendations.push(...authorRecommendations);

    // Discovery recommendations (different genres)
    const discoveryRecommendations = this.getDiscoveryRecommendations(profile, maxRecs * 0.1);
    recommendations.push(...discoveryRecommendations);

    return recommendations.slice(0, maxRecs);
  }

  /**
   * Get popular books by genre (fallback data)
   * @param {Array} topGenres - User's top genres
   * @param {number} count - Number of recommendations
   * @returns {Array} Genre-based recommendations
   */
  getPopularBooksByGenre(topGenres, count) {
    // This would typically query a database or external API
    // For now, using hardcoded popular books by genre
    const popularBooks = {
      'Fiction': [
        { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', reason: 'Popular contemporary fiction with strong character development' },
        { title: 'Where the Crawdads Sing', author: 'Delia Owens', reason: 'Bestselling literary fiction with mystery elements' },
      ],
      'Mystery': [
        { title: 'The Thursday Murder Club', author: 'Richard Osman', reason: 'Cozy mystery with clever plotting and humor' },
        { title: 'The Silent Patient', author: 'Alex Michaelides', reason: 'Psychological thriller with unexpected twists' },
      ],
      'Fantasy': [
        { title: 'The Name of the Wind', author: 'Patrick Rothfuss', reason: 'Epic fantasy with beautiful prose and world-building' },
        { title: 'The Priory of the Orange Tree', author: 'Samantha Shannon', reason: 'Standalone epic fantasy with dragons and strong characters' },
      ]
    };

    const recommendations = [];
    for (const genreInfo of topGenres) {
      const books = popularBooks[genreInfo.genre] || [];
      for (const book of books) {
        if (recommendations.length < count) {
          recommendations.push({
            ...book,
            genre: genreInfo.genre,
            confidence: 0.6,
            source: 'rule-based-genre',
            themes: []
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Get books by favorite authors (fallback)
   * @param {Array} topAuthors - User's favorite authors
   * @param {number} count - Number of recommendations
   * @returns {Array} Author-based recommendations
   */
  getBooksByAuthors(topAuthors, count) {
    // This would query for other books by the same authors
    // For now, return empty array as this requires external data
    return [];
  }

  /**
   * Get discovery recommendations (fallback)
   * @param {object} profile - Reading profile
   * @param {number} count - Number of recommendations
   * @returns {Array} Discovery recommendations
   */
  getDiscoveryRecommendations(profile, count) {
    // Suggest books from genres not well-represented in their collection
    const discoveryBooks = [
      { title: 'Educated', author: 'Tara Westover', genre: 'Memoir', reason: 'Powerful memoir to expand beyond fiction' },
      { title: 'The Midnight Library', author: 'Matt Haig', genre: 'Philosophical Fiction', reason: 'Thought-provoking philosophical fiction' }
    ];

    return discoveryBooks.slice(0, Math.floor(count)).map(book => ({
      ...book,
      confidence: 0.5,
      source: 'rule-based-discovery',
      themes: []
    }));
  }

  /**
   * Enrich recommendations with metadata from Google Books
   * @param {Array} recommendations - Basic recommendations
   * @param {boolean} includeMetadata - Whether to fetch metadata
   * @returns {Promise<Array>} Enriched recommendations
   */
  async enrichRecommendations(recommendations, includeMetadata = true) {
    if (!includeMetadata) return recommendations;

    const enriched = [];
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

    for (const rec of recommendations) {
      try {
        const enrichedRec = { ...rec };

        if (apiKey && rec.title && rec.author) {
          const googleBookData = await this.fetchGoogleBookMetadata(rec.title, rec.author);
          if (googleBookData) {
            enrichedRec.metadata = {
              isbn: googleBookData.isbn,
              publishedDate: googleBookData.publishedDate,
              pageCount: googleBookData.pageCount,
              averageRating: googleBookData.averageRating,
              ratingsCount: googleBookData.ratingsCount,
              description: googleBookData.description,
              thumbnail: googleBookData.thumbnail,
              categories: googleBookData.categories
            };
          }
        }

        enriched.push(enrichedRec);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`Failed to enrich recommendation for "${rec.title}":`, error.message);
        enriched.push(rec);
      }
    }

    return enriched;
  }

  /**
   * Fetch book metadata from Google Books API
   * @param {string} title - Book title
   * @param {string} author - Author name
   * @returns {Promise<object|null>} Book metadata
   */
  async fetchGoogleBookMetadata(title, author) {
    try {
      const query = `intitle:"${title}"+inauthor:"${author}"`;
      const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
        params: {
          q: query,
          key: process.env.GOOGLE_BOOKS_API_KEY,
          maxResults: 1
        },
        timeout: 5000
      });

      if (response.data.items && response.data.items.length > 0) {
        const book = response.data.items[0].volumeInfo;
        return {
          isbn: book.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount,
          averageRating: book.averageRating,
          ratingsCount: book.ratingsCount,
          description: book.description,
          thumbnail: book.imageLinks?.thumbnail,
          categories: book.categories || []
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Rank and score recommendations based on various factors
   * @param {Array} recommendations - Raw recommendations
   * @param {object} profile - Reading profile
   * @param {object} preferences - User preferences
   * @returns {Array} Ranked recommendations
   */
  rankRecommendations(recommendations, profile, preferences) {
    return recommendations
      .map(rec => ({
        ...rec,
        finalScore: this.calculateRecommendationScore(rec, profile, preferences)
      }))
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Calculate recommendation score (Enhanced with Goodreads data)
   * @param {object} rec - Recommendation
   * @param {object} profile - Reading profile
   * @param {object} preferences - User preferences
   * @returns {number} Score (0-1)
   */
  calculateRecommendationScore(rec, profile, preferences) {
    let score = rec.confidence || 0.5;

    // Boost score for preferred genres
    if (preferences.favoriteGenres?.includes(rec.genre)) {
      score += 0.2;
    }

    // Reduce score for genres to avoid
    if (preferences.avoidGenres?.includes(rec.genre)) {
      score -= 0.3;
    }

    // Boost for popular genres in user's collection
    const genrePopularity = profile.topGenres.find(g => g.genre === rec.genre);
    if (genrePopularity) {
      score += Math.min(0.15, parseFloat(genrePopularity.percentage) / 100 * 0.5);
    }

    // Enhanced Goodreads rating boost
    if (rec.goodreadsData?.rating) {
      const ratingBoost = (rec.goodreadsData.rating - 3) * 0.15; // Stronger boost for high Goodreads ratings
      score += ratingBoost;
      
      // Additional boost for books with many reviews (credibility)
      if (rec.goodreadsData.ratingsCount > 10000) {
        score += 0.1;
      } else if (rec.goodreadsData.ratingsCount > 1000) {
        score += 0.05;
      }
    }

    // Boost for books with good Google Books ratings (fallback)
    if (rec.metadata?.averageRating && !rec.goodreadsData?.rating) {
      score += (rec.metadata.averageRating - 3) * 0.1;
    }

    // Rating threshold compliance
    if (preferences.ratingThresholds?.minimumRating && rec.goodreadsData?.rating) {
      if (rec.goodreadsData.rating >= preferences.ratingThresholds.minimumRating) {
        score += 0.05; // Small boost for meeting rating requirements
      } else {
        score -= 0.2; // Penalty for not meeting requirements
      }
    }

    // Award-winning books boost
    if (rec.goodreadsData?.awards && rec.goodreadsData.awards.length > 0) {
      score += 0.1;
    }

    // Source-based scoring
    if (rec.source === 'ai-generated') {
      score += 0.05; // Slight boost for personalized AI recommendations
    } else if (rec.source === 'goodreads-popular') {
      score += 0.03; // Slight boost for popular Goodreads books
    }

    // Diversity preference handling
    if (preferences.discoverySettings?.experimentWithGenres) {
      // User likes variety - boost books from different genres
      const userHasGenre = profile.topGenres.some(g => g.genre === rec.genre);
      if (!userHasGenre) {
        score += 0.08;
      }
    }

    // Recent publications boost (if user prefers new releases)
    if (preferences.discoverySettings?.includeNewReleases && rec.publicationYear) {
      const currentYear = new Date().getFullYear();
      if (rec.publicationYear >= currentYear - 2) {
        score += 0.06;
      }
    }

    // Classic literature boost (if user includes classics)
    if (preferences.discoverySettings?.includeClassics && rec.publicationYear) {
      if (rec.publicationYear < 1990 && rec.goodreadsData?.rating >= 4.0) {
        score += 0.05;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate explanation for recommendations
   * @param {Array} detectedBooks - User's books
   * @param {Array} recommendations - Generated recommendations
   * @param {object} profile - Reading profile
   * @returns {string} Explanation text
   */
  generateExplanation(detectedBooks, recommendations, profile) {
    const topGenre = profile.topGenres[0];
    const diversity = profile.diversity;

    let explanation = `Based on your collection of ${detectedBooks.length} books, `;

    if (topGenre) {
      explanation += `we noticed you enjoy ${topGenre.genre.toLowerCase()} (${topGenre.percentage}% of your collection). `;
    }

    if (diversity > 0.7) {
      explanation += `You have a wonderfully diverse reading taste, so we've included recommendations across multiple genres. `;
    } else if (diversity < 0.3) {
      explanation += `We've focused on your preferred genres but also included a few discoveries to broaden your horizons. `;
    }

    explanation += `These ${recommendations.length} recommendations are carefully selected to complement your existing library.`;

    return explanation;
  }

  // Helper methods

  determineReadingStyle(profile) {
    if (profile.diversity > 0.7) return 'eclectic';
    if (profile.series.size > profile.totalBooks * 0.3) return 'series-focused';
    if (profile.authors.size < profile.totalBooks * 0.5) return 'author-loyal';
    return 'genre-focused';
  }

  createProfileSummary(profile) {
    return `${profile.totalBooks} books, ${profile.readingStyle} reader, ${profile.genres.size} genres, diversity: ${(profile.diversity * 100).toFixed(1)}%`;
  }

  calculateRecommendationConfidence(recommendations) {
    if (recommendations.length === 0) return 0;
    return recommendations.reduce((sum, rec) => sum + (rec.finalScore || rec.confidence), 0) / recommendations.length;
  }

  getCacheKey(books, preferences, options) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(books.map(b => ({ title: b.title, author: b.author, genre: b.genre }))));
    hash.update(JSON.stringify(preferences));
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
  }

  updateStats(result, sessionId) {
    this.stats.totalRecommendations++;
    this.stats.uniqueUsers.add(sessionId);
    this.stats.averageBooks = (this.stats.averageBooks * (this.stats.totalRecommendations - 1) + result.metadata.basedOnBooks) / this.stats.totalRecommendations;

    // Update popular genres
    for (const genre of result.readingProfile.topGenres) {
      this.stats.popularGenres.set(genre.genre, (this.stats.popularGenres.get(genre.genre) || 0) + 1);
    }
  }

  /**
   * Get recommendation statistics
   * @returns {object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      uniqueUsers: this.stats.uniqueUsers.size,
      cacheSize: this.recommendationCache.size,
      topGenres: Array.from(this.stats.popularGenres.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([genre, count]) => ({ genre, requests: count }))
    };
  }

  /**
   * Clear recommendation cache
   * @returns {number} Number of entries cleared
   */
  clearCache() {
    const size = this.recommendationCache.size;
    this.recommendationCache.clear();
    return size;
  }

  /**
   * Get Goodreads-based recommendations
   * @param {Array} detectedBooks - User's detected books
   * @param {object} readingProfile - Reading profile analysis
   * @param {object} userPreferences - User preferences
   * @param {object} options - Options
   * @returns {Promise<Array>} Goodreads recommendations
   */
  async getGoodreadsRecommendations(detectedBooks, readingProfile, userPreferences, options) {
    try {
      console.log('📚 Getting Goodreads-based recommendations');

      const goodreadsRecs = await goodreadsIntegration.getRecommendations(
        userPreferences,
        detectedBooks
      );

      // Apply rating thresholds if specified
      let filteredRecs = goodreadsRecs;
      if (userPreferences.ratingThresholds?.minimumRating) {
        filteredRecs = goodreadsRecs.filter(book => 
          book.rating >= userPreferences.ratingThresholds.minimumRating
        );
      }

      if (userPreferences.ratingThresholds?.minimumReviewCount) {
        filteredRecs = filteredRecs.filter(book => 
          book.ratingsCount >= userPreferences.ratingThresholds.minimumReviewCount
        );
      }

      // Convert to standard recommendation format
      return filteredRecs.map(book => ({
        title: book.title,
        author: book.author,
        genre: book.genres[0], // Use first genre as primary
        reason: `Highly rated on Goodreads (${book.rating}/5 stars with ${book.ratingsCount.toLocaleString()} reviews)`,
        confidence: Math.min(0.9, book.rating / 5), // Convert rating to confidence
        themes: book.genres,
        publicationYear: book.publicationYear,
        source: 'goodreads-popular',
        goodreadsData: {
          id: book.id,
          isbn: book.isbn,
          rating: book.rating,
          ratingsCount: book.ratingsCount,
          awards: book.awards || []
        }
      }));

    } catch (error) {
      console.error('Failed to get Goodreads recommendations:', error);
      return [];
    }
  }

  /**
   * Combine AI and Goodreads recommendations intelligently
   * @param {Array} aiRecs - AI-generated recommendations
   * @param {Array} goodreadsRecs - Goodreads-based recommendations
   * @param {object} options - Options
   * @returns {Array} Combined recommendations
   */
  combineRecommendations(aiRecs, goodreadsRecs, options) {
    console.log(`🔀 Combining ${aiRecs.length} AI recs with ${goodreadsRecs.length} Goodreads recs`);

    const combined = [];
    const seenTitles = new Set();

    // Strategy: Interleave AI and Goodreads recommendations
    // Prioritize AI recommendations but include Goodreads for validation/enhancement
    const maxRecs = options.maxRecommendations || 20;
    const aiWeight = 0.7; // 70% AI, 30% Goodreads
    
    const targetAI = Math.ceil(maxRecs * aiWeight);
    const targetGoodreads = maxRecs - targetAI;

    // Add AI recommendations first (they're more personalized)
    for (const rec of aiRecs.slice(0, targetAI)) {
      const titleKey = rec.title.toLowerCase();
      if (!seenTitles.has(titleKey)) {
        combined.push({ ...rec, combinationSource: 'ai-primary' });
        seenTitles.add(titleKey);
      }
    }

    // Add Goodreads recommendations for diversity
    for (const rec of goodreadsRecs.slice(0, targetGoodreads)) {
      const titleKey = rec.title.toLowerCase();
      if (!seenTitles.has(titleKey)) {
        combined.push({ ...rec, combinationSource: 'goodreads-diversity' });
        seenTitles.add(titleKey);
      }
    }

    // Fill remaining slots with either source
    const remaining = [...aiRecs.slice(targetAI), ...goodreadsRecs.slice(targetGoodreads)];
    for (const rec of remaining) {
      if (combined.length >= maxRecs) break;
      
      const titleKey = rec.title.toLowerCase();
      if (!seenTitles.has(titleKey)) {
        combined.push({ ...rec, combinationSource: 'mixed-fill' });
        seenTitles.add(titleKey);
      }
    }

    console.log(`✅ Combined into ${combined.length} unique recommendations`);
    return combined;
  }
}

// Create singleton instance
const recommendationEngine = new RecommendationEngine();

module.exports = recommendationEngine;