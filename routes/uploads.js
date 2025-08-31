const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');
const bookSpineRecognition = require('../services/bookSpineRecognition');
const { insertOne, findById, updateById } = require('../utils/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `bookshelf-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer with options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  }
});

// Upload bookshelf image
router.post('/bookshelf', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Use multer middleware for single file upload
    upload.single('bookshelf')(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        if (err.message === 'Only image files are allowed!') {
          return res.status(400).json({ error: 'Invalid file type. Only image files are allowed.' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // File upload successful
        const fileInfo = {
          session_id: sessionId,
          filename: req.file.filename,
          file_path: req.file.path,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          processing_status: 'uploaded'
        };

        // Save upload info to database
        const uploadRecord = await insertOne('image_uploads', fileInfo);
        
        console.log('File uploaded and recorded:', uploadRecord.id);

        // Start AI processing in background
        const processOptions = req.body.processImmediately === 'true' ? 
          await processBookshelfImage(uploadRecord.id, req.file.path, sessionId) : null;

        res.status(201).json({
          success: true,
          message: 'Bookshelf image uploaded successfully',
          file: {
            id: uploadRecord.id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
            uploadedAt: uploadRecord.created_at,
            processingStatus: uploadRecord.processing_status
          },
          ...(processOptions && { processing: processOptions })
        });

      } catch (dbError) {
        console.error('Database error during upload:', dbError);
        res.status(500).json({ 
          error: 'Upload successful but failed to record in database',
          fileId: req.file.filename
        });
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get uploaded file info
router.get('/file/:fileId', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { fileId } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const filePath = path.join(__dirname, '../uploads', fileId);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    
    // In a real implementation, you would fetch from database and check ownership
    res.json({
      success: true,
      file: {
        id: fileId,
        size: stats.size,
        uploadedAt: stats.birthtime.toISOString(),
        lastModified: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to retrieve file information' });
  }
});

// Serve uploaded images (for development only)
router.get('/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(__dirname, '../uploads', fileId);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // In production, you should add proper authentication and authorization here
    res.sendFile(filePath);
  } catch (error) {
    console.error('Image serve error:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Delete uploaded file
router.delete('/file/:fileId', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { fileId } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const filePath = path.join(__dirname, '../uploads', fileId);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    
    // In a real implementation, you would also remove from database
    console.log(`File deleted: ${fileId} by session ${sessionId}`);

    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get upload history for current session
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

    // In a real implementation, you would fetch from database
    // For now, return empty history
    res.json({
      success: true,
      uploads: [],
      totalCount: 0,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Upload history error:', error);
    res.status(500).json({ error: 'Failed to retrieve upload history' });
  }
});

// Process bookshelf image with AI
router.post('/:fileId/analyze', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { fileId } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get upload record
    const uploadRecord = await findById('image_uploads', fileId);
    if (!uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Check ownership
    if (uploadRecord.session_id !== sessionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already processed
    if (uploadRecord.processing_status === 'completed') {
      return res.json({
        success: true,
        message: 'Image already processed',
        books: uploadRecord.extracted_books || [],
        processingStatus: 'completed'
      });
    }

    // Update status to processing
    await updateById('image_uploads', fileId, { 
      processing_status: 'processing',
      processed_at: new Date()
    });

    // Start AI processing
    const analysisOptions = {
      includeAuthors: req.body.includeAuthors !== false,
      includeGenres: req.body.includeGenres !== false,
      maxResults: req.body.maxResults || 50,
      minConfidence: req.body.minConfidence || 0.3,
      enrichWithGoogleBooks: req.body.enrichWithGoogleBooks === true
    };

    console.log(`🔍 Starting AI analysis for upload ${fileId}`);
    
    const analysisResult = await bookSpineRecognition.recognizeBooks(
      uploadRecord.file_path,
      analysisOptions
    );

    // Update database with results
    await updateById('image_uploads', fileId, {
      processing_status: 'completed',
      extracted_books: analysisResult.books
    });

    console.log(`✅ AI analysis completed for upload ${fileId}: ${analysisResult.books.length} books found`);

    res.json({
      success: true,
      message: 'Bookshelf analysis completed',
      analysis: analysisResult,
      uploadId: fileId
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Update status to failed
    try {
      await updateById('image_uploads', req.params.fileId, {
        processing_status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to update processing status:', dbError);
    }

    res.status(500).json({ error: `AI analysis failed: ${error.message}` });
  }
});

// Get extracted books from processed image
router.get('/:fileId/books', async (req, res) => {
  try {
    const sessionId = req.session.deviceSessionId;
    const { fileId } = req.params;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    const uploadRecord = await findById('image_uploads', fileId);
    if (!uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Check ownership
    if (uploadRecord.session_id !== sessionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (uploadRecord.processing_status !== 'completed') {
      return res.status(400).json({ 
        error: 'Image not yet processed',
        status: uploadRecord.processing_status
      });
    }

    res.json({
      success: true,
      books: uploadRecord.extracted_books || [],
      metadata: {
        uploadId: uploadRecord.id,
        processedAt: uploadRecord.processed_at,
        totalBooks: uploadRecord.extracted_books?.length || 0
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to retrieve books' });
  }
});

// Helper function for background processing
async function processBookshelfImage(uploadId, imagePath, sessionId) {
  try {
    console.log(`🔄 Starting background processing for upload ${uploadId}`);
    
    const analysisResult = await bookSpineRecognition.recognizeBooks(imagePath, {
      includeAuthors: true,
      includeGenres: true,
      maxResults: 50,
      minConfidence: 0.3
    });

    // Update database with results
    await updateById('image_uploads', uploadId, {
      processing_status: 'completed',
      extracted_books: analysisResult.books,
      processed_at: new Date()
    });

    console.log(`✅ Background processing completed for upload ${uploadId}: ${analysisResult.books.length} books found`);

    return {
      status: 'completed',
      booksFound: analysisResult.books.length,
      processingTime: analysisResult.metadata.processingTime
    };

  } catch (error) {
    console.error(`❌ Background processing failed for upload ${uploadId}:`, error);
    
    try {
      await updateById('image_uploads', uploadId, {
        processing_status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to update failed status:', dbError);
    }

    return {
      status: 'failed',
      error: error.message
    };
  }
}

module.exports = router;