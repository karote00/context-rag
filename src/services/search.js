const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { EmbeddingService } = require('./embedder');
const { GitService } = require('./git');
const { ContextService } = require('./context');
const { ContextMerger } = require('./merger');

class SearchService {
  constructor(config) {
    this.config = config;
    this.embeddingService = new EmbeddingService(config);
    this.gitService = new GitService(config);
    this.contextService = new ContextService(config);
    this.contextMerger = new ContextMerger(config, this.gitService);
    this.indexData = null;
  }

  async loadIndex() {
    const currentBranch = await this.gitService.getCurrentBranch();
    
    // Try to create a merged view if we're on a feature branch
    if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
      const mergedContext = await this.contextMerger.mergeContexts('main', currentBranch);
      
      if (mergedContext) {
        console.log(chalk.blue(`🔄 Using merged context view (${mergedContext.stats.totalChunks} chunks)`));
        this.indexData = mergedContext.data;
        return;
      }
    }
    
    // Fallback to branch-specific cache
    const branchCachePath = await this.gitService.getBranchCachePath();
    
    if (!fs.existsSync(branchCachePath)) {
      throw new Error('Index not found. Run "context-rag index" first.');
    }

    try {
      const indexContent = fs.readFileSync(branchCachePath, 'utf8');
      this.indexData = JSON.parse(indexContent);
      
      // Load embeddings if they exist
      const embeddingsPath = await this.gitService.getEmbeddingsCachePath();
      if (fs.existsSync(embeddingsPath)) {
        const embeddingsContent = fs.readFileSync(embeddingsPath, 'utf8');
        const embeddingsData = JSON.parse(embeddingsContent);
        
        // Merge embeddings with chunks
        this.indexData.chunks = this.indexData.chunks.map(chunk => {
          const embeddingData = embeddingsData.chunks.find(e => 
            e.file_path === chunk.file_path && e.chunk_index === chunk.chunk_index
          );
          return embeddingData || chunk;
        });
      }
      
      const branchInfo = currentBranch ? ` (branch: ${currentBranch})` : '';
      console.log(chalk.gray(`📋 Loaded index with ${this.indexData.chunks.length} chunks${branchInfo}`));
      
    } catch (error) {
      throw new Error(`Failed to load index: ${error.message}`);
    }
  }

  async search(query, options = {}) {
    if (!this.indexData) {
      await this.loadIndex();
    }

    const topK = options.topK || this.config.search.top_k || 5;
    
    console.log(chalk.blue(`🔍 Searching for: "${query}"`));
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embedText(query);
    
    // Calculate similarities
    const results = [];
    
    for (const chunk of this.indexData.chunks) {
      if (!chunk.embedding) {
        // Skip chunks without embeddings
        continue;
      }
      
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      results.push({
        file_path: chunk.file_path,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        similarity: similarity,
        snippet: this.createSnippet(chunk.content, query)
      });
    }
    
    // Sort by similarity and take top K
    results.sort((a, b) => b.similarity - a.similarity);
    let topResults = results.slice(0, topK * 2); // Get more results for context filtering
    
    // Filter out very low similarity results (more lenient for Node.js embedder)
    const engine = await this.embeddingService.detectEmbeddingEngine();
    const similarityThreshold = engine === 'nodejs' ? 0.01 : 0.1;
    topResults = topResults.filter(result => result.similarity > similarityThreshold);
    
    // Apply context-aware filtering if project context is available
    if (this.indexData.context_metadata) {
      console.log(chalk.gray('🎯 Applying context-aware search filtering'));
      topResults = await this.contextService.searchContext(query, topResults, Math.ceil(topK * 0.6));
    }
    
    // Enhance results with context information
    const enhancedResults = await this.contextService.enhanceSearchResults(topResults);
    
    // Take final top K results
    const finalResults = enhancedResults.slice(0, topK);
    
    return finalResults;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  createSnippet(content, query, maxLength = 200) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find the best position to start the snippet
    let bestPosition = 0;
    let bestScore = 0;
    
    for (let i = 0; i < content.length - maxLength; i += 50) {
      const snippet = contentLower.slice(i, i + maxLength);
      let score = 0;
      
      for (const word of queryWords) {
        if (snippet.includes(word)) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }
    
    let snippet = content.slice(bestPosition, bestPosition + maxLength);
    
    // Try to start and end at word boundaries
    if (bestPosition > 0) {
      const spaceIndex = snippet.indexOf(' ');
      if (spaceIndex > 0 && spaceIndex < 50) {
        snippet = snippet.slice(spaceIndex + 1);
      }
    }
    
    const lastSpaceIndex = snippet.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength - 50) {
      snippet = snippet.slice(0, lastSpaceIndex);
    }
    
    // Add ellipsis if needed
    if (bestPosition > 0) {
      snippet = '...' + snippet;
    }
    if (bestPosition + maxLength < content.length) {
      snippet = snippet + '...';
    }
    
    return snippet;
  }

  async generateEmbeddingsForIndex() {
    if (!this.indexData) {
      await this.loadIndex();
    }

    console.log(chalk.blue('🧠 Generating embeddings for indexed chunks...'));
    
    const chunksWithoutEmbeddings = this.indexData.chunks.filter(chunk => !chunk.embedding);
    
    if (chunksWithoutEmbeddings.length === 0) {
      console.log(chalk.green('✅ All chunks already have embeddings'));
      return;
    }

    console.log(chalk.gray(`Processing ${chunksWithoutEmbeddings.length} chunks...`));
    
    const embeddedChunks = await this.embeddingService.generateEmbeddings(chunksWithoutEmbeddings);
    
    // Update the index data
    const embeddingMap = new Map();
    embeddedChunks.forEach(chunk => {
      const key = `${chunk.file_path}:${chunk.chunk_index}`;
      embeddingMap.set(key, chunk.embedding);
    });
    
    this.indexData.chunks = this.indexData.chunks.map(chunk => {
      const key = `${chunk.file_path}:${chunk.chunk_index}`;
      if (embeddingMap.has(key)) {
        return { ...chunk, embedding: embeddingMap.get(key) };
      }
      return chunk;
    });
    
    // Save embeddings separately for better performance
    const embeddingsPath = this.config.storage.path.replace('.db', '_embeddings.json');
    const embeddingsData = {
      model: this.config.embedder.model,
      chunks: this.indexData.chunks.filter(chunk => chunk.embedding)
    };
    
    fs.writeFileSync(embeddingsPath, JSON.stringify(embeddingsData, null, 2));
    
    console.log(chalk.green(`✅ Generated embeddings for ${embeddedChunks.length} chunks`));
    console.log(chalk.gray(`💾 Embeddings saved to: ${embeddingsPath}`));
  }
}

module.exports = { SearchService };