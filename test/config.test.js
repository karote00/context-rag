const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { loadConfig, saveConfig } = require('../src/services/config');

describe('Configuration Service', () => {
  const testConfigPath = '.context-rag.config.test.json';
  const originalConfigPath = '.context-rag.config.json';

  beforeEach(() => {
    // Clean up any existing test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    
    // Backup original config if it exists
    if (fs.existsSync(originalConfigPath)) {
      fs.renameSync(originalConfigPath, `${originalConfigPath}.backup`);
    }
  });

  afterEach(() => {
    // Clean up test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    
    if (fs.existsSync(originalConfigPath)) {
      fs.unlinkSync(originalConfigPath);
    }
    
    // Restore original config
    if (fs.existsSync(`${originalConfigPath}.backup`)) {
      fs.renameSync(`${originalConfigPath}.backup`, originalConfigPath);
    }
  });

  it('should return null when config file does not exist', async () => {
    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it('should load valid configuration', async () => {
    const testConfig = {
      index: {
        include: ["*.md", "docs/"],
        exclude: ["node_modules/"]
      },
      embedder: {
        type: "python-fast",
        model: "test-model"
      },
      search: {
        engine: "rust",
        top_k: 5
      },
      storage: {
        type: "sqlite",
        path: ".context-rag/test.db"
      }
    };

    fs.writeFileSync(originalConfigPath, JSON.stringify(testConfig, null, 2));
    
    const config = await loadConfig();
    expect(config).toEqual(testConfig);
  });

  it('should validate required fields', async () => {
    const invalidConfig = {
      index: {
        include: ["*.md"]
        // missing exclude
      },
      // missing embedder
      search: {
        engine: "rust"
        // missing top_k is optional
      }
    };

    fs.writeFileSync(originalConfigPath, JSON.stringify(invalidConfig, null, 2));
    
    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it('should handle invalid JSON', async () => {
    fs.writeFileSync(originalConfigPath, '{ invalid json }');
    
    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it('should save configuration', async () => {
    const testConfig = {
      index: { include: ["*.md"], exclude: [] },
      embedder: { type: "python-fast", model: "test" },
      search: { engine: "rust", top_k: 3 },
      storage: { type: "sqlite", path: "test.db" }
    };

    await saveConfig(testConfig);
    
    expect(fs.existsSync(originalConfigPath)).toBe(true);
    
    const savedContent = fs.readFileSync(originalConfigPath, 'utf8');
    const savedConfig = JSON.parse(savedContent);
    
    expect(savedConfig).toEqual(testConfig);
  });
});