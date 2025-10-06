#!/usr/bin/env python3
"""
Context-RAG Embedding Module
Provides semantic embeddings for text chunks using sentence-transformers
"""

import json
import sys
import hashlib
import os
from typing import List, Dict, Any
import argparse
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
except ImportError:
    print("Error: Required packages not installed. Run: pip install sentence-transformers numpy", file=sys.stderr)
    sys.exit(1)

class ContextRagEmbedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", cache_dir: str = ".context-rag/embeddings"):
        """
        Initialize the embedder with specified model
        
        Args:
            model_name: HuggingFace model name for sentence transformers
            cache_dir: Directory to cache embeddings
        """
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            print(f"Loading model: {model_name}", file=sys.stderr)
            self.model = SentenceTransformer(model_name)
            print(f"Model loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model {model_name}: {e}", file=sys.stderr)
            sys.exit(1)
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            embeddings = self.model.encode(texts, convert_to_tensor=False)
            return embeddings.tolist()
        except Exception as e:
            print(f"Error generating embeddings: {e}", file=sys.stderr)
            return []
    
    def embed_with_cache(self, text: str, cache_key: str = None) -> List[float]:
        """
        Generate embedding with caching support
        
        Args:
            text: Text to embed
            cache_key: Optional cache key, defaults to text hash
            
        Returns:
            Embedding vector
        """
        if cache_key is None:
            cache_key = hashlib.sha256(text.encode()).hexdigest()
        
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        # Check cache first
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    if cached_data.get('model') == self.model_name:
                        return cached_data['embedding']
            except Exception:
                pass  # Cache miss, continue to generate
        
        # Generate new embedding
        embedding = self.generate_embeddings([text])[0]
        
        # Save to cache
        try:
            cache_data = {
                'model': self.model_name,
                'text_hash': cache_key,
                'embedding': embedding
            }
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f)
        except Exception as e:
            print(f"Warning: Failed to cache embedding: {e}", file=sys.stderr)
        
        return embedding
    
    def embed_chunks(self, chunks_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Embed a list of document chunks
        
        Args:
            chunks_data: List of chunk dictionaries with 'content' field
            
        Returns:
            List of chunks with added 'embedding' field
        """
        texts = [chunk['content'] for chunk in chunks_data]
        embeddings = self.generate_embeddings(texts)
        
        result = []
        for chunk, embedding in zip(chunks_data, embeddings):
            chunk_with_embedding = chunk.copy()
            chunk_with_embedding['embedding'] = embedding
            result.append(chunk_with_embedding)
        
        return result

def main():
    parser = argparse.ArgumentParser(description='Context-RAG Embedding Service')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='Sentence transformer model name')
    parser.add_argument('--cache-dir', default='.context-rag/embeddings', help='Cache directory')
    parser.add_argument('--input', help='Input JSON file with chunks')
    parser.add_argument('--output', help='Output JSON file with embeddings')
    parser.add_argument('--text', help='Single text to embed (for testing)')
    
    args = parser.parse_args()
    
    embedder = ContextRagEmbedder(args.model, args.cache_dir)
    
    if args.text:
        # Single text embedding for testing
        embedding = embedder.embed_with_cache(args.text)
        result = {
            'text': args.text,
            'embedding': embedding,
            'model': args.model
        }
        print(json.dumps(result, indent=2))
        return
    
    if args.input:
        # Batch processing from file
        try:
            with open(args.input, 'r') as f:
                chunks_data = json.load(f)
            
            if isinstance(chunks_data, dict) and 'chunks' in chunks_data:
                chunks_data = chunks_data['chunks']
            
            print(f"Processing {len(chunks_data)} chunks...", file=sys.stderr)
            
            embedded_chunks = embedder.embed_chunks(chunks_data)
            
            result = {
                'model': args.model,
                'chunks': embedded_chunks,
                'total_chunks': len(embedded_chunks)
            }
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"Embeddings saved to {args.output}", file=sys.stderr)
            else:
                print(json.dumps(result, indent=2))
                
        except Exception as e:
            print(f"Error processing input file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Read from stdin
        try:
            input_data = json.loads(sys.stdin.read())
            
            if 'chunks' in input_data:
                chunks_data = input_data['chunks']
            else:
                chunks_data = input_data
            
            embedded_chunks = embedder.embed_chunks(chunks_data)
            
            result = {
                'model': args.model,
                'chunks': embedded_chunks,
                'total_chunks': len(embedded_chunks)
            }
            
            print(json.dumps(result, indent=2))
            
        except Exception as e:
            print(f"Error reading from stdin: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()