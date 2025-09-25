#!/usr/bin/env python3
"""
HS Code Classification CLI
Interactive tool for classifying products using embeddings + Claude AI
"""

import json
import os
import sys
import argparse
import glob
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import anthropic
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

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

class HSCodeNode:
    def __init__(self, level: int, code: str, name: str, node_id: int):
        self.level = level
        self.code = code.strip()
        self.name = name.strip()
        self.node_id = node_id
        self.children = []
        self.parent = None
        self.path = []
        
    def add_child(self, child):
        child.parent = self
        self.children.append(child)
        
    def is_leaf(self) -> bool:
        return len(self.children) == 0
        
    def get_full_path(self) -> str:
        if not self.path:
            current = self
            path = []
            while current:
                path.insert(0, current.name)
                current = current.parent
            self.path = path
        return " → ".join(self.path)
        
    def to_dict(self) -> dict:
        return {
            'level': self.level,
            'code': self.code,
            'name': self.name,
            'id': self.node_id,
            'full_text': f"{self.code} {self.name}".strip(),
            'path': self.get_full_path(),
            'is_leaf': self.is_leaf()
        }

class HSCodeSemanticSearch:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2', debug=False):
        self.model_name = model_name
        self.model = None
        self.tree_data = []
        self.leaf_nodes = []
        self.embeddings = None
        self.embeddings_file = None
        self.debug = debug
        
    def load_model(self):
        if self.model is None:
            if self.debug:
                print(f"[DEBUG] Loading SentenceTransformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
        
    def load_data(self, filepath: str) -> None:
        if self.debug:
            print(f"[DEBUG] Loading HS code data from {filepath}")
        
        # Load Excel file
        df = pd.read_excel(filepath)
        
        # Clean the data
        df = df.dropna(subset=['LEVEL', 'NAME_EN'])
        df['CN_CODE'] = df['CN_CODE'].fillna('')
        df['LEVEL'] = df['LEVEL'].astype(int)
        
        if self.debug:
            print(f"[DEBUG] Loaded {len(df)} HS code entries")
        
        # Build tree structure
        self._build_tree(df)
        self._extract_leaf_nodes()
        
        if self.debug:
            print(f"[DEBUG] Built tree with {len(self.leaf_nodes)} leaf nodes")
        
    def _build_tree(self, df: pd.DataFrame) -> None:
        stack = []
        self.tree_data = []
        
        for idx, row in df.iterrows():
            level = row['LEVEL']
            code = str(row['CN_CODE'])
            name = str(row['NAME_EN'])
            
            node = HSCodeNode(level, code, name, idx)
            
            while stack and stack[-1].level >= level:
                stack.pop()
                
            if not stack:
                self.tree_data.append(node)
            else:
                stack[-1].add_child(node)
                
            stack.append(node)
    
    def _extract_leaf_nodes(self) -> None:
        self.leaf_nodes = []
        
        def traverse(node: HSCodeNode):
            if node.is_leaf():
                self.leaf_nodes.append(node)
            for child in node.children:
                traverse(child)
                
        for root in self.tree_data:
            traverse(root)
    
    def compute_embeddings(self, force_recompute: bool = False, embedding_file: str = None, use_cached_only: bool = False) -> None:
        # If use_cached_only is True, we should never compute embeddings
        if use_cached_only:
            if not embedding_file:
                raise ValueError("use_cached_only=True but no embedding_file specified")
            
            if not os.path.exists(embedding_file):
                raise ValueError(f"Cached embeddings not found at {embedding_file}")
            
            if self.debug:
                print(f"[DEBUG] Loading cached embeddings from {embedding_file} (cached-only mode)")
            try:
                with open(embedding_file, 'rb') as f:
                    self.embeddings = pickle.load(f)
                print(f"✓ Loaded cached embeddings for {len(self.embeddings)} nodes from {embedding_file}")
                self.embeddings_file = embedding_file
                return
            except Exception as e:
                raise ValueError(f"Failed to load cached embeddings from {embedding_file}: {e}")
        
        self.load_model()
        
        # Use specific embedding file if provided
        if embedding_file:
            self.embeddings_file = embedding_file
        else:
            # Set up embeddings cache file based on data
            data_hash = hash(str([node.to_dict() for node in self.leaf_nodes]))
            self.embeddings_file = f"hs_embeddings_{abs(data_hash)}.pkl"
        
        # Try to load existing embeddings first (if not forcing recompute)
        if not force_recompute and os.path.exists(self.embeddings_file):
            if self.debug:
                print(f"[DEBUG] Loading cached embeddings from {self.embeddings_file}")
            try:
                with open(self.embeddings_file, 'rb') as f:
                    self.embeddings = pickle.load(f)
                print(f"✓ Loaded cached embeddings for {len(self.embeddings)} nodes from {self.embeddings_file}")
                return
            except Exception as e:
                print(f"Warning: Failed to load cached embeddings, will recompute: {e}")
            
        # Compute new embeddings
        print("Computing embeddings...")
        if self.debug:
            print(f"[DEBUG] This may take a few minutes for {len(self.leaf_nodes)} nodes...")
        
        # Prepare texts for embedding with smart context
        texts = []
        for node in self.leaf_nodes:
            # Get parent categories for context
            path_parts = node.get_full_path().split(" → ")
            key_context = " ".join(path_parts[-3:-1]) if len(path_parts) > 2 else ""
            
            # Smart text: code + name + key parent categories
            text = f"{node.code} {node.name} {key_context}".strip()
            texts.append(text)
        
        # Compute embeddings in batches
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.model.encode(batch_texts, show_progress_bar=not self.debug)
            all_embeddings.append(batch_embeddings)
            
            if self.debug:
                print(f"[DEBUG] Processed {min(i + batch_size, len(texts))}/{len(texts)} embeddings")
        
        self.embeddings = np.vstack(all_embeddings)
        
        # Cache the embeddings
        if self.debug:
            print(f"[DEBUG] Saving embeddings to {self.embeddings_file}")
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
        
        print(f"✓ Computed and cached embeddings for {len(self.embeddings)} HS codes")
    
    def search_hs_codes(self, query_context: str, similarity_threshold: float = 0.6) -> List[HSCode]:
        """Search HS codes using semantic similarity"""
        if self.embeddings is None:
            raise ValueError("Embeddings not computed. Call compute_embeddings() first.")
        
        if self.debug:
            print(f"[DEBUG] HSCodeSemanticSearch.search_hs_codes() called")
            print(f"[DEBUG] Query context: '{query_context}'")
            print(f"[DEBUG] Similarity threshold: {similarity_threshold}")
        
        self.load_model()
        
        # Encode query
        query_embedding = self.model.encode([query_context])
        
        # Compute semantic similarities
        semantic_similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        # Apply keyword boosting for better relevance
        query_words = query_context.lower().split()
        
        for i, node in enumerate(self.leaf_nodes):
            keyword_boost = 0
            for word in query_words:
                if len(word) > 2:  # Ignore very short words
                    if word in node.name.lower():
                        keyword_boost += 0.3  # Strong boost for name match
                    elif word in node.get_full_path().lower():
                        keyword_boost += 0.2  # Medium boost for path match
            
            # Apply boost (capped at 0.5)
            semantic_similarities[i] = min(1.0, semantic_similarities[i] + min(keyword_boost, 0.5))
        
        # Filter by threshold and convert to HSCode objects
        results = []
        for i, score in enumerate(semantic_similarities):
            if score >= similarity_threshold:
                node = self.leaf_nodes[i]
                hs_code = HSCode(
                    code=node.code,
                    description=node.name,
                    similarity_score=float(score)
                )
                results.append(hs_code)
        
        # Sort by similarity score (highest first)
        results = sorted(results, key=lambda x: x.similarity_score, reverse=True)
        
        if self.debug:
            print(f"[DEBUG] Found {len(results)} codes above threshold:")
            for code in results[:5]:  # Show top 5 in debug
                print(f"[DEBUG]   {code.code}: {code.similarity_score:.3f}")
        
        return results

class ClaudeQuestionGenerator:
    """Handles Claude API integration for question generation"""
    
    def __init__(self, api_key: str, debug=False):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.debug = debug
    
    def generate_smart_query(self, state: ConversationState, current_candidates: List[HSCode] = None) -> str:
        """Let Claude AI take full control of semantic search query generation"""
        
        # Build context for Claude to understand the situation
        qa_context = "\n".join([
            f"Q: {qa['question']}\nA: {qa['answer']}"
            for qa in state.qa_history
        ]) if state.qa_history else "None"
        
        candidates_context = ""
        if current_candidates:
            candidates_context = f"""

CURRENT SEARCH RESULTS:
{chr(10).join([f"- {code.code}: {code.description}" for code in current_candidates[:5]])}

These results appear to be {'RELEVANT' if self._candidates_seem_relevant(state.product_description, current_candidates) else 'COMPLETELY IRRELEVANT'} to the product."""
        
        prompt = f"""You are controlling the semantic search query for HS code classification.

ORIGINAL PRODUCT: {state.product_description}

PREVIOUS Q&A:
{qa_context}

{candidates_context}

Your task: Generate the BEST semantic search query that will find relevant HS codes for this product.

CRITICAL RULES:
1. Focus on the ACTUAL PRODUCT, not packaging/containers
2. Use professional trade/customs terminology
3. If previous results were irrelevant, completely rewrite the query
4. Ignore user gibberish - extract the real product intent
5. For beverages in containers, focus on the beverage type

Examples:
- "lemonade in glass bottle" → "lemon flavored beverage"
- "organic pineapple juice plastic bottle" → "pineapple juice beverage"
- "hello world test" + "organic pineapple juice" → "pineapple fruit juice"

Return ONLY the semantic search query text, nothing else."""

        try:
            if self.debug:
                print(f"[DEBUG] Asking Claude to generate smart query...")
                
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            
            smart_query = response.content[0].text.strip()
            
            if self.debug:
                print(f"[DEBUG] Claude generated query: '{smart_query}'")
            
            return smart_query if smart_query else state.product_description
            
        except Exception as e:
            if self.debug:
                print(f"[DEBUG] Claude query generation failed: {e}")
            return state.product_description
    
    def _candidates_seem_relevant(self, product_description: str, candidates: List[HSCode]) -> bool:
        """Check if candidates are obviously wrong for the product"""
        if not candidates:
            return False
            
        product_lower = product_description.lower()
        
        # Define product categories and their expected HS chapter ranges
        product_indicators = {
            'food_beverage': (['juice', 'drink', 'beverage', 'lemonade', 'soda', 'water', 'coffee', 'tea'], ['20', '21', '22']),
            'electronics': (['phone', 'computer', 'device', 'electronic'], ['85', '90', '84']),
            'clothing': (['shirt', 'pants', 'clothing', 'apparel'], ['61', '62', '63']),
            'chemicals': (['chemical', 'acid', 'compound'], ['28', '29', '30'])
        }
        
        # Determine expected product category
        expected_chapters = []
        for category, (keywords, chapters) in product_indicators.items():
            if any(keyword in product_lower for keyword in keywords):
                expected_chapters.extend(chapters)
                break
        
        if not expected_chapters:
            return True  # Can't determine, assume relevant
            
        # Check if any candidates match expected chapters
        for candidate in candidates[:3]:
            candidate_chapter = candidate.code[:2] if len(candidate.code) >= 2 else ""
            if candidate_chapter in expected_chapters:
                return True
                
        return False  # No candidates match expected category

    def refine_query(self, original_query: str, top_candidates: List[HSCode]) -> str:
        """Legacy method - now just calls generate_smart_query"""
        # This is kept for compatibility but we should use generate_smart_query instead
        return original_query
    
    def _extract_question_from_response(self, response: str) -> str:
        """Extract just the question from Claude's response if it provided analysis"""
        
        # If response ends with a question mark, find the last sentence that's a question
        sentences = response.split('.')
        for sentence in reversed(sentences):
            sentence = sentence.strip()
            if sentence.endswith('?'):
                return sentence
        
        # If no question mark found, look for question patterns
        lines = response.split('\n')
        for line in reversed(lines):
            line = line.strip()
            if line.endswith('?'):
                return line
            # Look for question starters
            if any(line.lower().startswith(starter) for starter in ['what', 'which', 'how', 'do', 'are', 'is', 'does']):
                return line + "?"
        
        # If all else fails, return the last meaningful line or the whole response if short
        if len(response) < 200:
            return response
        
        # Return fallback question
        return "What is the specific characteristic that best describes your product?"
    
    def _detect_obvious_mismatch(self, original_query: str, top_candidates: List[HSCode]) -> bool:
        """Detect if top candidates are obviously unrelated to the original query"""
        if not top_candidates:
            return True  # No candidates is a mismatch
            
        # Enhanced mismatch detection
        query_lower = original_query.lower()
        
        # Check for obvious category mismatches
        beverage_terms = ['juice', 'drink', 'beverage', 'lemonade', 'soda', 'water', 'tea', 'coffee']
        electronics_terms = ['electronic', 'device', 'phone', 'computer', 'card', 'circuit']
        
        is_beverage_query = any(term in query_lower for term in beverage_terms)
        is_electronics_query = any(term in query_lower for term in electronics_terms)
        
        for candidate in top_candidates[:3]:
            desc_lower = candidate.description.lower()
            code_prefix = candidate.code[:2] if len(candidate.code) >= 2 else ""
            
            # If query is about beverages but candidates are electronics (85xx, 84xx, 95xx)
            if is_beverage_query and code_prefix in ['85', '84', '95']:
                return True
                
            # If query is about electronics but candidates are food/beverage (20xx, 21xx, 22xx)
            if is_electronics_query and code_prefix in ['20', '21', '22']:
                return True
                
            # Check for obvious keyword mismatches
            if ('card' in desc_lower or 'magnetic' in desc_lower) and any(term in query_lower for term in beverage_terms):
                return True
                
        # Original word-based check as fallback
        query_words = set(query_lower.split())
        for candidate in top_candidates[:3]:
            candidate_words = set(candidate.description.lower().split())
            common_words = query_words.intersection(candidate_words)
            meaningful_common = [word for word in common_words if len(word) > 2]
            
            if len(meaningful_common) > 0:
                return False
                
        return True
    
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

Your task: Analyze these HS code candidates and determine the best way to help the user distinguish between them.

Think through this step by step:
1. Look at the original product description - what is already clearly specified?
2. Examine the HS code candidates - what are the key differences between them?
3. Consider previous Q&A - what has already been established?
4. Decide: Is there a meaningful question that would help narrow down the candidates, or is the answer already obvious from the description?

You can think freely and provide analysis, but you MUST end your response in one of these two formats:

If a question would help:
QUESTION: [Your specific question here]

If no question is needed because the answer is obvious:
CONCLUSION: Based on [brief reason], the most likely codes are [list 2-3 specific codes]

Examples:
QUESTION: What is the sugar content percentage in your preserved mandarins?
CONCLUSION: Based on "canned" in the description, codes 2008.30.55 and 2008.30.75 are most relevant as they cover preserved mandarins."""

        if self.debug:
            print(f"[DEBUG] Sending prompt to Claude:")
            print(f"[DEBUG] {'-'*50}")
            print(prompt)
            print(f"[DEBUG] {'-'*50}")

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,  # Increased from 300 to allow complete responses
                messages=[{"role": "user", "content": prompt}]
            )
            
            raw_response = response.content[0].text.strip()
            
            # Parse the structured response
            parsed_result = self._parse_structured_response(raw_response)
            
            if self.debug:
                print(f"[DEBUG] Claude response received:")
                print(f"[DEBUG] Raw response: {raw_response}")
                print(f"[DEBUG] Parsed result: {parsed_result}")
            
            return parsed_result
        
        except Exception as e:
            print(f"Error generating question: {e}")
            if self.debug:
                print(f"[DEBUG] Exception details: {type(e).__name__}: {str(e)}")
            return {"type": "question", "content": "What is the primary intended use or application of your product?"}

    def _parse_structured_response(self, response: str) -> Dict[str, str]:
        """Parse Claude's structured response into question or conclusion with truncation handling"""
        
        # Look for QUESTION: format
        if "QUESTION:" in response:
            question_start = response.find("QUESTION:") + len("QUESTION:")
            question = response[question_start:].strip()
            
            # Check if question appears truncated (ends abruptly or is very short)
            if len(question) < 10 or not question.endswith(('?', '.', '!')):
                if self.debug:
                    print(f"[DEBUG] Detected truncated question: '{question}'")
                # Generate a fallback question based on the analysis provided
                return {"type": "question", "content": "Can you provide more specific details about your product to help distinguish between the current candidates?"}
            
            return {"type": "question", "content": question}
        
        # Look for CONCLUSION: format
        if "CONCLUSION:" in response:
            conclusion_start = response.find("CONCLUSION:") + len("CONCLUSION:")
            conclusion = response[conclusion_start:].strip()
            
            # Check if conclusion appears truncated
            if len(conclusion) < 20:
                if self.debug:
                    print(f"[DEBUG] Detected truncated conclusion: '{conclusion}'")
                return {"type": "question", "content": "What additional characteristics of your product can help narrow down the classification?"}
            
            return {"type": "conclusion", "content": conclusion}
        
        # Fallback: try to extract question from unstructured response
        question = self._extract_question_from_response(response)
        return {"type": "question", "content": question}

class HSCodeClassifier:
    """Main classifier orchestrating the iterative process"""
    
    def __init__(self, claude_api_key: str, hs_data_file: str, debug=False, embedding_file: str = None, use_cached_only: bool = False, force_recompute: bool = False):
        self.debug = debug
        self.embedding_service = HSCodeSemanticSearch(debug=debug)
        self.question_generator = ClaudeQuestionGenerator(claude_api_key, debug=debug)
        self.max_iterations = 6
        self.similarity_threshold = 0.6
        
        if self.debug:
            print(f"[DEBUG] HSCodeClassifier initialized")
            print(f"[DEBUG] Max iterations: {self.max_iterations}")
            print(f"[DEBUG] Similarity threshold: {self.similarity_threshold}")
            print(f"[DEBUG] Loading HS data from: {hs_data_file}")
        
        # Load HS code data
        self.embedding_service.load_data(hs_data_file)
        
        # Setup embeddings
        if use_cached_only and not embedding_file:
            # Try to find a cached embedding file automatically
            available_embeddings = glob.glob("hs_embeddings_*.pkl")
            if available_embeddings:
                embedding_file = available_embeddings[0]  # Use the first one found
                if self.debug:
                    print(f"[DEBUG] Auto-selected embedding file: {embedding_file}")
            else:
                print("Error: No cached embedding files found!")
                print("Available options:")
                print("1. Remove --cached-only to compute new embeddings")
                print("2. Use --list-embeddings to see available files")
                raise ValueError("No cached embeddings available")
        
        print("Setting up semantic search...")
        try:
            self.embedding_service.compute_embeddings(
                force_recompute=force_recompute,
                embedding_file=embedding_file,
                use_cached_only=use_cached_only
            )
        except ValueError as e:
            print(f"Error: {e}")
            raise
        
        print("Ready for classification!")
        
    def build_query_context(self, state: ConversationState) -> str:
        """Build enriched query context from description + Q&A history with smart deduplication"""
        
        # Start with original description
        original_words = set(state.product_description.lower().split())
        context_parts = [state.product_description]
        
        # Add unique, relevant Q&A answers
        for qa in state.qa_history:
            answer = qa['answer'].strip()
            if answer and len(answer) > 1:  # Skip very short answers
                # Only add if it provides new information
                answer_words = set(answer.lower().split())
                # Check if answer adds meaningful new terms (not just repetition)
                new_words = answer_words - original_words
                if len(new_words) > 0 and len(answer.split()) <= 10:  # Reasonable length
                    context_parts.append(answer)
                    original_words.update(answer_words)
        
        # Join with spaces for natural semantic search
        context = " ".join(context_parts)
        
        if self.debug:
            print(f"[DEBUG] build_query_context() called")
            print(f"[DEBUG] Original: '{state.product_description}'")
            print(f"[DEBUG] Q&A answers: {[qa['answer'] for qa in state.qa_history]}")
            print(f"[DEBUG] Built context: '{context}'")
            
        return context
    
    def build_smart_query(self, state: ConversationState) -> str:
        """Build a semantically smart query that prioritizes product essence over container details"""
        
        original = state.product_description.lower()
        
        # Detect product + container patterns like "X in a Y bottle/container/jar"
        import re
        container_pattern = r'\s+in\s+(a|an)\s+(glass|plastic|metal|wooden|ceramic)?\s*(bottle|jar|container|can|box|bag|package)'
        
        if re.search(container_pattern, original):
            # Extract the core product (everything before "in a")
            core_product = re.split(r'\s+in\s+(a|an)\s+', original)[0].strip()
            
            # Add relevant Q&A context that's about the product, not packaging
            product_context = []
            for qa in state.qa_history:
                answer = qa['answer'].strip().lower()
                if answer and len(answer) > 1:
                    # Skip answers that are just repetition of container info
                    if not re.search(r'\b(bottle|glass|container|jar|package|packaging)\b', answer):
                        if answer not in core_product:  # Avoid repetition
                            product_context.append(answer)
            
            # Build smart query: core product + relevant context
            if product_context:
                smart_query = f"{core_product} {' '.join(product_context[:2])}"  # Limit context
            else:
                smart_query = core_product
                
            if self.debug:
                print(f"[DEBUG] Smart query transformation:")
                print(f"[DEBUG]   Original: '{state.product_description}'")
                print(f"[DEBUG]   Detected pattern: product in container")
                print(f"[DEBUG]   Core product: '{core_product}'")
                print(f"[DEBUG]   Smart query: '{smart_query}'")
            
            return smart_query.strip()
        
        # For non-container patterns, use regular context building
        return self.build_query_context(state)
    
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
        """Display current candidates with full descriptions to avoid truncation"""
        print("Current HS Code Candidates:")
        for i, candidate in enumerate(candidates[:10], 1):
            # Show full description but break it into lines if too long
            desc = candidate.description
            if len(desc) > 100:
                # Break at word boundaries for readability
                words = desc.split()
                lines = []
                current_line = []
                current_length = 0
                
                for word in words:
                    if current_length + len(word) + 1 > 80:  # 80 chars per line
                        if current_line:
                            lines.append(" ".join(current_line))
                            current_line = [word]
                            current_length = len(word)
                        else:
                            lines.append(word)  # Single word longer than 80 chars
                            current_length = 0
                    else:
                        current_line.append(word)
                        current_length += len(word) + 1
                
                if current_line:
                    lines.append(" ".join(current_line))
                
                # Display first line on same line as number, rest indented
                print(f"{i}. {candidate.code}: {lines[0]}")
                for line in lines[1:]:
                    print(f"   {line}")
            else:
                print(f"{i}. {candidate.code}: {desc}")
                
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
            
            # Let Claude AI generate the semantic search query with full context
            claude_query = self.question_generator.generate_smart_query(state, state.current_candidates if state.iteration > 1 else None)
            
            if self.debug:
                print(f"[DEBUG] Claude-generated query: '{claude_query}'")
            
            # ALWAYS display the actual query being used for transparency
            print(f"🔍 Semantic search query: '{claude_query}'")
            
            # Try search with Claude-generated query
            state.current_candidates = self.embedding_service.search_hs_codes(
                claude_query,
                self.similarity_threshold
            )
            
            # Check if candidates are completely irrelevant (Claude already optimized the query)
            if state.current_candidates:
                candidates_relevant = self.question_generator._candidates_seem_relevant(
                    state.product_description,
                    state.current_candidates
                )
                
                if not candidates_relevant:
                    print(f"⚠️  WARNING: Search results appear completely irrelevant to '{state.product_description}'")
                    print(f"🔄 Generating new query to find better matches...")
                    
                    # Let Claude try again with focus on relevance
                    retry_query = self.question_generator.generate_smart_query(state, state.current_candidates)
                    
                    if retry_query != claude_query:
                        print(f"🔍 Retry semantic search query: '{retry_query}'")
                        retry_candidates = self.embedding_service.search_hs_codes(
                            retry_query,
                            self.similarity_threshold
                        )
                        
                        if retry_candidates:
                            retry_relevant = self.question_generator._candidates_seem_relevant(
                                state.product_description,
                                retry_candidates
                            )
                            if retry_relevant:
                                print(f"✅ Retry found {len(retry_candidates)} more relevant candidates")
                                state.current_candidates = retry_candidates
                            else:
                                print(f"❌ Retry still produced irrelevant results")
            
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
                
            # Generate next question or conclusion
            if self.debug:
                print(f"[DEBUG] Generating question/analysis for iteration {state.iteration}")
            
            claude_response = self.question_generator.generate_question(state)
            
            # Handle different response types - but NEVER allow conclusions with irrelevant candidates
            if claude_response["type"] == "conclusion":
                # Double-check that candidates are actually relevant before allowing conclusion
                candidates_relevant = self.question_generator._candidates_seem_relevant(
                    state.product_description,
                    state.current_candidates
                )
                
                if not candidates_relevant:
                    print(f"🚫 AI wanted to make a conclusion, but current candidates appear irrelevant to '{state.product_description}'")
                    print(f"Continuing with questions to find better matches...")
                    
                    # Force a question instead
                    fallback_question = f"The search results don't seem to match your product '{state.product_description}'. Can you provide more specific details or use different terminology to describe your product?"
                    print(f"Question {len(state.qa_history) + 1}: {fallback_question}")
                    
                    # Get user answer
                    answer = input("Your answer: ").strip()
                    
                    if self.debug:
                        print(f"[DEBUG] User answer: {answer}")
                    
                    # Update state
                    state.qa_history.append({
                        "question": fallback_question,
                        "answer": answer
                    })
                else:
                    print(f"\nAI Analysis: {claude_response['content']}")
                    
                    # Determine if this is a positive conclusion (recommending codes) or negative (no classification possible)
                    conclusion_text = claude_response['content'].lower()
                    
                    # Strong negative indicators - if ANY of these are present, it's a negative conclusion
                    strong_negative_indicators = [
                        'no meaningful', 'cannot', 'not a product', 'no classification', 'not describing', 'no actual product',
                        'none of the', 'not meaningfully applicable', 'proper product description is needed',
                        'system prompt rather than', 'vague and doesn\'t specify', 'doesn\'t describe any actual product',
                        'classification is not possible', 'no meaningful hs classification', 'system instruction',
                        'general knowledge question', 'conversational question', 'not a product description',
                        'asking about', 'who is', 'what is', 'when was', 'where is', 'how does', 'why does',
                        'not describing a physical product', 'information request', 'trivia question'
                    ]
                    
                    # Additional negative patterns
                    negative_patterns = [
                        'needed for accurate' in conclusion_text and 'classification' in conclusion_text,
                        'appears to be a test' in conclusion_text,
                        'system prompt' in conclusion_text,
                        'rather than a genuine product' in conclusion_text,
                        'general knowledge' in conclusion_text,
                        'information about' in conclusion_text and 'not a product' in conclusion_text,
                        'biographical' in conclusion_text or 'historical' in conclusion_text,
                        'question about' in conclusion_text and ('company' in conclusion_text or 'person' in conclusion_text)
                    ]
                    
                    has_strong_negative = any(indicator in conclusion_text for indicator in strong_negative_indicators)
                    has_negative_pattern = any(negative_patterns)
                    
                    is_positive_conclusion = not (has_strong_negative or has_negative_pattern)
                    
                    if is_positive_conclusion:
                        print("\nThe AI believes it has enough information to recommend specific codes.")
                        user_choice = input("Continue with questions (c) or accept recommendation (a)? [c/a]: ").strip().lower()
                    else:
                        print("\nThe AI has determined that classification is not possible with the current information.")
                        user_choice = input("Continue with questions (c) or start over with a new product (s)? [c/s]: ").strip().lower()
                        if user_choice == 's':
                            if self.debug:
                                print(f"[DEBUG] User chose to start over")
                            return None  # Signal to start over
                    
                    # Ask user if they want to continue with questions or accept the recommendation
                    
                    if user_choice in ['a']:  # Accept recommendation (only for positive conclusions)
                        print("Accepting AI recommendation and moving to final selection...")
                        if self.debug:
                            print(f"[DEBUG] User accepted AI recommendation - forcing convergence")
                        break
                    elif user_choice in ['s']:  # Start over (for negative conclusions)
                        if self.debug:
                            print(f"[DEBUG] User chose to start over - returning None")
                        return None
                    else:  # Continue with questions
                        print("Continuing with additional questions...")
                        # Generate a fallback question
                        fallback_question = "What additional details can you provide about your product that might help narrow down the classification?"
                        print(f"Question {len(state.qa_history) + 1}: {fallback_question}")
                        
                        # Get user answer
                        answer = input("Your answer: ").strip()
                        
                        if self.debug:
                            print(f"[DEBUG] User answer: {answer}")
                        
                        # Update state
                        state.qa_history.append({
                            "question": fallback_question,
                            "answer": answer
                        })
            
            else:  # type == "question"
                question = claude_response["content"]
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

def list_embedding_files():
    """List available embedding cache files"""
    embedding_files = glob.glob("hs_embeddings_*.pkl")
    
    if not embedding_files:
        print("No embedding cache files found in current directory.")
        return []
    
    print("\nAvailable Embedding Files:")
    print("="*50)
    
    from datetime import datetime
    
    for i, filepath in enumerate(embedding_files, 1):
        try:
            stat = os.stat(filepath)
            size_mb = stat.st_size / (1024 * 1024)
            modified_time = datetime.fromtimestamp(stat.st_mtime)
            
            print(f"{i}. {filepath}")
            print(f"   Size: {size_mb:.1f} MB")
            print(f"   Modified: {modified_time.strftime('%Y-%m-%d %H:%M:%S')}")
            print()
        except Exception as e:
            print(f"{i}. {filepath} (Error reading file info: {e})")
    
    return embedding_files

def main():
    """Main CLI entry point"""
    
    parser = argparse.ArgumentParser(description='HS Code Classification with AI-powered semantic search')
    parser.add_argument('excel_file', nargs='?', help='Path to Excel file with HS codes')
    parser.add_argument('--debug', '-d', action='store_true', help='Enable debug mode')
    parser.add_argument('--embedding-file', help='Path to specific embedding file to use')
    parser.add_argument('--cached-only', action='store_true', help='Only use cached embeddings, don\'t compute new ones')
    parser.add_argument('--recompute', action='store_true', help='Force recompute embeddings even if cached version exists')
    parser.add_argument('--list-embeddings', action='store_true', help='List available embedding cache files and exit')
    
    args = parser.parse_args()
    
    # Handle list embeddings command
    if args.list_embeddings:
        list_embedding_files()
        return
    
    # Check debug mode from args or environment
    debug = args.debug or os.getenv("DEBUG") in ["1", "true", "True", "TRUE"]
    
    if debug:
        print("[DEBUG] Debug mode enabled")
        print(f"[DEBUG] Python version: {sys.version}")
        print(f"[DEBUG] Command line args: {sys.argv}")
    
    print("HS Code Classifier")
    if debug:
        print("(Debug mode)")
    print()
    
    # Get HS data file
    if args.excel_file:
        hs_data_file = args.excel_file
    else:
        hs_data_file = input("Enter path to HS codes Excel file: ").strip()
    
    if not os.path.exists(hs_data_file):
        print(f"Error: File {hs_data_file} not found!")
        return
    
    # Get Claude API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        api_key = input("Enter your Anthropic API key: ").strip()
    
    if debug:
        print(f"[DEBUG] API key provided: {bool(api_key)}")
        print(f"[DEBUG] HS data file: {hs_data_file}")
        print(f"[DEBUG] Embedding options:")
        print(f"[DEBUG]   Specific file: {args.embedding_file}")
        print(f"[DEBUG]   Cached only: {args.cached_only}")
        print(f"[DEBUG]   Force recompute: {args.recompute}")
    
    # Show available embeddings if cached-only is specified
    if args.cached_only and not args.embedding_file:
        print("\nUsing cached-only mode. Available embedding files:")
        available = list_embedding_files()
        if not available:
            return
    
    try:
        classifier = HSCodeClassifier(
            claude_api_key=api_key,
            hs_data_file=hs_data_file,
            debug=debug,
            embedding_file=args.embedding_file,
            use_cached_only=args.cached_only,
            force_recompute=args.recompute
        )
    except Exception as e:
        print(f"Error initializing classifier: {e}")
        if debug:
            print(f"[DEBUG] Error details: {type(e).__name__}: {str(e)}")
        return
    
    # Interactive classification loop
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
    # Show help if no arguments provided
    if len(sys.argv) == 1:
        print("HS Code Classification CLI")
        print("=" * 30)
        print("Usage examples:")
        print("  python hs_classifier.py data.xlsx                    # Basic usage")
        print("  python hs_classifier.py data.xlsx --cached-only      # Use only cached embeddings")
        print("  python hs_classifier.py data.xlsx --recompute        # Force recompute embeddings")
        print("  python hs_classifier.py --embedding-file embed.pkl   # Use specific embedding file")
        print("  python hs_classifier.py --list-embeddings           # List available cached files")
        print("  python hs_classifier.py data.xlsx --debug           # Debug mode")
        print()
        print("Embedding options:")
        print("  --cached-only      : Only use cached embeddings (fastest)")
        print("  --recompute        : Force recompute embeddings (slowest)")
        print("  --embedding-file   : Use specific embedding file")
        print("  --list-embeddings  : List available embedding cache files")
        print()
        print("Dependencies: pip install anthropic pandas sentence-transformers scikit-learn openpyxl numpy")
        print()
    else:
        main()