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
    
    def search_hs_codes(self, query_context: str, similarity_threshold: float = 0.6, qa_history: List[Dict[str, str]] = None) -> List[HSCode]:
        """Search HS codes using semantic similarity with enhanced keyword matching and negative punishment"""
        if self.embeddings is None:
            raise ValueError("Embeddings not computed. Call compute_embeddings() first.")
        
        if self.debug:
            print(f"[DEBUG] HSCodeSemanticSearch.search_hs_codes() called")
            print(f"[DEBUG] Query context: '{query_context}'")
            print(f"[DEBUG] Similarity threshold: {similarity_threshold}")
            print(f"[DEBUG] Q&A history entries: {len(qa_history) if qa_history else 0}")
        
        self.load_model()
        
        # Store Q&A history for contradiction penalty calculation
        self._current_qa_history = qa_history or []
        
        # Encode query
        query_embedding = self.model.encode([query_context])
        
        # Compute semantic similarities
        semantic_similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        # Enhanced keyword processing with plural support and negative punishment
        query_words = self._extract_query_features(query_context.lower())
        
        for i, node in enumerate(self.leaf_nodes):
            node_text_lower = node.name.lower()
            node_path_lower = node.get_full_path().lower()
            
            # Calculate keyword boost with plural support
            keyword_boost = self._calculate_keyword_boost(query_words, node_text_lower, node_path_lower)
            
            # Calculate negative keyword punishment
            negative_penalty = self._calculate_negative_penalty(query_words, node_text_lower, node_path_lower)
            
            # NEW: Add Q&A contradiction penalty - this catches cases like cider apple contradictions
            if self._current_qa_history:
                qa_penalty = self._calculate_qa_contradiction_penalty(self._current_qa_history, node_text_lower, node_path_lower)
                negative_penalty += qa_penalty
            
            # Apply adjustments (boost capped at 0.4, penalty can be severe)
            final_score = semantic_similarities[i] + min(keyword_boost, 0.4) - negative_penalty
            # CRITICAL: Cap similarity scores to never exceed 100% (1.0) and never go below 0
            semantic_similarities[i] = max(0.0, min(1.0, final_score))
            
            if self.debug and (keyword_boost > 0 or negative_penalty > 0):
                qa_penalty_part = self._calculate_qa_contradiction_penalty(self._current_qa_history, node_text_lower, node_path_lower) if self._current_qa_history else 0
                print(f"[DEBUG] {node.code[:10]}: base={semantic_similarities[i]:.3f}, boost=+{keyword_boost:.3f}, penalty=-{negative_penalty:.3f} (qa=-{qa_penalty_part:.3f}), final={final_score:.3f}")
        
        # Clean up
        self._current_qa_history = None
        
        # Apply HARSHER filtering - require higher scores for many results
        adjusted_threshold = self._get_adaptive_threshold(semantic_similarities, similarity_threshold)
        
        # Filter by threshold and convert to HSCode objects
        results = []
        for i, score in enumerate(semantic_similarities):
            if score >= adjusted_threshold:
                node = self.leaf_nodes[i]
                hs_code = HSCode(
                    code=node.code,
                    description=node.name,
                    similarity_score=float(score)
                )
                results.append(hs_code)
        
        # Sort by similarity score (highest first)
        results = sorted(results, key=lambda x: x.similarity_score, reverse=True)
        
        # Apply harsh result filtering - if too many high-scoring results, be more selective
        results = self._apply_harsh_filtering(results, query_context)
        
        if self.debug:
            print(f"[DEBUG] Found {len(results)} codes above threshold (adjusted: {adjusted_threshold:.3f}):")
            for code in results[:5]:  # Show top 5 in debug
                print(f"[DEBUG]   {code.code}: {code.similarity_score:.3f}")
        
        return results
    
    def _extract_query_features(self, query_lower: str) -> Dict[str, List[str]]:
        """Extract positive and negative keywords from query with plural support"""
        import re
        
        words = query_lower.split()
        
        # Define negative indicators
        negative_indicators = {
            'not', 'without', 'except', 'excluding', 'no', 'non', 'anti', 'un'
        }
        
        # Technology contradictions - these should heavily penalize each other
        tech_contradictions = {
            'oled': ['lcd', 'led', 'plasma', 'crt'],
            'lcd': ['oled', 'plasma', 'crt'],
            'led': ['oled', 'lcd', 'plasma', 'crt'],
            'wireless': ['wired', 'cable', 'ethernet'],
            'wired': ['wireless', 'wifi', 'bluetooth'],
            'digital': ['analog', 'analogue'],
            'analog': ['digital'],
            'organic': ['synthetic', 'artificial'],
            'synthetic': ['organic', 'natural'],
            'automatic': ['manual'],
            'manual': ['automatic', 'auto']
        }
        
        positive_words = []
        negative_words = []
        contradiction_pairs = []
        
        for i, word in enumerate(words):
            # Clean word
            word = re.sub(r'[^\w]', '', word)
            if len(word) < 2:
                continue
                
            # Check for explicit negative indicators
            if i > 0 and words[i-1] in negative_indicators:
                negative_words.append(word)
                # Add plural forms
                negative_words.extend(self._get_plural_forms(word))
            else:
                positive_words.append(word)
                # Add plural forms
                positive_words.extend(self._get_plural_forms(word))
                
                # Check for contradictions
                if word in tech_contradictions:
                    contradiction_pairs.append((word, tech_contradictions[word]))
        
        return {
            'positive': positive_words,
            'negative': negative_words,
            'contradictions': contradiction_pairs
        }
    
    def _get_plural_forms(self, word: str) -> List[str]:
        """Generate plural/singular variants of a word"""
        variants = []
        
        # Simple plural rules
        if word.endswith('s') and len(word) > 3:
            variants.append(word[:-1])  # Remove 's'
        elif word.endswith('es') and len(word) > 4:
            variants.append(word[:-2])  # Remove 'es'
        elif word.endswith('ies') and len(word) > 5:
            variants.append(word[:-3] + 'y')  # berries -> berry
        else:
            variants.append(word + 's')  # Add 's'
            if word.endswith('y'):
                variants.append(word[:-1] + 'ies')  # berry -> berries
            if word.endswith(('sh', 'ch', 'x', 'z', 'o')):
                variants.append(word + 'es')  # box -> boxes
        
        return variants
    
    def _calculate_keyword_boost(self, query_words: Dict[str, List[str]], node_text: str, node_path: str) -> float:
        """Calculate keyword boost with plural support"""
        boost = 0.0
        
        for word in query_words['positive']:
            if len(word) > 2:
                # Exact match in name gets highest boost
                if word in node_text:
                    boost += 0.25
                # Match in path gets medium boost
                elif word in node_path:
                    boost += 0.15
                # Partial match gets small boost
                elif any(word in part for part in node_text.split()):
                    boost += 0.1
                    
        return boost
    
    def _calculate_negative_penalty(self, query_words: Dict[str, List[str]], node_text: str, node_path: str) -> float:
        """Calculate penalty for negative keywords and contradictions"""
        penalty = 0.0
        
        # Penalty for explicit negative keywords
        for word in query_words['negative']:
            if len(word) > 2:
                if word in node_text:
                    penalty += 0.4  # Heavy penalty for negative matches
                elif word in node_path:
                    penalty += 0.2
        
        # HARSH penalty for contradictions (e.g., OLED vs LCD)
        for positive_word, contradictory_words in query_words['contradictions']:
            for contradiction in contradictory_words:
                if contradiction in node_text or contradiction in node_path:
                    penalty += 0.6  # Very heavy penalty for contradictions
                    if self.debug:
                        print(f"[DEBUG] CONTRADICTION PENALTY: {positive_word} vs {contradiction} in {node_text[:50]}")
        
        return penalty
    
    def _calculate_qa_contradiction_penalty(self, qa_history: List[Dict[str, str]], node_text: str, node_path: str) -> float:
        """Calculate penalty based on Q&A history contradictions - this catches cases like cider apple example"""
        penalty = 0.0
        combined_node_text = (node_text + " " + node_path).lower()
        
        for qa in qa_history:
            question = qa['question'].lower()
            answer = qa['answer'].lower()
            
            # Detect contradictions based on Q&A patterns
            
            # Pattern 1: User said NO to something but candidate description contains it
            if ("are these" in question or "is this" in question or "do you have" in question):
                if answer in ['no', 'not', 'none', 'never']:
                    # Extract what user said no to
                    no_terms = self._extract_negated_terms(question, answer)
                    for term in no_terms:
                        if term in combined_node_text:
                            penalty += 0.8  # VERY heavy penalty for direct contradiction
                            if self.debug:
                                print(f"[DEBUG] Q&A CONTRADICTION: User said NO to '{term}' but found in '{node_text[:50]}'")
                
                # Pattern 2: User specified something specific but candidate is different
                elif "or" in question:  # e.g., "fresh apples or dried apples" -> "fresh"
                    # Extract the alternatives and what user chose
                    alternatives = self._extract_alternatives(question)
                    chosen = answer.strip()
                    rejected = [alt for alt in alternatives if alt != chosen and alt not in chosen]
                    
                    for reject in rejected:
                        if reject in combined_node_text:
                            penalty += 0.7  # Heavy penalty for choosing wrong alternative
                            if self.debug:
                                print(f"[DEBUG] ALTERNATIVE CONTRADICTION: User chose '{chosen}' over '{reject}' but found '{reject}' in '{node_text[:50]}'")
            
            # Pattern 3: User said something is NOT bulk/seasonal/etc but candidate specifies it
            if "bulk" in answer and "no" in answer:
                if "bulk" in combined_node_text:
                    penalty += 0.9  # Extremely heavy penalty
                    if self.debug:
                        print(f"[DEBUG] BULK CONTRADICTION: User said not bulk but found in '{node_text[:50]}'")
            
            # Pattern 4: User specified time period but candidate has different time period
            if "september" in combined_node_text or "december" in combined_node_text:
                if "no" in answer and ("september" in question or "december" in question):
                    penalty += 0.8  # Heavy penalty for seasonal contradiction
                    if self.debug:
                        print(f"[DEBUG] SEASONAL CONTRADICTION: User rejected seasonal but found seasonal in '{node_text[:50]}'")
            
            # Pattern 5: User specified type but candidate is different type
            if "cider" in combined_node_text:
                if "regular" in answer or "eating" in answer or ("not" in answer and "cider" in question):
                    penalty += 0.9  # Extremely heavy penalty for cider contradiction
                    if self.debug:
                        print(f"[DEBUG] CIDER CONTRADICTION: User rejected cider but found cider in '{node_text[:50]}'")
        
        return penalty
    
    def _extract_negated_terms(self, question: str, answer: str) -> List[str]:
        """Extract terms that the user said no to"""
        terms = []
        
        # Simple extraction - look for key terms in question
        question_words = question.lower().split()
        important_terms = ['bulk', 'cider', 'dried', 'seasonal', 'september', 'december', 'shipped', 'shipping']
        
        for term in important_terms:
            if term in question_words:
                terms.append(term)
        
        return terms
    
    def _extract_alternatives(self, question: str) -> List[str]:
        """Extract alternatives from questions like 'X or Y'"""
        alternatives = []
        
        if " or " in question:
            # Simple extraction - get words around "or"
            parts = question.lower().split(" or ")
            if len(parts) >= 2:
                # Extract last word of first part and first word of second part
                first_alt = parts[0].split()[-1] if parts[0].split() else ""
                second_alt = parts[1].split()[0] if parts[1].split() else ""
                
                if first_alt and len(first_alt) > 2:
                    alternatives.append(first_alt)
                if second_alt and len(second_alt) > 2:
                    alternatives.append(second_alt)
        
        return alternatives
    
    def _get_adaptive_threshold(self, similarities: np.ndarray, base_threshold: float) -> float:
        """Get adaptive threshold - be harsher when too many results have high scores"""
        high_scores = np.sum(similarities >= base_threshold)
        
        # If too many results above threshold, raise it
        if high_scores > 50:
            # Many high scores suggests the query is too generic
            return min(0.8, base_threshold + 0.2)
        elif high_scores > 20:
            return min(0.75, base_threshold + 0.1)
        else:
            return base_threshold
    
    def _apply_harsh_filtering(self, results: List[HSCode], query_context: str) -> List[HSCode]:
        """Apply harsh filtering to reduce false positives"""
        if len(results) <= 10:
            return results
        
        # If too many results, only keep the ones with significant score gaps
        if len(results) > 30:
            # Keep only results within 0.15 of the top score
            top_score = results[0].similarity_score
            filtered = [r for r in results if r.similarity_score >= (top_score - 0.15)]
            return filtered[:20]  # Max 20 results
        
        return results[:25]  # Max 25 results otherwise

class ClaudeQuestionGenerator:
    """Handles Claude API integration for question generation"""
    
    def __init__(self, api_key: str, debug=False):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.debug = debug
        self.embedding_service = None  # Will be set by HSCodeClassifier
    
    def generate_smart_query(self, state: ConversationState, current_candidates: List[HSCode] = None) -> str:
        """Let Claude AI take full control of semantic search query generation with aggressive rewriting"""
        
        # Build context for Claude to understand the situation
        qa_context = "\n".join([
            f"Q: {qa['question']}\nA: {qa['answer']}"
            for qa in state.qa_history
        ]) if state.qa_history else "None"
        
        candidates_context = ""
        relevance_status = "UNKNOWN"
        if current_candidates:
            is_relevant = self._candidates_seem_relevant(state.product_description, current_candidates)
            relevance_status = "RELEVANT" if is_relevant else "COMPLETELY IRRELEVANT"
            candidates_context = f"""

CURRENT SEARCH RESULTS ({len(current_candidates)} found):
{chr(10).join([f"- {code.code}: {code.description[:80]}..." for code in current_candidates[:5]])}

RELEVANCE ASSESSMENT: These results are {relevance_status} to the product.
{'✓ Results seem appropriate for the query.' if is_relevant else '✗ Results are completely wrong - query needs major rewrite!'}"""

        # Determine iteration context
        iteration_context = ""
        if state.iteration > 1:
            if relevance_status == "COMPLETELY IRRELEVANT":
                iteration_context = f"\n\nITERATION {state.iteration} - PREVIOUS QUERY FAILED: The previous search query produced completely irrelevant results. You MUST completely rewrite the query using different terminology."
            elif len(current_candidates or []) > 30:
                iteration_context = f"\n\nITERATION {state.iteration} - TOO MANY RESULTS: Previous query was too generic ({len(current_candidates)} results). Make the query more specific and precise."
        
        prompt = f"""You have FULL CONTROL over semantic search for HS code classification. Your query determines what results the user sees.

ORIGINAL USER INPUT: "{state.product_description}"

PREVIOUS Q&A CONTEXT:
{qa_context}
{candidates_context}
{iteration_context}

YOUR MISSION: Generate a semantic search query that will find the RIGHT HS codes for this product.

AGGRESSIVE REWRITING RULES:
1. IGNORE gibberish/test phrases - extract the REAL product
2. If user says "apple fruit" but only wants apple, use just "apple" (avoid triggering all fruits)
3. If previous results were wrong, use COMPLETELY DIFFERENT terminology
4. Focus on the CORE PRODUCT, ignore packaging/containers
5. Use precise trade terminology, not consumer language
6. If user input is vague, make educated guesses based on context

EXAMPLES OF AGGRESSIVE REWRITING:
- "hello world apple test" → "apple fruit fresh"
- "jibberish oled monitor stuff" → "oled display monitor"
- "apple fruit in container" → "apple fruit" (NOT "fruit" - that's too broad)
- "random text lcd screen" → "lcd display screen"
- "test monitor display oled thing" → "oled monitor display"

NEGATIVE KEYWORD HANDLING:
- If query mentions "oled", avoid "lcd" terms
- If query mentions "wireless", avoid "wired" terms
- Be specific to avoid contradictory results

RESULT QUALITY CONTROL:
- If this is iteration {state.iteration} and previous results were irrelevant, try a FUNDAMENTALLY different approach
- If too many results (>30), make query MORE specific
- If no results, make query LESS specific

Return ONLY the optimized semantic search query, nothing else."""

        try:
            if self.debug:
                print(f"[DEBUG] Asking Claude to generate smart query (iteration {state.iteration})...")
                
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",  # Faster model as requested
                max_tokens=150,  # Increased for more complex reasoning
                messages=[{"role": "user", "content": prompt}]
            )
            
            smart_query = response.content[0].text.strip()
            
            # Validate and clean the query
            smart_query = self._validate_and_clean_query(smart_query, state.product_description)
            
            if self.debug:
                print(f"[DEBUG] Claude generated query: '{smart_query}'")
                if smart_query != state.product_description:
                    print(f"[DEBUG] Query transformation: '{state.product_description}' → '{smart_query}'")
            
            return smart_query
            
        except Exception as e:
            if self.debug:
                print(f"[DEBUG] Claude query generation failed: {e}")
            return self._fallback_query_generation(state.product_description)
    
    def _validate_and_clean_query(self, query: str, original: str) -> str:
        """Validate and clean Claude's generated query"""
        if not query or len(query.strip()) < 3:
            return original
            
        # Remove common junk that Claude might include
        query = query.strip()
        junk_patterns = [
            r'^(query|search):\s*',
            r'^semantic search query:\s*',
            r'^optimized query:\s*',
            r'"([^"]*)"$',  # Remove quotes if entire query is quoted
        ]
        
        import re
        for pattern in junk_patterns:
            query = re.sub(pattern, r'\1' if '(' in pattern else '', query, flags=re.IGNORECASE).strip()
        
        # Ensure it's not longer than reasonable
        if len(query) > 100:
            words = query.split()
            query = ' '.join(words[:15])  # Keep first 15 words
            
        return query if query else original
    
    def _fallback_query_generation(self, original: str) -> str:
        """Generate fallback query when Claude fails"""
        # Simple fallback logic
        original_lower = original.lower()
        
        # Extract meaningful words (ignore common junk)
        junk_words = {'test', 'hello', 'world', 'example', 'demo', 'random', 'stuff', 'thing', 'jibberish', 'gibberish'}
        words = [word for word in original_lower.split() if word not in junk_words and len(word) > 2]
        
        if words:
            return ' '.join(words)
        else:
            return original
    
    def _candidates_seem_relevant(self, product_description: str, candidates: List[HSCode]) -> bool:
        """Enhanced relevance detection - check if candidates are obviously wrong for the product"""
        if not candidates:
            return False
            
        product_lower = product_description.lower()
        
        # Enhanced product categories and their expected HS chapter ranges
        product_indicators = {
            'food_beverage': (['juice', 'drink', 'beverage', 'lemonade', 'soda', 'water', 'coffee', 'tea', 'milk', 'beer', 'wine', 'alcohol'], ['20', '21', '22', '04', '19']),
            'electronics': (['phone', 'computer', 'device', 'electronic', 'monitor', 'screen', 'display', 'oled', 'lcd', 'led', 'television', 'tv', 'radio', 'camera'], ['85', '90', '84', '95']),
            'clothing_textiles': (['shirt', 'pants', 'clothing', 'apparel', 'fabric', 'textile', 'cotton', 'wool', 'garment'], ['61', '62', '63', '50', '51', '52', '53', '54', '55']),
            'chemicals': (['chemical', 'acid', 'compound', 'pharmaceutical', 'medicine', 'drug'], ['28', '29', '30', '38']),
            'machinery': (['machine', 'engine', 'motor', 'pump', 'generator', 'compressor'], ['84', '85']),
            'metals': (['steel', 'iron', 'aluminum', 'copper', 'metal', 'alloy'], ['72', '73', '74', '75', '76', '78', '79']),
            'vehicles': (['car', 'truck', 'vehicle', 'automobile', 'motorcycle', 'bicycle'], ['87', '89']),
            'furniture': (['chair', 'table', 'furniture', 'bed', 'desk', 'cabinet'], ['94']),
            'books_paper': (['book', 'paper', 'document', 'magazine', 'newspaper'], ['48', '49']),
            'toys_games': (['toy', 'game', 'puzzle', 'doll', 'ball'], ['95'])
        }
        
        # Determine expected product category
        expected_chapters = []
        matched_category = None
        for category, (keywords, chapters) in product_indicators.items():
            if any(keyword in product_lower for keyword in keywords):
                expected_chapters.extend(chapters)
                matched_category = category
                break
        
        # If we can determine the category, check for major mismatches
        if expected_chapters:
            relevant_candidates = 0
            total_checked = min(5, len(candidates))  # Check top 5
            
            for candidate in candidates[:total_checked]:
                candidate_chapter = candidate.code[:2] if len(candidate.code) >= 2 else ""
                if candidate_chapter in expected_chapters:
                    relevant_candidates += 1
            
            # Need at least 40% of top candidates to match expected category
            relevance_ratio = relevant_candidates / total_checked
            
            if self.debug:
                print(f"[DEBUG] Relevance check: {matched_category} expects chapters {expected_chapters}")
                print(f"[DEBUG] Found {relevant_candidates}/{total_checked} relevant candidates ({relevance_ratio:.2f})")
            
            return relevance_ratio >= 0.4
        
        # Advanced semantic relevance check for unclear categories
        return self._semantic_relevance_check(product_lower, candidates)
    
    def _semantic_relevance_check(self, product_lower: str, candidates: List[HSCode]) -> bool:
        """Semantic relevance check for products that don't fit clear categories"""
        
        # Extract meaningful words from product description
        product_words = set(word for word in product_lower.split()
                           if len(word) > 3 and word not in {'test', 'hello', 'world', 'example', 'demo'})
        
        if not product_words:
            return True  # If no meaningful words, assume relevant
        
        relevant_count = 0
        total_checked = min(5, len(candidates))
        
        for candidate in candidates[:total_checked]:
            candidate_desc_lower = candidate.description.lower()
            
            # Check for word overlap
            candidate_words = set(candidate_desc_lower.split())
            
            # Look for meaningful word matches
            word_matches = 0
            for product_word in product_words:
                if (product_word in candidate_desc_lower or
                    any(product_word in cand_word or cand_word in product_word
                        for cand_word in candidate_words if len(cand_word) > 3)):
                    word_matches += 1
            
            # If we find some word matches or high similarity score, consider relevant
            if word_matches > 0 or candidate.similarity_score > 0.7:
                relevant_count += 1
                
        relevance_ratio = relevant_count / total_checked
        
        if self.debug:
            print(f"[DEBUG] Semantic relevance check: {relevant_count}/{total_checked} candidates seem relevant ({relevance_ratio:.2f})")
            
        return relevance_ratio >= 0.3  # Lower threshold for semantic check

    def _format_candidate_with_full_context(self, hs_code: HSCode) -> str:
        """Format HS code with full tree context for better Claude understanding"""
        # Find the corresponding node in the tree to get full path
        candidate_node = None
        for node in self.embedding_service.leaf_nodes:
            if node.code == hs_code.code and node.name == hs_code.description:
                candidate_node = node
                break
        
        if candidate_node:
            # Get full path for context (so "Other" becomes meaningful)
            full_path = candidate_node.get_full_path()
            return f"- {hs_code.code}: {hs_code.description} (similarity: {hs_code.similarity_score:.2f})\n  └── Context: {full_path}"
        else:
            # Fallback to basic format
            return f"- {hs_code.code}: {hs_code.description} (similarity: {hs_code.similarity_score:.2f})"
    
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
        
        # Build context for Claude with FULL TREE PATH for better context
        candidates_text = "\n".join([
            self._format_candidate_with_full_context(code)
            for code in state.current_candidates[:10]  # Top 10 for context
        ])
        
        qa_history_text = "\n".join([
            f"Q: {qa['question']}\nA: {qa['answer']}"
            for qa in state.qa_history
        ])
        
        if self.debug:
            print(f"[DEBUG] Question generation - Q&A history has {len(state.qa_history)} entries:")
            for i, qa in enumerate(state.qa_history, 1):
                print(f"[DEBUG]   {i}. Q: {qa['question']}")
                print(f"[DEBUG]      A: {qa['answer']}")
        
        prompt = f"""You are helping classify a product into the correct HS (Harmonized System) code.

ORIGINAL PRODUCT DESCRIPTION: {state.product_description}

PREVIOUS QUESTIONS AND ANSWERS:
{qa_history_text if qa_history_text else "None"}

CURRENT TOP HS CODE CANDIDATES:
{candidates_text}

OBJECTIVE

Ask one short, discriminating question about a product characteristic the user actually knows (or give a confident conclusion when warranted) to reliably distinguish between the candidate HS codes.

HARD RULES (must follow)

Never ask about HS codes, chapters, classification numbers, tariff rates, customs regulations, or which HS chapter applies.

Never ask the same question twice (check qa_history_text for synonyms and answered topics).

Ask only one question per assistant message. If a multiple-choice format is appropriate, present one multiple-choice question (2–4 options).

Use plain language the user understands — prefer choices like “material,” “processing,” “use,” “size,” “packaging,” “condition,” or “origin.”

If you are confident, provide a CONCLUSION (see required output formats below). Otherwise ask a QUESTION or MULTIPLE_CHOICE.

The assistant response must end in exactly one of the required output formats (CONCLUSION / QUESTION / MULTIPLE_CHOICE) described below.

DECISION LOGIC (how to decide whether to conclude or ask)

CONCLUDE when you are >90% confident (or the top candidate’s similarity >0.90) and there are no close competitors. If top similarity is >0.85 and the second candidate’s similarity is at least 0.10 lower, concluding is acceptable.

ASK A TARGETED QUESTION when: top similarity ≤ 0.90 but > 0.70, or if two or more candidates are close and a specific distinguishing characteristic is missing.

ASK A BROAD CLARIFYING QUESTION when top similarity ≤ 0.70 or the product description is vague/missing core attributes.

When deciding what to ask, follow this micro-algorithm:

Parse qa_history_text — list topics already answered.

Parse state.product_description — list missing or ambiguous product attributes.

Compare candidates_text — identify the smallest set of characteristics that differ between candidates (material, processing, intended use, condition, packaging, or composition).

Create a single, precise question that targets that distinguishing characteristic and that a typical product-owner can answer.

QUESTION STYLE GUIDELINES

Keep it one sentence, simple, and specific.

Avoid technical measurements unless the user likely knows them (if in doubt, offer multiple-choice ranges).

If using multiple-choice: include an “I don’t know / Other” option. Limit to 2–4 options.

Never use classification jargon. Use everyday words like “metal/plastic/wood,” “fresh/dried/processed,” “for household/industrial use,” etc.

Do not combine multiple different topics into one question.

ALLOWED TOPICS TO ASK ABOUT

Material(s) (plastic, metal, fabric, wood, glass, ceramic, composite, leather, etc.)

Processing or treatment (coated, plated, painted, varnished, heat-treated, sterilized, concentrated, preserved)

Function or intended primary use (e.g., for cutting food, for packaging, for measuring)

Condition (fresh, dried, frozen, raw, cooked, processed)

Composition or ingredients and their percentages (if user can know them)

Packaging (retail packaged, bulk, individually packaged)

Origin (country/region of manufacture or growth)

Target market (consumer, industrial, medical)

Size/dimensions and weight (if relevant and likely known)

ABSOLUTELY FORBIDDEN QUESTIONS (examples)

“What HS code chapter covers this?”

“Which classification applies to your product?”

“What tariff rate applies?”

Any question phrased as “Which HS code…”, “What chapter…”, or asking the user to provide classification numbers.

Questions asking for expert customs/legal interpretation.

MULTIPLE-CHOICE RULES

Use when 2–4 clear plausible alternatives exist.

Include an “Other / I don’t know” option.

Keep each option short and mutually exclusive.

OUTPUT FORMATS (the assistant must end the message with exactly one of these)

CONCLUSION (use when >90% confident and top candidate clearly matches):
CONCLUSION: The correct HS code is [CODE] because [brief reasoning based on product characteristics and Q&A history].

QUESTION (single specific new question):
QUESTION: [Your specific NEW question here]

MULTIPLE_CHOICE (2–4 options; use when the user is more likely to choose from clear alternatives):
MULTIPLE_CHOICE: [Your NEW question here]
OPTIONS:
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option if needed; include “Other / I don’t know” when appropriate]

SHORT EXAMPLES

CONCLUSION: The correct HS code is 0808.10.80 because the description and confirmed answers indicate these are fresh apples for eating (not processed or preserved).

QUESTION: Is the product sold fresh, dried, or preserved/processed?

MULTIPLE_CHOICE: What is the product’s primary material?
OPTIONS:
A) Plastic
B) Metal
C) Textile/fabric
D) I don’t know / Other

FINAL REMINDERS

Always check qa_history_text first — do not repeat topics or synonyms.

Ask the smallest possible question that will resolve the ambiguity.

Be short, polite, and actionable."""

        if self.debug:
            print(f"[DEBUG] Sending prompt to Claude:")
            print(f"[DEBUG] {'-'*50}")
            print(prompt)
            print(f"[DEBUG] {'-'*50}")

        try:
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",  # Faster model as requested
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
            
            # Additional check: Validate that we're not asking duplicate questions
            if parsed_result.get('type') in ['question', 'multiple_choice']:
                new_question = parsed_result.get('content', '').lower()
                for qa in state.qa_history:
                    existing_question = qa['question'].lower()
                    # Check for similar questions (simple similarity check)
                    if self._questions_are_similar(new_question, existing_question):
                        if self.debug:
                            print(f"[DEBUG] WARNING: Potential duplicate question detected!")
                            print(f"[DEBUG]   New: {new_question}")
                            print(f"[DEBUG]   Existing: {existing_question}")
                        # Generate a fallback question that's definitely different
                        parsed_result = {
                            "type": "question",
                            "content": f"Can you provide any additional technical specifications or details about your {state.product_description} that might help with classification?"
                        }
                        break
            
            return parsed_result
        
        except Exception as e:
            print(f"Error generating question: {e}")
            if self.debug:
                print(f"[DEBUG] Exception details: {type(e).__name__}: {str(e)}")
            return {"type": "question", "content": "What is the primary intended use or application of your product?"}

    def _parse_structured_response(self, response: str) -> Dict[str, str]:
        """Parse Claude's structured response into conclusion, question, or multiple choice"""
        
        # Look for CONCLUSION: format (new - for confident classifications)
        if "CONCLUSION:" in response:
            conclusion_start = response.find("CONCLUSION:") + len("CONCLUSION:")
            conclusion_text = conclusion_start
            # Extract everything after CONCLUSION: up to next line or end
            conclusion_lines = response[conclusion_start:].strip().split('\n')
            conclusion = conclusion_lines[0].strip()
            
            if self.debug:
                print(f"[DEBUG] Claude provided conclusion: '{conclusion}'")
            
            return {"type": "conclusion", "content": conclusion}
        
        # Look for MULTIPLE_CHOICE: format
        if "MULTIPLE_CHOICE:" in response and "OPTIONS:" in response:
            mc_start = response.find("MULTIPLE_CHOICE:") + len("MULTIPLE_CHOICE:")
            options_start = response.find("OPTIONS:")
            
            question = response[mc_start:options_start].strip()
            options_text = response[options_start + len("OPTIONS:"):].strip()
            
            # Parse options
            options = []
            for line in options_text.split('\n'):
                line = line.strip()
                if line and (line.startswith(('A)', 'B)', 'C)', 'D)', 'E)')) or
                            line.startswith(('A.', 'B.', 'C.', 'D.', 'E.'))):
                    # Extract option text (remove A), B), etc.)
                    option_text = line[2:].strip()
                    if option_text:
                        options.append(option_text)
            
            if len(options) >= 2:  # Need at least 2 options for multiple choice
                return {
                    "type": "multiple_choice",
                    "content": question,
                    "options": options
                }
            else:
                # Fall back to regular question if options parsing failed
                return {"type": "question", "content": question if question else "What specific characteristic best describes your product?"}
        
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
        
        # Fallback: try to extract question from unstructured response
        question = self._extract_question_from_response(response)
        return {"type": "question", "content": question}
    
    def _questions_are_similar(self, question1: str, question2: str) -> bool:
        """Check if two questions are asking about similar things to prevent duplicates"""
        
        # Simple similarity check - look for common key terms
        def extract_key_terms(question):
            # Remove question words and common terms
            stop_words = {
                'what', 'how', 'which', 'where', 'when', 'why', 'who', 'is', 'are', 'do', 'does', 'can', 'could', 'would', 'should',
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'your', 'this', 'that'
            }
            terms = set()
            for word in question.lower().split():
                word = word.strip('.,?!:;')
                if len(word) > 2 and word not in stop_words:
                    terms.add(word)
            return terms
        
        terms1 = extract_key_terms(question1)
        terms2 = extract_key_terms(question2)
        
        # If there's significant overlap in key terms, they're probably similar
        if not terms1 or not terms2:
            return False
            
        overlap = len(terms1.intersection(terms2))
        min_terms = min(len(terms1), len(terms2))
        
        # If more than 50% of terms overlap, consider it similar
        similarity_ratio = overlap / min_terms if min_terms > 0 else 0
        
        return similarity_ratio > 0.5

class HSCodeClassifier:
    """Main classifier orchestrating the iterative process"""
    
    def __init__(self, claude_api_key: str, hs_data_file: str, debug=False, embedding_file: str = None, use_cached_only: bool = False, force_recompute: bool = False):
        self.debug = debug
        self.embedding_service = HSCodeSemanticSearch(debug=debug)
        self.question_generator = ClaudeQuestionGenerator(claude_api_key, debug=debug)
        # Connect the embedding service to the question generator
        self.question_generator.embedding_service = self.embedding_service
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
        """Check if we should stop iterating - STRICTER criteria to force more questioning"""
        
        if self.debug:
            print(f"[DEBUG] check_convergence() called")
            print(f"[DEBUG] Current iteration: {state.iteration}/{self.max_iterations}")
            print(f"[DEBUG] Current candidates: {len(state.current_candidates)}")
        
        # Max iterations reached
        if state.iteration >= self.max_iterations:
            if self.debug:
                print(f"[DEBUG] Convergence: Max iterations reached")
            return True
        
        # STRICTER: Only converge if we have very few candidates AND high confidence
        if len(state.current_candidates) <= 2:
            if len(state.current_candidates) == 1:
                # Single candidate needs VERY high confidence (raised from 0.85 to 0.9)
                if state.current_candidates[0].similarity_score > 0.9:
                    if self.debug:
                        print(f"[DEBUG] Convergence: Single very high-confidence candidate ({state.current_candidates[0].similarity_score:.3f})")
                    return True
            elif len(state.current_candidates) == 2:
                # Two candidates: top one must be significantly better than second
                top_score = state.current_candidates[0].similarity_score
                second_score = state.current_candidates[1].similarity_score
                if top_score > 0.85 and (top_score - second_score) > 0.2:
                    if self.debug:
                        print(f"[DEBUG] Convergence: Two candidates with clear winner ({top_score:.3f} vs {second_score:.3f})")
                    return True
        
        # REMOVED: The "stable top 3" convergence criteria - we want to keep asking questions
        # even if results are stable to get more specificity
        
        # NEW: Only converge if we have BOTH stability AND enough Q&A history
        if (prev_candidates and len(state.current_candidates) >= 3 and len(prev_candidates) >= 3 and
            len(state.qa_history) >= 3):  # Require at least 3 Q&As
            current_top3 = [c.code for c in state.current_candidates[:3]]
            prev_top3 = [c.code for c in prev_candidates[:3]]
            
            if current_top3 == prev_top3:
                # Additional check: top candidate must have good confidence
                if state.current_candidates[0].similarity_score > 0.75:
                    if self.debug:
                        print(f"[DEBUG] Convergence: Stable top 3 + enough Q&A history ({len(state.qa_history)} questions)")
                        print(f"[DEBUG] Top 3: {current_top3}")
                    return True
        
        # NEVER converge too early - force at least 2 iterations even with good results
        if state.iteration < 2:
            if self.debug:
                print(f"[DEBUG] No convergence: Forcing minimum 2 iterations (currently {state.iteration})")
            return False
        
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
                self.similarity_threshold,
                state.qa_history  # Pass Q&A history for contradiction penalty
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
                            self.similarity_threshold,
                            state.qa_history  # Pass Q&A history for contradiction penalty
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
            
            # Handle conclusions, questions, and multiple choice
            if claude_response["type"] == "conclusion":
                # Claude is confident about the classification
                conclusion_text = claude_response["content"]
                print(f"AI Analysis: {conclusion_text}")
                
                # Extract HS code from conclusion if possible
                import re
                code_match = re.search(r'\b\d{4}\.?\d{2}\.?\d{2}\b', conclusion_text)
                if code_match:
                    suggested_code = code_match.group().replace('.', '')
                    # Find the candidate with this code
                    for candidate in state.current_candidates:
                        if candidate.code.replace(' ', '').replace('.', '') == suggested_code.replace(' ', '').replace('.', ''):
                            print(f"🎯 Confident classification found!")
                            if self.debug:
                                print(f"[DEBUG] Conclusion suggests: {candidate.code}")
                            return candidate
                
                # If we can't extract the code, treat top candidate as final
                if state.current_candidates:
                    print(f"🎯 Using top candidate based on confident analysis")
                    if self.debug:
                        print(f"[DEBUG] Conclusion fallback to top candidate: {state.current_candidates[0].code}")
                    return state.current_candidates[0]
                
            elif claude_response["type"] == "multiple_choice":
                question = claude_response["content"]
                options = claude_response.get("options", [])
                
                print(f"Question {len(state.qa_history) + 1}: {question}")
                
                # Display options
                if options:
                    print("Options:")
                    for i, option in enumerate(options, 1):
                        print(f"  {chr(64+i)}) {option}")  # A), B), C), etc.
                    print()
                
                # Get user answer
                answer = input("Your answer: ").strip()
                
                if self.debug:
                    print(f"[DEBUG] User answer: {answer}")
                
                # Update state
                state.qa_history.append({
                    "question": question,
                    "answer": answer
                })
            
            else:  # type == "question" (regular question)
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