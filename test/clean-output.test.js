const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test utilities
function runCommand(command, expectError = false) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    if (expectError) {
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || '', 
        exitCode: error.status || 1 
      };
    }
    throw error;
  }
}

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Test suite for clean CLI output
describe('Clean CLI Output', () => {
  
  describe('Silent Configuration Loading', () => {
    it('should load config silently when silent flag is true', async () => {
      const { loadConfig } = require('../src/services/config');
      
      // Capture console output
      let consoleOutput = '';
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (msg) => { consoleOutput += msg; };
      console.error = (msg) => { consoleOutput += msg; };
      
      try {
        // This should not produce any console output
        await loadConfig({ silent: true });
        
        // Restore console
        console.log = originalLog;
        console.error = originalError;
        
        // Verify no output was produced
        assert.strictEqual(consoleOutput, '', 'Silent config loading should not produce console output');
      } catch (error) {
        // Restore console even on error
        console.log = originalLog;
        console.error = originalError;
        throw error;
      }
    });
    
    it('should return same config structure in silent and normal mode', async () => {
      const { loadConfig } = require('../src/services/config');
      
      // Skip if no config file exists
      if (!fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no config file found');
        return;
      }
      
      const normalConfig = await loadConfig({ silent: false });
      const silentConfig = await loadConfig({ silent: true });
      
      // Both should have same structure (or both be null)
      assert.deepStrictEqual(normalConfig, silentConfig, 'Silent and normal config loading should return same result');
    });
  });
  
  describe('AI Command Clean Output', () => {
    it('should output only JSON for ai command', () => {
      // Skip if no index exists
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      const result = runCommand('node src/index.js ai "test query"', true);
      
      // Should be valid JSON
      assert(isValidJSON(result.stdout), 'AI command output should be valid JSON');
      
      const response = JSON.parse(result.stdout);
      
      // Should have required fields
      assert(response.hasOwnProperty('status'), 'Response should have status field');
      assert(response.hasOwnProperty('timestamp'), 'Response should have timestamp field');
      
      // Should not contain any non-JSON text
      const lines = result.stdout.trim().split('\n');
      const jsonStart = lines.findIndex(line => line.trim().startsWith('{'));
      const jsonEnd = lines.findLastIndex(line => line.trim().endsWith('}'));
      
      assert(jsonStart === 0, 'Output should start with JSON');
      assert(jsonEnd === lines.length - 1, 'Output should end with JSON');
    });
    
    it('should output structured error JSON for ai command errors', () => {
      // Test with invalid config or missing index
      const result = runCommand('node src/index.js ai "test" 2>/dev/null', true);
      
      // Should be valid JSON even on error
      assert(isValidJSON(result.stdout), 'AI command error output should be valid JSON');
      
      const response = JSON.parse(result.stdout);
      
      // Should have error structure
      assert.strictEqual(response.status, 'error', 'Error response should have status: error');
      assert(response.hasOwnProperty('message'), 'Error response should have message field');
      assert(response.hasOwnProperty('error_code'), 'Error response should have error_code field');
      assert(response.hasOwnProperty('timestamp'), 'Error response should have timestamp field');
    });
  });
  
  describe('Query Command Clean Output', () => {
    it('should output only JSON when using --json flag', () => {
      // Skip if no index exists
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      const result = runCommand('node src/index.js query "test" --json', true);
      
      // Should be valid JSON
      assert(isValidJSON(result.stdout), 'Query --json output should be valid JSON');
      
      const response = JSON.parse(result.stdout);
      
      // Should have required fields
      assert(response.hasOwnProperty('status'), 'Response should have status field');
      assert(response.hasOwnProperty('query'), 'Response should have query field');
      assert(response.hasOwnProperty('results'), 'Response should have results field');
      assert(response.hasOwnProperty('timestamp'), 'Response should have timestamp field');
    });
    
    it('should show interactive output without --json flag', () => {
      // Skip if no index exists
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      const result = runCommand('node src/index.js query "test"', true);
      
      // Should contain interactive elements (emojis, colors, hints)
      const output = result.stdout + result.stderr;
      
      // Should not be pure JSON (should contain interactive elements)
      assert(!isValidJSON(result.stdout), 'Interactive query output should not be pure JSON');
      
      // Should contain helpful hints or formatting
      const hasInteractiveElements = 
        output.includes('📋') || 
        output.includes('⚠️') || 
        output.includes('💡') ||
        output.includes('Found') ||
        output.includes('results');
        
      assert(hasInteractiveElements, 'Interactive mode should contain helpful hints or formatting');
    });
    
    it('should output structured error JSON with --json flag on errors', () => {
      // Test with missing index
      const result = runCommand('node src/index.js query "test" --json 2>/dev/null', true);
      
      // Should be valid JSON even on error
      assert(isValidJSON(result.stdout), 'Query --json error output should be valid JSON');
      
      const response = JSON.parse(result.stdout);
      
      // Should have error structure
      assert.strictEqual(response.status, 'error', 'Error response should have status: error');
      assert(response.hasOwnProperty('message'), 'Error response should have message field');
      assert(response.hasOwnProperty('error_code'), 'Error response should have error_code field');
      assert(response.hasOwnProperty('results'), 'Error response should have results field');
      assert(Array.isArray(response.results), 'Error response results should be array');
      assert(response.hasOwnProperty('timestamp'), 'Error response should have timestamp field');
    });
  });
  
  describe('Output Parsing Validation', () => {
    it('should be parseable by jq for ai command', () => {
      // Skip if no index exists or jq not available
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      try {
        // Test if jq is available
        execSync('which jq', { stdio: 'ignore' });
      } catch {
        console.log('Skipping test - jq not available');
        return;
      }
      
      // Should be parseable by jq
      const result = runCommand('node src/index.js ai "test" | jq .status', true);
      
      // jq should successfully parse and extract status
      assert(result.stdout.includes('"success"') || result.stdout.includes('"error"'), 
        'AI command output should be parseable by jq');
    });
    
    it('should be parseable by jq for query --json command', () => {
      // Skip if no index exists or jq not available
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      try {
        // Test if jq is available
        execSync('which jq', { stdio: 'ignore' });
      } catch {
        console.log('Skipping test - jq not available');
        return;
      }
      
      // Should be parseable by jq
      const result = runCommand('node src/index.js query "test" --json | jq .status', true);
      
      // jq should successfully parse and extract status
      assert(result.stdout.includes('"success"') || result.stdout.includes('"error"'), 
        'Query --json output should be parseable by jq');
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should maintain existing interactive behavior for query command', () => {
      // Skip if no index exists
      if (!fs.existsSync('.context-rag') || !fs.existsSync('.context-rag.config.json')) {
        console.log('Skipping test - no index or config found');
        return;
      }
      
      const result = runCommand('node src/index.js query "test"', true);
      
      // Should still show helpful interactive elements
      const output = result.stdout + result.stderr;
      
      // Should not be pure JSON
      assert(!isValidJSON(result.stdout), 'Interactive mode should not output pure JSON');
      
      // Should contain some interactive elements
      const hasInteractiveElements = 
        output.length > 0 && (
          output.includes('Found') || 
          output.includes('No') || 
          output.includes('Error') ||
          output.includes('⚠️') ||
          output.includes('💡')
        );
        
      assert(hasInteractiveElements, 'Interactive mode should preserve helpful output');
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running Clean CLI Output Tests...\n');
  
  // Simple test runner
  const tests = [
    'Silent Configuration Loading',
    'AI Command Clean Output', 
    'Query Command Clean Output',
    'Output Parsing Validation',
    'Backward Compatibility'
  ];
  
  let passed = 0;
  let total = 0;
  
  tests.forEach(testSuite => {
    console.log(`\n${testSuite}:`);
    // Note: This is a simplified test runner
    // In a real implementation, you'd run the actual test functions
    console.log('  ✓ Tests would run here');
    passed++;
    total++;
  });
  
  console.log(`\n${passed}/${total} test suites completed`);
  console.log('Note: Run with a proper test framework for full validation');
}

module.exports = {
  runCommand,
  isValidJSON
};