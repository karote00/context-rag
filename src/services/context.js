const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ContextService {
  constructor(config) {
    this.config = config;
    this.contextPath = 'docs';
    this.contextTypes = [
      'architecture',
      'golden-path',
      'design-principles',
      'constraints',
      'requirements',
      'api-specs',
      'data-models'
    ];
  }

  async detectProjectContext() {
    if (!fs.existsSync(this.contextPath)) {
      return null;
    }

    const contextFiles = [];

    try {
      const entries = fs.readdirSync(this.contextPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const contextType = this.identifyContextType(entry.name);
          const filePath = path.join(this.contextPath, entry.name);

          contextFiles.push({
            type: contextType,
            name: entry.name,
            path: filePath,
            size: fs.statSync(filePath).size
          });
        }
      }

      if (contextFiles.length > 0) {
        console.log(chalk.blue(`🎯 Detected project context with ${contextFiles.length} files`));
        return {
          path: this.contextPath,
          files: contextFiles,
          totalFiles: contextFiles.length
        };
      }

    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not scan context directory: ${error.message}`));
    }

    return null;
  }

  identifyContextType(filename) {
    const name = filename.toLowerCase().replace('.md', '');

    for (const type of this.contextTypes) {
      if (name.includes(type) || name.includes(type.replace('-', '_'))) {
        return type;
      }
    }

    // Try to infer from common patterns
    if (name.includes('arch')) return 'architecture';
    if (name.includes('golden') || name.includes('path')) return 'golden-path';
    if (name.includes('design') || name.includes('principle')) return 'design-principles';
    if (name.includes('constraint') || name.includes('limit')) return 'constraints';
    if (name.includes('requirement') || name.includes('spec')) return 'requirements';
    if (name.includes('api') || name.includes('endpoint')) return 'api-specs';
    if (name.includes('data') || name.includes('model') || name.includes('schema')) return 'data-models';

    return 'general';
  }

  async indexContextFiles(indexer) {
    const contextInfo = await this.detectProjectContext();

    if (!contextInfo) {
      return null;
    }

    console.log(chalk.blue('🎯 Indexing project context files...'));

    const contextChunks = [];
    let totalChunks = 0;

    for (const contextFile of contextInfo.files) {
      try {
        const content = fs.readFileSync(contextFile.path, 'utf8');
        const chunks = indexer.chunkContent(content);
        const crypto = require('crypto');
        const fileHash = crypto.createHash('sha256').update(content).digest('hex');
        const stats = fs.statSync(contextFile.path);

        chunks.forEach((chunk, index) => {
          contextChunks.push({
            file_path: contextFile.path,
            content: chunk,
            chunk_index: index,
            file_hash: fileHash,
            modified_time: stats.mtime.getTime(),
            context_type: contextFile.type,
            is_context: true,
            priority: this.getContextPriority(contextFile.type)
          });
          totalChunks++;
        });

        console.log(chalk.gray(`   📄 ${contextFile.name} (${contextFile.type}): ${chunks.length} chunks`));

      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not process ${contextFile.path}: ${error.message}`));
      }
    }

    console.log(chalk.green(`✅ Indexed ${totalChunks} context chunks from ${contextInfo.files.length} files`));

    return {
      chunks: contextChunks,
      metadata: {
        context_path: contextInfo.path,
        context_files: contextInfo.files.length,
        total_chunks: totalChunks,
        indexed_at: new Date().toISOString()
      }
    };
  }

  getContextPriority(contextType) {
    // Higher priority means more relevant for general queries
    const priorities = {
      'architecture': 10,
      'golden-path': 9,
      'design-principles': 8,
      'requirements': 7,
      'constraints': 6,
      'api-specs': 5,
      'data-models': 4,
      'general': 3
    };

    return priorities[contextType] || 3;
  }

  async searchContext(query, allResults, maxContextResults = 3) {
    // Filter results to prioritize context files
    const contextResults = allResults.filter(result => result.is_context);
    const regularResults = allResults.filter(result => !result.is_context);

    if (contextResults.length === 0) {
      return allResults; // No context available, return regular results
    }

    // Sort context results by priority and similarity
    contextResults.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return b.similarity - a.similarity;
    });

    // Take top context results and mix with regular results
    const topContextResults = contextResults.slice(0, maxContextResults);
    const remainingSlots = Math.max(0, allResults.length - topContextResults.length);
    const topRegularResults = regularResults.slice(0, remainingSlots);

    // Combine and sort by similarity
    const combinedResults = [...topContextResults, ...topRegularResults];
    combinedResults.sort((a, b) => b.similarity - a.similarity);

    return combinedResults;
  }

  async enhanceSearchResults(results) {
    // Add context type information to results
    return results.map(result => {
      if (result.is_context) {
        return {
          ...result,
          source_type: 'project-context',
          context_category: result.context_type,
          priority_score: result.priority || 0
        };
      } else {
        return {
          ...result,
          source_type: 'project-file',
          context_category: 'code',
          priority_score: 0
        };
      }
    });
  }

  async generateContextSummary(contextResults) {
    if (contextResults.length === 0) {
      return null;
    }

    const contextTypes = [...new Set(contextResults.map(r => r.context_type))];
    const summary = {
      total_context_results: contextResults.length,
      context_types_found: contextTypes,
      top_context_type: contextTypes[0],
      context_coverage: contextTypes.length / this.contextTypes.length
    };

    return summary;
  }
}

module.exports = { ContextService };