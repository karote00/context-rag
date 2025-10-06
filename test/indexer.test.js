const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { ContextRagIndexer } = require('../src/services/indexer');

describe('Context RAG Indexer', () => {
  const testConfig = {
    index: {
      include: ["*.md", "*.txt"],
      exclude: ["node_modules/", ".git/"]
    },
    storage: {
      path: ".context-rag/test-index.db"
    }
  };

  const testDir = 'test-files';
  
  beforeEach(() => {
    // Create test directory and files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(testDir, 'test1.md'), '# Test Document\n\nThis is a test document with some content.');
    fs.writeFileSync(path.join(testDir, 'test2.txt'), 'This is a plain text file for testing.');
    fs.writeFileSync(path.join(testDir, 'ignored.js'), 'console.log("This should be ignored");');
    
    // Clean up any existing test index
    if (fs.existsSync(testConfig.storage.path)) {
      fs.unlinkSync(testConfig.storage.path);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // Clean up test index
    if (fs.existsSync(testConfig.storage.path)) {
      fs.unlinkSync(testConfig.storage.path);
    }
    
    const indexDir = path.dirname(testConfig.storage.path);
    if (fs.existsSync(indexDir)) {
      fs.rmSync(indexDir, { recursive: true, force: true });
    }
  });

  it('should create indexer instance', () => {
    const indexer = new ContextRagIndexer(testConfig);
    expect(indexer).toBeDefined();
    expect(indexer.config).toEqual(testConfig);
  });

  it('should index directory and create chunks', async () => {
    const indexer = new ContextRagIndexer(testConfig);
    const result = await indexer.indexDirectory(testDir);
    
    expect(result).toBeDefined();
    expect(result.indexed_files).toBeGreaterThan(0);
    expect(result.total_chunks).toBeGreaterThan(0);
    expect(result.processing_time_ms).toBeGreaterThan(0);
    
    // Check that index file was created
    expect(fs.existsSync(testConfig.storage.path)).toBe(true);
    
    // Verify index content
    const indexContent = fs.readFileSync(testConfig.storage.path, 'utf8');
    const indexData = JSON.parse(indexContent);
    
    expect(indexData.chunks).toBeDefined();
    expect(indexData.files).toBeDefined();
    expect(indexData.chunks.length).toBeGreaterThan(0);
  });

  it('should respect include/exclude patterns', async () => {
    const indexer = new ContextRagIndexer(testConfig);
    const result = await indexer.indexDirectory(testDir);
    
    // Should index .md and .txt files but not .js files
    const indexContent = fs.readFileSync(testConfig.storage.path, 'utf8');
    const indexData = JSON.parse(indexContent);
    
    const filePaths = Object.keys(indexData.files);
    expect(filePaths.some(p => p.includes('test1.md'))).toBe(true);
    expect(filePaths.some(p => p.includes('test2.txt'))).toBe(true);
    expect(filePaths.some(p => p.includes('ignored.js'))).toBe(false);
  });

  it('should chunk content appropriately', () => {
    const indexer = new ContextRagIndexer(testConfig);
    
    const shortContent = 'Short content';
    const shortChunks = indexer.chunkContent(shortContent);
    expect(shortChunks).toHaveLength(1);
    expect(shortChunks[0]).toBe(shortContent);
    
    const longContent = 'A'.repeat(2000); // Longer than max chunk size
    const longChunks = indexer.chunkContent(longContent);
    expect(longChunks.length).toBeGreaterThan(1);
    expect(longChunks.every(chunk => chunk.length <= 1000)).toBe(true);
  });

  it('should calculate file hashes correctly', () => {
    const indexer = new ContextRagIndexer(testConfig);
    
    const content1 = 'Test content';
    const content2 = 'Test content';
    const content3 = 'Different content';
    
    const hash1 = indexer.calculateHash(content1);
    const hash2 = indexer.calculateHash(content2);
    const hash3 = indexer.calculateHash(content3);
    
    expect(hash1).toBe(hash2); // Same content should have same hash
    expect(hash1).not.toBe(hash3); // Different content should have different hash
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Should be valid SHA-256 hex
  });

  it('should handle empty directory', async () => {
    const emptyDir = 'empty-test-dir';
    fs.mkdirSync(emptyDir, { recursive: true });
    
    try {
      const indexer = new ContextRagIndexer(testConfig);
      const result = await indexer.indexDirectory(emptyDir);
      
      expect(result.indexed_files).toBe(0);
      expect(result.total_chunks).toBe(0);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});