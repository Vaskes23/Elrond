#!/usr/bin/env python3
"""
HS Code Classification CLI
Interactive tool for classifying products using embeddings + Claude AI
"""

import json
import os
import sys
from dataclasses import dataclass
from typing import List, Dict, Optional
import anthropic

@dataclass
class HSCode:
    code: str
    description: str
    similarity_score: float = 0.0

@dataclass
class ConversationState:
    product_description: str
    qa_history: List[Dict[str, str]]  # [{"question": "...", "answer": "..."}]
    current_candidates: List[HSCode]
    iteration: int = 0

class MockEmbeddingService:
    """Mock embedding service for testing - replace with your partner's implementation"""
    
    def __init__(self, debug=False):
        self.debug = debug
        # Mock HS codes for testing
        self.mock_codes = [
            HSCode("8471.30", "Portable automatic data processing machines, weighing not more than 10 kg"),
            HSCode("8471.41", "Data processing machines; comprising in the same housing at least a central processing unit"),
            HSCode("6109.10", "T-shirts, singlets and other vests, knitted or crocheted, of cotton"),
            HSCode("4202.92", "Travelling-bags, insulated food or beverages bags, toilet bags, rucksacks, shopping-bags"),
            HSCode("8517.12", "Telephones for cellular networks or for other wireless networks"),
        ]
    
    def search_hs_codes(self, query_context: str, similarity_threshold: float = 0.6) -> List[HSCode]:
        """Mock embedding search - replace with real implementation"""
        if self.debug:
            print(f"[DEBUG] MockEmbeddingService.search_hs_codes() called")
            print(f"[DEBUG] Query context: {query_context}")
            print(f"[DEBUG] Similarity threshold: {similarity_threshold}")
        
        # For demo purposes, return mock results with decreasing similarity
        results = []
        for i, code in enumerate(self.mock_codes):
            code.similarity_score = max(0.3, 0.9 - (i * 0.15))  # Decreasing similarity
            if code.similarity_score >= similarity_threshold:
                results.append(code)
        
        results = sorted(results, key=lambda x: x.similarity_score, reverse=True)
        
        if self.debug:
            print(f"[DEBUG] Found {len(results)} codes above threshold:")
            for code in results:
                print(f"[DEBUG]   {code.code}: {code.similarity_score:.3f}")
        
        return results

class ClaudeQuestionGenerator:
    """Handles Claude API integration for question generation"""
    
    def __init__(self, api_key: str, debug=False):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.debug = debug
    
    def generate_question(self, state: ConversationState) -> str:
        """Generate a discriminating question based on current state"""
        
        if self.debug:
            print(f"[DEBUG] ClaudeQuestionGenerator.generate_question() called")
            print(f"[DEBUG] Iteration: {state.iteration}")
            print(f"[DEBUG] Current candidates: {len(state.current_candidates)}")
        
        # Build context for Claude
        candidates_text = "\n".join([
            f"- {code.code}: {code.description} (similarity: {code.similarity_score:.2f})"
            for code in state.current_candidates[:10]  # Top 10 for context
        ])
        
        qa_history_text = "\n".join([
            f"Q: {qa['question']}\nA: {qa['answer']}"
            for qa in state.qa_history
        ])
        
        prompt = f"""You are helping classify a product into the correct HS (Harmonized System) code. 

ORIGINAL PRODUCT DESCRIPTION: {state.product_description}

PREVIOUS QUESTIONS AND ANSWERS:
{qa_history_text if qa_history_text else "None"}

CURRENT TOP HS CODE CANDIDATES:
{candidates_text}

Your task: Analyze these specific HS code candidates and identify what key differences exist between them. Then generate ONE specific question that will help the user choose between these exact candidates.

Steps:
1. Look at the descriptions of these specific HS codes
2. Identify the main differences between them (what makes them distinct from each other)
3. Consider what hasn't been asked yet based on the previous Q&A
4. Generate a question that directly addresses the biggest differentiator between these candidates

The question should be:
- Specific to these exact candidates (not generic)
- Something that hasn't been covered in previous questions
- Designed to eliminate some of these candidates based on the answer
- Clear and easy for the user to answer

Return ONLY the question text, nothing else."""

        if self.debug:
            print(f"[DEBUG] Sending prompt to Claude:")
            print(f"[DEBUG] {'-'*50}")
            print(prompt)
            print(f"[DEBUG] {'-'*50}")

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            
            question = response.content[0].text.strip()
            
            if self.debug:
                print(f"[DEBUG] Claude response received:")
                print(f"[DEBUG] Raw response: {response.content[0].text}")
                print(f"[DEBUG] Cleaned question: {question}")
            
            return question
        
        except Exception as e:
            print(f"Error generating question: {e}")
            if self.debug:
                print(f"[DEBUG] Exception details: {type(e).__name__}: {str(e)}")
            return "What is the primary material or composition of your product?"

class HSCodeClassifier:
    """Main classifier orchestrating the iterative process"""
    
    def __init__(self, claude_api_key: str, debug=False):
        self.debug = debug
        self.embedding_service = MockEmbeddingService(debug=debug)
        self.question_generator = ClaudeQuestionGenerator(claude_api_key, debug=debug)
        self.max_iterations = 6
        self.similarity_threshold = 0.6
        
        if self.debug:
            print(f"[DEBUG] HSCodeClassifier initialized")
            print(f"[DEBUG] Max iterations: {self.max_iterations}")
            print(f"[DEBUG] Similarity threshold: {self.similarity_threshold}")
        
    def build_query_context(self, state: ConversationState) -> str:
        """Build enriched query context from description + Q&A history"""
        context_parts = [f"Product: {state.product_description}"]
        
        for qa in state.qa_history:
            context_parts.append(f"{qa['question']}: {qa['answer']}")
        
        context = " | ".join(context_parts)
        
        if self.debug:
            print(f"[DEBUG] build_query_context() called")
            print(f"[DEBUG] Built context: {context}")
            
        return context
    
    def check_convergence(self, state: ConversationState, prev_candidates: List[HSCode]) -> bool:
        """Check if we should stop iterating"""
        
        if self.debug:
            print(f"[DEBUG] check_convergence() called")
            print(f"[DEBUG] Current iteration: {state.iteration}/{self.max_iterations}")
            print(f"[DEBUG] Current candidates: {len(state.current_candidates)}")
        
        # Max iterations reached
        if state.iteration >= self.max_iterations:
            if self.debug:
                print(f"[DEBUG] Convergence: Max iterations reached")
            return True
            
        # Single high-confidence candidate
        if len(state.current_candidates) == 1 and state.current_candidates[0].similarity_score > 0.85:
            if self.debug:
                print(f"[DEBUG] Convergence: Single high-confidence candidate ({state.current_candidates[0].similarity_score:.3f})")
            return True
            
        # Stable top candidates (same top 3 as previous iteration)
        if prev_candidates and len(state.current_candidates) >= 3 and len(prev_candidates) >= 3:
            current_top3 = [c.code for c in state.current_candidates[:3]]
            prev_top3 = [c.code for c in prev_candidates[:3]]
            if current_top3 == prev_top3:
                if self.debug:
                    print(f"[DEBUG] Convergence: Stable top 3 candidates")
                    print(f"[DEBUG] Top 3: {current_top3}")
                return True
        
        if self.debug:
            print(f"[DEBUG] No convergence criteria met - continuing")
                
        return False
    
    def display_candidates(self, candidates: List[HSCode]):
        """Display current candidates"""
        print("Current HS Code Candidates:")
        for i, candidate in enumerate(candidates[:10], 1):
            print(f"{i}. {candidate.code}: {candidate.description[:100]}...")
            print(f"   Similarity: {candidate.similarity_score:.3f}")
        print()
    
    def classify_product(self, initial_description: str) -> Optional[HSCode]:
        """Main classification flow"""
        
        if self.debug:
            print(f"[DEBUG] classify_product() started")
            print(f"[DEBUG] Initial description: {initial_description}")
        
        # Initialize state
        state = ConversationState(
            product_description=initial_description,
            qa_history=[],
            current_candidates=[],
            iteration=0
        )
        
        print("\nStarting HS Code Classification")
        print(f"Product: {initial_description}")
        print()
        
        prev_candidates = []
        
        while True:
            state.iteration += 1
            print(f"Iteration {state.iteration}")
            print()
            
            if self.debug:
                print(f"[DEBUG] Starting iteration {state.iteration}")
                print(f"[DEBUG] Q&A history so far: {len(state.qa_history)} entries")
            
            # Get current candidates via embedding search
            query_context = self.build_query_context(state)
            state.current_candidates = self.embedding_service.search_hs_codes(
                query_context, 
                self.similarity_threshold
            )
            
            print(f"Found {len(state.current_candidates)} candidates above {self.similarity_threshold} similarity")
            print()
            
            if not state.current_candidates:
                print("No candidates found above similarity threshold!")
                if self.debug:
                    print(f"[DEBUG] No candidates found - returning None")
                return None
                
            # Display current candidates
            self.display_candidates(state.current_candidates)
            
            # Check convergence
            converged = self.check_convergence(state, prev_candidates)
            if converged:
                print("Converged! Stopping iteration.")
                if self.debug:
                    print(f"[DEBUG] Convergence detected - breaking loop")
                break
                
            # Generate next question
            if self.debug:
                print(f"[DEBUG] Generating question for iteration {state.iteration}")
            
            question = self.question_generator.generate_question(state)
            print(f"Question {len(state.qa_history) + 1}: {question}")
            
            # Get user answer
            answer = input("Your answer: ").strip()
            
            if self.debug:
                print(f"[DEBUG] User answer: {answer}")
            
            # Update state
            state.qa_history.append({
                "question": question,
                "answer": answer
            })
            
            if self.debug:
                print(f"[DEBUG] Updated Q&A history - now {len(state.qa_history)} entries")
            
            prev_candidates = state.current_candidates.copy()
            print()
        
        # Final results
        if state.current_candidates:
            print("\nFinal Classification Results:")
            self.display_candidates(state.current_candidates[:5])
            
            if self.debug:
                print(f"[DEBUG] Final candidates: {len(state.current_candidates)}")
            
            if len(state.current_candidates) == 1:
                if self.debug:
                    print(f"[DEBUG] Single candidate found: {state.current_candidates[0].code}")
                return state.current_candidates[0]
            else:
                # Let user choose from top candidates
                print("Multiple candidates remain. Please select:")
                for i, candidate in enumerate(state.current_candidates[:5], 1):
                    print(f"{i}. {candidate.code}: {candidate.description[:100]}...")
                
                while True:
                    choice = input("Select number (1-5): ").strip()
                    try:
                        choice_num = int(choice)
                        if 1 <= choice_num <= min(5, len(state.current_candidates)):
                            selected = state.current_candidates[choice_num - 1]
                            if self.debug:
                                print(f"[DEBUG] User selected: {selected.code}")
                            return selected
                        else:
                            print("Invalid selection. Please try again.")
                    except ValueError:
                        print("Please enter a valid number.")
        
        if self.debug:
            print(f"[DEBUG] No final candidates - returning None")
        return None

def main():
    """Main CLI entry point"""
    
    # Check for debug mode
    debug = False
    if "--debug" in sys.argv or "-d" in sys.argv:
        debug = True
    elif os.getenv("DEBUG") in ["1", "true", "True", "TRUE"]:
        debug = True
    
    if debug:
        print("[DEBUG] Debug mode enabled")
        print(f"[DEBUG] Python version: {sys.version}")
        print(f"[DEBUG] Command line args: {sys.argv}")
    
    print("HS Code Classifier")
    if debug:
        print("(Debug mode)")
    print()
    
    # Get Claude API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        api_key = input("Enter your Anthropic API key: ").strip()
    
    if debug:
        print(f"[DEBUG] API key provided: {bool(api_key)}")
    
    classifier = HSCodeClassifier(api_key, debug=debug)
    
    while True:
        print("\n" + "="*50)
        
        # Get product description
        product_description = input("\nEnter product description: ").strip()
        
        if not product_description:
            if debug:
                print("[DEBUG] Empty product description - exiting")
            break
            
        # Run classification
        result = classifier.classify_product(product_description)
        
        if result:
            print(f"\nCLASSIFIED:")
            print(f"HS Code: {result.code}")
            print(f"Description: {result.description}")
            print(f"Confidence: {result.similarity_score:.3f}")
            if debug:
                print(f"[DEBUG] Classification successful: {result.code}")
        else:
            print("Classification failed")
            if debug:
                print(f"[DEBUG] Classification failed - no result returned")
            
        # Continue?
        continue_choice = input("\nClassify another product? (y/n): ").strip().lower()
        if continue_choice not in ['y', 'yes']:
            if debug:
                print(f"[DEBUG] User chose not to continue")
            break
    
    print("Goodbye!")
    if debug:
        print("[DEBUG] Program ended")

if __name__ == "__main__":
    main()