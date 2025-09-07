# 📚 ShelfScanner

AI-powered book discovery app that analyzes your bookshelf and provides personalized reading recommendations.

## ✨ Features

- 📷 **Smart Camera Interface**: Take photos of bookshelves with mobile-optimized camera
- 🤖 **AI Book Recognition**: Uses OpenAI Vision + Google Vision APIs to extract book titles
- 🎯 **Personalized Recommendations**: GPT-4 powered recommendations based on your reading profile
- 📊 **Goodreads Integration**: Enhanced book metadata and ratings
- 💾 **Session Management**: Device-based sessions without requiring accounts
- 📱 **Mobile-First Design**: Responsive design optimized for mobile devices
- 🔒 **Privacy Focused**: No account required, session-based data storage

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL (optional - app works without DB)
- OpenAI API key
- Google Vision API key
- Google Books API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shelf-scanner
   cd shelf-scanner
   ```

2. **Install dependencies**
   ```bash
   # Backend
   npm install
   
   # Frontend
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Set up database (optional)**
   ```bash
   npm run setup-db
   ```

5. **Start development servers**
   ```bash
   # Backend (http://localhost:3000)
   npm run dev
   
   # Frontend (http://localhost:3001)
   cd frontend && PORT=3001 npm start
   ```

## 🌐 Deployment

### Deploy to Vercel

1. **Prepare for deployment**
   ```bash
   npm run deploy:prep
   ```

2. **Deploy to Vercel**
   ```bash
   npm run deploy
   ```

3. **Configure environment variables in Vercel**
   - `OPENAI_API_KEY`
   - `GOOGLE_VISION_API_KEY`
   - `DATABASE_URL` (PostgreSQL connection string)
   - `SESSION_SECRET`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for book recognition and recommendations |
| `GOOGLE_VISION_API_KEY` | Yes | Google Vision API key for fallback book recognition |
| `GOOGLE_BOOKS_API_KEY` | No | Google Books API for enhanced metadata |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `NODE_ENV` | No | Environment (development/production) |

## 📖 API Documentation

### Core Endpoints

- `GET /api/health` - Health check
- `POST /api/sessions` - Create session
- `POST /api/uploads` - Upload bookshelf image
- `POST /api/uploads/:id/analyze` - Analyze uploaded image
- `GET /api/recommendations` - Get book recommendations
- `GET /api/admin/stats` - System statistics

### Usage Flow

1. Create session: `POST /api/sessions`
2. Upload image: `POST /api/uploads`
3. Analyze books: `POST /api/uploads/:id/analyze`
4. Get recommendations: `POST /api/recommendations`

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │────│   Express API   │────│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌───────┼───────┐
                       │       │       │
                ┌──────▼──┐ ┌──▼───┐ ┌─▼────┐
                │OpenAI   │ │Google│ │Google│
                │Vision   │ │Vision│ │Books │
                └─────────┘ └──────┘ └──────┘
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd frontend && npm test
```

## 📊 Monitoring

Visit `/api/admin/stats` for system statistics including:
- Memory usage
- Processing statistics
- Cache status
- Database connections
- API success rates

## 🔧 Development

### Project Structure

```
shelf-scanner/
├── server.js              # Express server
├── routes/                 # API routes
├── services/              # Core business logic
├── middleware/            # Express middleware
├── database/              # Database schema
├── frontend/              # React application
├── scripts/               # Utility scripts
└── temp/                  # Temporary file storage
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build frontend
- `npm run deploy:prep` - Prepare for deployment
- `npm run deploy` - Deploy to Vercel
- `npm run setup-db` - Initialize database
- `npm test` - Run tests

## 📝 Roadmap Completion Status

- ✅ **Day 1-2: Foundation & Setup** - Complete
- ✅ **Day 3-4: Core AI Pipeline** - Complete
- ✅ **Day 5-6: Frontend & UX** - Complete  
- ✅ **Day 7: Polish & Deploy** - Complete

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the [Issues](https://github.com/yourusername/shelf-scanner/issues) page
- Review the API documentation above
- Ensure all environment variables are set correctly

