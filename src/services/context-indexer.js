const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { SpecsMonitor } = require('./context-monitor');

/**
 * Specs indexer for feature branches
 * Focuses on feature implementation docs: requirements, design, tasks, specs
 */
class SpecsIndexer {
  constructor(config = {}) {
    this.config = config;
    this.specsMonitor = new SpecsMonitor(config);
  }
  
  /**
   * Index specs files only for a specific feature branch
   * @param {string} branchName - Name of the branch
   * @returns {Object} Indexing results
   */
  async indexSpecsOnly(branchName) {
    console.log(chalk.blue(`📚 Starting specs indexing for feature branch: ${branchName}`));
    
    const startTime = Date.now();
    
    // Discover specs files
    const specsDiscovery = await this.specsMonitor.discoverContextFiles();
    
    if (specsDiscovery.totalFiles === 0) {
      console.log(chalk.yellow('⚠️  No specs files found'));
      console.log(chalk.gray('Consider adding .kiro/specs/, requirements/, or design/ directories'));
      return await this.createEmptySpecsResult(branchName);
    }
    
    // Process specs files
    const indexResult = await this.processSpecsFiles(specsDiscovery, branchName);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(chalk.green(`✅ Specs indexing completed in ${processingTime}ms`));
    
    return {
      ...indexResult,
      branch: branchName,
      specs_focused: true,
      processing_time_ms: processingTime,
      specs_discovery: specsDiscovery
    };
  }
  
  /**
   * Process discovered specs files into index chunks
   * @param {Object} specsDiscovery - Specs discovery results
   * @param {string} branchName - Branch name
   * @returns {Object} Processing results
   */
  async processSpecsFiles(specsDiscovery, branchName) {
    const chunks = [];
    const processedFiles = [];
    let totalChunks = 0;
    
    console.log(chalk.blue(`📄 Processing ${specsDiscovery.totalFiles} specs files...`));
    
    // Process files
    for (const file of specsDiscovery.files) {
      try {
        const fileChunks = await this.processContextFile(file);
        chunks.push(...fileChunks);
        totalChunks += fileChunks.length;
        
        processedFiles.push({
          path: file.path,
          chunks: fileChunks.length,
          contextType: file.contextType,
          priority: file.priority
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
        branch: branchName,
        version: '0.2.0',
        specs_focused: true,
        total_files: processedFiles.length,
        total_chunks: totalChunks,
        specs_directories: specsDiscovery.directories.map(d => d.path)
      },
      chunks: chunks,
      files: processedFiles,
      specs_metadata: {
        directories: specsDiscovery.directories,
        total_specs_files: specsDiscovery.totalFiles
      }
    };
    
    return {
      indexed_files: processedFiles.length,
      total_chunks: totalChunks,
      index_data: indexData
    };
  }
  
  /**
   * Process a single specs file into chunks
   * @param {Object} fileInfo - File information from specs discovery
   * @returns {Array} Array of chunks
   */
  async processContextFile(fileInfo) {
    try {
      const content = fs.readFileSync(fileInfo.path, 'utf8');
      const chunks = [];
      
      // Different chunking strategies based on file type
      switch (fileInfo.contextType) {
        case 'requirements':
        case 'design':
        case 'tasks':
          chunks.push(...this.chunkSpecificationFile(content, fileInfo));
          break;
          
        case 'architecture':
        case 'overview':
          chunks.push(...this.chunkArchitectureFile(content, fileInfo));
          break;
          
        case 'api-documentation':
          chunks.push(...this.chunkApiDocumentation(content, fileInfo));
          break;
          
        default:
          chunks.push(...this.chunkGeneralMarkdown(content, fileInfo));
      }
      
      return chunks;
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read file ${fileInfo.path}: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Chunk specification files (requirements, design, tasks)
   * @param {string} content - File content
   * @param {Object} fileInfo - File information
   * @returns {Array} Array of chunks
   */
  chunkSpecificationFile(content, fileInfo) {
    const chunks = [];
    
    // Split by major sections (## headers)
    const sections = content.split(/^## /m);
    
    for (let i = 0; i < sections.length; i++) {
      const section = i === 0 ? sections[i] : '## ' + sections[i];
      
      if (section.trim().length > 50) { // Skip very short sections
        chunks.push(this.createChunk(section, fileInfo, i));
      }
    }
    
    // If no major sections, chunk by paragraphs
    if (chunks.length === 0) {
      chunks.push(...this.chunkByParagraphs(content, fileInfo));
    }
    
    return chunks;
  }
  
  /**
   * Chunk architecture and overview files
   * @param {string} content - File content
   * @param {Object} fileInfo - File information
   * @returns {Array} Array of chunks
   */
  chunkArchitectureFile(content, fileInfo) {
    const chunks = [];
    
    // Split by sections and subsections
    const sections = content.split(/^#{1,3} /m);
    
    for (let i = 0; i < sections.length; i++) {
      const section = i === 0 ? sections[i] : '# ' + sections[i];
      
      if (section.trim().length > 100) {
        chunks.push(this.createChunk(section, fileInfo, i));
      }
    }
    
    return chunks.length > 0 ? chunks : this.chunkByParagraphs(content, fileInfo);
  }
  
  /**
   * Chunk API documentation
   * @param {string} content - File content
   * @param {Object} fileInfo - File information
   * @returns {Array} Array of chunks
   */
  chunkApiDocumentation(content, fileInfo) {
    const chunks = [];
    
    // Split by API endpoints or major sections
    const sections = content.split(/^### /m);
    
    for (let i = 0; i < sections.length; i++) {
      const section = i === 0 ? sections[i] : '### ' + sections[i];
      
      if (section.trim().length > 80) {
        chunks.push(this.createChunk(section, fileInfo, i));
      }
    }
    
    return chunks.length > 0 ? chunks : this.chunkByParagraphs(content, fileInfo);
  }
  
  /**
   * Chunk general markdown files
   * @param {string} content - File content
   * @param {Object} fileInfo - File information
   * @returns {Array} Array of chunks
   */
  chunkGeneralMarkdown(content, fileInfo) {
    // Try section-based chunking first
    const sections = content.split(/^#{1,4} /m);
    
    if (sections.length > 1) {
      const chunks = [];
      for (let i = 0; i < sections.length; i++) {
        const section = i === 0 ? sections[i] : '# ' + sections[i];
        if (section.trim().length > 50) {
          chunks.push(this.createChunk(section, fileInfo, i));
        }
      }
      if (chunks.length > 0) return chunks;
    }
    
    // Fall back to paragraph-based chunking
    return this.chunkByParagraphs(content, fileInfo);
  }
  
  /**
   * Chunk content by paragraphs
   * @param {string} content - File content
   * @param {Object} fileInfo - File information
   * @returns {Array} Array of chunks
   */
  chunkByParagraphs(content, fileInfo) {
    const chunks = [];
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      if (trimmedParagraph.length === 0) continue;
      
      // If adding this paragraph would make chunk too long, start new chunk
      if (currentChunk.length > 0 && (currentChunk.length + trimmedParagraph.length) > 1000) {
        chunks.push(this.createChunk(currentChunk, fileInfo, chunkIndex));
        currentChunk = trimmedParagraph;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk, fileInfo, chunkIndex));
    }
    
    return chunks;
  }
  
  /**
   * Create a chunk object
   * @param {string} content - Chunk content
   * @param {Object} fileInfo - File information
   * @param {number} chunkIndex - Index of the chunk within the file
   * @returns {Object} Chunk object
   */
  createChunk(content, fileInfo, chunkIndex) {
    const snippet = this.generateSnippet(content);
    
    return {
      file_path: fileInfo.path,
      content: content.trim(),
      snippet: snippet,
      chunk_index: chunkIndex,
      source_type: 'specs-file',
      is_context: true,
      context_type: 'feature_specs',
      file_size: fileInfo.size,
      modified: fileInfo.modified.toISOString()
    };
  }
  
  /**
   * Generate a snippet from content
   * @param {string} content - Full content
   * @returns {string} Snippet
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
   * Create empty result when no specs files found
   * @param {string} branchName - Branch name
   * @returns {Object} Indexing results
   */
  async createEmptySpecsResult(branchName) {
    return {
      indexed_files: 0,
      total_chunks: 0,
      branch: branchName,
      specs_focused: true,
      processing_time_ms: 0,
      index_data: {
        metadata: {
          created: new Date().toISOString(),
          branch: branchName,
          version: '0.2.0',
          specs_focused: true,
          total_files: 0,
          total_chunks: 0
        },
        chunks: [],
        files: []
      },
      message: 'No specs files found. Consider adding .kiro/specs/, requirements/, or design/ directories.'
    };
  }
  
  /**
   * Get indexing statistics
   * @param {Object} indexResult - Result from indexing
   * @returns {Object} Statistics
   */
  getIndexingStats(indexResult) {
    return {
      total_files: indexResult.indexed_files,
      total_chunks: indexResult.total_chunks,
      context_focused: indexResult.context_focused,
      context_types: indexResult.context_types || [],
      processing_time: indexResult.processing_time_ms,
      branch: indexResult.branch,
      directories_indexed: indexResult.context_discovery?.directories?.length || 0
    };
  }
}

module.exports = { SpecsIndexer };