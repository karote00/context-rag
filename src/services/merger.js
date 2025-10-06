const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ContextMerger {
  constructor(config, gitService) {
    this.config = config;
    this.gitService = gitService;
  }

  async mergeContexts(baseBranch = 'main', currentBranch = null) {
    if (!currentBranch) {
      currentBranch = await this.gitService.getCurrentBranch();
    }

    if (!currentBranch || currentBranch === baseBranch) {
      return null; // No merge needed
    }

    console.log(chalk.blue(`🔄 Merging contexts: ${baseBranch} + ${currentBranch}`));

    const baseCache = await this.loadBranchCache(baseBranch);
    const featureCache = await this.loadBranchCache(currentBranch);

    if (!baseCache && !featureCache) {
      return null;
    }

    const mergedContext = await this.performMerge(baseCache, featureCache, baseBranch, currentBranch);
    
    return mergedContext;
  }

  async loadBranchCache(branchName) {
    const cachePath = await this.gitService.getBranchCachePath(branchName);
    
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const cacheContent = fs.readFileSync(cachePath, 'utf8');
      const cacheData = JSON.parse(cacheContent);
      
      // Load embeddings if available
      const embeddingsPath = cachePath.replace('.db', '_embeddings.json');
      if (fs.existsSync(embeddingsPath)) {
        const embeddingsContent = fs.readFileSync(embeddingsPath, 'utf8');
        const embeddingsData = JSON.parse(embeddingsContent);
        
        // Merge embeddings with chunks
        const embeddingMap = new Map();
        embeddingsData.chunks.forEach(chunk => {
          const key = `${chunk.file_path}:${chunk.chunk_index}`;
          embeddingMap.set(key, chunk.embedding);
        });
        
        cacheData.chunks = cacheData.chunks.map(chunk => {
          const key = `${chunk.file_path}:${chunk.chunk_index}`;
          if (embeddingMap.has(key)) {
            return { ...chunk, embedding: embeddingMap.get(key) };
          }
          return chunk;
        });
      }
      
      return {
        branch: branchName,
        data: cacheData,
        path: cachePath
      };
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not load cache for ${branchName}: ${error.message}`));
      return null;
    }
  }

  async performMerge(baseCache, featureCache, baseBranch, featureBranch) {
    const mergedData = {
      files: {},
      chunks: [],
      metadata: {
        merged_from: [baseBranch, featureBranch],
        merged_at: new Date().toISOString(),
        merge_strategy: 'feature_priority'
      }
    };

    // Get changed files to determine merge strategy
    const changedFiles = await this.gitService.getChangedFiles(baseBranch);
    const changedFileSet = new Set(changedFiles);

    console.log(chalk.gray(`📋 Changed files in ${featureBranch}: ${changedFiles.length}`));

    // Merge file metadata
    if (baseCache) {
      Object.assign(mergedData.files, baseCache.data.files);
      if (baseCache.data.context_metadata) {
        mergedData.context_metadata = baseCache.data.context_metadata;
      }
    }

    if (featureCache) {
      // Feature branch files override base branch files
      Object.assign(mergedData.files, featureCache.data.files);
      if (featureCache.data.context_metadata) {
        mergedData.context_metadata = featureCache.data.context_metadata;
      }
    }

    // Merge chunks with conflict resolution
    const chunkMap = new Map();
    
    // Add base chunks first
    if (baseCache) {
      baseCache.data.chunks.forEach(chunk => {
        const key = `${chunk.file_path}:${chunk.chunk_index}`;
        chunkMap.set(key, {
          ...chunk,
          source_branch: baseBranch,
          is_base: true
        });
      });
    }

    // Add/override with feature chunks
    if (featureCache) {
      featureCache.data.chunks.forEach(chunk => {
        const key = `${chunk.file_path}:${chunk.chunk_index}`;
        const isChangedFile = changedFileSet.has(chunk.file_path) || 
                             changedFiles.some(cf => chunk.file_path.includes(cf));
        
        chunkMap.set(key, {
          ...chunk,
          source_branch: featureBranch,
          is_base: false,
          is_modified: isChangedFile
        });
      });
    }

    // Convert map back to array
    mergedData.chunks = Array.from(chunkMap.values());

    // Sort chunks by priority (context first, then modified files, then base)
    mergedData.chunks.sort((a, b) => {
      // Context chunks get highest priority
      if (a.is_context && !b.is_context) return -1;
      if (!a.is_context && b.is_context) return 1;
      
      // Modified files get priority over base files
      if (a.is_modified && !b.is_modified) return -1;
      if (!a.is_modified && b.is_modified) return 1;
      
      // Feature branch chunks get priority over base
      if (!a.is_base && b.is_base) return -1;
      if (a.is_base && !b.is_base) return 1;
      
      return 0;
    });

    console.log(chalk.green(`✅ Merged ${mergedData.chunks.length} chunks from both branches`));
    
    const stats = this.calculateMergeStats(mergedData.chunks, changedFiles);
    console.log(chalk.gray(`   Base chunks: ${stats.baseChunks}`));
    console.log(chalk.gray(`   Feature chunks: ${stats.featureChunks}`));
    console.log(chalk.gray(`   Modified files: ${stats.modifiedChunks}`));
    console.log(chalk.gray(`   Context chunks: ${stats.contextChunks}`));

    return {
      data: mergedData,
      stats: stats
    };
  }

  calculateMergeStats(chunks, changedFiles) {
    const stats = {
      baseChunks: 0,
      featureChunks: 0,
      modifiedChunks: 0,
      contextChunks: 0,
      totalChunks: chunks.length
    };

    chunks.forEach(chunk => {
      if (chunk.is_context) {
        stats.contextChunks++;
      }
      
      if (chunk.is_modified) {
        stats.modifiedChunks++;
      }
      
      if (chunk.is_base) {
        stats.baseChunks++;
      } else {
        stats.featureChunks++;
      }
    });

    return stats;
  }

  async saveUnifiedView(mergedContext, targetBranch) {
    const unifiedPath = await this.gitService.getBranchCachePath(targetBranch);
    const unifiedDir = path.dirname(unifiedPath);
    
    if (!fs.existsSync(unifiedDir)) {
      fs.mkdirSync(unifiedDir, { recursive: true });
    }

    // Save merged index
    fs.writeFileSync(unifiedPath, JSON.stringify(mergedContext.data, null, 2));

    // Save merged embeddings separately
    const chunksWithEmbeddings = mergedContext.data.chunks.filter(chunk => chunk.embedding);
    if (chunksWithEmbeddings.length > 0) {
      const embeddingsPath = unifiedPath.replace('.db', '_embeddings.json');
      const embeddingsData = {
        model: this.config.embedder.model,
        chunks: chunksWithEmbeddings,
        merged_from: mergedContext.data.metadata.merged_from,
        merged_at: mergedContext.data.metadata.merged_at
      };
      
      fs.writeFileSync(embeddingsPath, JSON.stringify(embeddingsData, null, 2));
    }

    console.log(chalk.green(`💾 Saved unified view to: ${unifiedPath}`));
    
    return unifiedPath;
  }

  async createQueryTimeView(query, baseBranch = 'main', featureBranch = null) {
    // Create a temporary merged view optimized for the specific query
    const mergedContext = await this.mergeContexts(baseBranch, featureBranch);
    
    if (!mergedContext) {
      return null;
    }

    // Apply query-specific optimizations
    const queryOptimizedChunks = this.optimizeForQuery(mergedContext.data.chunks, query);
    
    return {
      ...mergedContext.data,
      chunks: queryOptimizedChunks,
      query_optimized: true,
      optimization_query: query
    };
  }

  optimizeForQuery(chunks, query) {
    // Simple query optimization - boost chunks that contain query terms
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return chunks.map(chunk => {
      let relevanceBoost = 0;
      const contentLower = chunk.content.toLowerCase();
      
      queryTerms.forEach(term => {
        if (contentLower.includes(term)) {
          relevanceBoost += 0.1;
        }
      });
      
      return {
        ...chunk,
        query_relevance_boost: relevanceBoost
      };
    }).sort((a, b) => {
      // Sort by relevance boost, then by existing priority
      const boostDiff = (b.query_relevance_boost || 0) - (a.query_relevance_boost || 0);
      if (boostDiff !== 0) return boostDiff;
      
      if (a.is_context && !b.is_context) return -1;
      if (!a.is_context && b.is_context) return 1;
      
      return 0;
    });
  }
}

module.exports = { ContextMerger };