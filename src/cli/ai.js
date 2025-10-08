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
    
    // Format for AI consumption - optimized for token efficiency
    const aiResponse = {
      status: apiResult.error ? 'error' : 'success',
      context: apiResult.error ? null : {
        query: apiResult.query,
        context_summary: generateContextSummary(apiResult.results),
        code_context: apiResult.results.slice(0, 3).map(result => ({
          file: result.file_path,
          snippet: result.snippet || result.content.substring(0, 200) + '...',
          relevance: Math.round(result.similarity * 100) / 100
        })),
        total_results: apiResult.total_results
      },
      message: apiResult.error || undefined
    };
    
    // Always output JSON for AI consumption
    console.log(JSON.stringify(aiResponse, null, 2));
    
  } catch (error) {
    // Always return structured error for AI
    const errorResponse = {
      status: 'error',
      message: error.message,
      context: null
    };
    
    console.log(JSON.stringify(errorResponse, null, 2));
    process.exit(1);
  }
}

function generateContextSummary(results) {
  if (!results || results.length === 0) {
    return 'No relevant context found';
  }
  
  const fileTypes = [...new Set(results.map(r => {
    const ext = r.file_path.split('.').pop();
    return ext;
  }))];
  
  const topFiles = results.slice(0, 3).map(r => r.file_path);
  
  return `Found ${results.length} relevant files (${fileTypes.join(', ')}) including ${topFiles.join(', ')}`;
}

module.exports = aiCommand;