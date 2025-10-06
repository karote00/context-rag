const chalk = require('chalk');

/**
 * Context Expansion Service
 * 
 * Implements iterative context discovery through:
 * 1. Pattern-based expansion rules
 * 2. Co-occurrence analysis
 * 3. Reference following
 * 4. Multi-pass search refinement
 */

class ContextExpansionService {
  constructor(config) {
    this.config = config;
    this.expansionRules = this.loadExpansionRules();
    this.coOccurrenceMap = new Map();
    this.maxPasses = config.expansion?.max_passes || 3;
    this.enabled = config.expansion?.enabled !== false; // Default enabled
  }

  loadExpansionRules() {
    return {
      // UI/Mouse Interaction Patterns
      mouse_events: {
        triggers: ['mousedown', 'click', 'drag', 'resize'],
        expands_to: ['mousemove', 'mouseup', 'event.preventDefault', 'state_management', 'bounds_checking'],
        confidence: 0.9
      },
      
      // API/Network Patterns
      api_operations: {
        triggers: ['fetch', 'request', 'api', 'endpoint', 'http'],
        expands_to: ['error_handling', 'response_parsing', 'loading_state', 'retry_logic', 'timeout'],
        confidence: 0.85
      },
      
      // Database Patterns
      database_operations: {
        triggers: ['query', 'insert', 'update', 'delete', 'transaction'],
        expands_to: ['validation', 'connection_management', 'error_handling', 'migration', 'schema'],
        confidence: 0.8
      },
      
      // Authentication Patterns
      auth_patterns: {
        triggers: ['login', 'auth', 'authenticate', 'token', 'session'],
        expands_to: ['validation', 'middleware', 'encryption', 'logout', 'permissions', 'security'],
        confidence: 0.88
      },
      
      // State Management Patterns
      state_patterns: {
        triggers: ['state', 'store', 'reducer', 'action'],
        expands_to: ['dispatch', 'selector', 'middleware', 'persistence', 'subscription'],
        confidence: 0.82
      },
      
      // Component Patterns
      component_patterns: {
        triggers: ['component', 'render', 'props', 'jsx'],
        expands_to: ['lifecycle', 'hooks', 'context', 'styling', 'events'],
        confidence: 0.75
      },
      
      // Testing Patterns
      testing_patterns: {
        triggers: ['test', 'spec', 'mock', 'assert'],
        expands_to: ['setup', 'teardown', 'fixtures', 'coverage', 'integration'],
        confidence: 0.8
      }
    };
  }

  async performExpandedSearch(query, searchService, options = {}) {
    if (!this.enabled) {
      return await searchService.search(query, options);
    }

    console.log(chalk.blue('🔍 Starting expanded context discovery...'));
    
    let allResults = [];
    let searchTerms = this.extractInitialTerms(query);
    let usedTerms = new Set();
    
    for (let pass = 0; pass < this.maxPasses; pass++) {
      console.log(chalk.gray(`   Pass ${pass + 1}: Searching with ${searchTerms.length} terms`));
      
      // Search with current terms
      const passQuery = this.buildExpandedQuery(query, searchTerms);
      const passResults = await searchService.search(passQuery, {
        ...options,
        topK: options.topK * 2 // Get more results for analysis
      });
      
      if (passResults.length === 0) break;
      
      // Add new results
      const newResults = this.filterNewResults(passResults, allResults);
      allResults.push(...newResults);
      
      // Extract expansion terms from results
      const expansionTerms = this.extractExpansionTerms(passResults, usedTerms);
      
      if (expansionTerms.length === 0) {
        console.log(chalk.gray(`   No new expansion terms found, stopping at pass ${pass + 1}`));
        break;
      }
      
      // Add new terms for next pass
      expansionTerms.forEach(term => {
        searchTerms.push(term);
        usedTerms.add(term);
      });
      
      console.log(chalk.gray(`   Found ${expansionTerms.length} expansion terms: ${expansionTerms.slice(0, 3).join(', ')}${expansionTerms.length > 3 ? '...' : ''}`));
    }
    
    // Final ranking and filtering
    const finalResults = this.rankExpandedResults(allResults, query);
    const topResults = finalResults.slice(0, options.topK || 5);
    
    console.log(chalk.green(`✅ Expanded search completed: ${topResults.length} results from ${allResults.length} total`));
    
    return topResults;
  }

  extractInitialTerms(query) {
    // Extract meaningful terms from the query
    const terms = query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'for', 'how', 'can', 'what', 'when', 'where'].includes(term));
    
    return terms;
  }

  buildExpandedQuery(originalQuery, additionalTerms) {
    // Combine original query with expansion terms
    const expandedTerms = additionalTerms.slice(0, 10); // Limit to prevent query explosion
    return `${originalQuery} ${expandedTerms.join(' ')}`;
  }

  extractExpansionTerms(results, usedTerms) {
    const expansionTerms = new Set();
    
    results.forEach(result => {
      // 1. Pattern-based expansion
      const patternTerms = this.getPatternExpansionTerms(result.content);
      patternTerms.forEach(term => expansionTerms.add(term));
      
      // 2. Reference following
      const referenceTerms = this.extractCodeReferences(result.content);
      referenceTerms.forEach(term => expansionTerms.add(term));
      
      // 3. Co-occurrence expansion
      const coOccurrenceTerms = this.getCoOccurrenceTerms(result.content);
      coOccurrenceTerms.forEach(term => expansionTerms.add(term));
    });
    
    // Filter out already used terms
    return Array.from(expansionTerms).filter(term => !usedTerms.has(term));
  }

  getPatternExpansionTerms(content) {
    const expansionTerms = [];
    
    Object.entries(this.expansionRules).forEach(([patternName, rule]) => {
      const hasPattern = rule.triggers.some(trigger => 
        content.toLowerCase().includes(trigger.toLowerCase())
      );
      
      if (hasPattern) {
        // Add expansion terms with confidence weighting
        rule.expands_to.forEach(term => {
          if (Math.random() < rule.confidence) {
            expansionTerms.push(term);
          }
        });
      }
    });
    
    return expansionTerms;
  }

  extractCodeReferences(content) {
    const references = [];
    
    // Function calls: functionName()
    const functionCalls = content.match(/\b\w+\(/g);
    if (functionCalls) {
      functionCalls.forEach(call => {
        const funcName = call.slice(0, -1);
        if (funcName.length > 2 && !this.isCommonWord(funcName)) {
          references.push(funcName);
        }
      });
    }
    
    // Variable references: this.variableName, obj.method
    const objectRefs = content.match(/\b\w+\.\w+/g);
    if (objectRefs) {
      objectRefs.forEach(ref => {
        const parts = ref.split('.');
        parts.forEach(part => {
          if (part.length > 2 && !this.isCommonWord(part)) {
            references.push(part);
          }
        });
      });
    }
    
    // Import statements
    const imports = content.match(/(?:import|require)\s*\(?['"](.*?)['"]|from\s+['"](.*?)['"]/g);
    if (imports) {
      imports.forEach(imp => {
        const match = imp.match(/['"](.*?)['"]/);
        if (match) {
          const moduleName = match[1].split('/').pop().replace(/\.(js|ts|jsx|tsx)$/, '');
          if (moduleName.length > 2) {
            references.push(moduleName);
          }
        }
      });
    }
    
    return references.slice(0, 10); // Limit to prevent explosion
  }

  getCoOccurrenceTerms(content) {
    // Simple co-occurrence based on content analysis
    const terms = [];
    const contentLower = content.toLowerCase();
    
    // If we see certain patterns, suggest related terms
    if (contentLower.includes('event') && contentLower.includes('mouse')) {
      terms.push('event_listener', 'event_handler', 'event_delegation');
    }
    
    if (contentLower.includes('async') || contentLower.includes('await')) {
      terms.push('promise', 'error_handling', 'try_catch');
    }
    
    if (contentLower.includes('component') || contentLower.includes('render')) {
      terms.push('props', 'state', 'lifecycle', 'hooks');
    }
    
    return terms;
  }

  filterNewResults(newResults, existingResults) {
    const existingPaths = new Set(existingResults.map(r => r.file_path + ':' + r.chunk_index));
    
    return newResults.filter(result => {
      const key = result.file_path + ':' + result.chunk_index;
      return !existingPaths.has(key);
    });
  }

  rankExpandedResults(results, originalQuery) {
    // Re-rank results considering both original query relevance and expansion relevance
    const originalTerms = this.extractInitialTerms(originalQuery);
    
    return results.map(result => {
      // Calculate original query relevance
      const originalRelevance = this.calculateTermRelevance(result.content, originalTerms);
      
      // Boost score based on original query match
      const boostedSimilarity = result.similarity * (1 + originalRelevance * 0.2);
      
      return {
        ...result,
        similarity: Math.min(boostedSimilarity, 1.0),
        expansion_boost: originalRelevance * 0.2,
        is_expanded: result.expansion_pass > 0
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  calculateTermRelevance(content, terms) {
    const contentLower = content.toLowerCase();
    let relevanceScore = 0;
    
    terms.forEach(term => {
      if (contentLower.includes(term.toLowerCase())) {
        relevanceScore += 1;
      }
    });
    
    return relevanceScore / terms.length;
  }

  isCommonWord(word) {
    const commonWords = new Set([
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'return', 'true', 'false', 'null', 'undefined', 'this', 'that',
      'get', 'set', 'add', 'remove', 'update', 'delete', 'create',
      'data', 'item', 'value', 'key', 'id', 'name', 'type', 'class'
    ]);
    
    return commonWords.has(word.toLowerCase()) || word.length < 3;
  }

  // Build co-occurrence map during indexing
  buildCoOccurrenceMap(indexData) {
    console.log(chalk.blue('🧠 Building co-occurrence patterns...'));
    
    const coOccurrences = new Map();
    
    indexData.chunks.forEach(chunk => {
      const terms = this.extractTermsFromContent(chunk.content);
      
      // Build co-occurrence relationships
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          const term1 = terms[i];
          const term2 = terms[j];
          
          // Record co-occurrence
          this.recordCoOccurrence(coOccurrences, term1, term2);
          this.recordCoOccurrence(coOccurrences, term2, term1);
        }
      }
    });
    
    this.coOccurrenceMap = coOccurrences;
    console.log(chalk.gray(`   Built co-occurrence map with ${coOccurrences.size} term relationships`));
  }

  recordCoOccurrence(map, term1, term2) {
    if (!map.has(term1)) {
      map.set(term1, new Map());
    }
    
    const term1Map = map.get(term1);
    const currentCount = term1Map.get(term2) || 0;
    term1Map.set(term2, currentCount + 1);
  }

  extractTermsFromContent(content) {
    // Extract meaningful terms from content
    const terms = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !this.isCommonWord(term));
    
    return [...new Set(terms)]; // Remove duplicates
  }

  getCoOccurrenceExpansionTerms(terms) {
    const expansionTerms = new Set();
    
    terms.forEach(term => {
      const coOccurrences = this.coOccurrenceMap.get(term);
      if (coOccurrences) {
        // Get top co-occurring terms
        const sortedCoOccurrences = Array.from(coOccurrences.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5); // Top 5 co-occurring terms
        
        sortedCoOccurrences.forEach(([coTerm, frequency]) => {
          if (frequency > 2) { // Minimum frequency threshold
            expansionTerms.add(coTerm);
          }
        });
      }
    });
    
    return Array.from(expansionTerms);
  }

  // Analyze search results to suggest missing context
  analyzeContextGaps(query, results) {
    const gaps = [];
    const foundPatterns = new Set();
    
    // Identify patterns in current results
    results.forEach(result => {
      Object.entries(this.expansionRules).forEach(([patternName, rule]) => {
        const hasPattern = rule.triggers.some(trigger => 
          result.content.toLowerCase().includes(trigger.toLowerCase())
        );
        
        if (hasPattern) {
          foundPatterns.add(patternName);
        }
      });
    });
    
    // Check for missing related terms in found patterns
    foundPatterns.forEach(patternName => {
      const rule = this.expansionRules[patternName];
      const missingTerms = rule.expands_to.filter(term => 
        !results.some(result => 
          result.content.toLowerCase().includes(term.toLowerCase())
        )
      );
      
      if (missingTerms.length > 0) {
        gaps.push({
          pattern: patternName,
          missing_terms: missingTerms,
          confidence: rule.confidence,
          suggestion: this.generateSuggestion(patternName, missingTerms)
        });
      }
    });
    
    return gaps;
  }

  generateSuggestion(patternName, missingTerms) {
    const suggestions = {
      mouse_events: `Consider including complete mouse event lifecycle: ${missingTerms.join(', ')}`,
      api_operations: `API calls typically need: ${missingTerms.join(', ')}`,
      database_operations: `Database operations should include: ${missingTerms.join(', ')}`,
      auth_patterns: `Authentication systems usually require: ${missingTerms.join(', ')}`,
      state_patterns: `State management often involves: ${missingTerms.join(', ')}`,
      component_patterns: `Component implementations typically need: ${missingTerms.join(', ')}`,
      testing_patterns: `Testing suites should include: ${missingTerms.join(', ')}`
    };
    
    return suggestions[patternName] || `Consider adding: ${missingTerms.join(', ')}`;
  }

  // Enhanced search with iterative discovery
  async searchWithExpansion(query, searchService, options = {}) {
    const startTime = performance.now();
    
    // Perform expanded search
    const results = await this.performExpandedSearch(query, searchService, options);
    
    // Analyze for potential gaps
    const contextGaps = this.analyzeContextGaps(query, results);
    
    const processingTime = performance.now() - startTime;
    
    return {
      results: results,
      context_gaps: contextGaps,
      expansion_stats: {
        processing_time_ms: Math.round(processingTime),
        expansion_enabled: this.enabled,
        passes_used: Math.min(this.maxPasses, 3),
        gaps_detected: contextGaps.length
      }
    };
  }

  // Update configuration for expansion settings
  updateExpansionConfig(newConfig) {
    this.enabled = newConfig.enabled !== false;
    this.maxPasses = newConfig.max_passes || 3;
    
    if (newConfig.custom_rules) {
      Object.assign(this.expansionRules, newConfig.custom_rules);
    }
  }
}

module.exports = { ContextExpansionService };