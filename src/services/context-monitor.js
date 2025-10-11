const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const chalk = require('chalk');

/**
 * Specs monitoring service
 * Watches feature implementation docs and rebuilds cache when specs change
 * Monitors: requirements, design docs, tasks, feature specifications
 */
class SpecsMonitor {
  constructor(config = {}) {
    this.config = config;
    this.watcher = null;
    this.isWatching = false;
    this.onChangeCallback = null;
    
    // Get context paths from config, with sensible defaults
    this.contextPaths = this.getContextPaths();
  }
  
  /**
   * Get specs paths from config or use defaults
   * This monitors feature implementation docs, not general project context
   */
  getContextPaths() {
    // Check if user configured specs paths
    if (this.config.specs && this.config.specs.include) {
      return this.config.specs.include;
    }
    
    // Default specs paths - feature implementation docs
    return [
      '.kiro/specs/',
      'requirements/',
      'design/'
    ];
  }
  
  /**
   * Simple discovery of context files in configured paths
   * @returns {Object} Context discovery results
   */
  async discoverContextFiles() {
    const discovered = {
      directories: [],
      files: [],
      totalFiles: 0
    };
    
    for (const contextPath of this.contextPaths) {
      if (fs.existsSync(contextPath) && fs.statSync(contextPath).isDirectory()) {
        const files = await this.scanDirectory(contextPath);
        
        if (files.length > 0) {
          discovered.directories.push({
            path: contextPath,
            files: files
          });
          
          discovered.files.push(...files);
          discovered.totalFiles += files.length;
        }
      }
    }
    
    return discovered;
  }
  
  /**
   * Simple directory scan for context files
   * @param {string} dirPath - Directory path to scan
   * @returns {Array} Array of file paths
   */
  async scanDirectory(dirPath) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isContextFile(entry.name)) {
          files.push({
            path: fullPath,
            name: entry.name,
            size: fs.statSync(fullPath).size,
            modified: fs.statSync(fullPath).mtime
          });
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not scan directory ${dirPath}: ${error.message}`));
    }
    
    return files;
  }
  

  
  /**
   * Simple check if a file is a specs file (feature implementation doc)
   * @param {string} fileName - Name of the file
   * @returns {boolean} True if it's a specs file
   */
  isContextFile(fileName) {
    // Get exclude patterns from specs config
    const excludePatterns = this.config.specs?.exclude || [
      'node_modules',
      '.git',
      'package-lock.json',
      '*.log'
    ];
    
    // Check if file should be excluded
    for (const pattern of excludePatterns) {
      if (fileName.includes(pattern.replace('*', ''))) {
        return false;
      }
    }
    
    // Get include extensions from specs config
    const includeExtensions = this.config.specs?.extensions || ['.md', '.txt', '.yaml', '.yml', '.json'];
    const ext = path.extname(fileName).toLowerCase();
    
    return includeExtensions.includes(ext);
  }
  
  /**
   * Start watching configured context paths for changes
   * @param {Function} onChangeCallback - Callback for when changes occur
   */
  async startWatching(onChangeCallback) {
    if (this.isWatching) {
      await this.stopWatching();
    }
    
    this.onChangeCallback = onChangeCallback;
    
    // Find existing context directories to watch
    const existingPaths = this.contextPaths.filter(contextPath => 
      fs.existsSync(contextPath) && fs.statSync(contextPath).isDirectory()
    );
    
    if (existingPaths.length === 0) {
      console.log(chalk.yellow('📁 No specs directories found to watch'));
      console.log(chalk.gray('   Configure specs.include in .context-rag.config.json'));
      return;
    }
    
    // Get exclude patterns from specs config
    const excludePatterns = this.config.specs?.exclude || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log'
    ];
    
    this.watcher = chokidar.watch(existingPaths, {
      ignored: excludePatterns,
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('add', (filePath) => this.handleFileChange('added', filePath));
    this.watcher.on('change', (filePath) => this.handleFileChange('modified', filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileChange('deleted', filePath));
    
    this.watcher.on('error', (error) => {
      console.error(chalk.red('❌ Context watcher error:'), error.message);
    });
    
    this.isWatching = true;
    console.log(chalk.green(`📁 Watching ${existingPaths.length} specs directories`));
    existingPaths.forEach(p => console.log(chalk.gray(`   ${p}`)));
  }
  
  /**
   * Stop watching context directories
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    this.onChangeCallback = null;
  }
  
  /**
   * Handle file change events - simple logging and rebuild trigger
   * @param {string} changeType - Type of change (added, modified, deleted)
   * @param {string} filePath - Path to the changed file
   */
  async handleFileChange(changeType, filePath) {
    // Only process context files
    if (!this.isContextFile(path.basename(filePath))) {
      return;
    }
    
    // Simple log message
    console.log(chalk.blue(`📝 Specs file ${changeType}: ${filePath}`));
    console.log(chalk.yellow('🔄 Rebuilding feature branch cache...'));
    
    if (this.onChangeCallback) {
      try {
        await this.onChangeCallback({
          filePath,
          changeType,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(chalk.red('❌ Error rebuilding cache:'), error.message);
      }
    }
  }
  
  /**
   * Get simple monitoring status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      specsPaths: this.contextPaths,
      configuredPaths: this.config.specs?.include || 'using defaults'
    };
  }
}

module.exports = { SpecsMonitor };