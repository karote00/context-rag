const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { PluginManager } = require('../src/services/plugins');

describe('Plugin Manager', () => {
  const testConfig = {
    embedder: { type: "python", model: "test-model" },
    search: { engine: "rust", top_k: 5 }
  };

  const mockResults = [
    {
      file_path: 'test1.md',
      content: 'This is about machine learning',
      similarity: 0.9,
      snippet: 'This is about machine learning...',
      chunk_index: 0
    },
    {
      file_path: 'test2.rs',
      content: 'fn main() { println!("Hello, world!"); }',
      similarity: 0.7,
      snippet: 'fn main() { println!("Hello, world!"); }',
      chunk_index: 0
    }
  ];

  let pluginManager;

  beforeEach(async () => {
    pluginManager = new PluginManager(testConfig);
    await pluginManager.loadPlugins();
  });

  it('should create plugin manager instance', () => {
    expect(pluginManager).toBeDefined();
    expect(pluginManager.config).toEqual(testConfig);
  });

  it('should load built-in transformers', () => {
    const transformers = pluginManager.listTransformers();
    
    expect(transformers.length).toBeGreaterThan(0);
    
    const transformerNames = transformers.map(t => t.name);
    expect(transformerNames).toContain('markdown');
    expect(transformerNames).toContain('summary');
    expect(transformerNames).toContain('context-extract');
    expect(transformerNames).toContain('code');
  });

  it('should register custom transformer', () => {
    const customTransformer = {
      name: 'Custom Transformer',
      description: 'A test transformer',
      transform: async (results) => ({ format: 'custom', results })
    };

    pluginManager.registerTransformer('custom', customTransformer);
    
    const transformers = pluginManager.listTransformers();
    const customFound = transformers.find(t => t.name === 'custom');
    
    expect(customFound).toBeDefined();
    expect(customFound.description).toBe('A test transformer');
  });

  it('should apply markdown transformer', async () => {
    const result = await pluginManager.transformResults(mockResults, ['markdown']);
    
    expect(result).toBeDefined();
    expect(result.format).toBe('markdown');
    expect(result.content).toContain('# Search Results');
    expect(result.content).toContain('test1.md');
    expect(result.content).toContain('machine learning');
  });

  it('should apply summary transformer', async () => {
    const result = await pluginManager.transformResults(mockResults, ['summary']);
    
    expect(result).toBeDefined();
    expect(result.format).toBe('summary');
    expect(result.overview).toBeDefined();
    expect(result.overview.total_results).toBe(2);
    expect(result.code_summary).toBeDefined();
    expect(result.top_result).toBeDefined();
  });

  it('should apply context extractor transformer', async () => {
    const contextResults = [
      ...mockResults,
      {
        file_path: '.project/architecture.md',
        content: 'System architecture overview',
        similarity: 0.95,
        snippet: 'System architecture overview...',
        chunk_index: 0,
        is_context: true,
        context_type: 'architecture'
      }
    ];

    const result = await pluginManager.transformResults(contextResults, ['context-extract']);
    
    expect(result).toBeDefined();
    expect(result.format).toBe('context-extract');
    expect(result.structured_context).toBeDefined();
    expect(result.code_context).toBeDefined();
    expect(result.structured_context.architecture).toBeDefined();
  });

  it('should apply code transformer', async () => {
    const result = await pluginManager.transformResults(mockResults, ['code']);
    
    expect(result).toBeDefined();
    expect(result.format).toBe('code');
    expect(result.files).toBeDefined();
    expect(result.metadata.languages).toContain('rust');
    expect(result.metadata.total_files).toBeGreaterThan(0);
  });

  it('should detect programming languages correctly', () => {
    expect(pluginManager.detectLanguage('js')).toBe('javascript');
    expect(pluginManager.detectLanguage('ts')).toBe('typescript');
    expect(pluginManager.detectLanguage('py')).toBe('python');
    expect(pluginManager.detectLanguage('rs')).toBe('rust');
    expect(pluginManager.detectLanguage('unknown')).toBe('text');
  });

  it('should chain multiple transformers', async () => {
    // This would apply summary first, then try to apply markdown to the summary result
    // The second transformer should handle the different input format gracefully
    const result = await pluginManager.transformResults(mockResults, ['summary', 'markdown']);
    
    expect(result).toBeDefined();
    // The final result should be from the last transformer in the chain
  });

  it('should handle transformer errors gracefully', async () => {
    const errorTransformer = {
      name: 'Error Transformer',
      description: 'A transformer that throws errors',
      transform: async () => {
        throw new Error('Test error');
      }
    };

    pluginManager.registerTransformer('error', errorTransformer);
    
    // Should not throw, but handle the error gracefully
    const result = await pluginManager.transformResults(mockResults, ['error']);
    
    // Should return original results when transformer fails
    expect(result).toEqual(mockResults);
  });

  it('should handle non-existent transformer', async () => {
    const result = await pluginManager.transformResults(mockResults, ['non-existent']);
    
    // Should return original results when transformer doesn't exist
    expect(result).toEqual(mockResults);
  });

  it('should register and list embedders', () => {
    const customEmbedder = {
      name: 'Custom Embedder',
      description: 'A test embedder',
      create: (config) => ({ embed: () => [1, 2, 3] })
    };

    pluginManager.registerEmbedder('custom', customEmbedder);
    
    const embedders = pluginManager.listEmbedders();
    const customFound = embedders.find(e => e.name === 'custom');
    
    expect(customFound).toBeDefined();
    expect(customFound.description).toBe('A test embedder');
  });

  it('should get registered embedder', () => {
    const customEmbedder = {
      name: 'Custom Embedder',
      description: 'A test embedder',
      create: (config) => ({ embed: () => [1, 2, 3] })
    };

    pluginManager.registerEmbedder('custom', customEmbedder);
    
    const retrieved = pluginManager.getEmbedder('custom');
    expect(retrieved).toBe(customEmbedder);
    
    const nonExistent = pluginManager.getEmbedder('non-existent');
    expect(nonExistent).toBeUndefined();
  });
});