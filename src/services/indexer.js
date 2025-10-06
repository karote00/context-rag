const path = require('path');
const chalk = require('chalk');

// For now, we'll use a JavaScript implementation until Rust module is compiled
class ContextRagIndexer {
  constructor(config) {
    this.config = config;
    this.indexPath = config.storage.path;
  }

  async indexDirectory(targetPath = '.', options = {}) {
    const fs = require('fs');
    const crypto = require('crypto');
    const { performance } = require('perf_hooks');
    
    const startTime = performance.now();
    let indexedFiles = 0;
    let totalChunks = 0;

    console.log(chalk.blue('🔍 Scanning files...'));
    
    const files = await this.scanFiles(targetPath);
    console.log(chalk.gray(`Found ${files.length} files to process`));

    const indexData = {
      files: {},
      chunks: [],
      metadata: {
        created: new Date().toISOString(),
        version: '0.1.0'
      }
    };

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileHash = crypto.createHash('sha256').update(content).digest('hex');
        const stats = fs.statSync(filePath);
        
        const chunks = this.chunkContent(content);
        
        indexData.files[filePath] = {
          hash: fileHash,
          modified: stats.mtime.getTime(),
          chunks: chunks.length
        };

        chunks.forEach((chunk, index) => {
          indexData.chunks.push({
            file_path: filePath,
            content: chunk,
            chunk_index: index,
            file_hash: fileHash,
            modified_time: stats.mtime.getTime()
          });
          totalChunks++;
        });

        indexedFiles++;
        
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Skipped ${filePath}: ${error.message}`));
      }
    }

    // Save index to file
    const indexDir = path.dirname(this.indexPath);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    
    fs.writeFileSync(this.indexPath, JSON.stringify(indexData, null, 2));
    
    const processingTime = performance.now() - startTime;
    
    return {
      indexed_files: indexedFiles,
      total_chunks: totalChunks,
      processing_time_ms: Math.round(processingTime)
    };
  }

  async scanFiles(targetPath) {
    const fs = require('fs');
    const path = require('path');
    const files = [];

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (this.shouldIncludeDirectory(fullPath)) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          if (this.shouldIncludeFile(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(targetPath);
    return files;
  }

  shouldIncludeFile(filePath) {
    const { include, exclude } = this.config.index;
    
    // Check exclusions first
    for (const excludePattern of exclude) {
      if (filePath.includes(excludePattern)) {
        return false;
      }
    }
    
    // Check inclusions
    for (const includePattern of include) {
      if (includePattern.startsWith('*.')) {
        // Extension pattern
        const ext = includePattern.slice(2);
        if (filePath.endsWith(`.${ext}`)) {
          return true;
        }
      } else if (includePattern.endsWith('/')) {
        // Directory pattern
        if (filePath.includes(includePattern)) {
          return true;
        }
      } else {
        // Filename pattern
        if (filePath.includes(includePattern)) {
          return true;
        }
      }
    }
    
    return false;
  }

  shouldIncludeDirectory(dirPath) {
    const { exclude } = this.config.index;
    
    for (const excludePattern of exclude) {
      if (dirPath.includes(excludePattern)) {
        return false;
      }
    }
    
    return true;
  }

  chunkContent(content) {
    const MAX_CHUNK_SIZE = 1000;
    const chunks = [];
    let currentChunk = '';
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      currentChunk += line + '\n';
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [content];
  }
}

module.exports = { ContextRagIndexer };