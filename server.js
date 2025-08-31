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
      books: '/api/books'
    },
    documentation: 'https://github.com/yourusername/shelf-scanner'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});