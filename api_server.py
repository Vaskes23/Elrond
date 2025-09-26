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
from dotenv import load_dotenv

# Load environment variables and enforce offline cache usage for transformers
load_dotenv()
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import existing backend functionality
try:
    from fullimpl import HSCodeClassifier, ConversationState, HSCode, ClaudeQuestionGenerator
    BACKEND_AVAILABLE = True
    logger.info("Successfully imported fullimpl backend")
except ImportError as e:
    logger.warning(f"Failed to import fullimpl backend: {e}")
    BACKEND_AVAILABLE = False

# Additional imports for semantic search
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Environment validation
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
CLAUDE_AVAILABLE = bool(CLAUDE_API_KEY)

if CLAUDE_AVAILABLE:
    logger.info(f"✅ Claude API key loaded: {CLAUDE_API_KEY[:15]}...")
else:
    logger.warning("⚠️  ANTHROPIC_API_KEY not found - Claude-dependent endpoints will be unavailable, but semantic search will be enabled.")

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

# Semantic search API models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Free-text query for semantic search")
    topK: int = Field(10, ge=1, le=50, description="Number of matches to return")
    similarityThreshold: float = Field(0.3, ge=0.0, le=1.0, description="Cosine similarity threshold")

class SearchMatch(BaseModel):
    index: int
    rank: int
    similarity: float = Field(..., ge=0.0, le=1.0)
    code: Optional[str] = None
    description: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    totalMatches: int
    topK: int
    threshold: float
    matches: List[SearchMatch]

# Global backend instance (will be initialized if available)
classification_system = None
question_generator = None
semantic_search_service = None
metadata_store = None

class HSMetadataStore:
    """
    Optional metadata store mapping embedding indices -> HS code metadata.
    Expects a JSON file with a list of objects: [{"code": "8517.12.00", "description": "..."}, ...]
    The list order must correspond to the rows in the embeddings matrix.
    """

    def __init__(self, metadata_path: str | None = None, debug: bool = False):
        self.metadata_path = metadata_path
        self.items: List[Dict[str, str]] = []
        self.debug = debug

    def try_load(self) -> bool:
        paths_to_try = []
        if self.metadata_path:
            paths_to_try.append(self.metadata_path)
        # Default sidecar filenames
        paths_to_try.extend([
            "hs_leaf_metadata.json",
            "hs_codes_metadata.json",
        ])

        for path in paths_to_try:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        self.items = data
                        if self.debug:
                            logger.info(f"[DEBUG] Loaded HS metadata from {path} with {len(self.items)} entries")
                        return True
                except Exception as e:
                    logger.warning(f"⚠️  Failed to load HS metadata from {path}: {e}")
        return False

    def get(self, idx: int) -> Optional[Dict[str, str]]:
        if 0 <= idx < len(self.items):
            return self.items[idx]
        return None

class HybridSemanticSearch:
    """
    Hybrid semantic search using pre-computed embeddings + Claude AI
    Works without the original Excel file by using embeddings directly
    """

    def __init__(self, embeddings_file: str, debug=False):
        self.embeddings_file = embeddings_file
        self.embeddings = None
        self.model = None
        self.debug = debug
        self.num_codes = 0
        self.model_available = os.getenv("DISABLE_EMBEDDING_MODEL", "false").lower() != "true"

    def load_embeddings(self):
        """Load pre-computed embeddings"""
        try:
            if self.debug:
                logger.info(f"[DEBUG] Loading embeddings from {self.embeddings_file}")

            with open(self.embeddings_file, 'rb') as f:
                self.embeddings = pickle.load(f)

            self.num_codes = self.embeddings.shape[0]
            embedding_dim = self.embeddings.shape[1]

            logger.info(f"✅ Loaded {self.num_codes} HS code embeddings ({embedding_dim}D vectors)")

            if self.debug:
                logger.info(f"[DEBUG] Embeddings shape: {self.embeddings.shape}")
                logger.info(f"[DEBUG] Embeddings dtype: {self.embeddings.dtype}")

        except Exception as e:
            logger.error(f"❌ Failed to load embeddings: {e}")
            raise

    def load_model(self):
        """Load SentenceTransformer model for query encoding"""
        if self.model is None and self.model_available:
            try:
                if self.debug:
                    logger.info("[DEBUG] Loading SentenceTransformer model: all-MiniLM-L6-v2")

                cache_dir = os.path.join(os.path.expanduser('~'), '.cache', 'huggingface', 'hub')
                self.model = SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_dir)

                if self.debug:
                    logger.info("[DEBUG] ✅ SentenceTransformer model loaded successfully")

            except Exception as e:
                logger.error(f"❌ Failed to load SentenceTransformer model: {e}")
                logger.warning("⚠️  Semantic search will fall back to keyword heuristics only")
                self.model_available = False
                self.model = None

    def search_similar_codes(self, query: str, top_k: int = 10, similarity_threshold: float = 0.6) -> List[Dict]:
        """
        Find most similar HS codes using semantic search
        Returns list of matches with similarity scores and index positions
        """
        if self.embeddings is None:
            raise ValueError("Embeddings not loaded. Call load_embeddings() first.")

        if self.model is None:
            self.load_model()

        if not self.model_available or self.model is None:
            logger.warning("⚠️  SentenceTransformer model unavailable; skipping semantic embedding search")
            return []

        try:
            if self.debug:
                logger.info(f"[DEBUG] 🔍 Semantic search for: '{query}'")
                logger.info(f"[DEBUG] Searching through {self.num_codes} HS codes")
                logger.info(f"[DEBUG] Top K: {top_k}, Threshold: {similarity_threshold}")

            # Encode query to same dimensional space as embeddings
            query_embedding = self.model.encode([query])

            if self.debug:
                logger.info(f"[DEBUG] Query embedding shape: {query_embedding.shape}")

            # Compute cosine similarity with all HS code embeddings
            similarities = cosine_similarity(query_embedding, self.embeddings)[0]

            if self.debug:
                logger.info(f"[DEBUG] Computed {len(similarities)} similarity scores")
                logger.info(f"[DEBUG] Max similarity: {np.max(similarities):.4f}")
                logger.info(f"[DEBUG] Min similarity: {np.min(similarities):.4f}")
                logger.info(f"[DEBUG] Mean similarity: {np.mean(similarities):.4f}")

            # Get indices sorted by similarity (highest first)
            sorted_indices = np.argsort(similarities)[::-1]

            # Filter by threshold and get top K results
            results = []
            for i, idx in enumerate(sorted_indices):
                if len(results) >= top_k:
                    break

                similarity_score = float(similarities[idx])
                if similarity_score >= similarity_threshold:
                    results.append({
                        'index': int(idx),
                        'similarity_score': similarity_score,
                        'rank': i + 1
                    })

            # ALWAYS log semantic matches (not just in debug mode)
            print(f"\n{'='*80}")
            print(f"🔍 SEMANTIC SEARCH RESULTS")
            print(f"{'='*80}")
            print(f"Query: {query}")
            print(f"Total HS codes searched: {self.num_codes:,}")
            print(f"Matches above threshold ({similarity_threshold}): {len(results)}")
            print(f"Max similarity found: {np.max(similarities):.4f}")
            print(f"Mean similarity: {np.mean(similarities):.4f}")
            print(f"\n🏆 TOP 10 SEMANTIC MATCHES:")
            print("-" * 60)

            for i, result in enumerate(results[:10], 1):
                print(f"#{i:2d} | Index: {result['index']:5d} | Score: {result['similarity_score']:.4f}")

            if len(results) == 0:
                print("⚠️  NO MATCHES FOUND above the threshold")
                print(f"Try lowering the threshold (currently {similarity_threshold})")

            print("=" * 80 + "\n")

            if self.debug:
                logger.info(f"[DEBUG] 🎯 Found {len(results)} matches above threshold")
                logger.info(f"[DEBUG] 🏆 TOP 10 SEMANTIC MATCHES:")
                for result in results[:10]:
                    logger.info(f"[DEBUG]   #{result['rank']}: Index {result['index']}, Score: {result['similarity_score']:.4f}")

            return results

        except Exception as e:
            logger.error(f"❌ Error in semantic search: {e}")
            logger.error(traceback.format_exc())
            return []

async def get_backend():
    """Dependency to get backend instance"""
    global classification_system
    if not BACKEND_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Backend not available - fullimpl.py could not be imported or API key missing"
        )

    if classification_system is None:
        raise HTTPException(
            status_code=503,
            detail="Backend not initialized - classification system not loaded"
        )

    return classification_system

async def get_question_generator():
    """Dependency to get question generator instance"""
    global question_generator
    if not BACKEND_AVAILABLE or question_generator is None:
        raise HTTPException(
            status_code=503,
            detail="Question generator not available"
        )
    return question_generator

def initialize_backend_sync():
    """Initialize backend synchronously with hybrid semantic search"""
    global classification_system, question_generator, semantic_search_service, metadata_store

    if not BACKEND_AVAILABLE:
        logger.warning("Backend import failed - API will run in mock mode")
        # We still allow semantic search init below if embeddings exist

    try:
        logger.info("🚀 Initializing HYBRID Semantic Search + Claude AI System...")

        # Initialize semantic search service with pre-computed embeddings
        embeddings_file = "hs_embeddings_600970782048097937.pkl"
        if os.path.exists(embeddings_file):
            logger.info(f"📊 Loading pre-computed embeddings: {embeddings_file}")
            semantic_search_service = HybridSemanticSearch(embeddings_file, debug=DEBUG_MODE)
            semantic_search_service.load_embeddings()
            if not semantic_search_service.model_available:
                logger.warning("⚠️  SentenceTransformer model disabled; semantic search will operate in fallback mode")
            logger.info("✅ Hybrid Semantic Search Service initialized successfully")
        else:
            logger.error(f"❌ Embeddings file not found: {embeddings_file}")
            semantic_search_service = None

        # Initialize question generator only if Claude is available
        if CLAUDE_AVAILABLE:
            question_generator = ClaudeQuestionGenerator(CLAUDE_API_KEY, debug=DEBUG_MODE)
            logger.info("✅ Real Claude Question Generator initialized successfully")
        else:
            question_generator = None
            logger.warning("⚠️  Claude not available; skipping question generator initialization")

        # Note: Full HSCodeClassifier requires Excel file, using hybrid approach instead
        logger.info("📋 Note: Using hybrid semantic search (embeddings) + Claude AI approach")
        logger.info("🎯 Backend initialization completed with REAL semantic search + Claude integration")

        # Try to load HS metadata (optional)
        metadata_path = os.getenv("HS_METADATA_PATH")
        metadata_store = HSMetadataStore(metadata_path, debug=DEBUG_MODE)
        loaded = metadata_store.try_load()
        if loaded:
            logger.info("✅ HS metadata loaded for semantic search responses")
        else:
            logger.warning("⚠️  HS metadata not found. /api/search will return indices only unless metadata is provided.")

    except Exception as e:
        logger.error(f"❌ Failed to initialize backend: {e}")
        logger.error(traceback.format_exc())
        classification_system = None
        question_generator = None
        semantic_search_service = None

# Initialize backend immediately on module load
try:
    initialize_backend_sync()
except Exception as e:
    logger.warning(f"Failed to initialize backend during startup: {e}")

# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    dependencies = {
        "backend_imported": BACKEND_AVAILABLE,
        "backend_initialized": classification_system is not None,
        "question_generator_initialized": question_generator is not None,
        "semantic_search_initialized": semantic_search_service is not None,
        "claude_api_key": CLAUDE_AVAILABLE,
        "embeddings_file": os.path.exists("hs_embeddings_600970782048097937.pkl"),
        "sentence_transformer_ready": semantic_search_service.model is not None if semantic_search_service else False,
        "embeddings_loaded": semantic_search_service.embeddings is not None if semantic_search_service else False,
        "metadata_loaded": bool(metadata_store and metadata_store.items)
    }

    backend_status = "hybrid_semantic_search" if semantic_search_service else "mock_mode"

    return HealthResponse(
        status="healthy",
        backend=backend_status,
        timestamp=datetime.now().isoformat(),
        dependencies=dependencies
    )

# Semantic search endpoint - returns top-K matches with optional HS metadata
@app.post("/api/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    if semantic_search_service is None:
        raise HTTPException(status_code=503, detail="Semantic search service not available")

    try:
        logger.info(f"🔎 Semantic search request: q='{request.query}', k={request.topK}, thr={request.similarityThreshold}")

        matches = semantic_search_service.search_similar_codes(
            query=request.query,
            top_k=request.topK,
            similarity_threshold=request.similarityThreshold
        )

        # Assemble response with optional metadata enrichment
        enriched: List[SearchMatch] = []
        for m in matches:
            code = None
            desc = None
            if 'index' in m:
                meta = metadata_store.get(m['index']) if metadata_store and metadata_store.items else None
                if meta:
                    code = meta.get('code') or meta.get('CN_CODE')
                    desc = meta.get('description') or meta.get('NAME_EN') or meta.get('name')

            enriched.append(SearchMatch(
                index=m['index'],
                rank=m['rank'],
                similarity=m['similarity_score'],
                code=code,
                description=desc
            ))

        return SearchResponse(
            query=request.query,
            totalMatches=len(matches),
            topK=request.topK,
            threshold=request.similarityThreshold,
            matches=enriched
        )

    except Exception as e:
        logger.error(f"❌ Error in /api/search: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Semantic search failed")

# Question generation endpoint
@app.post("/api/questions/generate", response_model=QuestionGenerationResponse)
async def generate_questions(request: QuestionGenerationRequest, generator: ClaudeQuestionGenerator = Depends(get_question_generator)):
    """Generate contextual questions for HS code classification using real Claude AI"""
    logger.info(f"🎯 REAL CLAUDE: Generating questions for product type: {request.productType}")

    try:
        # Create conversation state from API request
        product_description = f"{request.productType} made of {request.materials}, used for {request.function}, target audience: {request.targetAudience}, from {request.origin}"

        logger.info(f"[DEBUG] Built product description: {product_description}")

        # Create a ConversationState for the question generator
        conversation_state = ConversationState(
            product_description=product_description,
            qa_history=[],
            current_candidates=[],
            iteration=0
        )

        # Use real Claude to generate a discriminating question
        logger.info("[DEBUG] ⚡ Calling real Claude API for question generation...")

        # Log the input context being sent to Claude
        print(f"\n{'='*90}")
        print(f"🚀 API SERVER - CLAUDE QUESTION GENERATION")
        print(f"{'='*90}")
        print(f"Product Type: {request.productType}")
        print(f"Materials: {request.materials}")
        print(f"Function: {request.function}")
        print(f"Target Audience: {request.targetAudience}")
        print(f"Origin: {request.origin}")
        print(f"Conversation State:")
        print(f"  - Product Description: {conversation_state.product_description}")
        print(f"  - Current Candidates: {len(conversation_state.current_candidates)}")
        print(f"  - Q&A History: {len(conversation_state.qa_history)} entries")
        print(f"  - Iteration: {conversation_state.iteration}")
        print("Calling Claude API now...")

        claude_response = generator.generate_question(conversation_state)

        # Prepare default question set (mirrors legacy mock logic but will be
        # overwritten with real Claude content whenever available).
        fallback_questions = generate_mock_questions(request)
        question_payloads = [q.model_dump() for q in fallback_questions]

        # Ensure predictable IDs/categories for frontend mapping
        for idx, payload in enumerate(question_payloads, start=1):
            payload["id"] = f"claude_question_{idx}"
            payload["category"] = "claude_generated"

        # Log Claude's response
        print(f"\n📥 CLAUDE RESPONSE RECEIVED:")
        print("-" * 60)
        print(f"Type: {claude_response.get('type', 'unknown')}")
        print(f"Content: {claude_response.get('content', 'No content')}")
        print("-" * 60)
        print("=" * 90 + "\n")

        logger.info(f"[DEBUG] ✅ Claude response type: {claude_response.get('type', 'unknown')}")
        logger.info(f"[DEBUG] ✅ Claude response content: {claude_response.get('content', 'No content')}")

        # Promote Claude's question into the first slot when available
        primary_question_text = None
        if claude_response.get("type") == "question":
            primary_question_text = claude_response.get("content", "").strip()
        elif claude_response.get("type") == "conclusion":
            conclusion = claude_response.get("content", "").strip()
            if conclusion:
                primary_question_text = (
                    f"Given this early conclusion — {conclusion} — what additional detail would help confirm the correct HS code?"
                )

        if not primary_question_text:
            primary_question_text = (
                f"What specific characteristics of your {request.productType} can help distinguish it from similar products?"
            )

        question_payloads[0].update({
            "text": primary_question_text,
            "type": "text",
            "options": None,
            "required": True,
            "category": "claude_generated"
        })

        # Ensure second question has sensible defaults (fallback may already
        # include options/types tailored to the product category).
        if len(question_payloads) > 1:
            question_payloads[1].setdefault("required", True)
            question_payloads[1].setdefault("category", "claude_generated")

        questions = [Question(**payload) for payload in question_payloads]

        logger.info(f"[DEBUG] ✅ Successfully prepared {len(questions)} questions using Claude + fallback context")
        return QuestionGenerationResponse(questions=questions)

    except Exception as e:
        logger.error(f"❌ Error in real Claude question generation: {e}")
        logger.error(traceback.format_exc())

        # Fallback to a basic question if Claude fails
        fallback_questions = [
            Question(
                id="fallback_question_1",
                text=f"What are the key characteristics of your {request.productType} that would help identify the correct classification?",
                type="text",
                required=True,
                category="fallback"
            )
        ]

        logger.warning("⚠️  Using fallback question due to Claude API error")
        return QuestionGenerationResponse(questions=fallback_questions)

# Product classification endpoint with REAL semantic search
@app.post("/api/classify", response_model=AnalysisResponse)
async def classify_product(request: AnalysisRequest, generator: ClaudeQuestionGenerator = Depends(get_question_generator)):
    """Classify product using HYBRID semantic search + Claude AI analysis"""
    logger.info(f"🎯 HYBRID CLASSIFICATION: Semantic Search + Claude AI for: {request.productType}")

    if semantic_search_service is None:
        logger.warning("⚠️  Semantic search not available, falling back to Claude-only analysis")
        return await classify_product_claude_only(request, generator)

    try:
        # Build comprehensive product description for semantic search
        materials_str = ', '.join(request.materials) if isinstance(request.materials, list) else str(request.materials)
        product_description = f"{request.productType} made of {materials_str}, used for {request.function}, target audience: {request.targetAudience}, from {request.origin}"

        logger.info(f"[DEBUG] 📋 Full product context: {product_description}")

        # STEP 1: SEMANTIC SEARCH - Find top candidates using embeddings
        logger.info("[DEBUG] 🔍 STEP 1: Running semantic search through 9,812 HS codes...")

        # Generate semantic search query using Claude intelligence
        search_query = f"{request.productType} {materials_str} {request.function}"

        # Perform semantic search with embeddings
        semantic_matches = semantic_search_service.search_similar_codes(
            query=search_query,
            top_k=10,
            similarity_threshold=0.3  # Adjusted based on actual similarity distribution
        )

        if not semantic_matches:
            logger.warning("❌ No semantic matches found, using Claude-only classification")
            return await classify_product_claude_only(request, generator)

        logger.info(f"[DEBUG] 🎯 Found {len(semantic_matches)} semantic matches!")

        # STEP 2: CLAUDE ANALYSIS - Analyze semantic results and provide expert reasoning
        logger.info("[DEBUG] ⚡ STEP 2: Claude analyzing semantic search results...")

        # Enhanced console logging for Claude analysis
        print(f"\n{'='*90}")
        print(f"🔍 CLAUDE ANALYZING SEMANTIC RESULTS")
        print(f"{'='*90}")
        print(f"Found {len(semantic_matches)} semantic matches above threshold")
        print(f"Sending top 10 matches to Claude for expert analysis...")

        # Create Claude prompt with semantic search results
        candidates_text = "\n".join([
            f"Match #{match['rank']}: Index {match['index']} (similarity: {match['similarity_score']:.4f})"
            for match in semantic_matches[:10]
        ])

        claude_prompt = f"""You are an expert HS code classification specialist with access to semantic search results.

PRODUCT TO CLASSIFY: {product_description}

SEMANTIC SEARCH RESULTS (Top 10 matches from 9,812 HS codes):
{candidates_text}

The semantic search found these matches based on text similarity. Your task:

1. Analyze the product characteristics:
   - Material: {materials_str}
   - Function: {request.function}
   - Target: {request.targetAudience}
   - Origin: {request.origin}

2. Based on HS code classification principles, determine the most appropriate code and provide reasoning.

Provide your analysis in this EXACT format:

HS_CODE: [Best HS code - can be from semantic results or your expert knowledge]
CONFIDENCE: [0.0 to 1.0 based on certainty]
DESCRIPTION: [Official HS code description]
REASONING: [Expert explanation combining semantic analysis + HS classification rules]
CATEGORY: [General product category]

Important: Use your HS code expertise to validate semantic results."""

        # Call Claude API for analysis
        print(f"\nINPUT TO CLAUDE (Classification Analysis):")
        print("-" * 80)
        print(claude_prompt)
        print("-" * 80)
        print("Sending classification request to Claude API...")

        response = generator.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            messages=[{"role": "user", "content": claude_prompt}]
        )

        # Log Claude's classification response
        response_text = response.content[0].text.strip()
        print(f"\nCLAUDE CLASSIFICATION RESPONSE:")
        print("-" * 80)
        print(response_text)
        print("-" * 80)
        print("=" * 90 + "\n")

        claude_analysis = response.content[0].text.strip()

        logger.info(f"[DEBUG] 🤖 Claude analysis of semantic results:")
        logger.info(f"[DEBUG] {'-'*50}")
        logger.info(claude_analysis)
        logger.info(f"[DEBUG] {'-'*50}")

        # Parse Claude's expert analysis
        final_result = parse_claude_classification(claude_analysis, request)

        # Add semantic search metadata to response reasoning
        semantic_info = f"Semantic search found {len(semantic_matches)} matches (best similarity: {semantic_matches[0]['similarity_score']:.3f}). "
        final_result.reasoning = semantic_info + final_result.reasoning

        logger.info(f"[DEBUG] ✅ HYBRID CLASSIFICATION COMPLETE:")
        logger.info(f"[DEBUG]   Final HS Code: {final_result.code}")
        logger.info(f"[DEBUG]   Confidence: {final_result.confidence}")
        logger.info(f"[DEBUG]   Semantic Matches Used: {len(semantic_matches)}")

        return final_result

    except Exception as e:
        logger.error(f"❌ Error in hybrid classification: {e}")
        logger.error(traceback.format_exc())

        # Fallback to Claude-only analysis
        logger.warning("⚠️  Falling back to Claude-only classification due to error")
        return await classify_product_claude_only(request, generator)

async def classify_product_claude_only(request: AnalysisRequest, generator: ClaudeQuestionGenerator):
    """Fallback Claude-only classification when semantic search fails"""
    logger.info(f"[DEBUG] 🤖 Using Claude-only classification for: {request.productType}")

    # Use the original Claude-only implementation as fallback
    materials_str = ', '.join(request.materials) if isinstance(request.materials, list) else str(request.materials)
    product_description = f"{request.productType} made of {materials_str}, used for {request.function}, target audience: {request.targetAudience}, from {request.origin}"

    classification_prompt = f"""You are an expert HS code classification specialist.

PRODUCT TO CLASSIFY: {product_description}

Provide the most appropriate HS code classification in this EXACT format:

HS_CODE: [6-digit HS code]
CONFIDENCE: [0.0 to 1.0]
DESCRIPTION: [Official HS code description]
REASONING: [Expert explanation of classification]
CATEGORY: [General product category]"""

    try:
        # Enhanced console logging for Claude-only classification
        print(f"\n{'='*90}")
        print(f"🤖 CLAUDE-ONLY CLASSIFICATION (No Semantic Search)")
        print(f"{'='*90}")
        print(f"Product: {request.productType}")
        print(f"Materials: {request.materials}")
        print(f"Function: {request.function}")
        print(f"\nINPUT TO CLAUDE (Direct Classification):")
        print("-" * 80)
        print(classification_prompt)
        print("-" * 80)
        print("Sending direct classification request to Claude API...")

        response = generator.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": classification_prompt}]
        )

        # Log Claude's direct classification response
        response_text = response.content[0].text.strip()
        print(f"\nCLAUDE DIRECT CLASSIFICATION RESPONSE:")
        print("-" * 80)
        print(response_text)
        print("-" * 80)
        print("=" * 90 + "\n")

        claude_analysis = response.content[0].text.strip()
        return parse_claude_classification(claude_analysis, request)

    except Exception as e:
        logger.error(f"❌ Claude-only classification failed: {e}")
        return generate_intelligent_fallback_classification(request)

@app.get("/api/products")
async def list_products():
    """Return list of previously classified products"""
    # TODO: Implement database storage and retrieval
    return {"products": [], "message": "Product storage not yet implemented"}

# Real Claude integration helper functions
def parse_claude_classification(claude_response: str, request: AnalysisRequest) -> AnalysisResponse:
    """Parse Claude's structured classification response into API format"""

    try:
        lines = claude_response.strip().split('\n')

        # Initialize defaults
        code = "9999.99.99"
        confidence = 0.5
        description = "Classification requires expert review"
        reasoning = "Unable to parse Claude response"
        category = "Other"

        # Parse structured response
        for line in lines:
            line = line.strip()
            if line.startswith("HS_CODE:"):
                code = line.split(":", 1)[1].strip()
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                    confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
                except (ValueError, IndexError):
                    confidence = 0.5
            elif line.startswith("DESCRIPTION:"):
                description = line.split(":", 1)[1].strip()
            elif line.startswith("REASONING:"):
                reasoning = line.split(":", 1)[1].strip()
            elif line.startswith("CATEGORY:"):
                category = line.split(":", 1)[1].strip()

        logger.info(f"[DEBUG] 📊 Parsed Claude classification:")
        logger.info(f"[DEBUG]   HS Code: {code}")
        logger.info(f"[DEBUG]   Confidence: {confidence}")
        logger.info(f"[DEBUG]   Description: {description}")
        logger.info(f"[DEBUG]   Reasoning: {reasoning}")
        logger.info(f"[DEBUG]   Category: {category}")

        return AnalysisResponse(
            code=code,
            description=description,
            confidence=confidence,
            reasoning=reasoning,
            category=category
        )

    except Exception as e:
        logger.error(f"❌ Error parsing Claude response: {e}")
        # Return fallback result
        return generate_intelligent_fallback_classification(request)

def generate_intelligent_fallback_classification(request: AnalysisRequest) -> AnalysisResponse:
    """Generate intelligent fallback classification based on product characteristics"""

    product_type = request.productType.lower()
    materials = str(request.materials).lower()
    function = request.function.lower()

    logger.info(f"[DEBUG] 🧠 Generating intelligent fallback for: {product_type}")

    # Enhanced pattern matching for better classification
    classification_rules = [
        # Electronics (Chapter 85)
        {
            "keywords": ["electronic", "device", "phone", "computer", "circuit", "sensor", "battery", "charger"],
            "code": "8517.12.00",
            "description": "Electronic communication devices",
            "confidence": 0.75,
            "category": "Electronics"
        },
        # Food & Beverages (Chapters 20-22)
        {
            "keywords": ["juice", "drink", "beverage", "lemonade", "soda", "water", "food", "edible"],
            "code": "2009.89.00",
            "description": "Fruit juices and other beverages",
            "confidence": 0.80,
            "category": "Food & Beverage"
        },
        # Textiles (Chapters 61-63)
        {
            "keywords": ["clothing", "apparel", "shirt", "pants", "fabric", "textile", "cotton", "polyester"],
            "code": "6203.42.10",
            "description": "Textile apparel and clothing",
            "confidence": 0.78,
            "category": "Textiles"
        },
        # Plastics (Chapter 39)
        {
            "keywords": ["plastic", "polymer", "synthetic"],
            "code": "3926.90.99",
            "description": "Plastic articles",
            "confidence": 0.70,
            "category": "Plastics"
        }
    ]

    # Find best matching rule
    best_match = None
    highest_score = 0

    search_text = f"{product_type} {materials} {function}".lower()

    for rule in classification_rules:
        score = sum(1 for keyword in rule["keywords"] if keyword in search_text)
        if score > highest_score:
            highest_score = score
            best_match = rule

    if best_match and highest_score > 0:
        reasoning = f"Intelligent fallback classification based on detected keywords: {[kw for kw in best_match['keywords'] if kw in search_text]}"
        logger.info(f"[DEBUG] 🎯 Found pattern match with {highest_score} keyword hits")

        return AnalysisResponse(
            code=best_match["code"],
            description=best_match["description"],
            confidence=best_match["confidence"] * 0.8,  # Reduce confidence for fallback
            reasoning=reasoning,
            category=best_match["category"]
        )
    else:
        # Ultimate fallback
        logger.info("[DEBUG] 🤷 No pattern matches found - using generic classification")
        return AnalysisResponse(
            code="9999.99.99",
            description="Product classification requires expert review",
            confidence=0.3,
            reasoning=f"No clear classification pattern found for '{request.productType}' - manual review recommended",
            category="Requires Review"
        )

# Legacy mock functions (kept for backup compatibility)
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
