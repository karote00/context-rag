const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { promisify } = require('util');
const execAsync = promisify(exec);

class EmbeddingService {
  constructor(config) {
    this.config = config;
    this.pythonPath = 'python3';
    this.fastEmbedderScript = path.join(__dirname, '../../python/fast_embedder.py');
    this.detectedEngine = null;
  }

  /**
   * Auto-detect available embedding engines in priority order:
   * 1. Rust
   * 2. Python 
   * 3. Node.js
   */
  async detectEmbeddingEngine() {
    if (this.detectedEngine) {
      return this.detectedEngine;
    }

    console.log(chalk.blue('🔍 Auto-detecting embedding engine...'));

    // Priority 1: Check for Rust embedder
    try {
      await execAsync('cargo --version');
      // Check if our Rust embedder is compiled
      const rustEmbedderPath = path.join(__dirname, '../../target/release/context-rag-embedder');
      try {
        await execAsync(`${rustEmbedderPath} --version`);
        console.log(chalk.green('✅ Using Rust embedder'));
        this.detectedEngine = 'rust';
        return 'rust';
      } catch (error) {
        console.log(chalk.yellow('⚠️  Rust toolchain found but embedder not compiled'));
      }
    } catch (error) {
      console.log(chalk.gray('   Rust not available'));
    }

    // Priority 2: Check for Python embedder
    try {
      await execAsync('python3 --version');
      try {
        await execAsync('python3 -c "import sentence_transformers"');
        console.log(chalk.green('✅ Using Python embedder'));
        this.detectedEngine = 'python';
        return 'python';
      } catch (sentenceTransformersError) {
        // Fallback to fast embedder if sentence-transformers not available
        console.log(chalk.yellow('✅ Using fast Python embedder'));
        this.detectedEngine = 'python-fast';
        return 'python-fast';
      }
    } catch (error) {
      console.log(chalk.gray('   Python not available'));
    }

    // Priority 3: Fallback to Node.js
    console.log(chalk.yellow('⚠️  Using Node.js fallback'));
    console.log(chalk.gray('   For better results, install Python + sentence-transformers or Rust'));
    this.detectedEngine = 'nodejs';
    return 'nodejs';
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
    const engine = await this.detectEmbeddingEngine();
    
    switch (engine) {
      case 'rust':
        return await this.generateRustEmbeddings(chunks);
      case 'python':
        return await this.generateFastPythonEmbeddings(chunks);
      case 'nodejs':
        return await this.generateNodeJsEmbeddings(chunks);
      default:
        throw new Error('No embedding engine available');
    }
  }

  async generateRustEmbeddings(chunks) {
    return new Promise((resolve, reject) => {
      const rustEmbedderPath = path.join(__dirname, '../../target/release/context-rag-embedder');
      const process = spawn(rustEmbedderPath, ['--model', this.config.embedder.model], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.chunks);
          } catch (error) {
            reject(new Error(`Failed to parse Rust embedder output: ${error.message}`));
          }
        } else {
          reject(new Error(`Rust embedder failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Rust embedder: ${error.message}`));
      });

      // Send chunks to embedder
      process.stdin.write(JSON.stringify({ chunks, model: this.config.embedder.model }));
      process.stdin.end();
    });
  }

  async generateFastPythonEmbeddings(chunks) {
    console.log(chalk.gray('⚡ Generating fast Python embeddings for', chunks.length, 'chunks'));
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [
        this.fastEmbedderScript,
        '--model', 'fast-embedder'
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
            reject(new Error(`Failed to parse fast embedding results: ${error.message}`));
          }
        } else {
          reject(new Error(`Fast Python embedder failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start fast Python embedder: ${error.message}`));
      });

      // Send chunks data to Python process
      process.stdin.write(JSON.stringify({ chunks }));
      process.stdin.end();
    });
  }

  async embedTextFastPython(text) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [
        this.fastEmbedderScript,
        '--text', text,
        '--model', 'fast-embedder'
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
            reject(new Error(`Failed to parse fast embedding result: ${error.message}`));
          }
        } else {
          reject(new Error(`Fast Python embedder failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start fast Python embedder: ${error.message}`));
      });
    });
  }
  


  async generateNodeJsEmbeddings(chunks) {
    console.log(chalk.gray('📝 Generating Node.js embeddings for', chunks.length, 'chunks'));
    
    return chunks.map(chunk => ({
      ...chunk,
      embedding: this.createEnhancedEmbedding(chunk.content)
    }));
  }

  createEnhancedEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Match sentence-transformers dimension
    
    // Create keyword-based features
    const keywordFeatures = this.extractKeywordFeatures(text);
    
    // Map features to embedding dimensions
    keywordFeatures.forEach((score, keyword) => {
      const hash = this.simpleHash(keyword);
      const embeddingIndex = hash % 384;
      embedding[embeddingIndex] += score * 0.1;
    });
    
    // Add positional and structural features
    words.forEach((word, wordIndex) => {
      for (let i = 0; i < Math.min(word.length, 5); i++) {
        const charCode = word.charCodeAt(i);
        const embeddingIndex = (charCode + wordIndex * 7 + i * 13) % 384;
        embedding[embeddingIndex] += (charCode / 255.0) * 0.05;
      }
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  extractKeywordFeatures(text) {
    const features = new Map();
    const words = text.toLowerCase().split(/\s+/);
    
    // Programming keywords get higher scores
    const programmingKeywords = [
      'function', 'class', 'method', 'variable', 'const', 'let', 'var',
      'import', 'export', 'require', 'module', 'component', 'service',
      'api', 'endpoint', 'route', 'middleware', 'auth', 'database',
      'query', 'model', 'controller', 'view', 'template', 'config'
    ];
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        const score = programmingKeywords.includes(cleanWord) ? 2.0 : 1.0;
        features.set(cleanWord, (features.get(cleanWord) || 0) + score);
      }
    });
    
    return features;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  generateMockEmbeddings(chunks) {
    // Deprecated - use generateNodeJsEmbeddings instead
    return this.generateNodeJsEmbeddings(chunks);
  }

  async embedText(text) {
    const engine = await this.detectEmbeddingEngine();
    
    switch (engine) {
      case 'rust':
        return await this.embedTextRust(text);
      case 'python':
        return await this.embedTextFastPython(text);
      case 'nodejs':
        return this.createEnhancedEmbedding(text);
      default:
        throw new Error('No embedding engine available');
    }
  }

  async embedTextRust(text) {
    return new Promise((resolve, reject) => {
      const rustEmbedderPath = path.join(__dirname, '../../target/release/context-rag-embedder');
      const process = spawn(rustEmbedderPath, ['--text', text, '--model', this.config.embedder.model]);

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
            reject(new Error(`Failed to parse Rust embedding result: ${error.message}`));
          }
        } else {
          reject(new Error(`Rust embedder failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Rust embedder: ${error.message}`));
      });
    });
  }




  
  async embedTextPythonDirect(text) {
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