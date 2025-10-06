#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Token Benchmark Tool
 * 
 * Compares token usage between:
 * 1. Direct AI requests without context
 * 2. AI requests with context-rag provided context
 */

class TokenBenchmark {
  constructor() {
    this.results = {
      without_context: [],
      with_context: [],
      summary: {}
    };
  }

  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Count actual tokens using tiktoken-like estimation
  countTokens(text) {
    // More accurate token counting
    // Roughly: 1 token per 3-4 characters for English text
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Heuristic: average of word-based and char-based estimates
    const wordBasedTokens = Math.ceil(words * 1.3); // ~1.3 tokens per word
    const charBasedTokens = Math.ceil(chars / 3.5); // ~3.5 chars per token
    
    return Math.round((wordBasedTokens + charBasedTokens) / 2);
  }

  async runContextRagQuery(query) {
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

  async benchmarkQuery(query, description = '') {
    console.log(`\n🔍 Benchmarking: ${description || query}`);
    console.log('=' .repeat(60));

    try {
      // 1. Get context from context-rag
      console.log('📋 Getting context from context-rag...');
      const contextResult = await this.runContextRagQuery(query);
      
      let contextText = '';
      let contextSources = 0;
      
      if (contextResult.status === 'success' && contextResult.context) {
        // Extract context content
        const structuredContext = contextResult.context.structured_context || [];
        const codeContext = contextResult.context.code_context || [];
        
        contextText = [
          ...structuredContext.map(c => `${c.type}: ${c.content}`),
          ...codeContext.map(c => `${c.file}: ${c.snippet}`)
        ].join('\n\n');
        
        contextSources = contextResult.context.total_results || 0;
      }

      // 2. Calculate token usage
      const queryTokens = this.countTokens(query);
      const contextTokens = this.countTokens(contextText);
      const totalWithContext = queryTokens + contextTokens;

      // 3. Estimate response tokens (typical AI response length)
      const estimatedResponseTokens = 150; // Conservative estimate for typical responses

      const withoutContextTotal = queryTokens + estimatedResponseTokens;
      const withContextTotal = totalWithContext + estimatedResponseTokens;

      // 4. Calculate savings/cost
      const tokenSavings = this.calculateSavings(contextText, query);

      const result = {
        query,
        description,
        without_context: {
          query_tokens: queryTokens,
          response_tokens: estimatedResponseTokens,
          total_tokens: withoutContextTotal,
          context_quality: 'unknown'
        },
        with_context: {
          query_tokens: queryTokens,
          context_tokens: contextTokens,
          response_tokens: estimatedResponseTokens,
          total_tokens: withContextTotal,
          context_sources: contextSources,
          context_quality: contextSources > 0 ? 'high' : 'low'
        },
        comparison: {
          token_difference: withContextTotal - withoutContextTotal,
          token_overhead: contextTokens,
          context_value_score: this.calculateContextValue(contextResult),
          efficiency_ratio: withoutContextTotal / withContextTotal
        }
      };

      // Display results
      this.displayBenchmarkResult(result);
      
      // Store results
      this.results.without_context.push(result.without_context);
      this.results.with_context.push(result.with_context);

      return result;

    } catch (error) {
      console.error(`❌ Benchmark failed: ${error.message}`);
      return null;
    }
  }

  calculateContextValue(contextResult) {
    if (contextResult.status !== 'success' || !contextResult.context) {
      return 0;
    }

    const context = contextResult.context;
    let score = 0;

    // Points for having results
    if (context.total_results > 0) score += 20;
    
    // Points for structured context (higher quality)
    if (context.context_sources > 0) score += 30;
    
    // Points for code context
    if (context.code_sources > 0) score += 20;
    
    // Points for multiple sources
    if (context.total_results > 3) score += 15;
    
    // Points for context summary quality
    if (context.context_summary && context.context_summary.length > 50) score += 15;

    return Math.min(score, 100); // Cap at 100
  }

  calculateSavings(contextText, query) {
    // Estimate how much more effective the query becomes with context
    // This is a heuristic - in practice, context-rag reduces the need for:
    // 1. Multiple follow-up questions
    // 2. Clarification requests  
    // 3. Broader exploratory queries

    const contextQuality = contextText.length > 500 ? 'high' : 
                          contextText.length > 200 ? 'medium' : 'low';
    
    const estimatedSavedQueries = {
      'high': 2.5,    // Saves ~2-3 additional queries
      'medium': 1.5,  // Saves ~1-2 additional queries  
      'low': 0.5      // Saves ~0-1 additional queries
    };

    return estimatedSavedQueries[contextQuality] || 0;
  }

  displayBenchmarkResult(result) {
    console.log(`\n📊 Token Usage Analysis:`);
    console.log(`   Query: "${result.query}"`);
    console.log(`   
   Without Context-RAG:
     • Query tokens: ${result.without_context.query_tokens}
     • Response tokens: ${result.without_context.response_tokens}
     • Total tokens: ${result.without_context.total_tokens}
     • Context quality: ${result.without_context.context_quality}
   
   With Context-RAG:
     • Query tokens: ${result.with_context.query_tokens}
     • Context tokens: ${result.with_context.context_tokens}
     • Response tokens: ${result.with_context.response_tokens}
     • Total tokens: ${result.with_context.total_tokens}
     • Context sources: ${result.with_context.context_sources}
     • Context quality: ${result.with_context.context_quality}
   
   📈 Analysis:
     • Token overhead: ${result.comparison.token_difference > 0 ? '+' : ''}${result.comparison.token_difference}
     • Context value score: ${result.comparison.context_value_score}/100
     • Efficiency ratio: ${result.comparison.efficiency_ratio.toFixed(2)}x
    `);

    if (result.comparison.token_difference > 0) {
      console.log(`   💡 Context-RAG uses ${result.comparison.token_difference} more tokens upfront`);
      console.log(`      but likely saves tokens by providing better context quality.`);
    } else {
      console.log(`   ✅ Context-RAG saves ${Math.abs(result.comparison.token_difference)} tokens!`);
    }
  }

  async runBenchmarkSuite() {
    console.log('🚀 Starting Context-RAG Token Benchmark Suite');
    console.log('=' .repeat(60));

    // Check if context-rag is available
    try {
      await this.runContextRagQuery('test');
    } catch (error) {
      console.error('❌ context-rag not found or not working. Please ensure:');
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
        query: "What's the database schema for users?", 
        description: "Database schema inquiry"
      },
      {
        query: "How do I handle errors in the API?",
        description: "Error handling patterns"
      },
      {
        query: "What are the main components of this system?",
        description: "Architecture overview"
      },
      {
        query: "How do I deploy this application?",
        description: "Deployment procedures"
      }
    ];

    const results = [];
    
    for (const { query, description } of benchmarkQueries) {
      const result = await this.benchmarkQuery(query, description);
      if (result) {
        results.push(result);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate summary
    this.generateSummary(results);
    
    // Save results to file
    this.saveResults(results);
  }

  generateSummary(results) {
    if (results.length === 0) return;

    console.log('\n' + '='.repeat(60));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(60));

    const avgWithoutContext = results.reduce((sum, r) => sum + r.without_context.total_tokens, 0) / results.length;
    const avgWithContext = results.reduce((sum, r) => sum + r.with_context.total_tokens, 0) / results.length;
    const avgContextValue = results.reduce((sum, r) => sum + r.comparison.context_value_score, 0) / results.length;
    const avgOverhead = results.reduce((sum, r) => sum + r.comparison.token_difference, 0) / results.length;

    console.log(`Queries tested: ${results.length}`);
    console.log(`Average tokens without context-rag: ${Math.round(avgWithoutContext)}`);
    console.log(`Average tokens with context-rag: ${Math.round(avgWithContext)}`);
    console.log(`Average token overhead: ${avgOverhead > 0 ? '+' : ''}${Math.round(avgOverhead)}`);
    console.log(`Average context value score: ${Math.round(avgContextValue)}/100`);

    const totalSavingsEstimate = results.reduce((sum, r) => {
      // Estimate saved follow-up queries based on context quality
      const contextQuality = r.comparison.context_value_score;
      const savedQueries = contextQuality > 70 ? 2 : contextQuality > 40 ? 1 : 0;
      return sum + (savedQueries * avgWithoutContext);
    }, 0);

    console.log(`\n💰 ESTIMATED TOKEN SAVINGS:`);
    console.log(`   Upfront cost: +${Math.round(avgOverhead * results.length)} tokens`);
    console.log(`   Estimated savings from avoided follow-ups: ${Math.round(totalSavingsEstimate)} tokens`);
    console.log(`   Net savings: ${Math.round(totalSavingsEstimate - (avgOverhead * results.length))} tokens`);

    if (totalSavingsEstimate > (avgOverhead * results.length)) {
      console.log(`   ✅ Context-RAG provides net token savings!`);
    } else {
      console.log(`   📈 Context-RAG trades tokens for higher quality responses`);
    }
  }

  saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `token-benchmark-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      tool_version: '1.0.0',
      results: results,
      summary: this.results.summary
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const benchmark = new TokenBenchmark();

  if (args.length === 0) {
    // Run full benchmark suite
    await benchmark.runBenchmarkSuite();
  } else {
    // Run single query benchmark
    const query = args.join(' ');
    await benchmark.benchmarkQuery(query);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  });
}

module.exports = TokenBenchmark;