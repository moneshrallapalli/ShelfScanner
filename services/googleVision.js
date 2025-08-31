require('dotenv').config();
const vision = require('@google-cloud/vision');
const axios = require('axios');
const fs = require('fs');

// Initialize Google Vision client using API key
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // If using service account JSON
  key: process.env.GOOGLE_VISION_API_KEY // If using API key
});

/**
 * Analyze bookshelf image using Google Vision API
 * @param {string} imagePath - Path to the uploaded image
 * @param {object} options - Additional options for analysis
 * @returns {Promise<object>} Analysis results with detected text
 */
async function analyzeBookshelfImage(imagePath, options = {}) {
  try {
    console.log(`Analyzing bookshelf with Google Vision: ${imagePath}`);

    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const startTime = Date.now();

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);

    // Perform text detection
    const [textResult] = await visionClient.textDetection({
      image: { content: imageBuffer }
    });

    // Perform document text detection for better OCR
    const [documentResult] = await visionClient.documentTextDetection({
      image: { content: imageBuffer }
    });

    // Perform object detection to identify books
    const [objectResult] = await visionClient.objectLocalization({
      image: { content: imageBuffer }
    });

    const processingTime = Date.now() - startTime;
    console.log(`Google Vision processing completed in ${processingTime}ms`);

    // Process and extract book information
    const books = extractBooksFromVisionResults(textResult, documentResult, objectResult, options);

    return {
      success: true,
      provider: 'google-vision',
      books: books,
      metadata: {
        totalBooksDetected: books.length,
        imageAnalyzed: imagePath,
        timestamp: new Date().toISOString(),
        processingTime: processingTime,
        confidence: calculateAverageConfidence(books)
      },
      rawResults: {
        textAnnotations: textResult.textAnnotations || [],
        documentText: documentResult.fullTextAnnotation || null,
        objects: objectResult.localizedObjectAnnotations || []
      }
    };

  } catch (error) {
    console.error('Google Vision analysis error:', error);
    
    // Handle specific Google Vision errors
    if (error.code === 3) { // INVALID_ARGUMENT
      throw new Error('Invalid image format or corrupted image file.');
    } else if (error.code === 7) { // PERMISSION_DENIED
      throw new Error('Google Vision API permission denied. Check your API key.');
    } else if (error.code === 8) { // RESOURCE_EXHAUSTED
      throw new Error('Google Vision API quota exceeded. Please try again later.');
    }
    
    throw new Error(`Google Vision analysis failed: ${error.message}`);
  }
}

/**
 * Use Google Vision API via REST API (alternative method)
 * @param {string} imagePath - Path to the uploaded image
 * @param {object} options - Additional options
 * @returns {Promise<object>} Analysis results
 */
async function analyzeBookshelfImageWithREST(imagePath, options = {}) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 50 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 20 }
          ]
        }
      ]
    };

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const result = response.data.responses[0];
    
    if (result.error) {
      throw new Error(`Google Vision API error: ${result.error.message}`);
    }

    // Process results similar to the client library method
    const books = extractBooksFromRESTResults(result, options);

    return {
      success: true,
      provider: 'google-vision-rest',
      books: books,
      metadata: {
        totalBooksDetected: books.length,
        imageAnalyzed: imagePath,
        timestamp: new Date().toISOString(),
        confidence: calculateAverageConfidence(books)
      }
    };

  } catch (error) {
    console.error('Google Vision REST API error:', error);
    throw new Error(`Google Vision REST analysis failed: ${error.message}`);
  }
}

/**
 * Extract book information from Google Vision results
 * @param {object} textResult - Text detection result
 * @param {object} documentResult - Document text detection result
 * @param {object} objectResult - Object detection result
 * @param {object} options - Processing options
 * @returns {Array} Array of book objects
 */
function extractBooksFromVisionResults(textResult, documentResult, objectResult, options = {}) {
  const books = [];
  const textAnnotations = textResult.textAnnotations || [];
  const objects = objectResult.localizedObjectAnnotations || [];

  // Find book objects
  const bookObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes('book') || 
    obj.name.toLowerCase().includes('publication')
  );

  console.log(`Found ${bookObjects.length} book objects and ${textAnnotations.length} text annotations`);

  // If we have book objects, try to associate text with them
  if (bookObjects.length > 0) {
    for (const bookObj of bookObjects) {
      const bookRegion = bookObj.boundingPoly;
      const nearbyText = findTextInRegion(textAnnotations, bookRegion, 0.1); // 10% overlap tolerance
      
      const bookInfo = processTextForBookInfo(nearbyText, options);
      if (bookInfo.title) {
        books.push({
          ...bookInfo,
          confidence: bookObj.score || 0.7,
          position: describePosition(bookRegion),
          boundingBox: bookRegion
        });
      }
    }
  }

  // If no book objects found or not enough books detected, try to extract from all text
  if (books.length < 3) {
    console.log('Falling back to text-based extraction');
    const fallbackBooks = extractBooksFromText(textAnnotations, options);
    
    // Merge with existing books, avoiding duplicates
    for (const fallbackBook of fallbackBooks) {
      const isDuplicate = books.some(existingBook => 
        similarTitles(existingBook.title, fallbackBook.title)
      );
      
      if (!isDuplicate) {
        books.push(fallbackBook);
      }
    }
  }

  return books.slice(0, options.maxBooks || 50); // Limit results
}

/**
 * Extract books from REST API results
 * @param {object} result - Google Vision REST API result
 * @param {object} options - Processing options
 * @returns {Array} Array of book objects
 */
function extractBooksFromRESTResults(result, options = {}) {
  const books = [];
  const textAnnotations = result.textAnnotations || [];
  const objects = result.localizedObjectAnnotations || [];

  // Similar logic to the client library version
  const bookObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes('book')
  );

  if (bookObjects.length > 0) {
    for (const bookObj of bookObjects) {
      const nearbyText = findTextInRegion(textAnnotations, bookObj.boundingPoly, 0.1);
      const bookInfo = processTextForBookInfo(nearbyText, options);
      
      if (bookInfo.title) {
        books.push({
          ...bookInfo,
          confidence: bookObj.score || 0.6,
          position: describePosition(bookObj.boundingPoly)
        });
      }
    }
  }

  // Fallback to text extraction
  if (books.length < 2) {
    const fallbackBooks = extractBooksFromText(textAnnotations, options);
    books.push(...fallbackBooks);
  }

  return books.slice(0, options.maxBooks || 30);
}

/**
 * Find text annotations within or near a bounding region
 * @param {Array} textAnnotations - Text detection results
 * @param {object} region - Bounding polygon of the region
 * @param {number} tolerance - Overlap tolerance (0-1)
 * @returns {Array} Text annotations in the region
 */
function findTextInRegion(textAnnotations, region, tolerance = 0.1) {
  if (!region || !region.vertices || textAnnotations.length === 0) {
    return [];
  }

  const regionBounds = getBoundingBox(region.vertices);
  const nearbyText = [];

  for (const annotation of textAnnotations.slice(1)) { // Skip the first full-text annotation
    if (annotation.boundingPoly && annotation.boundingPoly.vertices) {
      const textBounds = getBoundingBox(annotation.boundingPoly.vertices);
      const overlap = calculateOverlap(regionBounds, textBounds);
      
      if (overlap >= tolerance || isNearby(regionBounds, textBounds, 50)) {
        nearbyText.push(annotation);
      }
    }
  }

  return nearbyText;
}

/**
 * Extract books from text annotations using pattern matching
 * @param {Array} textAnnotations - All text annotations
 * @param {object} options - Processing options
 * @returns {Array} Array of book objects
 */
function extractBooksFromText(textAnnotations, options = {}) {
  const books = [];
  const allText = textAnnotations.map(annotation => annotation.description).join(' ');
  
  // Common book title patterns
  const titlePatterns = [
    // Series with numbers: "Book Title 1", "Book Title Vol. 2"
    /([A-Z][^0-9\n]{10,50})\s+(?:Vol\.?\s*)?(\d+)/gi,
    // Quoted titles: "Book Title"
    /"([^"]{5,50})"/g,
    // Titles in all caps (common on spines)
    /\b([A-Z][A-Z\s]{10,40})\b/g,
    // Author patterns: "by Author Name" or "Author Name"
    /(?:by\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
  ];

  // Look for potential book titles
  const potentialTitles = new Set();
  const potentialAuthors = new Set();

  for (const pattern of titlePatterns) {
    let match;
    while ((match = pattern.exec(allText)) !== null) {
      const text = match[1].trim();
      if (text.length >= 5 && text.length <= 50) {
        if (looksLikeTitle(text)) {
          potentialTitles.add(text);
        } else if (looksLikeAuthor(text)) {
          potentialAuthors.add(text);
        }
      }
    }
  }

  // Create book objects from potential titles
  let index = 0;
  for (const title of potentialTitles) {
    if (index >= (options.maxBooks || 20)) break;
    
    books.push({
      title: cleanTitle(title),
      author: findMatchingAuthor(title, potentialAuthors),
      confidence: 0.6,
      position: `detected from text analysis`,
      genre: null,
      spineColor: null
    });
    index++;
  }

  return books;
}

/**
 * Process text annotations to extract book information
 * @param {Array} textAnnotations - Text annotations in the region
 * @param {object} options - Processing options
 * @returns {object} Book information object
 */
function processTextForBookInfo(textAnnotations, options = {}) {
  if (!textAnnotations || textAnnotations.length === 0) {
    return { title: null, author: null };
  }

  const texts = textAnnotations.map(annotation => annotation.description);
  const combinedText = texts.join(' ');

  // Look for the longest meaningful text as potential title
  const longestText = texts.reduce((longest, current) => {
    return current.length > longest.length ? current : longest;
  }, '');

  // Try to identify title vs author
  const title = cleanTitle(longestText);
  const author = extractAuthorFromNearbyText(texts);

  return {
    title: title.length >= 3 ? title : null,
    author: author,
    genre: null,
    spineColor: null
  };
}

// Helper functions

function getBoundingBox(vertices) {
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys)
  };
}

function calculateOverlap(box1, box2) {
  const xOverlap = Math.max(0, Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left));
  const yOverlap = Math.max(0, Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top));
  
  const overlapArea = xOverlap * yOverlap;
  const box1Area = (box1.right - box1.left) * (box1.bottom - box1.top);
  const box2Area = (box2.right - box2.left) * (box2.bottom - box2.top);
  
  return overlapArea / Math.min(box1Area, box2Area);
}

function isNearby(box1, box2, threshold = 50) {
  const centerX1 = (box1.left + box1.right) / 2;
  const centerY1 = (box1.top + box1.bottom) / 2;
  const centerX2 = (box2.left + box2.right) / 2;
  const centerY2 = (box2.top + box2.bottom) / 2;
  
  const distance = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  return distance <= threshold;
}

function describePosition(boundingPoly) {
  if (!boundingPoly || !boundingPoly.vertices) return 'unknown position';
  
  const bounds = getBoundingBox(boundingPoly.vertices);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  
  // Rough position description
  const horizontal = centerX < 400 ? 'left' : centerX > 800 ? 'right' : 'center';
  const vertical = centerY < 300 ? 'top' : centerY > 700 ? 'bottom' : 'middle';
  
  return `${vertical} ${horizontal}`;
}

function looksLikeTitle(text) {
  // Simple heuristics to identify book titles
  const titleWords = ['the', 'a', 'an', 'of', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
  const words = text.toLowerCase().split(/\s+/);
  
  // Has common title words and reasonable length
  const hasCommonWords = titleWords.some(word => words.includes(word));
  const hasProperCapitalization = /^[A-Z]/.test(text);
  const reasonableLength = words.length >= 2 && words.length <= 8;
  
  return (hasCommonWords || hasProperCapitalization) && reasonableLength;
}

function looksLikeAuthor(text) {
  // Simple heuristics to identify author names
  const words = text.split(/\s+/);
  const isAllCapitalized = words.every(word => /^[A-Z][a-z]*$/.test(word));
  const hasReasonableLength = words.length >= 2 && words.length <= 4;
  
  return isAllCapitalized && hasReasonableLength;
}

function cleanTitle(title) {
  return title
    .replace(/[^\w\s\-'":]/g, '') // Remove special characters except common ones
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function extractAuthorFromNearbyText(texts) {
  // Look for author patterns in nearby text
  for (const text of texts) {
    if (text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)) {
      return text;
    }
  }
  return null;
}

function findMatchingAuthor(title, authors) {
  // Simple matching - could be enhanced with fuzzy matching
  return Array.from(authors)[0] || null;
}

function similarTitles(title1, title2) {
  const clean1 = title1.toLowerCase().replace(/[^\w]/g, '');
  const clean2 = title2.toLowerCase().replace(/[^\w]/g, '');
  
  // Simple similarity check
  return clean1 === clean2 || 
         clean1.includes(clean2) || 
         clean2.includes(clean1);
}

function calculateAverageConfidence(books) {
  if (books.length === 0) return 0;
  return books.reduce((sum, book) => sum + book.confidence, 0) / books.length;
}

/**
 * Validate image for Google Vision processing
 * @param {string} imagePath - Path to image file
 * @returns {object} Validation result
 */
function validateImageForAnalysis(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      return { valid: false, error: 'Image file not found' };
    }

    const stats = fs.statSync(imagePath);
    const maxSize = 20 * 1024 * 1024; // 20MB limit for Google Vision

    if (stats.size > maxSize) {
      return { valid: false, error: 'Image file too large (max 20MB)' };
    }

    return { valid: true, size: stats.size };

  } catch (error) {
    return { valid: false, error: `File validation error: ${error.message}` };
  }
}

module.exports = {
  analyzeBookshelfImage,
  analyzeBookshelfImageWithREST,
  validateImageForAnalysis,
  extractBooksFromText,
  processTextForBookInfo
};