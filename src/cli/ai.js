const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { APIService } = require('../services/api');
const { ExpandedSearchService } = require('../services/expanded-search');

async function aiCommand(query, options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const topK = parseInt(options.topK) || config.search.top_k || 5;
    
    // Initialize services
    const apiService = new APIService(config);
    
    // Perform search (with optional expansion for better AI context)
    let apiResult;
    if (options.expand || config.search.expanded_search?.enabled) {
      const expandedSearchService = new ExpandedSearchService(config);
      try {
        await expandedSearchService.generateEmbeddingsForIndex();
        const expandedResults = await expandedSearchService.expandedSearch(query, { 
          topK: topK * 2, // Get more results for AI context
          maxPasses: config.search.expanded_search?.max_passes || 3
        });
        
        apiResult = {
          query,
          results: expandedResults,
          total_results: expandedResults.length,
          search_options: { topK, expanded: true },
          timestamp: new Date().toISOString(),
          model: config.embedder.model
        };
      } catch (error) {
        // Fallback to regular search
        apiResult = await apiService.query(query, { topK });
      }
    } else {
      apiResult = await apiService.query(query, { topK });
    }
    
    // Format for AI consumption
    const aiFormattedResult = apiService.formatForAI(apiResult);
    
    // Always output JSON for AI consumption
    console.log(JSON.stringify(aiFormattedResult, null, 2));
    
  } catch (error) {
    // Always return structured error for AI
    const errorResponse = {
      status: 'error',
      message: error.message,
      context: null,
      timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(errorResponse, null, 2));
    process.exit(1);
  }
}

module.exports = aiCommand;