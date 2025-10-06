#!/usr/bin/env node

/**
 * Context Efficiency Analyzer
 * 
 * Measures how much context-rag reduces token usage by providing
 * filtered, relevant context instead of dumping entire files/docs.
 * 
 * Key Metrics:
 * - Raw context tokens (if you included all relevant files)
 * - Filtered context tokens (context-rag's smart selection)
 * - Efficiency ratio and token savings
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ContextEfficiencyAnalyzer {
  constructor() {
    this.results = [];
  }

  // Accurate token counting
  countTokens(text) {
    if (!text) return 0;
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const chars = cleanText.length;
    const words = cleanText.split(' ').length;
    
    // OpenAI-style estimation: ~3.8 chars per token
    const charBasedTokens = Math.ceil(chars / 3.8);
    const wordBasedTokens = Math.ceil(words * 1.3);
    
    return Math.round((charBasedTokens * 0.6) + (wordBasedTokens * 0.4));
  }

  // Get all potentially relevant files for a query
  async getAllRelevantFiles(query) {
    const relevantFiles = [];
    const extensions = ['.md', '.txt', '.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h'];
    
    const scanDirectory = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common ignore directories
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'target'].includes(entry.name)) {
              scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                // Simple relevance check - contains query terms
                const queryTerms = query.toLowerCase().split(/\s+/);
                const contentLower = content.toLowerCase();
                
                const relevanceScore = queryTerms.reduce((score, term) => {
                  return score + (contentLower.includes(term) ? 1 : 0);
                }, 0);
                
                if (relevanceScore > 0) {
                  relevantFiles.push({
                    path: fullPath,
                    content: content,
                    tokens: this.countTokens(content),
                    relevanceScore: relevanceScore
                  });
                }
              } catch (error) {
                // Skip files that can't be read
              }
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    scanDirectory('.');
    
    // Sort by relevance score
    relevantFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return relevantFiles;
  }

  // Get context-rag filtered results
  async getContextRagResults(query) {
    return new Promise((resolve, reject) => {
      const child = spawn('context-rag', ['ai', query], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse context-rag output: ${error.message}`));
          }
        } else {
          reject(new Error(`context-rag failed: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run context-rag: ${error.message}`));
      });
    });
  }

  // Analyze context efficiency for a query
  async analyzeQuery(query, description = '') {
    console.log(`\n🔍 Analyzing: ${description || query}`);
    console.log('='.repeat(70));

    try {
      // 1. Get all potentially relevant files
      console.log('📁 Scanning for relevant files...');
      const allRelevantFiles = await this.getAllRelevantFiles(query);
      
      // 2. Get context-rag filtered results
      console.log('🎯 Getting context-rag filtered results...');
      const contextRagResult = await this.getContextRagResults(query);
      
      // 3. Calculate raw context tokens (all relevant files)
      const rawContextTokens = allRelevantFiles.reduce((sum, file) => sum + file.tokens, 0);
      
      // 4. Calculate filtered context tokens (context-rag selection)
      let filteredContextTokens = 0;
      let contextSources = 0;
      
      if (contextRagResult.status === 'success' && contextRagResult.context) {
        const structuredContext = contextRagResult.context.structured_context || [];
        const codeContext = contextRagResult.context.code_context || [];
        
        const allContextText = [
          ...structuredContext.map(c => c.content),
          ...codeContext.map(c => c.snippet)
        ].join('\n\n');
        
        filteredContextTokens = this.countTokens(allContextText);
        contextSources = contextRagResult.context.total_results || 0;
      }
      
      // 5. Calculate efficiency metrics
      const tokenSavings = rawContextTokens - filteredContextTokens;
      const efficiencyRatio = rawContextTokens > 0 ? rawContextTokens / filteredContextTokens : 1;
      const compressionRatio = rawContextTokens > 0 ? (tokenSavings / rawContextTokens) * 100 : 0;
      
      const result = {
        query,
        description,
        analysis: {
          raw_context_tokens: rawContextTokens,
          filtered_context_tokens: filteredContextTokens,
          token_savings: tokenSavings,
          efficiency_ratio: efficiencyRatio,
          compression_ratio: compressionRatio,
          context_sources: contextSources,
          total_relevant_files: allRelevantFiles.length
        },
        file_breakdown: {
          all_relevant_files: allRelevantFiles.length,
          total_raw_tokens: rawContextTokens,
          selected_sources: contextSources,
          filtered_tokens: filteredContextTokens
        }
      };

      this.displayAnalysis(result);
      this.results.push(result);
      
      return result;

    } catch (error) {
      console.error(`❌ Analysis failed: ${error.message}`);
      return null;
    }
  }

  displayAnalysis(result) {
    const analysis = result.analysis;
    
    console.log(`\n📊 Context Filtering Efficiency:`);
    console.log(`   Query: "${result.query}"`);
    console.log(`
   📁 Raw Context (all relevant files):
     • Files found: ${analysis.total_relevant_files}
     • Total tokens: ${analysis.raw_context_tokens.toLocaleString()}
   
   🎯 Filtered Context (context-rag selection):
     • Sources selected: ${analysis.context_sources}
     • Filtered tokens: ${analysis.filtered_context_tokens.toLocaleString()}
   
   ⚡ Efficiency Metrics:
     • Token savings: ${analysis.token_savings.toLocaleString()} tokens
     • Efficiency ratio: ${analysis.efficiency_ratio.toFixed(1)}x
     • Compression ratio: ${analysis.compression_ratio.toFixed(1)}%
     • Context reduction: ${((1 - analysis.filtered_context_tokens/analysis.raw_context_tokens) * 100).toFixed(1)}%
    `);

    if (analysis.token_savings > 0) {
      console.log(`   ✅ Context-RAG saves ${analysis.token_savings.toLocaleString()} tokens per query!`);
      console.log(`   📈 That's ${analysis.compression_ratio.toFixed(1)}% less context needed`);
    } else {
      console.log(`   📋 Context-RAG provides focused, relevant context`);
    }

    // Quality assessment
    const qualityScore = this.assessContextQuality(analysis);
    console.log(`   🎯 Context quality score: ${qualityScore}/100`);
  }

  assessContextQuality(analysis) {
    let score = 0;
    
    // Points for having context sources
    if (analysis.context_sources > 0) score += 30;
    
    // Points for good compression (not too little, not too much)
    if (analysis.compression_ratio > 50 && analysis.compression_ratio < 95) score += 40;
    
    // Points for reasonable efficiency ratio
    if (analysis.efficiency_ratio > 2) score += 20;
    
    // Points for finding relevant files
    if (analysis.total_relevant_files > 0) score += 10;
    
    return Math.min(score, 100);
  }

  // Run efficiency analysis on multiple queries
  async runEfficiencyBenchmark() {
    console.log('🚀 Context Filtering Efficiency Benchmark');
    console.log('='.repeat(70));

    // Check if context-rag is available
    try {
      await this.getContextRagResults('test');
    } catch (error) {
      console.error('❌ context-rag not available. Please ensure:');
      console.error('   1. context-rag is installed: npm install -g context-rag');
      console.error('   2. You have run: context-rag init && context-rag index');
      process.exit(1);
    }

    const benchmarkQueries = [
      {
        query: "How do I implement user authentication?",
        description: "Authentication implementation"
      },
      {
        query: "What's the database schema?", 
        description: "Database schema inquiry"
      },
      {
        query: "How do I handle API errors?",
        description: "Error handling patterns"
      },
      {
        query: "What are the main system components?",
        description: "Architecture overview"
      },
      {
        query: "How do I configure the application?",
        description: "Configuration setup"
      }
    ];

    const results = [];
    
    for (const { query, description } of benchmarkQueries) {
      const result = await this.analyzeQuery(query, description);
      if (result) {
        results.push(result);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.generateEfficiencySummary(results);
    this.saveResults(results);
  }

  generateEfficiencySummary(results) {
    if (results.length === 0) return;

    console.log('\n' + '='.repeat(70));
    console.log('📊 CONTEXT FILTERING EFFICIENCY SUMMARY');
    console.log('='.repeat(70));

    const totalRawTokens = results.reduce((sum, r) => sum + r.analysis.raw_context_tokens, 0);
    const totalFilteredTokens = results.reduce((sum, r) => sum + r.analysis.filtered_context_tokens, 0);
    const totalSavings = totalRawTokens - totalFilteredTokens;
    const avgEfficiencyRatio = results.reduce((sum, r) => sum + r.analysis.efficiency_ratio, 0) / results.length;
    const avgCompressionRatio = results.reduce((sum, r) => sum + r.analysis.compression_ratio, 0) / results.length;

    console.log(`Queries analyzed: ${results.length}`);
    console.log(`Total raw context tokens: ${totalRawTokens.toLocaleString()}`);
    console.log(`Total filtered context tokens: ${totalFilteredTokens.toLocaleString()}`);
    console.log(`Total token savings: ${totalSavings.toLocaleString()}`);
    console.log(`Average efficiency ratio: ${avgEfficiencyRatio.toFixed(1)}x`);
    console.log(`Average compression ratio: ${avgCompressionRatio.toFixed(1)}%`);

    console.log(`\n🎯 KEY INSIGHTS:`);
    console.log(`   • Context-RAG reduces context size by ${avgCompressionRatio.toFixed(1)}% on average`);
    console.log(`   • Saves ${Math.round(totalSavings / results.length).toLocaleString()} tokens per query`);
    console.log(`   • ${avgEfficiencyRatio.toFixed(1)}x more efficient than including all relevant files`);
    console.log(`   • Works with any AI service - savings are universal!`);

    // ROI calculation (generic)
    console.log(`\n💡 UNIVERSAL TOKEN SAVINGS:`);
    console.log(`   Instead of sending ${Math.round(totalRawTokens / results.length).toLocaleString()} tokens of context,`);
    console.log(`   context-rag sends only ${Math.round(totalFilteredTokens / results.length).toLocaleString()} tokens of relevant context.`);
    console.log(`   
   This means for every query, you save:
   • ${Math.round(totalSavings / results.length).toLocaleString()} tokens regardless of AI service
   • Works with OpenAI, Anthropic, Google, local models, etc.
   • Savings scale with your codebase size`);
  }

  saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `context-efficiency-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      tool_version: '1.0.0',
      analysis_type: 'context_filtering_efficiency',
      results: results,
      summary: {
        total_queries: results.length,
        total_raw_tokens: results.reduce((sum, r) => sum + r.analysis.raw_context_tokens, 0),
        total_filtered_tokens: results.reduce((sum, r) => sum + r.analysis.filtered_context_tokens, 0),
        total_savings: results.reduce((sum, r) => sum + r.analysis.token_savings, 0),
        average_efficiency_ratio: results.reduce((sum, r) => sum + r.analysis.efficiency_ratio, 0) / results.length,
        average_compression_ratio: results.reduce((sum, r) => sum + r.analysis.compression_ratio, 0) / results.length
      }
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Efficiency analysis saved to: ${filename}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const analyzer = new ContextEfficiencyAnalyzer();

  if (args.length === 0) {
    // Run full efficiency benchmark
    await analyzer.runEfficiencyBenchmark();
  } else {
    // Analyze single query
    const query = args.join(' ');
    await analyzer.analyzeQuery(query);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = ContextEfficiencyAnalyzer;