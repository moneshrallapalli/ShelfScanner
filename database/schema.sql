-- Shelf Scanner Database Schema

-- Device sessions table for session management
CREATE TABLE device_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    device_fingerprint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- User preferences tied to device sessions
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES device_sessions(session_id) ON DELETE CASCADE,
    favorite_genres TEXT[], -- Array of genre strings
    preferred_authors TEXT[], -- Array of author names
    reading_pace VARCHAR(50), -- 'slow', 'medium', 'fast'
    content_preferences JSONB, -- Flexible storage for additional preferences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reading history for recommendations
CREATE TABLE reading_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES device_sessions(session_id) ON DELETE CASCADE,
    book_title VARCHAR(500) NOT NULL,
    book_author VARCHAR(300),
    isbn VARCHAR(20),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(20) DEFAULT 'read', -- 'read', 'reading', 'want_to_read'
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    goodreads_book_id VARCHAR(50),
    notes TEXT
);

-- Cache for book metadata to reduce API calls
CREATE TABLE book_cache (
    id SERIAL PRIMARY KEY,
    book_identifier VARCHAR(500) NOT NULL, -- Could be title, ISBN, or combination
    book_metadata JSONB NOT NULL, -- Store full book details
    source VARCHAR(50) NOT NULL, -- 'goodreads', 'google_books', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Image uploads tracking
CREATE TABLE image_uploads (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES device_sessions(session_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    processing_status VARCHAR(50) DEFAULT 'uploaded', -- 'uploaded', 'processing', 'completed', 'failed'
    extracted_books JSONB, -- Store recognized books from image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Recommendations generated for users
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES device_sessions(session_id) ON DELETE CASCADE,
    image_upload_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    recommended_books JSONB NOT NULL, -- Array of recommended book objects
    reasoning TEXT, -- Why these books were recommended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting tracking
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_device_sessions_session_id ON device_sessions(session_id);
CREATE INDEX idx_device_sessions_active ON device_sessions(is_active, expires_at);
CREATE INDEX idx_user_preferences_session ON user_preferences(session_id);
CREATE INDEX idx_reading_history_session ON reading_history(session_id);
CREATE INDEX idx_book_cache_identifier ON book_cache(book_identifier);
CREATE INDEX idx_book_cache_expires ON book_cache(expires_at);
CREATE INDEX idx_image_uploads_session ON image_uploads(session_id);
CREATE INDEX idx_recommendations_session ON recommendations(session_id);
CREATE INDEX idx_rate_limits_session_endpoint ON rate_limits(session_id, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM device_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR 
          (last_active < CURRENT_TIMESTAMP - INTERVAL '30 days' AND is_active = false);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM book_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;