const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { APIService } = require('../services/api');
const { withSilentModeAsync } = require('../utils/silent-mode');

async function queryCommand(query, options = {}) {
  const isCleanMode = options.json;
  
  try {
    // Load configuration (silent mode when using --json flag)
    const config = await loadConfig({ silent: isCleanMode });
    if (!config) {
      if (isCleanMode) {
        // Return structured error for missing config in JSON mode
        const errorResponse = {
          status: 'error',
          message: 'Configuration not found. Run "context-rag init" first.',
          error_code: 'CONFIG_NOT_FOUND',
          results: [],
          timestamp: new Date().toISOString()
        };
        console.log(JSON.stringify(errorResponse, null, 2));
      }
      process.exit(1);
    }

    const topK = parseInt(options.topK) || config.search.top_k || 5;
    const filters = {
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
      type: options.type,
      feature: options.feature,
    };
    
    // Perform operations with silent mode when in JSON mode
    const { apiService, indexStatus, apiResult } = await withSilentModeAsync(async () => {
      const apiService = new APIService(config);
      const indexStatus = await apiService.getIndexStatus();
      
      if (!indexStatus.cache_exists) {
        throw new Error('INDEX_NOT_FOUND');
      }
      
      const apiResult = await apiService.query(query, { topK, filters });
      
      if (apiResult.error) {
        throw new Error(apiResult.error);
      }
      
      return { apiService, indexStatus, apiResult };
    }, isCleanMode);

    
    if (isCleanMode) {
      // Clean JSON output mode
      const cleanResponse = {
        status: 'success',
        query: apiResult.query,
        results: apiResult.results,
        total_results: apiResult.total_results,
        timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(cleanResponse, null, 2));
    } else {
      // Interactive mode with helpful hints and colors
      if (apiResult.results.length === 0) {
        console.log(chalk.yellow('🔍 No relevant results found.'));
        console.log(chalk.gray('💡 Try different keywords or check if your index is up to date.'));
        return;
      }
      // Human-friendly output
      const results = apiResult.results;
      console.log(chalk.green(`\n📋 Found ${results.length} relevant results:\n`));
      
      results.forEach((result, index) => {
        const similarityPercent = (result.similarity * 100).toFixed(1);
        let prefix = `${index + 1}. ${result.file_path}`;
        
        // Add context indicator
        if (result.is_context) {
          prefix = chalk.cyan(`${index + 1}. 🎯 ${result.file_path}`);
        } else {
          prefix = chalk.cyan(`${index + 1}. ${result.file_path}`);
        }
        
        console.log(prefix);
        
        let metadata = `   Similarity: ${similarityPercent}%`;
        if (result.chunk_index !== undefined) {
          metadata += ` | Chunk: ${result.chunk_index}`;
        }
        if (result.context_type) {
          metadata += ` | Context: ${result.context_type}`;
        }
        
        console.log(chalk.gray(metadata));
        console.log(chalk.white(`   ${result.snippet}`));
        console.log();
      });
      
      // Show context summary if available
      if (indexStatus.has_context) {
        const contextResults = results.filter(r => r.is_context);
        if (contextResults.length > 0) {
          console.log(chalk.blue(`🎯 ${contextResults.length} results from structured context`));
        }
      }
      
      if (results.length === topK) {
        console.log(chalk.gray(`💡 Showing top ${topK} results. Use --top-k to see more.`));
      }
    }
    
  } catch (error) {
    if (isCleanMode) {
      // Structured error response for JSON mode
      let errorCode = 'SYSTEM_ERROR';
      let message = error.message;
      
      if (error.message === 'INDEX_NOT_FOUND') {
        errorCode = 'INDEX_NOT_FOUND';
        message = 'Index not found. Run "context-rag index" to create an index first.';
      }
      
      const errorResponse = {
        status: 'error',
        message: message,
        error_code: errorCode,
        results: [],
        timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(errorResponse, null, 2));
    } else {
      // Interactive error display
      if (error.message === 'INDEX_NOT_FOUND') {
        console.log(chalk.yellow('⚠️  Index not found'));
        console.log(chalk.gray('Run "context-rag index" to create an index first.'));
      } else {
        console.error(chalk.red('❌ Error during search:'), error.message);
      }
    }
    process.exit(1);
  }
}

module.exports = queryCommand;