import axios from 'axios';

// API base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add session handling
api.interceptors.request.use((config) => {
  // Add session ID if available
  const sessionId = localStorage.getItem('shelfScannerSession');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
export interface Session {
  sessionId: string;
  deviceId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Book {
  title: string;
  author: string;
  genre?: string;
  confidence: number;
  position?: string;
  isbn?: string;
  rating?: number;
  ratingsCount?: number;
  awards?: string[];
}

export interface Recommendation {
  title: string;
  author: string;
  genre: string;
  reason: string;
  confidence: number;
  themes: string[];
  publicationYear?: number;
  source: string;
  goodreadsData?: {
    id: string;
    isbn: string;
    rating: number;
    ratingsCount: number;
    awards: string[];
  };
  metadata?: {
    isbn: string;
    publishedDate: string;
    pageCount: number;
    averageRating?: number;
    description?: string;
    thumbnail?: string;
    categories?: string[];
  };
  finalScore?: number;
  amazonUrl?: string;
}

export interface Preferences {
  favoriteGenres: string[];
  avoidGenres: string[];
  preferredAuthors: string[];
  avoidAuthors: string[];
  readingLevel: string;
  ratingThresholds: {
    minimumRating: number;
    minimumReviewCount: number;
    preferHighlyRated: boolean;
  };
  contentPreferences: {
    violence: string;
    profanity: string;
    adult: string;
    religiousContent: string;
    politicalContent: string;
  };
  discoverySettings: {
    includeNewReleases: boolean;
    includeClassics: boolean;
    includeDiverseAuthors: boolean;
    includeTranslations: boolean;
    experimentWithGenres: boolean;
  };
  recommendations: {
    maxResults: number;
    includePopular: boolean;
    includeSimilar: boolean;
    includeAwards: boolean;
    diversityLevel: string;
  };
  readingGoals: {
    booksPerMonth?: number;
    pagesPerDay?: number;
    preferredLength: string;
    seriesPreference: string;
  };
  goodreadsIntegration: {
    enabled: boolean;
    importToRead: boolean;
    importRatings: boolean;
    syncProgress: boolean;
  };
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  uploadId: string;
  message: string;
  uploadedAt: string;
}

export interface AnalysisResponse {
  success: boolean;
  books: Book[];
  processingTime: number;
  detectedBooks: number;
  confidence: number;
  aiProvider: string;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: Recommendation[];
  readingProfile: {
    totalBooks: number;
    topGenres: Array<{ genre: string; count: number; percentage: string }>;
    readingStyle: string;
    diversity: number;
    summary: string;
  };
  explanations: {
    why: string;
    topGenres: Array<{ genre: string; count: number; percentage: string }>;
    readingStyle: string;
  };
  metadata: {
    totalRecommendations: number;
    processingTime: number;
    timestamp: string;
    confidence: number;
    basedOnBooks: number;
    aiProvider: string;
    goodreadsIntegrated: boolean;
  };
}

// API Service Class
class ApiService {
  // Session Management
  async createSession(deviceId: string = 'web-client'): Promise<Session> {
    const response = await api.post('/sessions', { device: deviceId });
    const session = response.data;
    
    // Store session ID in localStorage
    localStorage.setItem('shelfScannerSession', session.sessionId);
    localStorage.setItem('shelfScannerSessionExpiry', session.expiresAt);
    
    return session;
  }

  async getSession(): Promise<Session | null> {
    const sessionId = localStorage.getItem('shelfScannerSession');
    const expiry = localStorage.getItem('shelfScannerSessionExpiry');
    
    if (!sessionId || !expiry) return null;
    if (new Date() > new Date(expiry)) {
      this.clearSession();
      return null;
    }

    try {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.session;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem('shelfScannerSession');
    localStorage.removeItem('shelfScannerSessionExpiry');
  }

  // File Upload and Analysis
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('bookshelf', file);

    const response = await api.post('/uploads/bookshelf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async analyzeImage(uploadId: string): Promise<AnalysisResponse> {
    const response = await api.post(`/uploads/${uploadId}/analyze`);
    return response.data;
  }

  async getUploadStatus(uploadId: string) {
    const response = await api.get(`/uploads/${uploadId}/status`);
    return response.data;
  }

  // Recommendations
  async generateRecommendations(
    uploadId: string,
    preferences: Partial<Preferences> = {},
    options: { maxRecommendations?: number; aiModel?: string } = {}
  ): Promise<RecommendationResponse> {
    const response = await api.post('/recommendations/generate', {
      uploadId,
      preferences,
      options: {
        maxRecommendations: options.maxRecommendations || 10,
        includeMetadata: true,
        aiModel: options.aiModel || 'gpt-4o-mini'
      }
    });

    return response.data;
  }

  async saveRecommendation(recommendationId: string) {
    const response = await api.post(`/recommendations/${recommendationId}/save`);
    return response.data;
  }

  async getSavedRecommendations() {
    const response = await api.get('/recommendations/saved');
    return response.data;
  }

  async rateRecommendation(recommendationId: string, rating: number, feedback?: string) {
    const response = await api.post(`/recommendations/${recommendationId}/rate`, {
      rating,
      feedback
    });
    return response.data;
  }

  // Preferences
  async getPreferences(): Promise<Preferences> {
    const response = await api.get('/preferences');
    return response.data.preferences;
  }

  async updatePreferences(preferences: Partial<Preferences>) {
    const response = await api.put('/preferences', { preferences });
    return response.data;
  }

  async getAvailableGenres(): Promise<string[]> {
    const response = await api.get('/preferences/genres/available');
    return response.data.genres;
  }

  async quickSetupPreferences(setup: {
    favoriteGenres: string[];
    readingLevel: string;
    minimumRating: number;
    contentSensitivity: string;
  }) {
    const response = await api.post('/preferences/quick-setup', setup);
    return response.data;
  }

  async setReadingGoals(goals: {
    booksPerMonth?: number;
    pagesPerDay?: number;
    preferredLength: string;
    seriesPreference: string;
  }) {
    const response = await api.post('/preferences/goals', goals);
    return response.data;
  }

  // Goodreads Integration
  async searchBooks(query: string, limit: number = 10) {
    const response = await api.get(`/goodreads/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async getPopularBooksByGenre(genre: string, limit: number = 20) {
    const response = await api.get(`/goodreads/popular/${encodeURIComponent(genre)}?limit=${limit}`);
    return response.data;
  }

  async getHighlyRatedBooks(filters: {
    minimumRating?: number;
    minimumReviews?: number;
    genres?: string[];
    publicationYearAfter?: number;
    limit?: number;
  }) {
    const response = await api.post('/goodreads/highly-rated', filters);
    return response.data;
  }

  // System Health and Testing
  async getHealthStatus() {
    const response = await api.get('/health');
    return response.data;
  }

  async getSystemStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  }

  async testAIPipeline() {
    const response = await api.post('/test/ai-pipeline-day4');
    return response.data;
  }

  // Utility Methods
  generateAmazonUrl(book: Recommendation): string {
    const query = encodeURIComponent(`${book.title} ${book.author}`);
    return `https://www.amazon.com/s?k=${query}&i=stripbooks&tag=shelfscanner-20`;
  }

  formatBookData(book: any): Book {
    return {
      title: book.title || 'Unknown Title',
      author: book.author || 'Unknown Author',
      genre: book.genre,
      confidence: book.confidence || 0,
      position: book.position,
      isbn: book.isbn,
      rating: book.rating,
      ratingsCount: book.ratingsCount,
      awards: book.awards || []
    };
  }

  formatRecommendationData(rec: any): Recommendation {
    return {
      ...rec,
      amazonUrl: this.generateAmazonUrl(rec)
    };
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;