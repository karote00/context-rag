const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class PluginManager {
  constructor(config) {
    this.config = config;
    this.plugins = new Map();
    this.transformers = [];
    this.embedders = new Map();
    this.pluginDir = '.context-rag/plugins';
    this.loadedPlugins = [];
  }

  async loadPlugins() {
    // Ensure plugin directory exists
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }

    // Load built-in transformers
    this.loadBuiltinTransformers();
    
    // Scan for external plugins
    await this.scanExternalPlugins();
    
    console.log(chalk.gray(`🔌 Loaded ${this.transformers.length} result transformers`));
  }

  loadBuiltinTransformers() {
    // Markdown formatter
    this.registerTransformer('markdown', {
      name: 'Markdown Formatter',
      description: 'Format results as markdown',
      transform: this.markdownTransformer.bind(this)
    });

    // Summary transformer
    this.registerTransformer('summary', {
      name: 'Summary Generator',
      description: 'Generate summary of search results',
      transform: this.summaryTransformer.bind(this)
    });

    // Context extractor
    this.registerTransformer('context-extract', {
      name: 'Context Extractor',
      description: 'Extract and highlight context information',
      transform: this.contextExtractorTransformer.bind(this)
    });

    // Code formatter
    this.registerTransformer('code', {
      name: 'Code Formatter',
      description: 'Format code results with syntax highlighting hints',
      transform: this.codeTransformer.bind(this)
    });
  }

  async scanExternalPlugins() {
    try {
      // Look for context-rag-plugin-* packages in node_modules
      const nodeModulesPath = 'node_modules';
      if (fs.existsSync(nodeModulesPath)) {
        const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('context-rag-plugin-')) {
            await this.loadExternalPlugin(entry.name);
          }
        }
      }

      // Also look in local plugins directory
      const localPluginsPath = 'plugins';
      if (fs.existsSync(localPluginsPath)) {
        const entries = fs.readdirSync(localPluginsPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith('context-rag-plugin-')) {
            await this.loadExternalPlugin(entry.name, localPluginsPath);
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not scan for external plugins: ${error.message}`));
    }
  }

  async loadExternalPlugin(pluginName, basePath = 'node_modules') {
    try {
      const pluginPath = path.join(basePath, pluginName);
      const packageJsonPath = path.join(pluginPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if it's a valid context-rag plugin
      if (!packageJson.keywords || !packageJson.keywords.includes('context-rag-plugin')) {
        return;
      }

      // Load the plugin
      const plugin = require(path.resolve(pluginPath));
      
      // Register transformers
      if (plugin.transformers) {
        for (const [name, transformer] of Object.entries(plugin.transformers)) {
          this.registerTransformer(`${pluginName}:${name}`, transformer);
        }
      }

      // Register embedders
      if (plugin.embedders) {
        for (const [name, embedder] of Object.entries(plugin.embedders)) {
          this.registerEmbedder(`${pluginName}:${name}`, embedder);
        }
      }

      this.loadedPlugins.push({
        name: pluginName,
        version: plugin.version || packageJson.version,
        description: plugin.description || packageJson.description,
        transformers: Object.keys(plugin.transformers || {}),
        embedders: Object.keys(plugin.embedders || {})
      });

      console.log(chalk.green(`✅ Loaded external plugin: ${pluginName}`));
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not load plugin ${pluginName}: ${error.message}`));
    }
  }

  registerTransformer(name, transformer) {
    if (!transformer.transform || typeof transformer.transform !== 'function') {
      throw new Error(`Transformer ${name} must have a transform function`);
    }

    this.transformers.push({
      name: name,
      ...transformer
    });

    this.plugins.set(name, transformer);
  }

  async transformResults(results, transformerNames = []) {
    if (transformerNames.length === 0) {
      return results;
    }

    let transformedResults = results;

    for (const transformerName of transformerNames) {
      const transformer = this.plugins.get(transformerName);
      
      if (!transformer) {
        console.warn(chalk.yellow(`⚠️  Transformer not found: ${transformerName}`));
        continue;
      }

      try {
        transformedResults = await transformer.transform(transformedResults, this.config);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Transformer ${transformerName} failed: ${error.message}`));
      }
    }

    return transformedResults;
  }

  registerEmbedder(name, embedder) {
    if (!embedder.create || typeof embedder.create !== 'function') {
      throw new Error(`Embedder ${name} must have a create function`);
    }

    this.embedders.set(name, embedder);
  }

  getEmbedder(name) {
    return this.embedders.get(name);
  }

  listTransformers() {
    return this.transformers.map(t => ({
      name: t.name,
      description: t.description || 'No description available'
    }));
  }

  listEmbedders() {
    return Array.from(this.embedders.entries()).map(([name, embedder]) => ({
      name: name,
      description: embedder.description || 'No description available'
    }));
  }

  listLoadedPlugins() {
    return this.loadedPlugins;
  }

  // Built-in transformers
  async markdownTransformer(results) {
    const markdown = {
      format: 'markdown',
      content: this.generateMarkdown(results),
      metadata: {
        total_results: results.length,
        generated_at: new Date().toISOString()
      }
    };

    return markdown;
  }

  generateMarkdown(results) {
    let md = `# Search Results\n\n`;
    md += `Found ${results.length} relevant results:\n\n`;

    results.forEach((result, index) => {
      const similarity = (result.similarity * 100).toFixed(1);
      
      md += `## ${index + 1}. ${result.file_path}\n\n`;
      md += `**Similarity:** ${similarity}%`;
      
      if (result.context_type) {
        md += ` | **Context:** ${result.context_type}`;
      }
      
      md += `\n\n`;
      md += `\`\`\`\n${result.content}\n\`\`\`\n\n`;
      md += `---\n\n`;
    });

    return md;
  }

  async summaryTransformer(results) {
    const contextResults = results.filter(r => r.is_context);
    const codeResults = results.filter(r => !r.is_context);
    
    const summary = {
      format: 'summary',
      overview: {
        total_results: results.length,
        context_results: contextResults.length,
        code_results: codeResults.length,
        avg_similarity: results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      },
      context_summary: this.summarizeContextResults(contextResults),
      code_summary: this.summarizeCodeResults(codeResults),
      top_result: results[0] || null,
      generated_at: new Date().toISOString()
    };

    return summary;
  }

  summarizeContextResults(contextResults) {
    if (contextResults.length === 0) {
      return { message: 'No structured context found' };
    }

    const contextTypes = [...new Set(contextResults.map(r => r.context_type))];
    
    return {
      total: contextResults.length,
      types: contextTypes,
      top_context: contextResults[0]?.context_type || null,
      coverage: contextTypes.length
    };
  }

  summarizeCodeResults(codeResults) {
    if (codeResults.length === 0) {
      return { message: 'No code files found' };
    }

    const fileTypes = [...new Set(codeResults.map(r => {
      const ext = r.file_path.split('.').pop();
      return ext;
    }))];

    return {
      total: codeResults.length,
      file_types: fileTypes,
      files: [...new Set(codeResults.map(r => r.file_path))]
    };
  }

  async contextExtractorTransformer(results) {
    const extracted = {
      format: 'context-extract',
      structured_context: {},
      code_context: {},
      metadata: {
        extraction_method: 'context-rag-builtin',
        extracted_at: new Date().toISOString()
      }
    };

    // Group by context type
    const contextResults = results.filter(r => r.is_context);
    contextResults.forEach(result => {
      const type = result.context_type || 'general';
      if (!extracted.structured_context[type]) {
        extracted.structured_context[type] = [];
      }
      extracted.structured_context[type].push({
        content: result.content,
        similarity: result.similarity,
        source: result.file_path
      });
    });

    // Group code by file type
    const codeResults = results.filter(r => !r.is_context);
    codeResults.forEach(result => {
      const ext = result.file_path.split('.').pop() || 'unknown';
      if (!extracted.code_context[ext]) {
        extracted.code_context[ext] = [];
      }
      extracted.code_context[ext].push({
        file: result.file_path,
        snippet: result.snippet,
        similarity: result.similarity
      });
    });

    return extracted;
  }

  async codeTransformer(results) {
    const codeFormatted = {
      format: 'code',
      files: [],
      metadata: {
        total_files: 0,
        languages: [],
        formatted_at: new Date().toISOString()
      }
    };

    const fileMap = new Map();
    
    results.forEach(result => {
      const filePath = result.file_path;
      const ext = filePath.split('.').pop() || 'txt';
      
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          language: this.detectLanguage(ext),
          chunks: [],
          total_similarity: 0
        });
      }
      
      const file = fileMap.get(filePath);
      file.chunks.push({
        content: result.content,
        similarity: result.similarity,
        chunk_index: result.chunk_index
      });
      file.total_similarity += result.similarity;
    });

    // Convert to array and sort by relevance
    codeFormatted.files = Array.from(fileMap.values())
      .sort((a, b) => b.total_similarity - a.total_similarity);

    codeFormatted.metadata.total_files = codeFormatted.files.length;
    codeFormatted.metadata.languages = [...new Set(codeFormatted.files.map(f => f.language))];

    return codeFormatted;
  }

  detectLanguage(extension) {
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql'
    };

    return languageMap[extension.toLowerCase()] || 'text';
  }
}

module.exports = { PluginManager };