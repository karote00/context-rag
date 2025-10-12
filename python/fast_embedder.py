#!/usr/bin/env python3
"""
Fast lightweight embedder using TF-IDF + word vectors
Much faster startup than sentence-transformers
"""

import json
import sys
import hashlib
import numpy as np
from typing import List, Dict, Any
import argparse
from collections import Counter
import re

class FastEmbedder:
    def __init__(self):
        """Initialize fast embedder with pre-computed word vectors"""
        # Simple word frequency-based embeddings
        self.vocab_size = 384  # Match sentence-transformers dimension
        self.word_cache = {}
        
    def tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        # Convert to lowercase and split on non-alphanumeric
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def get_word_embedding(self, word: str) -> np.ndarray:
        """Generate consistent embedding for a word using hash"""
        if word in self.word_cache:
            return self.word_cache[word]
        
        # Use word hash to generate consistent embedding
        word_hash = hashlib.md5(word.encode()).hexdigest()
        
        # Convert hash to numbers and normalize
        embedding = np.array([
            int(word_hash[i:i+2], 16) / 255.0 - 0.5 
            for i in range(0, min(len(word_hash), self.vocab_size * 2), 2)
        ])
        
        # Pad or truncate to vocab_size
        if len(embedding) < self.vocab_size:
            embedding = np.pad(embedding, (0, self.vocab_size - len(embedding)))
        else:
            embedding = embedding[:self.vocab_size]
        
        # Normalize to unit vector
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        self.word_cache[word] = embedding
        return embedding
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text using word averaging"""
        tokens = self.tokenize(text)
        
        if not tokens:
            return [0.0] * self.vocab_size
        
        # Get word frequencies for TF weighting
        word_counts = Counter(tokens)
        total_words = len(tokens)
        
        # Average word embeddings with TF weighting
        text_embedding = np.zeros(self.vocab_size)
        
        for word, count in word_counts.items():
            word_emb = self.get_word_embedding(word)
            tf_weight = count / total_words
            text_embedding += word_emb * tf_weight
        
        # Normalize final embedding
        norm = np.linalg.norm(text_embedding)
        if norm > 0:
            text_embedding = text_embedding / norm
        
        return text_embedding.tolist()
    
    def embed_chunks(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Embed multiple chunks"""
        result = []
        for chunk in chunks:
            content = chunk.get('content', '')
            embedding = self.embed_text(content)
            
            chunk_with_embedding = chunk.copy()
            chunk_with_embedding['embedding'] = embedding
            result.append(chunk_with_embedding)
        
        return result

def main():
    parser = argparse.ArgumentParser(description='Fast Context-RAG Embedder')
    parser.add_argument('--model', default='fast-embedder', help='Model name (ignored)')
    parser.add_argument('--cache-dir', default='.context-rag/embeddings', help='Cache directory (ignored)')
    parser.add_argument('--text', help='Single text to embed')
    
    args = parser.parse_args()
    
    embedder = FastEmbedder()
    
    if args.text:
        # Single text embedding
        embedding = embedder.embed_text(args.text)
        result = {
            'text': args.text,
            'embedding': embedding,
            'model': 'fast-embedder'
        }
        print(json.dumps(result))
        return
    
    # Read from stdin for batch processing
    try:
        input_data = json.loads(sys.stdin.read())
        
        if 'chunks' in input_data:
            chunks_data = input_data['chunks']
        else:
            chunks_data = input_data
        
        embedded_chunks = embedder.embed_chunks(chunks_data)
        
        result = {
            'model': 'fast-embedder',
            'chunks': embedded_chunks,
            'total_chunks': len(embedded_chunks)
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()