const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { ContextRagIndexer } = require('../../src/services/indexer');
const { SearchService } = require('../../src/services/search');

describe('Performance Benchmarks', () => {
  const testConfig = {
    index: {
      include: ["*.md", "*.txt", "*.js"],
      exclude: ["node_modules/", ".git/"]
    },
    embedder: {
      type: "python",
      model: "test-model"
    },
    search: {
      engine: "rust",
      top_k: 10
    },
    storage: {
      path: ".context-rag/benchmark.db"
    }
  };

  const benchmarkDir = 'benchmark-data';

  beforeEach(() => {
    // Clean up previous benchmark data
    if (fs.existsSync(benchmarkDir)) {
      fs.rmSync(benchmarkDir, { recursive: true, force: true });
    }
    
    if (fs.existsSync('.context-rag')) {
      fs.rmSync('.context-rag', { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up benchmark data
    if (fs.existsSync(benchmarkDir)) {
      fs.rmSync(benchmarkDir, { recursive: true, force: true });
    }
    
    if (fs.existsSync('.context-rag')) {
      fs.rmSync('.context-rag', { recursive: true, force: true });
    }
  });

  it('should benchmark indexing 5k lines of content', async () => {
    const fileCount = 50;
    const linesPerFile = 100;
    
    createBenchmarkFiles(fileCount, linesPerFile);
    
    const indexer = new ContextRagIndexer(testConfig);
    
    const startTime = performance.now();
    const result = await indexer.indexDirectory(benchmarkDir);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    
    console.log(`\n📊 5K Lines Benchmark:`);
    console.log(`   Files: ${result.indexed_files}`);
    console.log(`   Chunks: ${result.total_chunks}`);
    console.log(`   Processing time: ${processingTime.toFixed(2)}ms`);
    console.log(`   Lines per second: ${(fileCount * linesPerFile / (processingTime / 1000)).toFixed(0)}`);
    
    expect(result.indexed_files).toBe(fileCount);
    expect(result.total_chunks).toBeGreaterThan(0);
    expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
  }, 15000);

  it('should benchmark indexing 50k lines of content', async () => {
    const fileCount = 200;
    const linesPerFile = 250;
    
    createBenchmarkFiles(fileCount, linesPerFile);
    
    const indexer = new ContextRagIndexer(testConfig);
    
    const startTime = performance.now();
    const result = await indexer.indexDirectory(benchmarkDir);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    
    console.log(`\n📊 50K Lines Benchmark:`);
    console.log(`   Files: ${result.indexed_files}`);
    console.log(`   Chunks: ${result.total_chunks}`);
    console.log(`   Processing time: ${processingTime.toFixed(2)}ms`);
    console.log(`   Lines per second: ${(fileCount * linesPerFile / (processingTime / 1000)).toFixed(0)}`);
    
    expect(result.indexed_files).toBe(fileCount);
    expect(result.total_chunks).toBeGreaterThan(0);
    expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
  }, 35000);

  it('should benchmark indexing 100k lines of content', async () => {
    const fileCount = 500;
    const linesPerFile = 200;
    
    createBenchmarkFiles(fileCount, linesPerFile);
    
    const indexer = new ContextRagIndexer(testConfig);
    
    const startTime = performance.now();
    const result = await indexer.indexDirectory(benchmarkDir);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    
    console.log(`\n📊 100K Lines Benchmark:`);
    console.log(`   Files: ${result.indexed_files}`);
    console.log(`   Chunks: ${result.total_chunks}`);
    console.log(`   Processing time: ${processingTime.toFixed(2)}ms`);
    console.log(`   Lines per second: ${(fileCount * linesPerFile / (processingTime / 1000)).toFixed(0)}`);
    
    expect(result.indexed_files).toBe(fileCount);
    expect(result.total_chunks).toBeGreaterThan(0);
    expect(processingTime).toBeLessThan(60000); // Should complete within 60 seconds
  }, 65000);

  it('should benchmark query latency', async () => {
    // Create moderate dataset for query testing
    const fileCount = 100;
    const linesPerFile = 50;
    
    createBenchmarkFiles(fileCount, linesPerFile, true); // Include varied content
    
    const indexer = new ContextRagIndexer(testConfig);
    await indexer.indexDirectory(benchmarkDir);
    
    // Create search service and load index
    const searchService = new SearchService(testConfig);
    
    // Mock the git service methods
    searchService.gitService.getBranchCachePath = () => Promise.resolve(testConfig.storage.path);
    searchService.gitService.getEmbeddingsCachePath = () => Promise.resolve(testConfig.storage.path.replace('.db', '_embeddings.json'));
    searchService.gitService.getCurrentBranch = () => Promise.resolve('main');
    
    // Mock embedding service for consistent testing
    searchService.embeddingService.embedText = () => Promise.resolve(
      Array.from({ length: 384 }, () => Math.random())
    );
    
    await searchService.loadIndex();
    
    // Benchmark multiple queries
    const queries = [
      'machine learning algorithms',
      'web development frameworks',
      'database optimization',
      'user interface design',
      'system architecture'
    ];
    
    const queryTimes = [];
    
    for (const query of queries) {
      const startTime = performance.now();
      const results = await searchService.search(query, { topK: 10 });
      const endTime = performance.now();
      
      const queryTime = endTime - startTime;
      queryTimes.push(queryTime);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    }
    
    const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
    const maxQueryTime = Math.max(...queryTimes);
    const minQueryTime = Math.min(...queryTimes);
    
    console.log(`\n📊 Query Latency Benchmark:`);
    console.log(`   Queries tested: ${queries.length}`);
    console.log(`   Average query time: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`   Min query time: ${minQueryTime.toFixed(2)}ms`);
    console.log(`   Max query time: ${maxQueryTime.toFixed(2)}ms`);
    console.log(`   Index size: ${searchService.indexData.chunks.length} chunks`);
    
    expect(avgQueryTime).toBeLessThan(1000); // Average query should be under 1 second
    expect(maxQueryTime).toBeLessThan(2000); // No query should take more than 2 seconds
  }, 30000);

  it('should benchmark chunking performance', async () => {
    const indexer = new ContextRagIndexer(testConfig);
    
    // Test different content sizes
    const testSizes = [
      { name: 'Small (1KB)', size: 1024 },
      { name: 'Medium (10KB)', size: 10240 },
      { name: 'Large (100KB)', size: 102400 },
      { name: 'Very Large (1MB)', size: 1048576 }
    ];
    
    console.log(`\n📊 Chunking Performance Benchmark:`);
    
    for (const test of testSizes) {
      const content = 'A'.repeat(test.size);
      
      const startTime = performance.now();
      const chunks = indexer.chunkContent(content);
      const endTime = performance.now();
      
      const chunkingTime = endTime - startTime;
      const throughput = test.size / (chunkingTime / 1000); // bytes per second
      
      console.log(`   ${test.name}: ${chunks.length} chunks in ${chunkingTime.toFixed(2)}ms (${(throughput / 1024).toFixed(0)} KB/s)`);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunkingTime).toBeLessThan(1000); // Should chunk within 1 second
    }
  });

  it('should benchmark hash calculation performance', async () => {
    const indexer = new ContextRagIndexer(testConfig);
    
    const testSizes = [
      { name: 'Small (1KB)', content: 'A'.repeat(1024) },
      { name: 'Medium (10KB)', content: 'B'.repeat(10240) },
      { name: 'Large (100KB)', content: 'C'.repeat(102400) }
    ];
    
    console.log(`\n📊 Hash Calculation Benchmark:`);
    
    for (const test of testSizes) {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const hash = indexer.calculateHash(test.content);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`   ${test.name}: ${avgTime.toFixed(2)}ms per hash (${iterations} iterations)`);
      
      expect(avgTime).toBeLessThan(10); // Each hash should take less than 10ms
    }
  });

  it('should benchmark memory usage during indexing', async () => {
    const fileCount = 200;
    const linesPerFile = 100;
    
    createBenchmarkFiles(fileCount, linesPerFile);
    
    const indexer = new ContextRagIndexer(testConfig);
    
    // Measure memory before indexing
    const memBefore = process.memoryUsage();
    
    const result = await indexer.indexDirectory(benchmarkDir);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Measure memory after indexing
    const memAfter = process.memoryUsage();
    
    const memoryIncrease = {
      rss: memAfter.rss - memBefore.rss,
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal
    };
    
    console.log(`\n📊 Memory Usage Benchmark:`);
    console.log(`   Files indexed: ${result.indexed_files}`);
    console.log(`   Chunks created: ${result.total_chunks}`);
    console.log(`   RSS increase: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap used increase: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Memory per chunk: ${(memoryIncrease.heapUsed / result.total_chunks / 1024).toFixed(2)} KB`);
    
    // Memory usage should be reasonable
    expect(memoryIncrease.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    expect(memoryIncrease.heapUsed / result.total_chunks).toBeLessThan(50 * 1024); // Less than 50KB per chunk
  }, 30000);
});

// Helper function to create benchmark files
function createBenchmarkFiles(fileCount, linesPerFile, varied = false) {
  fs.mkdirSync(benchmarkDir, { recursive: true });
  
  const contentTemplates = varied ? [
    'This is content about machine learning and artificial intelligence algorithms.',
    'Web development frameworks like React, Vue, and Angular are popular choices.',
    'Database optimization techniques include indexing, query optimization, and caching.',
    'User interface design principles focus on usability and user experience.',
    'System architecture patterns include microservices, monoliths, and serverless.',
    'Software testing methodologies ensure code quality and reliability.',
    'DevOps practices streamline development and deployment processes.',
    'Cloud computing platforms provide scalable infrastructure solutions.'
  ] : [
    'This is a test line for benchmarking purposes.'
  ];
  
  for (let i = 0; i < fileCount; i++) {
    const fileName = `test-file-${i.toString().padStart(4, '0')}.md`;
    const filePath = path.join(benchmarkDir, fileName);
    
    let content = `# Test File ${i}\n\nThis is test file number ${i} for benchmarking.\n\n`;
    
    for (let j = 0; j < linesPerFile; j++) {
      const template = contentTemplates[j % contentTemplates.length];
      content += `Line ${j}: ${template} (File ${i}, Line ${j})\n`;
    }
    
    fs.writeFileSync(filePath, content);
  }
}