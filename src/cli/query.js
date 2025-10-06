const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { SearchService } = require('../services/search');

async function queryCommand(query, options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const topK = parseInt(options.topK) || config.search.top_k || 5;
    
    // Initialize search service
    const searchService = new SearchService(config);
    
    // Generate embeddings if they don't exist
    try {
      await searchService.generateEmbeddingsForIndex();
    } catch (error) {
      console.log(chalk.yellow(`⚠️  ${error.message}`));
      console.log(chalk.gray('Run "context-rag index" to create an index first.'));
      process.exit(1);
    }
    
    // Perform search
    const results = await searchService.search(query, { topK });
    
    if (results.length === 0) {
      console.log(chalk.yellow('🔍 No relevant results found.'));
      console.log(chalk.gray('💡 Try different keywords or check if your index is up to date.'));
      return;
    }

    if (options.json) {
      const jsonResults = results.map(result => ({
        file_path: result.file_path,
        similarity: result.similarity,
        snippet: result.snippet,
        chunk_index: result.chunk_index
      }));
      console.log(JSON.stringify(jsonResults, null, 2));
    } else {
      console.log(chalk.green(`\n📋 Found ${results.length} relevant results:\n`));
      
      results.forEach((result, index) => {
        const similarityPercent = (result.similarity * 100).toFixed(1);
        console.log(chalk.cyan(`${index + 1}. ${result.file_path}`));
        console.log(chalk.gray(`   Similarity: ${similarityPercent}% | Chunk: ${result.chunk_index}`));
        console.log(chalk.white(`   ${result.snippet}`));
        console.log();
      });
      
      if (results.length === topK) {
        console.log(chalk.gray(`💡 Showing top ${topK} results. Use --top-k to see more.`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error during search:'), error.message);
    if (error.message.includes('Index not found')) {
      console.log(chalk.yellow('💡 Run "context-rag index" to create an index first.'));
    }
    process.exit(1);
  }
}

module.exports = queryCommand;