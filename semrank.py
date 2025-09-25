#!/usr/bin/env python3
"""
Streamlit Web Interface for HS Code Semantic Search
Run with: streamlit run hs_search_web.py
"""

import streamlit as st
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
from typing import List, Dict, Tuple
import json
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go

# Import the HSCodeNode and HSCodeSemanticSearch from the main script
# (You'd typically put the classes in a separate module)

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
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = None
        self.tree_data = []
        self.leaf_nodes = []
        self.embeddings = None
        self.embeddings_file = None
        
    def load_model(self):
        if self.model is None:
            self.model = SentenceTransformer(self.model_name)
        
    def load_data(self, df: pd.DataFrame) -> None:
        # Clean the data
        df = df.dropna(subset=['LEVEL', 'NAME_EN'])
        df['CN_CODE'] = df['CN_CODE'].fillna('')
        df['LEVEL'] = df['LEVEL'].astype(int)
        
        # Build tree structure
        self._build_tree(df)
        self._extract_leaf_nodes()
        
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
    
    def compute_embeddings(self, embedding_file: str = None) -> None:
        self.load_model()
        
        # Use specific embedding file if provided
        if embedding_file:
            self.embeddings_file = embedding_file
        else:
            # Set up embeddings cache file based on data
            data_hash = hash(str([node.to_dict() for node in self.leaf_nodes]))
            self.embeddings_file = f"hs_embeddings_{abs(data_hash)}.pkl"
        
        if os.path.exists(self.embeddings_file):
            st.info(f"📂 Loading cached embeddings from {self.embeddings_file}")
            with open(self.embeddings_file, 'rb') as f:
                self.embeddings = pickle.load(f)
            st.success(f"✅ Loaded embeddings for {len(self.embeddings)} nodes")
            return
            
        # Prepare texts for embedding with SMART CONTEXT
        texts = []
        for node in self.leaf_nodes:
            # Get parent categories (last 2 levels for context without being too verbose)
            path_parts = node.get_full_path().split(" → ")
            key_context = " ".join(path_parts[-3:-1]) if len(path_parts) > 2 else ""
            
            # Shorter but smarter text: code + name + key parent categories
            text = f"{node.code} {node.name} {key_context}".strip()
            texts.append(text)
        
        # Compute embeddings
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.model.encode(batch_texts)
            all_embeddings.append(batch_embeddings)
            
            progress = min(i + batch_size, len(texts)) / len(texts)
            progress_bar.progress(progress)
            status_text.text(f"Computing embeddings: {min(i + batch_size, len(texts))}/{len(texts)}")
        
        self.embeddings = np.vstack(all_embeddings)
        
        # Cache the embeddings
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
        
        progress_bar.empty()
        status_text.empty()
    
    def search(self, query: str, top_k: int = 20) -> List[Tuple[Dict, float]]:
        if self.embeddings is None:
            raise ValueError("Embeddings not computed.")
        
        self.load_model()
        
        # Encode query
        query_embedding = self.model.encode([query])
        
        # Compute semantic similarities
        semantic_similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        # Apply keyword boosting for better relevance
        query_words = query.lower().split()
        
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
        
        # Get top results
        top_indices = np.argsort(semantic_similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            node = self.leaf_nodes[idx]
            score = semantic_similarities[idx]
            results.append((node.to_dict(), float(score)))
        
        return results

# Streamlit App
def main():
    st.set_page_config(
        page_title="HS Code Semantic Search",
        page_icon="🔍",
        layout="wide"
    )
    
    st.title("🔍 HS Code Semantic Search")
    st.markdown("Upload your HS codes Excel file and perform AI-powered semantic search!")
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("Configuration")
        
        model_options = {
            'all-MiniLM-L6-v2': 'Fast & Good (recommended)',
            'all-mpnet-base-v2': 'Best Quality (much slower)',
            'paraphrase-multilingual-MiniLM-L12-v2': 'Multilingual'
        }
        
        selected_model = st.selectbox(
            "Choose AI Model:",
            options=list(model_options.keys()),
            format_func=lambda x: model_options[x]
        )
        
        top_k = st.slider("Number of results:", 5, 50, 20)
        
        st.markdown("---")
        
        # Embedding file management
        st.subheader("📂 Embedding Files")
        
        # List available embedding files
        import glob
        embedding_files = glob.glob("hs_embeddings_*.pkl")
        
        if embedding_files:
            st.write(f"Found {len(embedding_files)} cached embedding files:")
            
            # Show embedding file selector
            embedding_options = ["Auto-detect (recommended)"] + embedding_files
            selected_embedding = st.selectbox(
                "Use embedding file:",
                options=embedding_options,
                help="Auto-detect will use cached embeddings if available, or compute new ones"
            )
            
            # Show file details if specific file selected
            if selected_embedding != "Auto-detect (recommended)":
                try:
                    stat = os.stat(selected_embedding)
                    size_mb = stat.st_size / (1024 * 1024)
                    st.caption(f"📊 Size: {size_mb:.1f} MB")
                except:
                    pass
        else:
            st.info("No cached embedding files found")
            selected_embedding = "Auto-detect (recommended)"
        
        st.markdown("---")
        st.markdown("### About")
        st.markdown("This tool uses AI to find semantically similar HS codes based on meaning, not just keywords.")
        
        st.markdown("### Example Queries")
        st.markdown("- 'red shirt'")
        st.markdown("- 'electronic devices'") 
        st.markdown("- 'wooden furniture'")
        st.markdown("- 'dairy products'")
    
    # Initialize session state
    if 'search_system' not in st.session_state:
        st.session_state.search_system = None
        st.session_state.data_loaded = False
    
    # File upload
    uploaded_file = st.file_uploader(
        "Upload HS Codes Excel File",
        type=['xlsx', 'xls'],
        help="Upload your Excel file containing HS codes with LEVEL, CN_CODE, and NAME_EN columns"
    )
    
    if uploaded_file is not None:
        try:
            # Load data
            df = pd.read_excel(uploaded_file)
            
            # Validate required columns
            required_cols = ['LEVEL', 'NAME_EN']
            missing_cols = [col for col in required_cols if col not in df.columns]
            
            if missing_cols:
                st.error(f"Missing required columns: {missing_cols}")
                return
            
            # Display data info
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Entries", len(df))
            with col2:
                st.metric("Levels", df['LEVEL'].nunique())
            with col3:
                valid_entries = df.dropna(subset=['LEVEL', 'NAME_EN'])
                st.metric("Valid Entries", len(valid_entries))
            
            # Initialize search system
            if not st.session_state.data_loaded or st.session_state.search_system is None:
                with st.spinner("Loading data and building tree structure..."):
                    st.session_state.search_system = HSCodeSemanticSearch(selected_model)
                    st.session_state.search_system.load_data(df)
                    st.session_state.data_loaded = True
                
                st.success(f"✅ Loaded {len(st.session_state.search_system.leaf_nodes)} leaf nodes")
            
            # Compute embeddings
            if st.session_state.search_system.embeddings is None:
                st.info("💡 Embeddings need to be computed before you can search")
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("🚀 Compute AI Embeddings", type="primary"):
                        embedding_file = None if selected_embedding == "Auto-detect (recommended)" else selected_embedding
                        
                        with st.spinner("Computing embeddings... This may take a few minutes..."):
                            st.session_state.search_system.compute_embeddings(embedding_file)
                        st.success("✅ Embeddings computed successfully!")
                        st.rerun()
                
                with col2:
                    if st.button("🔄 Force Recompute", help="Ignore cached embeddings and compute fresh ones"):
                        # Clear existing embeddings to force recomputation
                        st.session_state.search_system.embeddings = None
                        embedding_file = None if selected_embedding == "Auto-detect (recommended)" else selected_embedding
                        
                        with st.spinner("Recomputing embeddings from scratch..."):
                            st.session_state.search_system.compute_embeddings(embedding_file)
                        st.success("✅ Fresh embeddings computed successfully!")
                        st.rerun()
            else:
                # Show current embedding info
                st.success(f"✅ Embeddings loaded! Shape: {st.session_state.search_system.embeddings.shape}")
                if hasattr(st.session_state.search_system, 'embeddings_file') and st.session_state.search_system.embeddings_file:
                    st.caption(f"📂 Using: {st.session_state.search_system.embeddings_file}")
                
                if st.button("🔄 Recompute Embeddings"):
                    st.session_state.search_system.embeddings = None
                    st.rerun()
            
            # Search interface
            if st.session_state.search_system.embeddings is not None:
                st.markdown("---")
                st.header("🔍 Semantic Search")
                
                # Search input
                query = st.text_input(
                    "Enter your search query:",
                    placeholder="e.g., 'red shirt', 'electronic devices', 'wooden furniture'",
                    help="Describe what you're looking for in natural language"
                )
                
                if query:
                    with st.spinner("Searching..."):
                        results = st.session_state.search_system.search(query, top_k)
                    
                    if results:
                        st.subheader(f"🎯 Search Results for '{query}'")
                        
                        # Create results dataframe
                        results_data = []
                        for i, (node_data, score) in enumerate(results, 1):
                            results_data.append({
                                'Rank': i,
                                'Code': node_data['code'],
                                'Name': node_data['name'],
                                'Similarity': f"{score*100:.1f}%",
                                'Level': node_data['level'],
                                'Path': node_data['path']
                            })
                        
                        results_df = pd.DataFrame(results_data)
                        
                        # Display results
                        for i, (node_data, score) in enumerate(results[:10], 1):  # Show top 10 prominently
                            with st.container():
                                col1, col2 = st.columns([1, 6])
                                with col1:
                                    percentage = score * 100
                                    color = "🟢" if percentage >= 70 else "🟡" if percentage >= 50 else "🔴"
                                    st.metric(f"#{i}", f"{percentage:.1f}%", label_visibility="collapsed")
                                
                                with col2:
                                    st.markdown(f"**[{node_data['code']}]** {node_data['name']}")
                                    st.caption(f"Level {node_data['level']} • {node_data['path']}")
                                
                                st.markdown("---")
                        
                        # Show all results in expandable table
                        if len(results) > 10:
                            with st.expander(f"Show all {len(results)} results"):
                                st.dataframe(results_df, use_container_width=True)
                        
                        # Visualization
                        st.subheader("📊 Results Visualization")
                        
                        # Similarity distribution
                        similarities = [score * 100 for _, score in results]
                        fig = px.bar(
                            x=list(range(1, len(similarities) + 1)),
                            y=similarities,
                            title="Similarity Scores",
                            labels={'x': 'Rank', 'y': 'Similarity %'}
                        )
                        fig.update_traces(marker_color='lightblue')
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # Download results
                        results_json = {
                            'query': query,
                            'timestamp': datetime.now().isoformat(),
                            'results': results_data
                        }
                        
                        st.download_button(
                            label="📥 Download Results (JSON)",
                            data=json.dumps(results_json, indent=2),
                            file_name=f"hs_search_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                            mime="application/json"
                        )
            else:
                st.info("👆 Click 'Compute AI Embeddings' button above to enable semantic search")
                
        except Exception as e:
            st.error(f"Error processing file: {str(e)}")
    else:
        st.info("👆 Please upload your HS codes Excel file to get started")

if __name__ == "__main__":
    main()