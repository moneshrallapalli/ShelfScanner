-- Sessions table (device-based sessions)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  device_info TEXT
);

-- User preferences (linked to session)
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(session_id),
  favorite_genres TEXT[], -- Array of genres
  favorite_authors TEXT[], -- Array of authors
  preferred_rating_min DECIMAL(2,1) DEFAULT 3.0,
  reading_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  preferred_book_length VARCHAR(50), -- 'short', 'medium', 'long', 'any'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reading history
CREATE TABLE reading_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(session_id),
  book_title VARCHAR(500),
  book_author VARCHAR(255),
  isbn VARCHAR(20),
  rating DECIMAL(2,1),
  status VARCHAR(50), -- 'read', 'want_to_read', 'currently_reading'
  goodreads_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scanned bookshelves
CREATE TABLE bookshelf_scans (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(session_id),
  image_path VARCHAR(500),
  detected_books JSONB, -- Store array of detected books
  scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_status VARCHAR(50) DEFAULT 'pending' -- 'pending', 'completed', 'failed'
);

-- Book metadata cache
CREATE TABLE book_cache (
  id SERIAL PRIMARY KEY,
  isbn VARCHAR(20) UNIQUE,
  title VARCHAR(500),
  author VARCHAR(255),
  description TEXT,
  rating DECIMAL(2,1),
  rating_count INTEGER,
  publication_year INTEGER,
  cover_image_url TEXT,
  amazon_url TEXT,
  goodreads_url TEXT,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Recommendations
CREATE TABLE recommendations (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(session_id),
  bookshelf_scan_id INTEGER REFERENCES bookshelf_scans(id),
  recommended_books JSONB, -- Array of recommended book objects
  recommendation_reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_user_preferences_session_id ON user_preferences(session_id);
CREATE INDEX idx_reading_history_session_id ON reading_history(session_id);
CREATE INDEX idx_bookshelf_scans_session_id ON bookshelf_scans(session_id);
CREATE INDEX idx_book_cache_isbn ON book_cache(isbn);
CREATE INDEX idx_recommendations_session_id ON recommendations(session_id);