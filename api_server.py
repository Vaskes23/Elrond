#!/usr/bin/env python3
"""
FastAPI Server - Bridge between React Frontend and Python Backend
Provides REST API endpoints for HS Code classification system
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import sys
import os
import json
import logging
from datetime import datetime
import traceback

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import existing backend functionality
try:
    from fullimpl import HSCodeSemanticSearch, ConversationState, HSCode
    BACKEND_AVAILABLE = True
    logger.info("Successfully imported fullimpl backend")
except ImportError as e:
    logger.warning(f"Failed to import fullimpl backend: {e}")
    BACKEND_AVAILABLE = False

app = FastAPI(
    title="HS Code Classification API",
    version="1.0.0",
    description="API Bridge for HS Code Classification System"
)

# CORS middleware for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev servers
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models matching frontend TypeScript interfaces
class QuestionGenerationRequest(BaseModel):
    productType: str = Field(..., description="Type of product to classify")
    materials: Union[str, List[str]] = Field(..., description="Materials used in product")
    function: str = Field(..., description="Primary function of the product")
    targetAudience: str = Field(..., description="Target market/audience")
    origin: str = Field(..., description="Country of origin")

class Question(BaseModel):
    id: str
    text: str
    type: str = Field(..., pattern="^(single|multiple|text|number)$")
    options: Optional[List[str]] = None
    required: bool = True
    category: str = "claude_generated"

class QuestionGenerationResponse(BaseModel):
    questions: List[Question]

class AnalysisRequest(BaseModel):
    productType: str
    function: str
    origin: str
    materials: Union[str, List[str]]
    targetAudience: str
    timestamp: str
    questionnaireVersion: str = "1.0"

class AlternativeCode(BaseModel):
    code: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str

class AnalysisResponse(BaseModel):
    code: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    category: str
    alternativeCodes: Optional[List[AlternativeCode]] = None

class HealthResponse(BaseModel):
    status: str
    backend: str
    timestamp: str
    dependencies: Dict[str, bool]

# Global backend instance (will be initialized if available)
hs_search_instance = None

async def get_backend():
    """Dependency to get backend instance"""
    global hs_search_instance
    if not BACKEND_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Backend not available - fullimpl.py could not be imported"
        )

    if hs_search_instance is None:
        raise HTTPException(
            status_code=503,
            detail="Backend not initialized - data not loaded"
        )

    return hs_search_instance

async def initialize_backend():
    """Initialize backend on startup"""
    global hs_search_instance

    if not BACKEND_AVAILABLE:
        logger.warning("Backend not available - API will run in mock mode")
        return

    try:
        logger.info("Initializing HS Code backend...")
        hs_search_instance = HSCodeSemanticSearch(debug=True)

        # Check if embeddings file exists
        embeddings_file = "hs_embeddings_600970782048097937.pkl"
        if os.path.exists(embeddings_file):
            logger.info(f"Found embeddings file: {embeddings_file}")
            # For now, we'll skip data loading since we don't have hs_data.xlsx
            # hs_search_instance.load_data("hs_data.xlsx")
            # hs_search_instance.compute_embeddings(use_cached_only=True, embedding_file=embeddings_file)
            logger.info("Backend initialization completed (embeddings found but data loading skipped - no hs_data.xlsx)")
        else:
            logger.warning(f"Embeddings file not found: {embeddings_file}")
            logger.info("Backend will run in mock mode")

    except Exception as e:
        logger.error(f"Failed to initialize backend: {e}")
        logger.error(traceback.format_exc())
        hs_search_instance = None

# Initialize backend immediately on module load
import asyncio
try:
    # Try to run the async initialization
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(initialize_backend())
    loop.close()
except Exception as e:
    logger.warning(f"Failed to initialize backend during startup: {e}")

# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    dependencies = {
        "backend_imported": BACKEND_AVAILABLE,
        "backend_initialized": hs_search_instance is not None,
        "embeddings_file": os.path.exists("hs_embeddings_600970782048097937.pkl")
    }

    backend_status = "connected" if hs_search_instance else "mock_mode"

    return HealthResponse(
        status="healthy",
        backend=backend_status,
        timestamp=datetime.now().isoformat(),
        dependencies=dependencies
    )

# Question generation endpoint
@app.post("/api/questions/generate", response_model=QuestionGenerationResponse)
async def generate_questions(request: QuestionGenerationRequest):
    """Generate contextual questions for HS code classification"""
    logger.info(f"Generating questions for product type: {request.productType}")

    try:
        # For now, use mock question generation
        # TODO: Integrate with real backend logic
        questions = generate_mock_questions(request)

        return QuestionGenerationResponse(questions=questions)

    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

# Product classification endpoint
@app.post("/api/classify", response_model=AnalysisResponse)
async def classify_product(request: AnalysisRequest):
    """Classify product and return HS code with confidence"""
    logger.info(f"Classifying product: {request.productType}")

    try:
        # For now, use mock classification
        # TODO: Integrate with real backend semantic search + Claude API
        result = generate_mock_classification(request)

        return result

    except Exception as e:
        logger.error(f"Error classifying product: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to classify product: {str(e)}")

@app.get("/api/products")
async def list_products():
    """Return list of previously classified products"""
    # TODO: Implement database storage and retrieval
    return {"products": [], "message": "Product storage not yet implemented"}

# Mock functions (to be replaced with real backend integration)
def generate_mock_questions(request: QuestionGenerationRequest) -> List[Question]:
    """Generate mock questions based on product type"""
    product_type = request.productType.lower()

    if "electronic" in product_type or "tech" in product_type:
        return [
            Question(
                id="claude_question_1",
                text=f"What are the key technical specifications of this {request.function} device?",
                type="text",
                required=True,
                category="claude_generated"
            ),
            Question(
                id="claude_question_2",
                text="What is the primary power source for this device?",
                type="single",
                options=["Battery", "Electric (Plug-in)", "Solar", "Manual", "Other"],
                required=True,
                category="claude_generated"
            )
        ]
    elif "textile" in product_type or "apparel" in product_type:
        return [
            Question(
                id="claude_question_1",
                text=f"What is the primary fabric composition of this {request.function} item?",
                type="multiple",
                options=["Cotton", "Polyester", "Wool", "Silk", "Leather", "Synthetic", "Other"],
                required=True,
                category="claude_generated"
            ),
            Question(
                id="claude_question_2",
                text="What is the intended gender and age group?",
                type="single",
                options=["Men's Adult", "Women's Adult", "Children's", "Unisex", "Other"],
                required=True,
                category="claude_generated"
            )
        ]
    else:
        return [
            Question(
                id="claude_question_1",
                text=f"What are the key materials and construction details of this {request.function} product?",
                type="text",
                required=True,
                category="claude_generated"
            ),
            Question(
                id="claude_question_2",
                text="What is the primary use case or application?",
                type="text",
                required=True,
                category="claude_generated"
            )
        ]

def generate_mock_classification(request: AnalysisRequest) -> AnalysisResponse:
    """Generate mock classification result"""
    # Mock classification based on product type
    product_type = request.productType.lower()

    if "electronic" in product_type:
        return AnalysisResponse(
            code="8517.12.00",
            description="Telephones for cellular networks or other wireless networks",
            confidence=0.89,
            reasoning=f"Based on product type '{request.productType}' with function '{request.function}' from {request.origin}",
            category="Electronics",
            alternativeCodes=[
                AlternativeCode(
                    code="8518.30.20",
                    description="Headphones and earphones",
                    confidence=0.76,
                    reasoning="Alternative classification for audio devices"
                )
            ]
        )
    elif "textile" in product_type or "apparel" in product_type:
        return AnalysisResponse(
            code="6203.42.10",
            description="Men's trousers and breeches of cotton",
            confidence=0.92,
            reasoning=f"Textile product '{request.productType}' for {request.targetAudience} from {request.origin}",
            category="Apparel"
        )
    else:
        return AnalysisResponse(
            code="9999.99.99",
            description="Unclassified product - manual review required",
            confidence=0.45,
            reasoning=f"Generic classification for '{request.productType}' - requires expert review",
            category="Other"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)