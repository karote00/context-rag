const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { APIService } = require('../services/api');

async function aiCommand(query, options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const topK = parseInt(options.topK) || config.search.top_k || 5;
    
    // Initialize API service
    const apiService = new APIService(config);
    
    // Perform search
    const apiResult = await apiService.query(query, { topK });
    
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