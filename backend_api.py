#!/usr/bin/env python3
"""
HS Code Classification Backend API
Flask service wrapping the fullimpl.py functionality for the React frontend
"""

import os
import json
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict
import uuid
import subprocess
import threading
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Import our existing classification system
from fullimpl import HSCodeClassifier, ConversationState, HSCode

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global classifier instance (initialized on startup)
classifier = None
active_sessions = {}  # Store active classification sessions

class ClassificationSession:
    """Manages an active classification session"""
    def __init__(self, session_id: str, product_description: str):
        self.session_id = session_id
        self.product_description = product_description
        self.conversation_state = ConversationState(
            product_description=product_description,
            qa_history=[],
            current_candidates=[],
            iteration=0
        )
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        self.demo_mode = False  # Track if this is a demo session

def get_demo_horse_candidates():
    """Return curated horse classification candidates for demo mode"""
    from fullimpl import HSCode
    
    demo_candidates = [
        HSCode(code="0101 21 00", description="Pure-bred breeding animals - Horses", similarity_score=0.92),
        HSCode(code="0101 29 10", description="For slaughter - Horses", similarity_score=0.78),
        HSCode(code="0101 29 90", description="Other - Horses", similarity_score=0.85),
        HSCode(code="0101 30 00", description="Asses", similarity_score=0.45),
        HSCode(code="0101 90 00", description="Other - Live animals", similarity_score=0.35)
    ]
    
    logger.info(f"🐎 Generated {len(demo_candidates)} demo horse candidates")
    return demo_candidates

def get_demo_horse_questions():
    """Return scripted questions for horse demo mode"""
    return [
        {
            "type": "multiple_choice",
            "content": "Is this product a live, fresh, or processed animal product?",
            "options": ["Live animal", "Fresh animal product", "Processed animal product", "Other"],
            "expected_answer": "Live animal"
        },
        {
            "type": "multiple_choice",
            "content": "Is the horse you are referring to a pure-bred animal or crossbred",
            "options": ["Pure-bred animal", "crossbred animal"],
            "expected_answer": "Pure-bred animal"
        },
        {
            "type": "question",
            "content": "What is the intended purpose of this horse?",
            "expected_answer": "pure-bred arabic horse"
        },
        {
            "type": "question",
            "content": "Can you provide any additional technical specifications or details about your horse?",
            "expected_answer": "its an arabic horse"
        }
    ]

def initialize_classifier():
    """Initialize the HS Code classifier with cached embeddings"""
    global classifier
    
    try:
        # Get configuration from environment variables
        api_key = "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"
        hs_data_file = os.getenv("HS_DATA_FILE", "hscodes.xlsx")
        embedding_file = os.getenv("EMBEDDING_FILE", "hs_embeddings_600970782048097937.pkl")
        
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        
        if not os.path.exists(hs_data_file):
            raise ValueError(f"HS data file not found: {hs_data_file}")
            
        logger.info(f"Initializing classifier with:")
        logger.info(f"  HS data file: {hs_data_file}")
        logger.info(f"  Embedding file: {embedding_file}")
        logger.info(f"  Using cached embeddings only: True")
        
        # Initialize classifier with cached embeddings only (for faster startup)
        classifier = HSCodeClassifier(
            claude_api_key=api_key,
            hs_data_file=hs_data_file,
            debug=False,  # Disable debug for API
            embedding_file=embedding_file,
            use_cached_only=True,  # Only use cached embeddings
            force_recompute=False
        )
        
        logger.info("✅ Classifier initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize classifier: {e}")
        logger.error(traceback.format_exc())
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'classifier_ready': classifier is not None,
        'timestamp': datetime.now().isoformat(),
        'active_sessions': len(active_sessions)
    })

@app.route('/api/classify/start', methods=['POST'])
def start_classification():
    """Start a new classification session"""
    try:
        if not classifier:
            return jsonify({'error': 'Classifier not initialized'}), 500
            
        data = request.get_json()
        product_description = data.get('description', '').strip()
        
        if not product_description:
            return jsonify({'error': 'Product description is required'}), 400
            
        # Create new session
        session_id = str(uuid.uuid4())
        session = ClassificationSession(session_id, product_description)
        active_sessions[session_id] = session
        
        logger.info(f"Started classification session {session_id}: {product_description}")
        
        # CHECK FOR DEMO MODE - if input contains "horse" trigger demo
        if 'horse' in product_description.lower():
            logger.info(f"🐎 DEMO MODE activated for session {session_id}")
            session.demo_mode = True
            candidates = get_demo_horse_candidates()
            smart_query = f"horse breeding animal demo query"
        else:
            # Get initial search results with enhanced retry logic
            try:
                # Use Claude to generate smart query for initial search
                smart_query = classifier.question_generator.generate_smart_query(
                    session.conversation_state
                )
                
                logger.info(f"Initial smart query for session {session_id}: '{smart_query}'")
                
                # Search for candidates
                candidates = classifier.embedding_service.search_hs_codes(
                    smart_query,
                    classifier.similarity_threshold,
                    session.conversation_state.qa_history  # Pass Q&A history for contradiction penalty
                )
                
                # Check relevance and potentially retry with better query
                if candidates:
                    candidates_relevant = classifier.question_generator._candidates_seem_relevant(
                        product_description, candidates
                    )
                    
                    if not candidates_relevant:
                        logger.warning(f"Initial candidates seem irrelevant for session {session_id}, attempting retry")
                        
                        # Try again with a potentially different query
                        retry_query = classifier.question_generator.generate_smart_query(
                            session.conversation_state, candidates
                        )
                        
                        if retry_query != smart_query:
                            logger.info(f"Retry query for session {session_id}: '{retry_query}'")
                            retry_candidates = classifier.embedding_service.search_hs_codes(
                                retry_query, classifier.similarity_threshold,
                                session.conversation_state.qa_history  # Pass Q&A history for contradiction penalty
                            )
                            
                            if retry_candidates:
                                retry_relevant = classifier.question_generator._candidates_seem_relevant(
                                    product_description, retry_candidates
                                )
                                if retry_relevant:
                                    logger.info(f"Retry found more relevant candidates for session {session_id}")
                                    candidates = retry_candidates
                                    smart_query = retry_query
                                else:
                                    logger.warning(f"Retry still produced irrelevant results for session {session_id}")
                
            except Exception as e:
                logger.error(f"Error in initial search: {e}")
                return jsonify({'error': f'Search failed: {str(e)}'}), 500
        
        session.conversation_state.current_candidates = candidates
        session.last_updated = datetime.now()
        
        return jsonify({
            'session_id': session_id,
            'product_description': product_description,
            'smart_query': smart_query,
            'candidates': [
                {
                    'code': candidate.code,
                    'description': candidate.description,
                    'similarity_score': candidate.similarity_score
                }
                for candidate in candidates[:10]  # Return top 10
            ],
            'candidate_count': len(candidates),
            'status': 'started',
            'demo_mode': getattr(session, 'demo_mode', False)
        })
            
    except Exception as e:
        logger.error(f"Error starting classification: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Classification start failed: {str(e)}'}), 500

@app.route('/api/classify/question/<session_id>', methods=['GET'])
def get_next_question(session_id: str):
    """Get next question for classification"""
    try:
        if session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
            
        session = active_sessions[session_id]
        
        # Handle demo mode with scripted questions
        if getattr(session, 'demo_mode', False):
            demo_questions = get_demo_horse_questions()
            current_qa_count = len(session.conversation_state.qa_history)
            
            if current_qa_count < len(demo_questions):
                demo_response = demo_questions[current_qa_count]
                logger.info(f"🐎 DEMO: Serving scripted question {current_qa_count + 1}")
                
                response_data = {
                    'session_id': session_id,
                    'question_type': demo_response['type'],
                    'question': demo_response['content'],
                    'iteration': session.conversation_state.iteration,
                    'qa_history_count': current_qa_count,
                    'candidate_count': len(session.conversation_state.current_candidates),
                    'demo_mode': True
                }
                
                if 'options' in demo_response:
                    response_data['options'] = demo_response['options']
                
                return jsonify(response_data)
            else:
                # Demo completed - force convergence by returning a special response
                # that will trigger finalization in the frontend
                logger.info(f"🐎 DEMO: All questions completed - triggering finalization")
                return jsonify({
                    'session_id': session_id,
                    'question_type': 'convergence_reached',
                    'question': 'Classification analysis complete.',
                    'iteration': session.conversation_state.iteration,
                    'qa_history_count': len(session.conversation_state.qa_history),
                    'candidate_count': len(session.conversation_state.current_candidates),
                    'demo_mode': True,
                    'converged': True  # This will trigger finalization
                })
        
        # Generate next question using Claude for non-demo mode
        try:
            claude_response = classifier.question_generator.generate_question(
                session.conversation_state
            )
            
            session.last_updated = datetime.now()
            
            response_data = {
                'session_id': session_id,
                'question_type': claude_response.get('type', 'question'),
                'question': claude_response.get('content', ''),
                'iteration': session.conversation_state.iteration,
                'qa_history_count': len(session.conversation_state.qa_history),
                'candidate_count': len(session.conversation_state.current_candidates)
            }
            
            # Add options for multiple choice questions
            if claude_response.get('type') == 'multiple_choice' and 'options' in claude_response:
                response_data['options'] = claude_response['options']
                
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return jsonify({'error': f'Question generation failed: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error getting question: {e}")
        return jsonify({'error': f'Failed to get question: {str(e)}'}), 500

@app.route('/api/classify/answer/<session_id>', methods=['POST'])
def submit_answer(session_id: str):
    """Submit answer and get updated results"""
    try:
        if session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
            
        session = active_sessions[session_id]
        data = request.get_json()
        
        question = data.get('question', '')
        answer = data.get('answer', '').strip()
        
        if not answer:
            return jsonify({'error': 'Answer is required'}), 400
            
        # Log the Q&A being added for debugging
        logger.info(f"Session {session_id}: Adding Q&A to history:")
        logger.info(f"  Question: {question}")
        logger.info(f"  Answer: {answer}")
            
        # Add Q&A to history
        session.conversation_state.qa_history.append({
            'question': question,
            'answer': answer
        })
        
        # Log full Q&A history for debugging
        logger.info(f"Session {session_id}: Full Q&A history now has {len(session.conversation_state.qa_history)} entries:")
        for i, qa in enumerate(session.conversation_state.qa_history, 1):
            logger.info(f"  {i}. Q: {qa['question'][:50]}...")
            logger.info(f"     A: {qa['answer']}")
        
        # Store previous candidates for convergence check
        prev_candidates = session.conversation_state.current_candidates.copy()
        
        session.conversation_state.iteration += 1
        session.last_updated = datetime.now()
        
        # Handle demo mode - force convergence after 4 questions
        if getattr(session, 'demo_mode', False) and len(session.conversation_state.qa_history) >= 4:
            logger.info(f"🐎 DEMO: Forcing convergence after {len(session.conversation_state.qa_history)} questions")
            return jsonify({
                'session_id': session_id,
                'smart_query': 'demo horse breeding query',
                'candidates': [
                    {
                        'code': candidate.code,
                        'description': candidate.description,
                        'similarity_score': candidate.similarity_score
                    }
                    for candidate in session.conversation_state.current_candidates[:10]
                ],
                'candidate_count': len(session.conversation_state.current_candidates),
                'iteration': session.conversation_state.iteration,
                'qa_history_count': len(session.conversation_state.qa_history),
                'converged': True,  # Force convergence
                'candidates_relevant': True,
                'query_retried': False,
                'status': 'updated',
                'demo_mode': True
            })
        
        # Generate new smart query with updated context (non-demo mode)
        smart_query = classifier.question_generator.generate_smart_query(
            session.conversation_state,
            session.conversation_state.current_candidates
        )
        
        logger.info(f"Smart query for session {session_id} iteration {session.conversation_state.iteration}: '{smart_query}'")
        
        # Search for updated candidates with retry logic
        new_candidates = classifier.embedding_service.search_hs_codes(
            smart_query,
            classifier.similarity_threshold,
            session.conversation_state.qa_history  # Pass Q&A history for contradiction penalty
        )
        
        query_retried = False
        # Enhanced relevance check and retry logic
        if new_candidates:
            candidates_relevant = classifier.question_generator._candidates_seem_relevant(
                session.product_description, new_candidates
            )
            
            if not candidates_relevant:
                logger.warning(f"Candidates seem irrelevant for session {session_id} iteration {session.conversation_state.iteration}, attempting retry")
                
                # Try a different approach - maybe the smart query was too aggressive
                retry_query = classifier.question_generator.generate_smart_query(
                    session.conversation_state, new_candidates
                )
                
                if retry_query != smart_query:
                    logger.info(f"Retry query for session {session_id}: '{retry_query}'")
                    retry_candidates = classifier.embedding_service.search_hs_codes(
                        retry_query, classifier.similarity_threshold,
                        session.conversation_state.qa_history  # Pass Q&A history for contradiction penalty
                    )
                    
                    if retry_candidates:
                        retry_relevant = classifier.question_generator._candidates_seem_relevant(
                            session.product_description, retry_candidates
                        )
                        if retry_relevant:
                            logger.info(f"Retry found more relevant candidates for session {session_id}")
                            new_candidates = retry_candidates
                            smart_query = retry_query
                            query_retried = True
                        else:
                            logger.warning(f"Retry still produced irrelevant results for session {session_id}")
        
        session.conversation_state.current_candidates = new_candidates
        
        # Check convergence with previous candidates
        converged = classifier.check_convergence(session.conversation_state, prev_candidates)
        
        # Add relevance assessment to response
        candidates_relevant = True
        if new_candidates:
            candidates_relevant = classifier.question_generator._candidates_seem_relevant(
                session.product_description, new_candidates
            )
        
        return jsonify({
            'session_id': session_id,
            'smart_query': smart_query,
            'candidates': [
                {
                    'code': candidate.code,
                    'description': candidate.description,
                    'similarity_score': candidate.similarity_score
                }
                for candidate in new_candidates[:10]
            ],
            'candidate_count': len(new_candidates),
            'iteration': session.conversation_state.iteration,
            'qa_history_count': len(session.conversation_state.qa_history),
            'converged': converged,
            'candidates_relevant': candidates_relevant,
            'query_retried': query_retried,
            'status': 'updated'
        })
        
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Answer submission failed: {str(e)}'}), 500

@app.route('/api/classify/finalize/<session_id>', methods=['POST'])
def finalize_classification(session_id: str):
    """Finalize classification and return final result"""
    try:
        if session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
            
        session = active_sessions[session_id]
        data = request.get_json()
        selected_code = data.get('selected_code')
        
        candidates = session.conversation_state.current_candidates
        
        if not candidates:
            return jsonify({'error': 'No candidates available'}), 400
            
        # Find selected candidate or use top candidate
        final_candidate = None
        if selected_code:
            for candidate in candidates:
                if candidate.code == selected_code:
                    final_candidate = candidate
                    break
        
        if not final_candidate:
            final_candidate = candidates[0]  # Use top candidate
            
        # Create final product structure
        product = {
            'id': f'prod_{int(datetime.now().timestamp())}',
            'identification': f'PROD-{datetime.now().strftime("%Y-%m-%d-%H%M%S")}',
            'dateAdded': datetime.now().isoformat(),
            'hsCode': final_candidate.code,
            'description': session.product_description,
            'reasoning': f'Classified through {session.conversation_state.iteration} iterations of AI-guided questioning. Final similarity score: {final_candidate.similarity_score:.3f}',
            'category': 'AI Classified',
            'origin': 'Unknown',  # Could be extracted from Q&A history
            'status': 'classified' if final_candidate.similarity_score > 0.8 else 'needs_review',
            'confidence': int(final_candidate.similarity_score * 100),
            'qa_history': session.conversation_state.qa_history,
            'alternativeHSCodes': [
                {
                    'code': candidate.code,
                    'confidence': int(candidate.similarity_score * 100),
                    'reasoning': f'Alternative classification with similarity score {candidate.similarity_score:.3f}',
                    'category': 'AI Alternative'
                }
                for candidate in candidates[1:4]  # Top 3 alternatives
            ]
        }
        
        logger.info(f"Finalized classification for session {session_id}: {final_candidate.code}")
        
        # Clean up session
        del active_sessions[session_id]
        
        return jsonify({
            'session_id': session_id,
            'product': product,
            'final_candidate': {
                'code': final_candidate.code,
                'description': final_candidate.description,
                'similarity_score': final_candidate.similarity_score
            },
            'status': 'finalized'
        })
        
    except Exception as e:
        logger.error(f"Error finalizing classification: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Finalization failed: {str(e)}'}), 500

@app.route('/api/classify/sessions', methods=['GET'])
def list_sessions():
    """List active classification sessions"""
    try:
        sessions_info = []
        for session_id, session in active_sessions.items():
            sessions_info.append({
                'session_id': session_id,
                'product_description': session.product_description,
                'iteration': session.conversation_state.iteration,
                'qa_count': len(session.conversation_state.qa_history),
                'candidate_count': len(session.conversation_state.current_candidates),
                'created_at': session.created_at.isoformat(),
                'last_updated': session.last_updated.isoformat()
            })
            
        return jsonify({
            'active_sessions': sessions_info,
            'total_count': len(sessions_info)
        })
        
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        return jsonify({'error': f'Failed to list sessions: {str(e)}'}), 500

@app.route('/api/classify/session/<session_id>', methods=['DELETE'])
def delete_session(session_id: str):
    """Delete a classification session"""
    try:
        if session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
            
        del active_sessions[session_id]
        logger.info(f"Deleted session {session_id}")
        
        return jsonify({
            'session_id': session_id,
            'status': 'deleted'
        })
        
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        return jsonify({'error': f'Failed to delete session: {str(e)}'}), 500

@app.route('/api/search', methods=['POST'])
def semantic_search():
    """Direct semantic search endpoint"""
    try:
        if not classifier:
            return jsonify({'error': 'Classifier not initialized'}), 500
            
        data = request.get_json()
        query = data.get('query', '').strip()
        top_k = data.get('top_k', 20)
        threshold = data.get('threshold', 0.6)
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
            
        # Direct semantic search
        candidates = classifier.embedding_service.search_hs_codes(query, threshold)
        
        return jsonify({
            'query': query,
            'results': [
                {
                    'code': candidate.code,
                    'description': candidate.description,
                    'similarity_score': candidate.similarity_score
                }
                for candidate in candidates[:top_k]
            ],
            'result_count': len(candidates[:top_k]),
            'total_found': len(candidates)
        })
        
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

# Global storage for agent sessions
active_agent_sessions = {}

class AgentSession:
    """Manages an active agent verification session"""
    def __init__(self, session_id: str, product: Dict[str, Any]):
        self.session_id = session_id
        self.product = product
        self.process = None
        self.status = 'starting'  # starting, active, completed, failed
        self.transcript_file = None
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        self.demo_mode = False

def generate_demo_transcript(session_id: str, product: dict):
    """Generate a realistic fake transcript for demo purposes"""
    import time
    import random
    
    # Create transcript directory
    transcript_dir = Path("transcripts")
    transcript_dir.mkdir(exist_ok=True)
    
    # Create transcript file
    timestamp_str = datetime.now().strftime("%Y%m%d-%H%M%S")
    transcript_file = transcript_dir / f"session-{timestamp_str}.json"
    
    # Demo conversation script for horse classification
    conversation_script = [
        ("Agent", "Hello, this is Durin from Elrond AI calling the German customs helpdesk regarding HS code classification."),
        ("Officer", "Good day. How can I assist you with your classification inquiry?"),
        ("Agent", f"We need verification for a product classified as HS code {product.get('hsCode', '0101 21 00')}. The product is described as: {product.get('description', 'Pure-bred Arabic horse for breeding')}."),
        ("Officer", "I see. Let me check our classification guidelines for live animals, specifically horses."),
        ("Agent", "The specific question is whether this pure-bred Arabic horse should be classified under 0101 21 00 for pure-bred breeding animals, or if there's a more specific subcategory."),
        ("Officer", "For pure-bred horses intended for breeding purposes, 0101 21 00 is indeed the correct classification. Can you confirm this is a registered pure-bred animal with breeding documentation?"),
        ("Agent", "Yes, this is confirmed to be a pure-bred Arabic horse with proper breeding documentation and registration papers."),
        ("Officer", "Perfect. Then HS code 0101 21 00 'Pure-bred breeding animals - Horses' is the correct classification. This falls under the European Union's agricultural product regulations."),
        ("Agent", "Excellent. Can you provide the legal basis for this classification? We need it for our compliance documentation."),
        ("Officer", "The legal basis is Council Regulation (EEC) No 2658/87 on the tariff and statistical nomenclature, specifically Chapter 1 covering live animals. The classification is supported by Commission Regulation (EU) 2017/1925."),
        ("Agent", "Thank you. Are there any specific import/export considerations we should be aware for this classification?"),
        ("Officer", "Yes, live animals require veterinary health certificates and CITES permits if applicable. Also ensure compliance with animal welfare regulations during transport."),
        ("Agent", "Understood. We'll ensure all veterinary and transport documentation is in order. Is there anything else we should consider for this classification?"),
        ("Officer", "The classification looks correct. Just ensure the animal meets the pure-bred criteria as defined in the relevant breeding association standards."),
        ("Agent", "Perfect. Thank you for confirming the classification and providing the legal basis. We'll proceed with HS code 0101 21 00."),
        ("Officer", "You're welcome. Have a good day and don't hesitate to contact us if you need further clarification."),
        ("Agent", "Thank you very much. Good day!")
    ]
    
    session = active_agent_sessions.get(session_id)
    if not session:
        return
    
    logger.info(f"🐎 DEMO: Starting fake transcript generation for {session_id}")
    
    # Generate transcript entries with realistic timing
    for i, (speaker, text) in enumerate(conversation_script):
        # Simulate realistic conversation timing
        if i == 0:
            time.sleep(1)  # Initial delay
        else:
            time.sleep(random.uniform(2, 5))  # 2-5 second delays between messages
            
        # Create transcript entry
        entry = {
            "call_id": session_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "text": f"{speaker}: {text}"
        }
        
        # Write to file
        with open(transcript_file, 'a') as f:
            f.write(json.dumps(entry) + '\n')
        
        # Update session status
        if session:
            session.last_updated = datetime.now()
            if i == len(conversation_script) - 1:
                session.status = 'completed'
                logger.info(f"🐎 DEMO: Fake transcript completed for {session_id}")
    
    logger.info(f"🐎 DEMO: Generated {len(conversation_script)} transcript entries")

@app.route('/api/agent/verify', methods=['POST'])
def start_agent_verification():
    """Start customs agent verification for a classified product"""
    try:
        data = request.get_json()
        product = data.get('product', {})
        
        if not product or not product.get('hsCode') or not product.get('description'):
            return jsonify({'error': 'Product with hsCode and description is required'}), 400
        
        # Create new agent session
        session_id = str(uuid.uuid4())
        session = AgentSession(session_id, product)
        active_agent_sessions[session_id] = session
        
        # Check if this is horse demo mode
        is_horse_demo = 'horse' in product.get('description', '').lower() or product.get('hsCode', '').startswith('0101')
        if is_horse_demo:
            session.demo_mode = True
            logger.info(f"🐎 DEMO AGENT verification started for session {session_id}")
        
        logger.info(f"Started agent verification session {session_id} for product: {product.get('hsCode')}")
        
        # Run the agent verification in a separate thread
        def run_agent_verification():
            try:
                session.status = 'active'
                session.last_updated = datetime.now()
                
                if session.demo_mode:
                    # Generate fake demo transcript
                    generate_demo_transcript(session_id, product)
                else:
                    # Import and run the interactive agent demo
                    import sys
                    sys.path.insert(0, str(Path(__file__).parent))
                    
                    # Set up environment for the agent
                    product_title = f"HS Code {product.get('hsCode')} Classification"
                    product_description = product.get('description', '')
                    
                    # Import the agent demo function
                    from agent.demo_interactive_cli import run_interactive
                    
                    # Run the interactive agent with the product details
                    jurisdiction = 'DE'  # Default to Germany, could be configurable
                    
                    try:
                        run_interactive(
                            jurisdiction=jurisdiction,
                            language='en',
                            title=product_title,
                            description=product_description
                        )
                        session.status = 'completed'
                        logger.info(f"Agent verification completed for session {session_id}")
                    except Exception as e:
                        session.status = 'failed'
                        logger.error(f"Agent verification failed for session {session_id}: {e}")
                    
                session.last_updated = datetime.now()
                
            except Exception as e:
                logger.error(f"Error in agent verification thread: {e}")
                session.status = 'failed'
                session.last_updated = datetime.now()
        
        # Start the agent verification in a background thread
        agent_thread = threading.Thread(target=run_agent_verification, daemon=True)
        agent_thread.start()
        
        return jsonify({
            'session_id': session_id,
            'status': 'started',
            'product': product,
            'demo_mode': getattr(session, 'demo_mode', False),
            'message': 'Agent verification started. The agent will call customs office to verify the classification.'
        })
        
    except Exception as e:
        logger.error(f"Error starting agent verification: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Agent verification start failed: {str(e)}'}), 500

@app.route('/api/agent/status/<session_id>', methods=['GET'])
def get_agent_status(session_id: str):
    """Get status of an agent verification session"""
    try:
        if session_id not in active_agent_sessions:
            return jsonify({'error': 'Agent session not found'}), 404
            
        session = active_agent_sessions[session_id]
        
        # Check for transcript file
        transcript_info = None
        transcript_dir = Path("transcripts")
        if transcript_dir.exists():
            # Look for the most recent transcript file for this session
            transcript_files = list(transcript_dir.glob("session-*.json"))
            if transcript_files:
                # Get the most recent one
                latest_transcript = max(transcript_files, key=lambda f: f.stat().st_mtime)
                transcript_info = {
                    'file': str(latest_transcript),
                    'created': datetime.fromtimestamp(latest_transcript.stat().st_mtime).isoformat()
                }
        
        return jsonify({
            'session_id': session_id,
            'status': session.status,
            'product': session.product,
            'created_at': session.created_at.isoformat(),
            'last_updated': session.last_updated.isoformat(),
            'transcript': transcript_info
        })
        
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        return jsonify({'error': f'Failed to get agent status: {str(e)}'}), 500

@app.route('/api/agent/sessions', methods=['GET'])
def list_agent_sessions():
    """List active agent verification sessions"""
    try:
        sessions_info = []
        for session_id, session in active_agent_sessions.items():
            sessions_info.append({
                'session_id': session_id,
                'product_code': session.product.get('hsCode'),
                'product_description': session.product.get('description', '')[:100],
                'status': session.status,
                'created_at': session.created_at.isoformat(),
                'last_updated': session.last_updated.isoformat()
            })
            
        return jsonify({
            'active_sessions': sessions_info,
            'total_count': len(sessions_info)
        })
        
    except Exception as e:
        logger.error(f"Error listing agent sessions: {e}")
        return jsonify({'error': f'Failed to list agent sessions: {str(e)}'}), 500

@app.route('/api/agent/session/<session_id>', methods=['DELETE'])
def delete_agent_session(session_id: str):
    """Delete an agent verification session"""
    try:
        if session_id not in active_agent_sessions:
            return jsonify({'error': 'Agent session not found'}), 404
            
        session = active_agent_sessions[session_id]
        
        # If there's an active process, try to terminate it
        if session.process and session.process.poll() is None:
            session.process.terminate()
            
        del active_agent_sessions[session_id]
        logger.info(f"Deleted agent session {session_id}")
        
        return jsonify({
            'session_id': session_id,
            'status': 'deleted'
        })
        
    except Exception as e:
        logger.error(f"Error deleting agent session: {e}")
        return jsonify({'error': f'Failed to delete agent session: {str(e)}'}), 500

@app.route('/api/agent/transcript/<session_id>', methods=['GET'])
def get_agent_transcript(session_id: str):
    """Get the transcript content for an agent verification session"""
    try:
        if session_id not in active_agent_sessions:
            return jsonify({'error': 'Agent session not found'}), 404
            
        session = active_agent_sessions[session_id]
        
        # Look for transcript files in the transcripts directory
        transcript_dir = Path("transcripts")
        if not transcript_dir.exists():
            return jsonify({'error': 'No transcripts available'}), 404
        
        # Find transcript files (look for the most recent one for this session)
        transcript_files = list(transcript_dir.glob("session-*.json"))
        if not transcript_files:
            return jsonify({'error': 'No transcript files found'}), 404
        
        # Get the most recent transcript file (since we don't have a direct session mapping)
        # In a production system, we'd store the transcript filename in the session
        latest_transcript = max(transcript_files, key=lambda f: f.stat().st_mtime)
        
        # Also check if session is still recent (within last hour)
        import time
        session_age = time.time() - session.created_at.timestamp()
        file_age = time.time() - latest_transcript.stat().st_mtime
        
        # Only return transcript if the file is newer than when session started
        if file_age > session_age + 300:  # Allow 5 minutes buffer
            return jsonify({'error': 'No recent transcript found for this session'}), 404
        
        # Read and parse the transcript
        transcript_entries = []
        try:
            with open(latest_transcript, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            transcript_entries.append(entry)
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Error reading transcript file: {e}")
            return jsonify({'error': 'Failed to read transcript'}), 500
        
        return jsonify({
            'session_id': session_id,
            'transcript_file': str(latest_transcript),
            'entries': transcript_entries,
            'entry_count': len(transcript_entries),
            'created_at': datetime.fromtimestamp(latest_transcript.stat().st_ctime).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting agent transcript: {e}")
        return jsonify({'error': f'Failed to get agent transcript: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info("🚀 Starting HS Code Classification Backend API...")
    
    # Initialize classifier on startup
    if initialize_classifier():
        logger.info("🎉 Starting Flask server...")
        app.run(
            host='0.0.0.0',
            port=int(os.getenv('PORT', 5000)),
            debug=False
        )
    else:
        logger.error("💥 Failed to initialize classifier. Exiting.")
        exit(1)