require('dotenv').config();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Image processing service for optimizing bookshelf images before AI analysis
 */
class ImageProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Process image for optimal AI analysis
   * @param {string} inputPath - Path to input image
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processing result with optimized image path
   */
  async processForAI(inputPath, options = {}) {
    try {
      console.log(`Processing image for AI analysis: ${inputPath}`);
      const startTime = Date.now();

      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      console.log(`Original image: ${metadata.width}x${metadata.height}, ${metadata.format}, ${Math.round(metadata.size / 1024)}KB`);

      // Generate output filename
      const timestamp = Date.now();
      const outputFilename = `processed_${timestamp}.jpg`;
      const outputPath = path.join(this.tempDir, outputFilename);

      // Apply processing pipeline
      let pipeline = sharp(inputPath);

      // 1. Rotate based on EXIF orientation
      pipeline = pipeline.rotate();

      // 2. Resize if too large (max 1920x1080 for balance between quality and processing speed)
      const maxDimension = options.maxDimension || 1920;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        pipeline = pipeline.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // 3. Enhance for text recognition
      pipeline = pipeline
        // Increase contrast and brightness for better text visibility
        .modulate({
          brightness: options.brightness || 1.1,
          saturation: options.saturation || 1.2,
          hue: 0
        })
        // Apply sharpening for text clarity
        .sharpen({
          sigma: options.sharpen || 1.0,
          flat: 1,
          jagged: 2
        });

      // 4. Convert to JPEG with high quality
      pipeline = pipeline.jpeg({
        quality: options.quality || 92,
        progressive: true
      });

      // Execute pipeline
      await pipeline.toFile(outputPath);

      const processedMetadata = await sharp(outputPath).metadata();
      const processingTime = Date.now() - startTime;

      console.log(`Processed image: ${processedMetadata.width}x${processedMetadata.height}, ${Math.round(processedMetadata.size / 1024)}KB, ${processingTime}ms`);

      return {
        success: true,
        originalPath: inputPath,
        processedPath: outputPath,
        originalSize: metadata.size,
        processedSize: processedMetadata.size,
        compressionRatio: (metadata.size / processedMetadata.size).toFixed(2),
        processingTime: processingTime,
        dimensions: {
          original: { width: metadata.width, height: metadata.height },
          processed: { width: processedMetadata.width, height: processedMetadata.height }
        }
      };

    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Create thumbnail for quick preview
   * @param {string} inputPath - Path to input image
   * @param {number} size - Thumbnail size (default: 200)
   * @returns {Promise<string>} Path to thumbnail
   */
  async createThumbnail(inputPath, size = 200) {
    try {
      const timestamp = Date.now();
      const thumbnailPath = path.join(this.tempDir, `thumbnail_${timestamp}.jpg`);

      await sharp(inputPath)
        .rotate()
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;

    } catch (error) {
      throw new Error(`Thumbnail creation failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image specifically for book spine detection
   * @param {string} inputPath - Path to input image
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processing result
   */
  async preprocessForBookSpines(inputPath, options = {}) {
    try {
      console.log('Preprocessing image for book spine detection');
      
      const timestamp = Date.now();
      const outputPath = path.join(this.tempDir, `spine_optimized_${timestamp}.jpg`);

      // Enhanced processing for book spine recognition
      await sharp(inputPath)
        .rotate()
        // Resize to optimal resolution for text recognition
        .resize(1600, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        // Enhance contrast for text visibility
        .normalize()
        // Sharpen for better text edges
        .sharpen({
          sigma: 1.5,
          flat: 1,
          jagged: 2
        })
        // Adjust levels for better text contrast
        .modulate({
          brightness: 1.15,
          saturation: 0.9, // Slightly desaturate to focus on text
          hue: 0
        })
        // High quality JPEG
        .jpeg({
          quality: 95,
          progressive: true
        })
        .toFile(outputPath);

      return {
        success: true,
        processedPath: outputPath,
        originalPath: inputPath
      };

    } catch (error) {
      throw new Error(`Book spine preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Extract multiple crops from bookshelf for detailed analysis
   * @param {string} inputPath - Path to input image
   * @param {Array} regions - Array of crop regions {x, y, width, height}
   * @returns {Promise<Array>} Array of cropped image paths
   */
  async extractBookRegions(inputPath, regions = []) {
    try {
      const croppedPaths = [];
      const metadata = await sharp(inputPath).metadata();

      // If no regions specified, create grid-based crops
      if (regions.length === 0) {
        regions = this.generateGridRegions(metadata.width, metadata.height);
      }

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const timestamp = Date.now();
        const cropPath = path.join(this.tempDir, `crop_${i}_${timestamp}.jpg`);

        await sharp(inputPath)
          .extract({
            left: Math.max(0, region.x),
            top: Math.max(0, region.y),
            width: Math.min(region.width, metadata.width - region.x),
            height: Math.min(region.height, metadata.height - region.y)
          })
          .jpeg({ quality: 90 })
          .toFile(cropPath);

        croppedPaths.push(cropPath);
      }

      return croppedPaths;

    } catch (error) {
      throw new Error(`Region extraction failed: ${error.message}`);
    }
  }

  /**
   * Generate grid-based regions for systematic analysis
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} rows - Number of rows (default: 3)
   * @param {number} cols - Number of columns (default: 4)
   * @returns {Array} Array of region objects
   */
  generateGridRegions(width, height, rows = 3, cols = 4) {
    const regions = [];
    const regionWidth = Math.floor(width / cols);
    const regionHeight = Math.floor(height / rows);
    const overlap = 0.1; // 10% overlap between regions

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.max(0, col * regionWidth - (overlap * regionWidth));
        const y = Math.max(0, row * regionHeight - (overlap * regionHeight));
        const w = regionWidth + (overlap * regionWidth);
        const h = regionHeight + (overlap * regionHeight);

        regions.push({
          x: Math.floor(x),
          y: Math.floor(y),
          width: Math.floor(w),
          height: Math.floor(h)
        });
      }
    }

    return regions;
  }

  /**
   * Validate image file for processing
   * @param {string} imagePath - Path to image file
   * @returns {Promise<object>} Validation result
   */
  async validateImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        return { valid: false, error: 'Image file not found' };
      }

      const stats = fs.statSync(imagePath);
      const maxSize = 50 * 1024 * 1024; // 50MB limit

      if (stats.size > maxSize) {
        return { valid: false, error: 'Image file too large (max 50MB)' };
      }

      // Try to read metadata to validate it's a valid image
      const metadata = await sharp(imagePath).metadata();
      
      if (!metadata.width || !metadata.height) {
        return { valid: false, error: 'Invalid image file' };
      }

      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'gif'];
      if (!supportedFormats.includes(metadata.format)) {
        return { valid: false, error: 'Unsupported image format' };
      }

      return { 
        valid: true, 
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: stats.size,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      return { valid: false, error: `Image validation error: ${error.message}` };
    }
  }

  /**
   * Clean up temporary files older than specified age
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   * @returns {Promise<object>} Cleanup result
   */
  async cleanupTempFiles(maxAgeHours = 24) {
    try {
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      const now = Date.now();
      let deletedCount = 0;
      let totalSize = 0;

      const files = fs.readdirSync(this.tempDir);
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} temp files, freed ${Math.round(totalSize / 1024)}KB`);

      return {
        deletedCount,
        totalSize,
        remainingFiles: files.length - deletedCount
      };

    } catch (error) {
      console.error('Temp file cleanup error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get processing statistics
   * @returns {object} Processing statistics
   */
  getStats() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const totalSize = files.reduce((sum, file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        return sum + stats.size;
      }, 0);

      return {
        tempFiles: files.length,
        totalTempSize: totalSize,
        tempSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        tempDir: this.tempDir
      };

    } catch (error) {
      return { error: error.message };
    }
  }
}

// Create singleton instance
const imageProcessor = new ImageProcessor();

// Schedule automatic cleanup every hour
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    imageProcessor.cleanupTempFiles(1); // Clean files older than 1 hour
  }, 60 * 60 * 1000);
}

module.exports = imageProcessor;