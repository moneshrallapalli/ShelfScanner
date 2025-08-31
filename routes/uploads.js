const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { getSession } = require('../utils/sessionUtils');

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
    upload.single('bookshelf')(req, res, function (err) {
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

      // File upload successful
      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedAt: new Date().toISOString(),
        sessionId: sessionId
      };

      // In a real implementation, you would save file info to database
      console.log('File uploaded:', fileInfo);

      res.status(201).json({
        success: true,
        message: 'Bookshelf image uploaded successfully',
        file: {
          id: fileInfo.filename, // Use filename as ID for now
          originalName: fileInfo.originalName,
          size: fileInfo.size,
          type: fileInfo.mimetype,
          uploadedAt: fileInfo.uploadedAt
        }
      });
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

module.exports = router;