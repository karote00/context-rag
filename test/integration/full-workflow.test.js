const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Full Workflow Integration Tests', () => {
  const testProjectDir = 'test-project';
  const contextRagBin = path.join(__dirname, '../../bin/context-rag.js');

  beforeEach(() => {
    // Create test project structure
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(testProjectDir, { recursive: true });
    
    // Create test files
    fs.writeFileSync(
      path.join(testProjectDir, 'README.md'),
      '# Test Project\n\nThis is a test project for context-rag integration testing.\n\n## Features\n\n- Semantic search\n- Branch-aware caching\n- AI integration'
    );
    
    fs.writeFileSync(
      path.join(testProjectDir, 'docs', 'architecture.md'),
      '# Architecture\n\nThe system consists of multiple components:\n\n- Indexer: Processes files and creates chunks\n- Embedder: Generates semantic embeddings\n- Search: Performs similarity search'
    );
    
    fs.writeFileSync(
      path.join(testProjectDir, 'src', 'main.js'),
      'const express = require("express");\n\nconst app = express();\n\napp.get("/", (req, res) => {\n  res.json({ message: "Hello World" });\n});\n\napp.listen(3000);'
    );
    
    // Create project context
    fs.mkdirSync(path.join(testProjectDir, '.project'), { recursive: true });
    fs.writeFileSync(
      path.join(testProjectDir, '.project', 'architecture.md'),
      '# System Architecture\n\nThis is the structured architecture context.\n\n## Components\n\n- API Layer\n- Business Logic\n- Data Layer'
    );
    
    // Change to test project directory
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    // Return to original directory
    process.chdir('..');
    
    // Clean up test project
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should complete full init -> index -> query workflow', async () => {
    // Step 1: Initialize
    const initResult = await runCommand('node', [contextRagBin, 'init']);
    expect(initResult.code).toBe(0);
    expect(initResult.stdout).toContain('initialized successfully');
    expect(fs.existsSync('.context-rag.config.json')).toBe(true);

    // Step 2: Index
    const indexResult = await runCommand('node', [contextRagBin, 'index']);
    expect(indexResult.code).toBe(0);
    expect(indexResult.stdout).toContain('Indexing completed successfully');
    expect(fs.existsSync('.context-rag')).toBe(true);

    // Step 3: Query
    const queryResult = await runCommand('node', [contextRagBin, 'query', 'architecture', '--json']);
    expect(queryResult.code).toBe(0);
    
    const queryOutput = JSON.parse(queryResult.stdout);
    expect(queryOutput.results).toBeDefined();
    expect(queryOutput.total_results).toBeGreaterThan(0);
    expect(queryOutput.query).toBe('architecture');
  }, 30000); // 30 second timeout for integration test

  it('should detect and prioritize project context', async () => {
    // Initialize and index
    await runCommand('node', [contextRagBin, 'init']);
    const indexResult = await runCommand('node', [contextRagBin, 'index']);
    expect(indexResult.stdout).toContain('Using structured context index');

    // Query should prioritize context
    const queryResult = await runCommand('node', [contextRagBin, 'query', 'architecture', '--json']);
    const queryOutput = JSON.parse(queryResult.stdout);
    
    // Should have context results
    const contextResults = queryOutput.results.filter(r => r.is_context);
    expect(contextResults.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle status command correctly', async () => {
    // Before init
    const statusBefore = await runCommand('node', [contextRagBin, 'status', '--json']);
    expect(statusBefore.code).toBe(1); // Should fail without config

    // After init
    await runCommand('node', [contextRagBin, 'init']);
    const statusAfterInit = await runCommand('node', [contextRagBin, 'status', '--json']);
    expect(statusAfterInit.code).toBe(0);
    
    const statusData = JSON.parse(statusAfterInit.stdout);
    expect(statusData.index.cache_exists).toBe(false);

    // After index
    await runCommand('node', [contextRagBin, 'index']);
    const statusAfterIndex = await runCommand('node', [contextRagBin, 'status', '--json']);
    const finalStatusData = JSON.parse(statusAfterIndex.stdout);
    expect(finalStatusData.index.cache_exists).toBe(true);
    expect(finalStatusData.index.total_files).toBeGreaterThan(0);
  }, 30000);

  it('should handle branch operations', async () => {
    await runCommand('node', [contextRagBin, 'init']);
    await runCommand('node', [contextRagBin, 'index']);

    // Test branch status
    const branchResult = await runCommand('node', [contextRagBin, 'branch']);
    expect(branchResult.code).toBe(0);
    expect(branchResult.stdout).toContain('Current branch:');

    // Test branch list
    const branchListResult = await runCommand('node', [contextRagBin, 'branch', '--list']);
    expect(branchListResult.code).toBe(0);
  }, 30000);

  it('should handle plugins command', async () => {
    await runCommand('node', [contextRagBin, 'init']);

    const pluginsResult = await runCommand('node', [contextRagBin, 'plugins']);
    expect(pluginsResult.code).toBe(0);
    expect(pluginsResult.stdout).toContain('Plugin Manager Status');

    const pluginsListResult = await runCommand('node', [contextRagBin, 'plugins', '--list']);
    expect(pluginsListResult.code).toBe(0);
    expect(pluginsListResult.stdout).toContain('Available Transformers');
  }, 30000);

  it('should handle AI command', async () => {
    await runCommand('node', [contextRagBin, 'init']);
    await runCommand('node', [contextRagBin, 'index']);

    const aiResult = await runCommand('node', [contextRagBin, 'ai', 'architecture']);
    expect(aiResult.code).toBe(0);
    
    const aiOutput = JSON.parse(aiResult.stdout);
    expect(aiOutput.status).toBeDefined();
    expect(['success', 'no_results']).toContain(aiOutput.status);
  }, 30000);

  it('should handle query transformers', async () => {
    await runCommand('node', [contextRagBin, 'init']);
    await runCommand('node', [contextRagBin, 'index']);

    // Test markdown format
    const markdownResult = await runCommand('node', [contextRagBin, 'query', 'architecture', '--format', 'markdown']);
    expect(markdownResult.code).toBe(0);
    const markdownOutput = JSON.parse(markdownResult.stdout);
    expect(markdownOutput.format).toBe('markdown');

    // Test summary format
    const summaryResult = await runCommand('node', [contextRagBin, 'query', 'architecture', '--format', 'summary']);
    expect(summaryResult.code).toBe(0);
    const summaryOutput = JSON.parse(summaryResult.stdout);
    expect(summaryOutput.format).toBe('summary');
  }, 30000);

  it('should handle errors gracefully', async () => {
    // Query without index should fail gracefully
    const queryWithoutIndex = await runCommand('node', [contextRagBin, 'query', 'test']);
    expect(queryWithoutIndex.code).toBe(1);
    expect(queryWithoutIndex.stderr).toContain('No configuration found');

    // Invalid command should show help
    const invalidCommand = await runCommand('node', [contextRagBin, 'invalid-command']);
    expect(invalidCommand.code).toBe(1);
    expect(invalidCommand.stderr).toContain('Invalid command');
  }, 30000);
});

// Helper function to run CLI commands
function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error.message
      });
    });
  });
}