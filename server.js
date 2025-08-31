require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');

// Import middleware
const rateLimit = require('./middleware/rateLimitMiddleware');
const { sessionMiddleware } = require('./utils/sessionUtils');

// Import routes
const sessionsRouter = require('./routes/sessions');
const preferencesRouter = require('./routes/preferences');
const uploadsRouter = require('./routes/uploads');
const recommendationsRouter = require('./routes/recommendations');
const booksRouter = require('./routes/books');
const adminRouter = require('./routes/admin');
const testRouter = require('./routes/test');
const goodreadsRouter = require('./routes/goodreads');

// Import error handling middleware
const { 
  errorLogger, 
  errorHandler, 
  notFoundHandler,
  timeoutHandler,
  rateLimitErrorHandler,
  corsErrorHandler,
  databaseErrorHandler
} = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and logging middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management (Express sessions)
app.use(session({
  secret: process.env.SESSION_SECRET || 'shelf-scanner-dev-secret',
  resave: false,
  saveUninitialized: false, // Changed to false for better security
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Prevent XSS attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'shelf-scanner-session' // Custom session name
}));

// Custom session middleware
app.use(sessionMiddleware());

// Request timeout (30 seconds)
app.use(timeoutHandler(30000));

// Apply general rate limiting
app.use('/api', rateLimit.general);

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running!', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/books', booksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/test', testRouter);
app.use('/api/goodreads', goodreadsRouter);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Shelf Scanner API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sessions: '/api/sessions',
      preferences: '/api/preferences',
      uploads: '/api/uploads',
      recommendations: '/api/recommendations',
      books: '/api/books',
      admin: '/api/admin',
      goodreads: '/api/goodreads'
    },
    documentation: 'https://github.com/yourusername/shelf-scanner'
  });
});

// Error handling middleware (order is important!)
app.use(corsErrorHandler);
app.use(rateLimitErrorHandler);
app.use(databaseErrorHandler);
app.use(errorLogger);
app.use(notFoundHandler); // Must be before general error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Shelf Scanner API server running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/api/admin/stats`);
  console.log(`📚 AI Services: ${process.env.OPENAI_API_KEY ? '✅ OpenAI' : '❌ OpenAI'} | ${process.env.GOOGLE_VISION_API_KEY ? '✅ Google Vision' : '❌ Google Vision'}`);
});