const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');
const fs = require('fs');
const { SearchService } = require('../src/services/search');

describe('Search Service', () => {
  const testConfig = {
    embedder: {
      type: "python",
      model: "test-model"
    },
    search: {
      engine: "rust",
      top_k: 5
    },
    storage: {
      path: ".context-rag/test-search.db"
    }
  };

  const mockIndexData = {
    files: {
      'test1.md': { hash: 'hash1', modified: Date.now(), chunks: 2 },
      'test2.md': { hash: 'hash2', modified: Date.now(), chunks: 1 }
    },
    chunks: [
      {
        file_path: 'test1.md',
        content: 'This is about machine learning algorithms',
        chunk_index: 0,
        file_hash: 'hash1',
        modified_time: Date.now(),
        embedding: Array.from({ length: 384 }, () => Math.random())
      },
      {
        file_path: 'test1.md',
        content: 'Neural networks are a subset of machine learning',
        chunk_index: 1,
        file_hash: 'hash1',
        modified_time: Date.now(),
        embedding: Array.from({ length: 384 }, () => Math.random())
      },
      {
        file_path: 'test2.md',
        content: 'This document discusses web development frameworks',
        chunk_index: 0,
        file_hash: 'hash2',
        modified_time: Date.now(),
        embedding: Array.from({ length: 384 }, () => Math.random())
      }
    ],
    metadata: {
      created: new Date().toISOString(),
      version: '0.1.0'
    }
  };

  beforeEach(() => {
    // Create test index
    const indexDir = '.context-rag';
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    
    fs.writeFileSync(testConfig.storage.path, JSON.stringify(mockIndexData, null, 2));
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfig.storage.path)) {
      fs.unlinkSync(testConfig.storage.path);
    }
    
    const indexDir = '.context-rag';
    if (fs.existsSync(indexDir)) {
      fs.rmSync(indexDir, { recursive: true, force: true });
    }
  });

  it('should create search service instance', () => {
    const searchService = new SearchService(testConfig);
    expect(searchService).toBeDefined();
    expect(searchService.config).toEqual(testConfig);
  });

  it('should load index data', async () => {
    const searchService = new SearchService(testConfig);
    
    // Mock GitService methods
    searchService.gitService.getBranchCachePath = vi.fn().mockResolvedValue(testConfig.storage.path);
    searchService.gitService.getEmbeddingsCachePath = vi.fn().mockResolvedValue(testConfig.storage.path.replace('.db', '_embeddings.json'));
    searchService.gitService.getCurrentBranch = vi.fn().mockResolvedValue('main');
    
    await searchService.loadIndex();
    
    expect(searchService.indexData).toBeDefined();
    expect(searchService.indexData.chunks).toHaveLength(3);
    expect(searchService.indexData.files).toBeDefined();
  });

  it('should calculate cosine similarity correctly', () => {
    const searchService = new SearchService(testConfig);
    
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    const vec3 = [0, 1, 0];
    
    const similarity1 = searchService.cosineSimilarity(vec1, vec2);
    const similarity2 = searchService.cosineSimilarity(vec1, vec3);
    
    expect(similarity1).toBeCloseTo(1.0, 5); // Identical vectors
    expect(similarity2).toBeCloseTo(0.0, 5); // Orthogonal vectors
  });

  it('should create meaningful snippets', () => {
    const searchService = new SearchService(testConfig);
    
    const content = 'This is a long document about machine learning. It contains information about neural networks and deep learning algorithms. The content is quite extensive and covers many topics.';
    const query = 'machine learning';
    
    const snippet = searchService.createSnippet(content, query, 100);
    
    expect(snippet).toContain('machine learning');
    expect(snippet.length).toBeLessThanOrEqual(100 + 10); // Allow some margin for ellipsis
  });

  it('should perform search with mock embeddings', async () => {
    const searchService = new SearchService(testConfig);
    
    // Mock dependencies
    searchService.gitService.getBranchCachePath = vi.fn().mockResolvedValue(testConfig.storage.path);
    searchService.gitService.getEmbeddingsCachePath = vi.fn().mockResolvedValue(testConfig.storage.path.replace('.db', '_embeddings.json'));
    searchService.gitService.getCurrentBranch = vi.fn().mockResolvedValue('main');
    
    // Mock embedding service
    searchService.embeddingService.embedText = vi.fn().mockResolvedValue(
      Array.from({ length: 384 }, () => Math.random())
    );
    
    const results = await searchService.search('machine learning', { topK: 3 });
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(3);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('file_path');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('snippet');
    }
  });

  it('should handle search with no results', async () => {
    const searchService = new SearchService(testConfig);
    
    // Mock dependencies
    searchService.gitService.getBranchCachePath = vi.fn().mockResolvedValue(testConfig.storage.path);
    searchService.gitService.getEmbeddingsCachePath = vi.fn().mockResolvedValue(testConfig.storage.path.replace('.db', '_embeddings.json'));
    searchService.gitService.getCurrentBranch = vi.fn().mockResolvedValue('main');
    
    // Mock embedding service to return very different embeddings
    searchService.embeddingService.embedText = vi.fn().mockResolvedValue(
      Array.from({ length: 384 }, () => -1) // Very different from random embeddings
    );
    
    const results = await searchService.search('completely unrelated query', { topK: 3 });
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    // Results might be empty or have very low similarity scores
  });

  it('should throw error when index not found', async () => {
    // Remove the test index
    fs.unlinkSync(testConfig.storage.path);
    
    const searchService = new SearchService(testConfig);
    searchService.gitService.getBranchCachePath = vi.fn().mockResolvedValue(testConfig.storage.path);
    
    await expect(searchService.loadIndex()).rejects.toThrow('Index not found');
  });
});