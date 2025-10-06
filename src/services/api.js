const chalk = require('chalk');
const { SearchService } = require('./search');

class APIService {
  constructor(config) {
    this.config = config;
    this.searchService = new SearchService(config);
  }

  async query(queryText, options = {}) {
    try {
      // Perform search
      const results = await this.searchService.search(queryText, options);
      
      // Format results for API consumption
      const apiResults = results.map(result => ({
        file_path: result.file_path,
        content: result.content,
        snippet: result.snippet,
        similarity: result.similarity,
        chunk_index: result.chunk_index,
        source_type: result.source_type || 'project-file',
        context_category: result.context_category || 'code',
        priority_score: result.priority_score || 0,
        is_context: result.is_context || false,
        context_type: result.context_type || null
      }));

      return {
        query: queryText,
        results: apiResults,
        total_results: apiResults.length,
        search_options: options,
        timestamp: new Date().toISOString(),
        model: this.config.embedder.model
      };

    } catch (error) {
      return {
        query: queryText,
        error: error.message,
        results: [],
        total_results: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getIndexStatus() {
    try {
      const { GitService } = require('./git');
      const gitService = new GitService(this.config);
      
      const currentBranch = await gitService.getCurrentBranch();
      const branchCachePath = await gitService.getBranchCachePath();
      const fs = require('fs');
      
      const status = {
        branch: currentBranch,
        cache_path: branchCachePath,
        cache_exists: fs.existsSync(branchCachePath),
        git_repository: currentBranch !== null
      };

      if (status.cache_exists) {
        const stats = fs.statSync(branchCachePath);
        const indexContent = fs.readFileSync(branchCachePath, 'utf8');
        const indexData = JSON.parse(indexContent);
        
        status.cache_size = stats.size;
        status.last_modified = stats.mtime.toISOString();
        status.total_files = Object.keys(indexData.files || {}).length;
        status.total_chunks = (indexData.chunks || []).length;
        status.has_context = !!indexData.context_metadata;
        
        if (indexData.context_metadata) {
          status.context_files = indexData.context_metadata.context_files;
          status.context_path = indexData.context_metadata.context_path;
        }
      }

      return status;

    } catch (error) {
      return {
        error: error.message,
        cache_exists: false
      };
    }
  }

  async getBranchInfo() {
    try {
      const { GitService } = require('./git');
      const gitService = new GitService(this.config);
      
      const currentBranch = await gitService.getCurrentBranch();
      const cachedBranches = await gitService.listCachedBranches();
      const changedFiles = await gitService.getChangedFiles();
      
      return {
        current_branch: currentBranch,
        cached_branches: cachedBranches.map(branch => ({
          name: branch.name,
          size: branch.size,
          modified: branch.modified.toISOString()
        })),
        changed_files: changedFiles,
        total_cached_branches: cachedBranches.length,
        has_changes: changedFiles.length > 0
      };

    } catch (error) {
      return {
        error: error.message,
        current_branch: null,
        cached_branches: [],
        changed_files: []
      };
    }
  }

  async getContextInfo() {
    try {
      const { ContextService } = require('./context');
      const contextService = new ContextService(this.config);
      
      const contextInfo = await contextService.detectHandoffContext();
      
      if (!contextInfo) {
        return {
          has_context: false,
          context_path: null,
          context_files: []
        };
      }

      return {
        has_context: true,
        context_path: contextInfo.path,
        context_files: contextInfo.files.map(file => ({
          name: file.name,
          type: file.type,
          path: file.path,
          size: file.size
        })),
        total_context_files: contextInfo.totalFiles
      };

    } catch (error) {
      return {
        error: error.message,
        has_context: false,
        context_files: []
      };
    }
  }

  formatForAI(queryResult) {
    // Format results specifically for AI consumption
    if (queryResult.error) {
      return {
        status: 'error',
        message: queryResult.error,
        context: null
      };
    }

    if (queryResult.results.length === 0) {
      return {
        status: 'no_results',
        message: 'No relevant context found for the query',
        query: queryResult.query,
        context: null
      };
    }

    // Group results by source type
    const contextResults = queryResult.results.filter(r => r.is_context);
    const codeResults = queryResult.results.filter(r => !r.is_context);

    const aiContext = {
      query: queryResult.query,
      total_results: queryResult.total_results,
      context_sources: contextResults.length,
      code_sources: codeResults.length,
      
      // Structured context for AI
      structured_context: contextResults.map(result => ({
        type: result.context_type,
        content: result.content,
        relevance: result.similarity,
        source: result.file_path
      })),
      
      // Code context for AI
      code_context: codeResults.slice(0, 3).map(result => ({
        file: result.file_path,
        snippet: result.snippet,
        relevance: result.similarity
      })),
      
      // Summary for AI prompt
      context_summary: this.generateContextSummary(queryResult.results),
      
      timestamp: queryResult.timestamp
    };

    return {
      status: 'success',
      context: aiContext
    };
  }

  generateContextSummary(results) {
    const contextTypes = [...new Set(results.filter(r => r.is_context).map(r => r.context_type))];
    const fileTypes = [...new Set(results.filter(r => !r.is_context).map(r => {
      const ext = r.file_path.split('.').pop();
      return ext;
    }))];

    let summary = `Found ${results.length} relevant sources`;
    
    if (contextTypes.length > 0) {
      summary += ` including structured context (${contextTypes.join(', ')})`;
    }
    
    if (fileTypes.length > 0) {
      summary += ` and code files (${fileTypes.join(', ')})`;
    }

    return summary;
  }
}

module.exports = { APIService };