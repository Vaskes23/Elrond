# CONNECTION.md - React Frontend ↔ Python Backend Integration Strategy

## 🎯 OBJECTIVE
Connect the existing React frontend with Python backend functionality while preserving the current UI/UX. The goal is to replace mock data with real HS code classification powered by the Python backend.

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────┐    HTTP API    ┌─────────────────────┐    Function Calls    ┌─────────────────────┐
│                     │   (REST/JSON)  │                     │                      │                     │
│  React Frontend     │◄──────────────►│   FastAPI Server   │◄────────────────────►│  Python Backend     │
│  (Port 3000)        │                │   (Port 8000)       │                      │  (fullimpl.py)      │
│                     │                │                     │                      │                     │
└─────────────────────┘                └─────────────────────┘                      └─────────────────────┘
         │                                        │                                            │
         │                                        │                                            │
    ┌────▼────┐                            ┌─────▼─────┐                              ┌──────▼──────┐
    │ Mock    │                            │ Endpoint  │                              │ HS Code     │
    │ Data    │ ──── REPLACE ────►         │ Mapping   │                              │ Classification│
    │ System  │                            │ Layer     │                              │ + Embeddings │
    └─────────┘                            └───────────┘                              └─────────────┘
```

## 🔌 INTEGRATION STRATEGY

### Phase 1: FastAPI Bridge Server
Create a new FastAPI application that serves as the bridge between React and Python backend.

**New File**: `/api_server.py`
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os

# Import existing backend functionality
from fullimpl import HSCodeSemanticSearch, ConversationState, HSCode

app = FastAPI(title="HS Code Classification API", version="1.0.0")

# CORS middleware for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize backend components
hs_search = HSCodeSemanticSearch(debug=True)
# Load data and embeddings on startup
hs_search.load_data("hs_data.xlsx")  # You'll need to provide this
hs_search.compute_embeddings(use_cached_only=True, embedding_file="hs_embeddings_600970782048097937.pkl")
```

### Phase 2: API Endpoint Mapping
Map React frontend expectations to Python backend functionality.

#### 2.1 Data Models (match frontend TypeScript interfaces)
```python
# API Models - matching frontend TypeScript interfaces
class QuestionGenerationRequest(BaseModel):
    productType: str
    materials: str | List[str]
    function: str
    targetAudience: str
    origin: str

class Question(BaseModel):
    id: str
    text: str
    type: str  # 'single' | 'multiple' | 'text' | 'number'
    options: Optional[List[str]] = None
    required: bool
    category: str

class QuestionGenerationResponse(BaseModel):
    questions: List[Question]

class AnalysisRequest(BaseModel):
    productType: str
    function: str
    origin: str
    materials: str | List[str]
    targetAudience: str
    timestamp: str
    questionnaireVersion: str

class AlternativeCode(BaseModel):
    code: str
    description: str
    confidence: float
    reasoning: str

class AnalysisResponse(BaseModel):
    code: str
    description: str
    confidence: float
    reasoning: str
    category: str
    alternativeCodes: Optional[List[AlternativeCode]] = None
```

#### 2.2 Core API Endpoints
```python
@app.post("/api/questions/generate", response_model=QuestionGenerationResponse)
async def generate_questions(request: QuestionGenerationRequest):
    """Generate contextual questions for HS code classification"""
    # Use Python backend logic to generate smart questions
    # based on product type and function
    questions = generate_contextual_questions(
        product_type=request.productType,
        function=request.function,
        origin=request.origin
    )
    return QuestionGenerationResponse(questions=questions)

@app.post("/api/classify", response_model=AnalysisResponse)
async def classify_product(request: AnalysisRequest):
    """Classify product and return HS code with confidence"""

    # Build product description from request
    product_description = build_product_description(request)

    # Use semantic search to find candidate HS codes
    candidates = hs_search.search_similar(
        query=product_description,
        top_k=10,
        similarity_threshold=0.3
    )

    # Use Claude API to refine classification
    final_classification = refine_with_claude(
        product_description=product_description,
        candidates=candidates,
        context=request
    )

    return final_classification

@app.get("/api/products")
async def list_products():
    """Return list of previously classified products"""
    # This would connect to a database in production
    # For now, return mock data or load from file
    return get_stored_products()

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "backend": "connected"}
```

### Phase 3: Frontend Configuration Update
Update the React frontend to use the local API server instead of mock data.

#### 3.1 Environment Configuration
**New File**: `/elrond-hs-codes/.env.local`
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_CLAUDE_API_KEY=your_claude_api_key_here
REACT_APP_ENV=development
```

#### 3.2 Update API Configuration
**File**: `/elrond-hs-codes/src/utils/claudeApi.ts`
```typescript
// Replace the hardcoded API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Update the API functions to use local backend
export const generateQuestionsWithClaude = async (
    request: ClaudeQuestionGenerationRequest
): Promise<ClaudeQuestionGenerationResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/questions/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling local API:', error);
        // Fallback to mock data if API unavailable
        return generateQuestionsFallback(request);
    }
};

export const analyzeWithClaude = async (
    request: ClaudeAnalysisRequest
): Promise<ClaudeAnalysisResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/classify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling local API:', error);
        // Fallback to mock data if API unavailable
        return analyzeFallback(request);
    }
};
```

---

## 🔄 DATA FLOW TRANSFORMATION

### Current Flow (Mock)
```
User Input → React Component → Mock Data → UI Display
```

### New Flow (Real Backend)
```
User Input → React Component → FastAPI Server → Python Backend → Real AI Classification → UI Display
```

### Specific Data Transformations

#### 1. Question Generation Flow
```typescript
// Frontend sends
{
  productType: "Electronics",
  function: "Audio playback",
  origin: "China",
  materials: ["Plastic", "Metal"],
  targetAudience: "Consumer"
}

// FastAPI transforms to Python backend call
generate_contextual_questions(
    product_type="Electronics",
    function="Audio playback",
    origin="China"
)

// Python backend returns structured questions
// FastAPI formats response to match frontend TypeScript interface
{
  questions: [
    {
      id: "claude_question_1",
      text: "What is the audio driver size and frequency range?",
      type: "text",
      required: true,
      category: "claude_generated"
    }
  ]
}
```

#### 2. Classification Flow
```typescript
// Frontend sends complete questionnaire data
{
  productType: "Electronics",
  function: "Audio playback",
  origin: "China",
  materials: ["Plastic", "Metal"],
  targetAudience: "Consumer",
  timestamp: "2024-09-26T10:30:00Z",
  questionnaireVersion: "1.0"
}

// FastAPI calls Python semantic search + Claude API
product_description = "Electronics for audio playback from China, plastic and metal construction, consumer market"
candidates = hs_search.search_similar(query=product_description, top_k=10)
final_result = claude_api.refine_classification(description, candidates)

// Returns real HS code classification
{
  code: "8518.30.20",
  description: "Headphones and earphones, whether or not combined with microphone",
  confidence: 0.94,
  reasoning: "Based on audio playback function and consumer target...",
  category: "Electronics",
  alternativeCodes: [...]
}
```

---

## 📁 FILE STRUCTURE AFTER INTEGRATION

```
/Elrond/
├── api_server.py                        # NEW: FastAPI bridge server
├── requirements.txt                     # NEW: Python API server dependencies
├── .env                                # NEW: API server environment config
├── fullimpl.py                         # KEEP: Python backend logic
├── hs_embeddings_600970782048097937.pkl # KEEP: Embeddings for semantic search
├── hs_data.xlsx                        # NEW: HS code data file (you'll need this)
├── elrond-hs-codes/                    # EXISTING: React frontend
│   ├── .env.local                      # NEW: Frontend environment config
│   ├── src/utils/claudeApi.ts          # MODIFIED: Point to local API
│   ├── src/mockData.ts                 # KEEP: Fallback data only
│   └── [all other React files unchanged]
├── REMOVE: hsai.py                     # DELETE: Redundant implementation
├── REMOVE: semrank.py                  # DELETE: Redundant Streamlit UI
└── REMOVE: AGENTERRORS.md              # DELETE: No longer needed
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Create FastAPI Server (Day 1)
```bash
# 1. Create API server file
touch /Users/matyasvascak/Desktop/Code/Elrond/api_server.py

# 2. Install FastAPI dependencies
pip install fastapi uvicorn python-multipart

# 3. Create requirements.txt
pip freeze > requirements.txt

# 4. Test basic server
uvicorn api_server:app --reload --port 8000
```

### Step 2: Implement Core Endpoints (Day 1-2)
- [ ] `/api/health` - Basic health check
- [ ] `/api/questions/generate` - Question generation
- [ ] `/api/classify` - Product classification
- [ ] `/api/products` - Product listing

### Step 3: Frontend Integration (Day 2-3)
- [ ] Create `.env.local` with API configuration
- [ ] Update `claudeApi.ts` to use local endpoints
- [ ] Test question generation flow
- [ ] Test classification flow
- [ ] Update error handling

### Step 4: Data Management (Day 3-4)
- [ ] Set up SQLite database for storing classifications
- [ ] Implement product persistence
- [ ] Add data migration from mock data
- [ ] Test data consistency

### Step 5: Testing and Polish (Day 4-5)
- [ ] End-to-end testing of complete flow
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Documentation updates

---

## 🔧 DEVELOPMENT WORKFLOW

### Running the Integrated System
```bash
# Terminal 1: Start Python API server
cd /Users/matyasvascak/Desktop/Code/Elrond
uvicorn api_server:app --reload --port 8000

# Terminal 2: Start React dev server
cd /Users/matyasvascak/Desktop/Code/Elrond/elrond-hs-codes
npm start

# Access application at http://localhost:3000
# API documentation at http://localhost:8000/docs
```

### Development URLs
- **React Frontend**: http://localhost:3000
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/health

---

## 🛡️ ERROR HANDLING & FALLBACKS

### Graceful Degradation Strategy
1. **Primary**: Use FastAPI + Python backend for real classifications
2. **Fallback**: If API server unavailable, use existing mock data
3. **Error Recovery**: Show user-friendly messages with retry options

### Implementation in Frontend
```typescript
const classifyProduct = async (data: AnalysisRequest): Promise<AnalysisResponse> => {
  try {
    // Try real API first
    const response = await fetch(`${API_BASE_URL}/api/classify`, { ... });
    return await response.json();
  } catch (error) {
    console.warn('API unavailable, using fallback:', error);
    // Gracefully fall back to mock data
    return analyzeFallback(data);
  }
};
```

---

## 📊 TESTING STRATEGY

### Unit Tests
- [ ] FastAPI endpoint tests
- [ ] Python backend function tests
- [ ] React component tests with API mocking

### Integration Tests
- [ ] End-to-end user flow tests
- [ ] API contract tests (frontend ↔ backend)
- [ ] Error handling tests

### Manual Testing Checklist
- [ ] Question generation works with real backend
- [ ] Product classification returns real HS codes
- [ ] UI updates correctly with real data
- [ ] Error states display properly
- [ ] Fallback to mock data works when API unavailable

---

## 🔐 SECURITY CONSIDERATIONS

### API Security
- [ ] CORS configuration for production
- [ ] Input validation and sanitization
- [ ] Rate limiting on endpoints
- [ ] API key management for Claude integration

### Environment Variables
```bash
# API Server (.env)
CLAUDE_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./classifications.db
DEBUG=True

# React Frontend (.env.local)
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENV=development
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Success (API Bridge)
- [ ] FastAPI server runs without errors
- [ ] Health check endpoint responds correctly
- [ ] Basic CORS configuration works with React

### Phase 2 Success (Core Integration)
- [ ] Question generation uses real Python backend
- [ ] Product classification returns real HS codes
- [ ] Frontend displays real backend results

### Phase 3 Success (Complete Integration)
- [ ] No more mock data used in production flow
- [ ] Error handling works gracefully
- [ ] Performance is acceptable (< 5s classification)
- [ ] Data persists between sessions

### Final Success Metrics
- [ ] 100% feature parity with mock system
- [ ] Real AI-powered HS code classifications
- [ ] Seamless user experience (no UI changes)
- [ ] Reliable fallback system for edge cases

---

## 🚨 POTENTIAL CHALLENGES & SOLUTIONS

### Challenge 1: Claude API Key Management
**Problem**: API keys need secure handling
**Solution**: Use environment variables, never commit keys to git

### Challenge 2: Embeddings File Size (15MB)
**Problem**: Large file affects deployment
**Solution**: Use separate storage (S3, CDN) or compress embeddings

### Challenge 3: Python Dependencies
**Problem**: Complex ML dependencies in production
**Solution**: Use Docker containers for consistent deployment

### Challenge 4: Performance
**Problem**: Semantic search may be slow
**Solution**: Cache results, optimize embedding lookup, consider async processing

### Challenge 5: Data Persistence
**Problem**: Need to store classifications
**Solution**: Start with SQLite, migrate to PostgreSQL for production

---

This connection strategy transforms the disconnected system into a unified, working application while preserving all existing React UI components and user experience.