require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze bookshelf image using OpenAI GPT-4 Vision
 * @param {string} imagePath - Path to the uploaded image
 * @param {object} options - Additional options for analysis
 * @returns {Promise<object>} Analysis results with book titles and metadata
 */
async function analyzeBookshelfImage(imagePath, options = {}) {
  try {
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Read and encode image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageExtension = path.extname(imagePath).toLowerCase();
    const mimeType = getMimeType(imageExtension);

    console.log(`Analyzing bookshelf image: ${imagePath} (${imageBuffer.length} bytes)`);

    // Create the vision prompt
    const visionPrompt = createBookshelfAnalysisPrompt(options);

    // Make request to OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: visionPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: options.detail || "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1 // Low temperature for consistent results
    });

    const rawResponse = response.choices[0].message.content;
    console.log('OpenAI Vision raw response:', rawResponse);

    // Parse the structured response
    const analysisResult = parseBookshelfAnalysis(rawResponse);
    
    return {
      success: true,
      provider: 'openai-vision',
      books: analysisResult.books,
      metadata: {
        totalBooksDetected: analysisResult.books.length,
        imageAnalyzed: imagePath,
        timestamp: new Date().toISOString(),
        tokensUsed: response.usage.total_tokens,
        confidence: analysisResult.confidence,
        processingTime: analysisResult.processingTime
      },
      rawResponse: rawResponse
    };

  } catch (error) {
    console.error('OpenAI Vision analysis error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`OpenAI Vision analysis failed: ${error.message}`);
  }
}

/**
 * Create a detailed prompt for bookshelf analysis
 * @param {object} options - Analysis options
 * @returns {string} Formatted prompt
 */
function createBookshelfAnalysisPrompt(options = {}) {
  const includeAuthors = options.includeAuthors !== false;
  const includeGenres = options.includeGenres !== false;
  const includeCondition = options.includeCondition || false;

  return `
Please analyze this bookshelf image and identify all visible book titles. I need you to extract the following information in JSON format:

IMPORTANT: Return only valid JSON. Do not include any markdown formatting or code blocks.

For each book you can clearly identify, provide:
- "title": The complete book title (required)
- "author": Author name if clearly visible (${includeAuthors ? 'required' : 'optional'})
- "series": Series name if applicable (optional)
- "volume": Volume/book number if part of series (optional)
${includeGenres ? '- "genre": Estimated genre based on title/spine design (optional)' : ''}
${includeCondition ? '- "condition": Physical condition (new/good/fair/poor) (optional)' : ''}
- "confidence": Your confidence level in this identification (0.1-1.0)
- "spineColor": Dominant color of the book spine (optional)
- "position": Approximate position description (e.g., "top shelf, left side")

Please be very careful about:
1. Only include books where you can read at least part of the title clearly
2. Don't guess or make up titles - if unsure, skip that book
3. Pay attention to series numbers and volumes
4. Some spines may have titles in different orientations
5. Group books that appear to be part of the same series

Return the response as a JSON object with this structure:
{
  "books": [
    {
      "title": "Book Title Here",
      "author": "Author Name",
      "confidence": 0.9,
      "position": "top shelf, center"
    }
  ],
  "summary": {
    "totalBooksIdentified": 0,
    "averageConfidence": 0.0,
    "notes": "Any additional observations about the bookshelf"
  }
}

Focus on accuracy over quantity. It's better to identify fewer books with high confidence than many books with uncertainty.
`.trim();
}

/**
 * Parse the OpenAI response and extract book information
 * @param {string} rawResponse - Raw response from OpenAI
 * @returns {object} Parsed book data
 */
function parseBookshelfAnalysis(rawResponse) {
  const startTime = Date.now();
  
  try {
    // Clean the response - remove any markdown code blocks
    let cleanResponse = rawResponse.trim();
    
    // Remove markdown code block markers if present
    cleanResponse = cleanResponse.replace(/^```json\s*\n?/i, '');
    cleanResponse = cleanResponse.replace(/\n?```$/i, '');
    cleanResponse = cleanResponse.replace(/^```\s*\n?/i, '');
    
    // Parse JSON
    const parsed = JSON.parse(cleanResponse);
    
    // Validate and normalize the structure
    const books = parsed.books || [];
    const validBooks = books
      .filter(book => book.title && book.title.trim().length > 0)
      .map(book => ({
        title: book.title.trim(),
        author: book.author ? book.author.trim() : null,
        series: book.series ? book.series.trim() : null,
        volume: book.volume || null,
        genre: book.genre ? book.genre.trim() : null,
        confidence: Math.max(0.1, Math.min(1.0, book.confidence || 0.7)),
        spineColor: book.spineColor ? book.spineColor.trim() : null,
        position: book.position ? book.position.trim() : null,
        condition: book.condition ? book.condition.trim() : null
      }));

    const processingTime = Date.now() - startTime;
    const averageConfidence = validBooks.length > 0 
      ? validBooks.reduce((sum, book) => sum + book.confidence, 0) / validBooks.length 
      : 0;

    return {
      books: validBooks,
      confidence: averageConfidence,
      processingTime: processingTime,
      summary: parsed.summary || {
        totalBooksIdentified: validBooks.length,
        averageConfidence: averageConfidence,
        notes: 'Analysis completed successfully'
      }
    };

  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    console.error('Raw response was:', rawResponse);
    
    // Attempt to extract books using regex as fallback
    const fallbackBooks = extractBooksWithRegex(rawResponse);
    
    return {
      books: fallbackBooks,
      confidence: 0.5,
      processingTime: Date.now() - startTime,
      summary: {
        totalBooksIdentified: fallbackBooks.length,
        averageConfidence: 0.5,
        notes: 'Parsed using fallback method due to JSON parsing error'
      }
    };
  }
}

/**
 * Fallback method to extract books using regex patterns
 * @param {string} text - Text to extract books from
 * @returns {Array} Array of book objects
 */
function extractBooksWithRegex(text) {
  const books = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for title patterns
    const titleMatch = line.match(/(?:title|book):\s*["']?([^"'\n]+)["']?/i);
    const authorMatch = line.match(/author:\s*["']?([^"'\n]+)["']?/i);
    
    if (titleMatch) {
      books.push({
        title: titleMatch[1].trim(),
        author: authorMatch ? authorMatch[1].trim() : null,
        confidence: 0.6,
        position: null,
        spineColor: null,
        genre: null
      });
    }
  }
  
  return books;
}

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (with dot)
 * @returns {string} MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * Validate image file for analysis
 * @param {string} imagePath - Path to image file
 * @returns {object} Validation result
 */
function validateImageForAnalysis(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      return { valid: false, error: 'Image file not found' };
    }

    const stats = fs.statSync(imagePath);
    const maxSize = 20 * 1024 * 1024; // 20MB limit

    if (stats.size > maxSize) {
      return { valid: false, error: 'Image file too large (max 20MB)' };
    }

    const extension = path.extname(imagePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    if (!validExtensions.includes(extension)) {
      return { valid: false, error: 'Unsupported image format' };
    }

    return { valid: true, size: stats.size, extension: extension };

  } catch (error) {
    return { valid: false, error: `File validation error: ${error.message}` };
  }
}

/**
 * Get OpenAI Vision API usage statistics
 * @returns {object} Usage statistics
 */
async function getUsageStats() {
  // This would typically require calling OpenAI's usage API
  // For now, return placeholder data
  return {
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  analyzeBookshelfImage,
  validateImageForAnalysis,
  getUsageStats,
  createBookshelfAnalysisPrompt,
  parseBookshelfAnalysis
};