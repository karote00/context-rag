#!/usr/bin/env node

/**
 * Simple Token Tracker
 * 
 * Usage:
 * 1. Track tokens for a request without context-rag
 * 2. Track tokens for the same request with context-rag context
 * 3. Compare the results
 */

class TokenTracker {
  constructor() {
    this.sessions = [];
  }

  // Estimate tokens (more accurate estimation)
  countTokens(text) {
    if (!text) return 0;
    
    // Remove extra whitespace
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Rough estimation based on OpenAI's tokenization:
    // - ~4 characters per token for English
    // - Adjust for punctuation and special characters
    const chars = cleanText.length;
    const words = cleanText.split(' ').length;
    
    // More accurate heuristic
    const charBasedTokens = Math.ceil(chars / 3.8);
    const wordBasedTokens = Math.ceil(words * 1.3);
    
    // Use the average, slightly favoring char-based for accuracy
    return Math.round((charBasedTokens * 0.6) + (wordBasedTokens * 0.4));
  }

  // Start a new comparison session
  startSession(description) {
    const session = {
      id: Date.now(),
      description,
      timestamp: new Date().toISOString(),
      without_context: null,
      with_context: null
    };
    
    this.sessions.push(session);
    console.log(`🆕 Started session: ${description}`);
    console.log(`📋 Session ID: ${session.id}`);
    return session.id;
  }

  // Record request without context-rag
  recordWithoutContext(sessionId, query, response) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('❌ Session not found');
      return;
    }

    const queryTokens = this.countTokens(query);
    const responseTokens = this.countTokens(response);
    const totalTokens = queryTokens + responseTokens;

    session.without_context = {
      query,
      response,
      query_tokens: queryTokens,
      response_tokens: responseTokens,
      total_tokens: totalTokens,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📝 Recorded WITHOUT context-rag:`);
    console.log(`   Query tokens: ${queryTokens}`);
    console.log(`   Response tokens: ${responseTokens}`);
    console.log(`   Total tokens: ${totalTokens}`);
  }

  // Record request with context-rag
  recordWithContext(sessionId, query, contextRagOutput, response) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('❌ Session not found');
      return;
    }

    const queryTokens = this.countTokens(query);
    const contextTokens = this.countTokens(contextRagOutput);
    const responseTokens = this.countTokens(response);
    const totalTokens = queryTokens + contextTokens + responseTokens;

    session.with_context = {
      query,
      context: contextRagOutput,
      response,
      query_tokens: queryTokens,
      context_tokens: contextTokens,
      response_tokens: responseTokens,
      total_tokens: totalTokens,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📝 Recorded WITH context-rag:`);
    console.log(`   Query tokens: ${queryTokens}`);
    console.log(`   Context tokens: ${contextTokens}`);
    console.log(`   Response tokens: ${responseTokens}`);
    console.log(`   Total tokens: ${totalTokens}`);
  }

  // Compare the results
  compareSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('❌ Session not found');
      return;
    }

    if (!session.without_context || !session.with_context) {
      console.error('❌ Incomplete session - need both with and without context data');
      return;
    }

    const without = session.without_context;
    const with_ = session.with_context;
    
    const tokenDifference = with_.total_tokens - without.total_tokens;
    const contextOverhead = with_.context_tokens;
    const efficiencyRatio = without.total_tokens / with_.total_tokens;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 COMPARISON: ${session.description}`);
    console.log('='.repeat(60));
    
    console.log(`\n🔍 Query: "${session.without_context.query}"`);
    
    console.log(`\n📈 Token Usage:`);
    console.log(`   Without context-rag: ${without.total_tokens} tokens`);
    console.log(`     • Query: ${without.query_tokens}`);
    console.log(`     • Response: ${without.response_tokens}`);
    
    console.log(`   With context-rag: ${with_.total_tokens} tokens`);
    console.log(`     • Query: ${with_.query_tokens}`);
    console.log(`     • Context: ${with_.context_tokens}`);
    console.log(`     • Response: ${with_.response_tokens}`);

    console.log(`\n📊 Analysis:`);
    console.log(`   Token difference: ${tokenDifference > 0 ? '+' : ''}${tokenDifference}`);
    console.log(`   Context overhead: ${contextOverhead} tokens`);
    console.log(`   Efficiency ratio: ${efficiencyRatio.toFixed(2)}x`);

    // Quality assessment
    const responseQualityImprovement = this.assessResponseQuality(without.response, with_.response);
    console.log(`   Response quality improvement: ${responseQualityImprovement}`);

    // Cost analysis (assuming $0.002 per 1K tokens for GPT-3.5)
    const costWithout = (without.total_tokens / 1000) * 0.002;
    const costWith = (with_.total_tokens / 1000) * 0.002;
    const costDifference = costWith - costWithout;

    console.log(`\n💰 Cost Analysis (GPT-3.5 pricing):`);
    console.log(`   Without context-rag: $${costWithout.toFixed(4)}`);
    console.log(`   With context-rag: $${costWith.toFixed(4)}`);
    console.log(`   Cost difference: ${costDifference > 0 ? '+' : ''}$${costDifference.toFixed(4)}`);

    // Recommendations
    console.log(`\n💡 Recommendation:`);
    if (tokenDifference < 0) {
      console.log(`   ✅ Context-rag saves tokens and likely improves quality!`);
    } else if (tokenDifference < 100) {
      console.log(`   📈 Small token overhead for potentially better context quality`);
    } else {
      console.log(`   ⚠️  Significant token overhead - evaluate if context quality justifies cost`);
    }

    return {
      session_id: sessionId,
      description: session.description,
      token_difference: tokenDifference,
      context_overhead: contextOverhead,
      efficiency_ratio: efficiencyRatio,
      cost_difference: costDifference,
      without_context: without,
      with_context: with_
    };
  }

  assessResponseQuality(responseWithout, responseWith) {
    // Simple heuristic for response quality
    const lengthDiff = responseWith.length - responseWithout.length;
    const hasMoreDetail = responseWith.length > responseWithout.length * 1.2;
    const hasCodeExamples = responseWith.includes('```') && !responseWithout.includes('```');
    const hasSpecificReferences = responseWith.includes('file:') || responseWith.includes('function') || responseWith.includes('class');

    let score = 0;
    if (hasMoreDetail) score += 25;
    if (hasCodeExamples) score += 30;
    if (hasSpecificReferences) score += 35;
    if (lengthDiff > 200) score += 10;

    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }

  // Save session results
  saveSession(sessionId, filename = null) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error('❌ Session not found');
      return;
    }

    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `token-comparison-${sessionId}-${timestamp}.json`;
    }

    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(session, null, 2));
    console.log(`💾 Session saved to: ${filename}`);
  }

  // List all sessions
  listSessions() {
    console.log('\n📋 All Sessions:');
    this.sessions.forEach(session => {
      const status = session.without_context && session.with_context ? '✅ Complete' : '⏳ Incomplete';
      console.log(`   ${session.id}: ${session.description} - ${status}`);
    });
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const tracker = new TokenTracker();

  if (args.length === 0) {
    console.log(`
🔍 Token Tracker Usage:

Interactive Mode:
  node token-tracker.js

Commands:
  node token-tracker.js start "Description"
  node token-tracker.js without <sessionId> "query" "response"  
  node token-tracker.js with <sessionId> "query" "context" "response"
  node token-tracker.js compare <sessionId>
  node token-tracker.js save <sessionId>

Example Workflow:
  1. sessionId=$(node token-tracker.js start "Authentication query")
  2. node token-tracker.js without $sessionId "How do I authenticate users?" "You can use JWT tokens..."
  3. # Get context: context-rag ai "How do I authenticate users?"
  4. node token-tracker.js with $sessionId "How do I authenticate users?" "Context from context-rag..." "Based on your codebase..."
  5. node token-tracker.js compare $sessionId
    `);
    return;
  }

  const command = args[0];

  switch (command) {
    case 'start':
      const description = args[1] || 'Token comparison';
      const sessionId = tracker.startSession(description);
      console.log(sessionId); // Output just the ID for scripting
      break;

    case 'without':
      const sessionId1 = parseInt(args[1]);
      const query1 = args[2];
      const response1 = args[3];
      tracker.recordWithoutContext(sessionId1, query1, response1);
      break;

    case 'with':
      const sessionId2 = parseInt(args[1]);
      const query2 = args[2];
      const context = args[3];
      const response2 = args[4];
      tracker.recordWithContext(sessionId2, query2, context, response2);
      break;

    case 'compare':
      const sessionId3 = parseInt(args[1]);
      tracker.compareSession(sessionId3);
      break;

    case 'save':
      const sessionId4 = parseInt(args[1]);
      const filename = args[2];
      tracker.saveSession(sessionId4, filename);
      break;

    case 'list':
      tracker.listSessions();
      break;

    default:
      console.error('❌ Unknown command:', command);
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TokenTracker;