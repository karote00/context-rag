const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { APIService } = require('../services/api');

async function queryCommand(query, options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const topK = parseInt(options.topK) || config.search.top_k || 5;
    
    // Initialize API service
    const apiService = new APIService(config);
    
    // Check if index exists
    const indexStatus = await apiService.getIndexStatus();
    if (!indexStatus.cache_exists) {
      if (options.json) {
        console.log(JSON.stringify({
          error: 'Index not found',
          message: 'Run "context-rag index" to create an index first',
          results: []
        }, null, 2));
      } else {
        console.log(chalk.yellow('⚠️  Index not found'));
        console.log(chalk.gray('Run "context-rag index" to create an index first.'));
      }
      process.exit(1);
    }
    
    // Perform search via API
    const apiResult = await apiService.query(query, { topK });
    
    if (apiResult.error) {
      if (options.json) {
        console.log(JSON.stringify(apiResult, null, 2));
      } else {
        console.error(chalk.red(`❌ Error: ${apiResult.error}`));
      }
      process.exit(1);
    }
    
    if (apiResult.results.length === 0) {
      if (options.json) {
        console.log(JSON.stringify(apiResult, null, 2));
      } else {
        console.log(chalk.yellow('🔍 No relevant results found.'));
        console.log(chalk.gray('💡 Try different keywords or check if your index is up to date.'));
      }
      return;
    }

    if (options.json) {
      // Full API response for JSON mode
      console.log(JSON.stringify(apiResult, null, 2));
    } else {
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
    if (options.json) {
      console.log(JSON.stringify({
        error: error.message,
        results: [],
        timestamp: new Date().toISOString()
      }, null, 2));
    } else {
      console.error(chalk.red('❌ Error during search:'), error.message);
    }
    process.exit(1);
  }
}

module.exports = queryCommand;