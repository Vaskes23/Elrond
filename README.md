# Elrond HS Code Classification System

A full-stack application for AI-powered HS (Harmonized System) code classification using Claude AI and semantic embeddings.

## Overview

This application combines a sophisticated React frontend with a Python backend that uses:
- **Claude AI** for intelligent questioning and analysis
- **Sentence Transformers** for semantic similarity search
- **Pre-computed embeddings** for fast HS code matching
- **Interactive questionnaire system** for accurate classification

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Flask Backend  │    │   Claude AI     │
│   (Port 3000)   │◄──►│   (Port 5000)   │◄──►│   & Embeddings  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: React app with TypeScript, Blueprint UI components
- **Backend**: Flask API wrapping the classification logic from `fullimpl.py`
- **AI**: Claude API for question generation and semantic embeddings for search
- **Data**: HS codes from Excel file + pre-computed embeddings (600M+ parameters)

## Prerequisites

Before running this application, you need:

1. **Docker & Docker Compose** installed on your system
2. **Anthropic Claude API Key** - Get it from [Anthropic Console](https://console.anthropic.com/)
3. **Required Data Files** (should be present):
   - `hscodes.xlsx` - HS codes database
   - `hs_embeddings_600970782048097937.pkl` - Pre-computed embeddings

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd /path/to/hackathon

# Copy environment template
cp .env.example .env

# Edit .env and add your Anthropic API key
nano .env
```

### 2. Configure Environment

Edit the `.env` file:

```bash
# Required: Your Anthropic Claude API key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: File paths (defaults should work)
HS_DATA_FILE=hscodes.xlsx
EMBEDDING_FILE=hs_embeddings_600970782048097937.pkl
```

### 3. Run with Docker

```bash
# Build and start both services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Manual Setup (Development)

If you prefer to run without Docker:

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY="your_key_here"
export HS_DATA_FILE="hscodes.xlsx"
export EMBEDDING_FILE="hs_embeddings_600970782048097937.pkl"

# Run backend
python backend_api.py
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd elrond-hs-codes

# Install dependencies
npm install

# Start development server
npm start
```

## API Endpoints

### Classification Flow

1. **Start Session**: `POST /api/classify/start`
   ```json
   {
     "description": "Wireless Bluetooth headphones with active noise cancellation"
   }
   ```

2. **Get Question**: `GET /api/classify/question/{session_id}`

3. **Submit Answer**: `POST /api/classify/answer/{session_id}`
   ```json
   {
     "question": "What is the primary material?",
     "answer": "Plastic and metal"
   }
   ```

4. **Finalize**: `POST /api/classify/finalize/{session_id}`

### Direct Search

- **Semantic Search**: `POST /api/search`
  ```json
  {
    "query": "electronic headphones",
    "top_k": 20,
    "threshold": 0.6
  }
  ```

### Utility

- **Health Check**: `GET /health`
- **List Sessions**: `GET /api/classify/sessions`
- **Delete Session**: `DELETE /api/classify/session/{session_id}`

## How It Works

### 1. Product Description Input
User enters a detailed product description in the frontend.

### 2. AI-Powered Questioning
- Claude AI analyzes the description and generates contextual questions
- Questions are tailored to narrow down the exact HS code classification
- Each answer refines the search and improves accuracy

### 3. Semantic Search
- User responses are combined with the original description
- The system performs semantic similarity search using pre-computed embeddings
- Results are ranked by relevance and filtered by confidence threshold

### 4. Iterative Refinement
- Claude AI determines if more questions are needed or if classification can be finalized
- The process continues until convergence or maximum iterations reached

### 5. Final Classification
- System presents the best matching HS code with confidence score
- Alternative classifications are provided for review
- User can accept or manually select from alternatives

## Features

- 🤖 **AI-Powered Classification**: Uses Claude AI for intelligent questioning
- 🔍 **Semantic Search**: Advanced embedding-based similarity matching  
- 📊 **Confidence Scoring**: Provides reliability metrics for classifications
- 🎯 **Interactive Process**: Guided questionnaire for accurate results
- 📱 **Modern UI**: Beautiful, responsive interface with dark theme
- 🐳 **Docker Ready**: Easy deployment with containerization
- 📈 **Session Management**: Track and manage multiple classification sessions
- 🔄 **Real-time Processing**: Live updates during classification process

## File Structure

```
├── backend_api.py                     # Flask API server
├── fullimpl.py                        # Core classification logic
├── requirements.txt                   # Python dependencies
├── Dockerfile.backend                 # Backend container config
├── Dockerfile.frontend                # Frontend container config
├── docker-compose.yml                 # Multi-container orchestration
├── nginx.conf                         # Reverse proxy configuration
├── hscodes.xlsx                       # HS codes database
├── hs_embeddings_600970782048097937.pkl # Pre-computed embeddings
└── elrond-hs-codes/                   # React frontend
    ├── src/
    │   ├── components/                # React components
    │   ├── services/                  # API integration
    │   └── types.ts                   # TypeScript definitions
    └── package.json                   # Frontend dependencies
```

## Troubleshooting

### Backend Issues

1. **Classifier not initialized**:
   - Check if `ANTHROPIC_API_KEY` is set correctly
   - Verify `hscodes.xlsx` exists and is readable
   - Ensure `hs_embeddings_*.pkl` file is present

2. **Memory issues**:
   - The embeddings file is large (~1GB+)
   - Ensure Docker has sufficient memory allocated
   - Consider using smaller embedding models for development

3. **API key errors**:
   - Verify your Anthropic API key is valid
   - Check if you have sufficient API credits

### Frontend Issues

1. **Cannot connect to backend**:
   - Verify backend is running on port 5000
   - Check if `REACT_APP_API_BASE_URL` is set correctly
   - Ensure CORS is enabled (handled by nginx in Docker)

2. **Build failures**:
   - Run `npm install` to ensure dependencies are installed
   - Check Node.js version compatibility

### Docker Issues

1. **Build failures**:
   - Ensure Docker daemon is running
   - Check disk space for image builds
   - Verify all required files are present

2. **Port conflicts**:
   - Change ports in `docker-compose.yml` if 3000/5000 are occupied
   - Update environment variables accordingly

## Development

### Adding New Features

1. **Backend**: Modify `backend_api.py` or extend `fullimpl.py`
2. **Frontend**: Add components in `elrond-hs-codes/src/components/`
3. **API Integration**: Update `elrond-hs-codes/src/services/backendApi.ts`

### Testing

```bash
# Test backend health
curl http://localhost:5000/health

# Test classification start
curl -X POST http://localhost:5000/api/classify/start \
  -H "Content-Type: application/json" \
  -d '{"description": "test product"}'
```

## Dependencies

### Backend
- Python 3.11+
- anthropic (Claude AI)
- flask (Web framework)
- pandas (Data handling)
- sentence-transformers (Embeddings)
- scikit-learn (ML utilities)

### Frontend
- React 19+
- TypeScript
- Blueprint.js (UI components)
- React Router (Navigation)

## Performance Notes

- **Initial Startup**: First run may take 1-2 minutes to load embeddings
- **Memory Usage**: Backend requires ~2GB RAM for embeddings
- **Response Time**: Classification typically takes 10-30 seconds depending on iteration count
- **Concurrent Sessions**: Backend can handle multiple concurrent classification sessions

## Security Considerations

- API key is passed via environment variables
- No sensitive data is logged
- CORS is configured for local development
- Consider implementing rate limiting for production use

## License

This project is part of a hackathon submission. Check with team members for licensing details.

---

For questions or issues, please check the troubleshooting section or consult the team members.