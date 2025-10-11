const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Project context indexer for main branch
 * Indexes stable project knowledge: docs, architecture, project overview
 */
class ProjectContextIndexer {
  constructor(config = {}) {
    this.config = config;
  }
  
  /**
   * Index project context files for main branch
   * @returns {Object} Indexing results
   */
  async indexProjectContext() {
    console.log(chalk.blue('📚 Indexing project context (main branch)...'));
    
    const startTime = Date.now();
    
    // Get context paths from config
    const contextPaths = this.getContextPaths();
    const contextFiles = await this.discoverContextFiles(contextPaths);
    
    if (contextFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No project context files found'));
      console.log(chalk.gray('Consider adding docs/, .project/, README.md'));
      return this.createEmptyResult();
    }
    
    // Process context files
    const indexResult = await this.processContextFiles(contextFiles);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(chalk.green(`✅ Project context indexing completed in ${processingTime}ms`));
    
    return {
      ...indexResult,
      context_type: 'project_context',
      processing_time_ms: processingTime
    };
  }
  
  /**
   * Get context paths from config
   */
  getContextPaths() {
    if (this.config.context && this.config.context.include) {
      return this.config.context.include;
    }
    
    // Default project context paths
    return [
      '.project/',
      'docs/',
      'README.md',
      'ARCHITECTURE.md'
    ];
  }
  
  /**
   * Discover context files in specified paths
   */
  async discoverContextFiles(contextPaths) {
    const files = [];
    
    for (const contextPath of contextPaths) {
      if (fs.existsSync(contextPath)) {
        const stat = fs.statSync(contextPath);
        
        if (stat.isDirectory()) {
          const dirFiles = await this.scanDirectory(contextPath);
          files.push(...dirFiles);
        } else if (stat.isFile() && this.isContextFile(contextPath)) {
          files.push({
            path: contextPath,
            name: path.basename(contextPath),
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
    
    return files;
  }
  
  /**
   * Scan directory for context files
   */
  async scanDirectory(dirPath) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.shouldExclude(entry.name)) continue;
          
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isContextFile(entry.name)) {
          files.push({
            path: fullPath,
            name: entry.name,
            size: fs.statSync(fullPath).size,
            modified: fs.statSync(fullPath).mtime
          });
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not scan directory ${dirPath}: ${error.message}`));
    }
    
    return files;
  }
  
  /**
   * Check if file should be excluded
   */
  shouldExclude(fileName) {
    const excludePatterns = this.config.context?.exclude || [
      'node_modules',
      '.git',
      'dist',
      'build'
    ];
    
    return excludePatterns.some(pattern => 
      fileName.includes(pattern.replace('*', ''))
    );
  }
  
  /**
   * Check if file is a context file
   */
  isContextFile(fileName) {
    if (this.shouldExclude(fileName)) return false;
    
    const ext = path.extname(fileName).toLowerCase();
    const contextExtensions = ['.md', '.txt', '.yaml', '.yml', '.json'];
    
    return contextExtensions.includes(ext);
  }
  
  /**
   * Process context files into chunks
   */
  async processContextFiles(contextFiles) {
    const chunks = [];
    const processedFiles = [];
    let totalChunks = 0;
    
    console.log(chalk.blue(`📄 Processing ${contextFiles.length} project context files...`));
    
    for (const file of contextFiles) {
      try {
        const fileChunks = await this.processContextFile(file);
        chunks.push(...fileChunks);
        totalChunks += fileChunks.length;
        
        processedFiles.push({
          path: file.path,
          chunks: fileChunks.length,
          size: file.size
        });
        
        console.log(chalk.gray(`   📝 ${file.path} → ${fileChunks.length} chunks`));
        
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not process ${file.path}: ${error.message}`));
      }
    }
    
    // Create index structure
    const indexData = {
      metadata: {
        created: new Date().toISOString(),
        version: '0.2.0',
        context_type: 'project_context',
        total_files: processedFiles.length,
        total_chunks: totalChunks
      },
      chunks: chunks,
      files: processedFiles
    };
    
    return {
      indexed_files: processedFiles.length,
      total_chunks: totalChunks,
      index_data: indexData
    };
  }
  
  /**
   * Process a single context file
   */
  async processContextFile(fileInfo) {
    try {
      const content = fs.readFileSync(fileInfo.path, 'utf8');
      return this.chunkContent(content, fileInfo);
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read file ${fileInfo.path}: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Chunk content into searchable pieces
   */
  chunkContent(content, fileInfo) {
    const chunks = [];
    
    // Split by major sections (## headers)
    const sections = content.split(/^## /m);
    
    for (let i = 0; i < sections.length; i++) {
      const section = i === 0 ? sections[i] : '## ' + sections[i];
      
      if (section.trim().length > 50) {
        chunks.push(this.createChunk(section, fileInfo, i));
      }
    }
    
    // If no sections, chunk by paragraphs
    if (chunks.length === 0) {
      chunks.push(...this.chunkByParagraphs(content, fileInfo));
    }
    
    return chunks;
  }
  
  /**
   * Chunk by paragraphs
   */
  chunkByParagraphs(content, fileInfo) {
    const chunks = [];
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      if (trimmedParagraph.length === 0) continue;
      
      if (currentChunk.length > 0 && (currentChunk.length + trimmedParagraph.length) > 1000) {
        chunks.push(this.createChunk(currentChunk, fileInfo, chunkIndex));
        currentChunk = trimmedParagraph;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk, fileInfo, chunkIndex));
    }
    
    return chunks;
  }
  
  /**
   * Create a chunk object
   */
  createChunk(content, fileInfo, chunkIndex) {
    const snippet = this.generateSnippet(content);
    
    return {
      file_path: fileInfo.path,
      content: content.trim(),
      snippet: snippet,
      chunk_index: chunkIndex,
      source_type: 'project-context',
      is_context: true,
      context_type: 'project_context',
      file_size: fileInfo.size,
      modified: fileInfo.modified.toISOString()
    };
  }
  
  /**
   * Generate snippet from content
   */
  generateSnippet(content) {
    const lines = content.split('\n');
    const maxLines = 3;
    const maxLength = 200;
    
    let snippet = lines.slice(0, maxLines).join('\n');
    
    if (snippet.length > maxLength) {
      snippet = snippet.substring(0, maxLength) + '...';
    } else if (lines.length > maxLines) {
      snippet += '...';
    }
    
    return snippet.trim();
  }
  
  /**
   * Create empty result when no files found
   */
  createEmptyResult() {
    return {
      indexed_files: 0,
      total_chunks: 0,
      context_type: 'project_context',
      processing_time_ms: 0,
      index_data: {
        metadata: {
          created: new Date().toISOString(),
          version: '0.2.0',
          context_type: 'project_context',
          total_files: 0,
          total_chunks: 0
        },
        chunks: [],
        files: []
      }
    };
  }
}

module.exports = { ProjectContextIndexer };