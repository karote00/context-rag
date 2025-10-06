const chalk = require('chalk');
const { SearchService } = require('./search');

/**
 * Expanded Search Service
 * 
 * Implements multi-pass context discovery using deterministic rules
 * to find related context without AI assistance.
 */
class ExpandedSearchService extends SearchService {
  constructor(config) {
    super(config);
    this.expansionRules = this.loadExpansionRules();
    this.coOccurrenceMap = new Map();
  }

  /**
   * Multi-pass search with context expansion
   */
  async expandedSearch(query, options = {}) {
    const maxPasses = options.maxPasses || 3;
    const maxResults = options.topK || this.config.search.top_k || 5;
    
    console.log(chalk.blue(`🔍 Starting expanded search with ${maxPasses} passes...`));
    
    let allResults = [];
    let searchTerms = this.extractSearchTerms(query);
    let processedTerms = new Set();

    for (let pass = 0; pass < maxPasses; pass++) {
      console.log(chalk.gray(`   Pass ${pass + 1}: Searching for [${searchTerms.join(', ')}]`));
      
      // Filter out already processed terms
      const newTerms = searchTerms.filter(term => !processedTerms.has(term));
      if (newTerms.length === 0) {
        console.log(chalk.gray(`   No new terms to search, stopping at pass ${pass + 1}`));
        break;
      }

      // Perform search with current terms
      const passResults = await this.searchWithTerms(newTerms, { topK: maxResults * 2 });
      if (passResults.length === 0) {
        console.log(chalk.gray(`   No results found in pass ${pass + 1}`));
        break;
      }

      // Add to all results
      allResults = this.mergeResults(allResults, passResults);
      
      // Mark terms as processed
      newTerms.forEach(term => processedTerms.add(term));
      
      // Extract new search terms for next pass
      const expandedTerms = this.expandSearchTerms(passResults, query);
      searchTerms = [...searchTerms, ...expandedTerms];
      
      console.log(chalk.gray(`   Found ${passResults.length} results, discovered ${expandedTerms.length} new terms`));
    }

    // Deduplicate and rank final results
    const finalResults = this.deduplicateAndRank(allResults, maxResults);
    
    console.log(chalk.green(`✅ Expanded search completed: ${finalResults.length} unique results`));
    return finalResults;
  }

  /**
   * Extract search terms from query
   */
  extractSearchTerms(query) {
    // Basic term extraction - can be enhanced
    const terms = query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !this.isStopWord(term));
    
    return [...new Set(terms)];
  }

  /**
   * Search with specific terms
   */
  async searchWithTerms(terms, options = {}) {
    const combinedQuery = terms.join(' ');
    return await this.search(combinedQuery, options);
  }

  /**
   * Expand search terms based on found results
   */
  expandSearchTerms(results, originalQuery) {
    const expandedTerms = new Set();

    // Apply expansion rules
    results.forEach(result => {
      const ruleExpansions = this.applyExpansionRules(result, originalQuery);
      ruleExpansions.forEach(term => expandedTerms.add(term));

      const referenceExpansions = this.extractCodeReferences(result);
      referenceExpansions.forEach(term => expandedTerms.add(term));

      const coOccurrenceExpansions = this.getCoOccurrenceTerms(result);
      coOccurrenceExpansions.forEach(term => expandedTerms.add(term));
    });

    return Array.from(expandedTerms);
  }

  /**
   * Apply pattern-based expansion rules
   */
  applyExpansionRules(result, originalQuery) {
    const expandedTerms = [];
    const content = result.content.toLowerCase();

    // Check each expansion rule
    Object.entries(this.expansionRules).forEach(([pattern, rule]) => {
      if (rule.triggers.some(trigger => content.includes(trigger.toLowerCase()))) {
        // Check if this rule is relevant to the original query
        if (this.isRuleRelevant(rule, originalQuery)) {
          expandedTerms.push(...rule.expands_to);
        }
      }
    });

    return expandedTerms;
  }

  /**
   * Extract code references (function calls, imports, etc.)
   */
  extractCodeReferences(result) {
    const references = [];
    const content = result.content;

    // Function calls: someFunction()
    const functionCalls = content.match(/\b\w+\s*\(/g);
    if (functionCalls) {
      functionCalls.forEach(call => {
        const funcName = call.replace(/\s*\($/, '');
        if (funcName.length > 2 && !this.isCommonFunction(funcName)) {
          references.push(funcName);
        }
      });
    }

    // Import statements
    const imports = content.match(/(?:import|require)\s*\(?['"]([\w\-\/\.]+)['"]\)?/g);
    if (imports) {
      imports.forEach(imp => {
        const match = imp.match(/['"]([\w\-\/\.]+)['"]/);
        if (match) {
          const moduleName = match[1].split('/').pop().replace(/\.(js|ts|jsx|tsx)$/, '');
          references.push(moduleName);
        }
      });
    }

    // Class/interface names
    const classNames = content.match(/(?:class|interface)\s+(\w+)/g);
    if (classNames) {
      classNames.forEach(cls => {
        const match = cls.match(/(?:class|interface)\s+(\w+)/);
        if (match) {
          references.push(match[1]);
        }
      });
    }

    return references.filter(ref => ref.length > 2);
  }

  /**
   * Get co-occurrence terms (simplified implementation)
   */
  getCoOccurrenceTerms(result) {
    // This would be enhanced with actual co-occurrence analysis
    // For now, return terms that commonly appear together
    const content = result.content.toLowerCase();
    const coOccurrenceTerms = [];

    // Simple co-occurrence patterns
    if (content.includes('mousedown')) {
      coOccurrenceTerms.push('mousemove', 'mouseup', 'preventDefault');
    }
    if (content.includes('fetch') || content.includes('api')) {
      coOccurrenceTerms.push('error', 'response', 'catch', 'async');
    }
    if (content.includes('database') || content.includes('query')) {
      coOccurrenceTerms.push('transaction', 'connection', 'schema');
    }

    return coOccurrenceTerms;
  }

  /**
   * Check if expansion rule is relevant to original query
   */
  isRuleRelevant(rule, originalQuery) {
    const queryLower = originalQuery.toLowerCase();
    
    // Check if query contains any of the rule's context keywords
    if (rule.context_keywords) {
      return rule.context_keywords.some(keyword => 
        queryLower.includes(keyword.toLowerCase())
      );
    }
    
    return true; // Default to relevant if no context keywords
  }

  /**
   * Merge results from different passes
   */
  mergeResults(existingResults, newResults) {
    const merged = [...existingResults];
    const existingPaths = new Set(existingResults.map(r => `${r.file_path}:${r.chunk_index}`));

    newResults.forEach(result => {
      const key = `${result.file_path}:${result.chunk_index}`;
      if (!existingPaths.has(key)) {
        merged.push(result);
        existingPaths.add(key);
      }
    });

    return merged;
  }

  /**
   * Deduplicate and rank final results
   */
  deduplicateAndRank(results, maxResults) {
    // Remove exact duplicates
    const uniqueResults = [];
    const seen = new Set();

    results.forEach(result => {
      const key = `${result.file_path}:${result.chunk_index}`;
      if (!seen.has(key)) {
        uniqueResults.push(result);
        seen.add(key);
      }
    });

    // Sort by similarity score
    uniqueResults.sort((a, b) => b.similarity - a.similarity);

    // Take top results
    return uniqueResults.slice(0, maxResults);
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Check if function name is too common to be useful
   */
  isCommonFunction(funcName) {
    const commonFunctions = ['console', 'log', 'error', 'warn', 'info', 'push', 'pop', 'map', 'filter', 'reduce'];
    return commonFunctions.includes(funcName.toLowerCase());
  }

  /**
   * Load expansion rules configuration
   */
  loadExpansionRules() {
    return {
      // UI Interaction Patterns
      mouse_events: {
        triggers: ['mousedown', 'click', 'drag', 'resize'],
        expands_to: ['mousemove', 'mouseup', 'preventDefault', 'state', 'position'],
        context_keywords: ['ui', 'interaction', 'event', 'mouse', 'drag', 'resize']
      },

      // API Patterns
      api_calls: {
        triggers: ['fetch', 'axios', 'request', 'api', 'endpoint'],
        expands_to: ['error', 'response', 'catch', 'async', 'await', 'loading'],
        context_keywords: ['api', 'http', 'request', 'server', 'client']
      },

      // Database Patterns
      database_operations: {
        triggers: ['query', 'insert', 'update', 'delete', 'select'],
        expands_to: ['transaction', 'connection', 'schema', 'validation', 'migration'],
        context_keywords: ['database', 'db', 'sql', 'query', 'data']
      },

      // Authentication Patterns
      authentication: {
        triggers: ['login', 'auth', 'token', 'jwt', 'session'],
        expands_to: ['password', 'hash', 'bcrypt', 'middleware', 'validation', 'user'],
        context_keywords: ['auth', 'login', 'security', 'user', 'session']
      },

      // State Management Patterns
      state_management: {
        triggers: ['state', 'redux', 'context', 'store'],
        expands_to: ['reducer', 'action', 'dispatch', 'selector', 'provider'],
        context_keywords: ['state', 'management', 'store', 'data']
      },

      // Testing Patterns
      testing: {
        triggers: ['test', 'spec', 'jest', 'mocha', 'describe'],
        expands_to: ['mock', 'stub', 'expect', 'assert', 'beforeEach', 'afterEach'],
        context_keywords: ['test', 'testing', 'spec', 'unit', 'integration']
      }
    };
  }
}

module.exports = { ExpandedSearchService };