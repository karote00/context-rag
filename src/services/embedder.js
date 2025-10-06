const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class EmbeddingService {
  constructor(config) {
    this.config = config;
    this.pythonPath = 'python3';
    this.embedderScript = path.join(__dirname, '../../python/embedder.py');
  }

  async checkPythonDependencies() {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, ['-c', 'import sentence_transformers; print("OK")']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  async generateEmbeddings(chunks) {
    // Check if Python dependencies are available
    const depsAvailable = await this.checkPythonDependencies();
    
    if (!depsAvailable) {
      console.log(chalk.yellow('⚠️  Python dependencies not available. Using mock embeddings.'));
      return this.generateMockEmbeddings(chunks);
    }

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [
        this.embedderScript,
        '--model', this.config.embedder.model,
        '--cache-dir', path.join('.context-rag', 'embeddings')
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result.chunks);
          } catch (error) {
            reject(new Error(`Failed to parse embedding results: ${error.message}`));
          }
        } else {
          reject(new Error(`Python embedder failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Python embedder: ${error.message}`));
      });

      // Send chunks data to Python process
      process.stdin.write(JSON.stringify({ chunks }));
      process.stdin.end();
    });
  }

  generateMockEmbeddings(chunks) {
    // Generate mock embeddings for development/testing
    console.log(chalk.gray('🔧 Generating mock embeddings (384 dimensions)'));
    
    return chunks.map(chunk => ({
      ...chunk,
      embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1) // Random values between -1 and 1
    }));
  }

  async embedText(text) {
    const depsAvailable = await this.checkPythonDependencies();
    
    if (!depsAvailable) {
      return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
    }

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [
        this.embedderScript,
        '--text', text,
        '--model', this.config.embedder.model
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result.embedding);
          } catch (error) {
            reject(new Error(`Failed to parse embedding result: ${error.message}`));
          }
        } else {
          reject(new Error(`Python embedder failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Python embedder: ${error.message}`));
      });
    });
  }
}

module.exports = { EmbeddingService };