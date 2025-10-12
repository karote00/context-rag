#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Simple test framework
class SimpleTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name, fn, timeout = 30000) {
    this.tests.push({ name, fn, timeout });
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toMatch: (pattern) => {
        if (!pattern.test(actual)) {
          throw new Error(`Expected ${actual} to match ${pattern}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`);
        }
      }
    };
  }

  async run() {
    console.log('🧪 Running Context-RAG Performance Tests\n');
    
    for (const test of this.tests) {
      try {
        const startTime = performance.now();
        await Promise.race([
          test.fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), test.timeout)
          )
        ]);
        const endTime = performance.now();
        
        console.log(`  ✅ ${test.name} (${(endTime - startTime).toFixed(0)}ms)`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  📋 Total: ${this.tests.length}`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Global test instance
const test = new SimpleTest();
global.describe = test.describe.bind(test);
global.it = test.it.bind(test);
global.expect = test.expect.bind(test);

// Performance benchmark tests
const { ContextRagIndexer } = require('../src/services/indexer');

describe('Context-RAG Performance Benchmarks', () => {
  const testConfig = {
    index: {
      include: ["*.md", "*.txt", "*.js"],
      exclude: ["node_modules/", ".git/"]
    },
    embedder: {
      type: "python-fast",
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

  // Helper function to create benchmark files
  function createBenchmarkFiles(fileCount, linesPerFile) {
    if (fs.existsSync(benchmarkDir)) {
      fs.rmSync(benchmarkDir, { recursive: true, force: true });
    }
    fs.mkdirSync(benchmarkDir, { recursive: true });
    
    for (let i = 0; i < fileCount; i++) {
      const fileName = `test-file-${i.toString().padStart(4, '0')}.md`;
      const filePath = path.join(benchmarkDir, fileName);
      
      let content = `# Test File ${i}\n\nThis is test file number ${i} for benchmarking.\n\n`;
      
      for (let j = 0; j < linesPerFile; j++) {
        content += `Line ${j}: This is a test line for benchmarking purposes. (File ${i}, Line ${j})\n`;
      }
      
      fs.writeFileSync(filePath, content);
    }
  }

  function cleanup() {
    if (fs.existsSync(benchmarkDir)) {
      fs.rmSync(benchmarkDir, { recursive: true, force: true });
    }
    if (fs.existsSync('.context-rag')) {
      fs.rmSync('.context-rag', { recursive: true, force: true });
    }
  }

  it('should benchmark indexing 1k lines of content', async () => {
    cleanup();
    const fileCount = 10;
    const linesPerFile = 100;
    
    createBenchmarkFiles(fileCount, linesPerFile);
    
    const indexer = new ContextRagIndexer(testConfig);
    
    const startTime = performance.now();
    const result = await indexer.indexDirectory(benchmarkDir);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    
    console.log(`\n    📊 1K Lines Benchmark:`);
    console.log(`       Files: ${result.indexed_files}`);
    console.log(`       Chunks: ${result.total_chunks}`);
    console.log(`       Processing time: ${processingTime.toFixed(2)}ms`);
    console.log(`       Lines per second: ${(fileCount * linesPerFile / (processingTime / 1000)).toFixed(0)}`);
    
    expect(result.indexed_files).toBe(fileCount);
    expect(result.total_chunks).toBeGreaterThan(0);
    expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    cleanup();
  });

  it('should benchmark chunking performance', async () => {
    const indexer = new ContextRagIndexer(testConfig);
    
    const testSizes = [
      { name: 'Small (1KB)', size: 1024 },
      { name: 'Medium (10KB)', size: 10240 },
      { name: 'Large (100KB)', size: 102400 }
    ];
    
    console.log(`\n    📊 Chunking Performance Benchmark:`);
    
    for (const testCase of testSizes) {
      const content = 'A'.repeat(testCase.size);
      
      const startTime = performance.now();
      const chunks = indexer.chunkContent(content);
      const endTime = performance.now();
      
      const chunkingTime = endTime - startTime;
      const throughput = testCase.size / (chunkingTime / 1000); // bytes per second
      
      console.log(`       ${testCase.name}: ${chunks.length} chunks in ${chunkingTime.toFixed(2)}ms (${(throughput / 1024).toFixed(0)} KB/s)`);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunkingTime).toBeLessThan(1000); // Should chunk within 1 second
    }
  });

  it('should benchmark hash calculation performance', async () => {
    const crypto = require('crypto');
    
    const testSizes = [
      { name: 'Small (1KB)', content: 'A'.repeat(1024) },
      { name: 'Medium (10KB)', content: 'B'.repeat(10240) }
    ];
    
    console.log(`\n    📊 Hash Calculation Benchmark:`);
    
    for (const testCase of testSizes) {
      const iterations = 50;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const hash = crypto.createHash('sha256').update(testCase.content).digest('hex');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`       ${testCase.name}: ${avgTime.toFixed(2)}ms per hash (${iterations} iterations)`);
      
      expect(avgTime).toBeLessThan(20); // Each hash should take less than 20ms
    }
  });
});

// Run the tests
test.run().catch(console.error);