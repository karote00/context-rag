const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const chalk = require('chalk');

/**
 * Context directory monitoring and discovery service
 * Focuses on project context files rather than source code
 */
class ContextMonitor {
  constructor(config = {}) {
    this.config = config;
    this.watcher = null;
    this.isWatching = false;
    
    // Context directories in priority order
    this.contextPaths = [
      // High priority - specs and project context
      '.kiro/specs/',
      '.project/',
      
      // Medium priority - documentation
      'docs/',
      '.docs/',
      
      // Low priority - explicit context directories
      'context/',
      '.context/'
    ];
    
    // Context file patterns
    this.contextFilePatterns = [
      '**/*.md',
      '**/*.txt',
      '**/*.yaml',
      '**/*.yml',
      '**/*.json'
    ];
    
    // Callback for context changes
    this.onChangeCallback = null;
  }
  
  /**
   * Discover existing context directories and files
   * @returns {Object} Context discovery results
   */
  async discoverContextFiles() {
    const discovered = {
      directories: [],
      files: [],
      totalFiles: 0,
      contextTypes: new Set()
    };
    
    for (const contextPath of this.contextPaths) {
      if (fs.existsSync(contextPath) && fs.statSync(contextPath).isDirectory()) {
        const dirInfo = await this.scanContextDirectory(contextPath);
        
        if (dirInfo.files.length > 0) {
          discovered.directories.push({
            path: contextPath,
            priority: this.getDirectoryPriority(contextPath),
            ...dirInfo
          });
          
          discovered.files.push(...dirInfo.files);
          discovered.totalFiles += dirInfo.files.length;
          
          // Add context types
          dirInfo.contextTypes.forEach(type => discovered.contextTypes.add(type));
        }
      }
    }
    
    // Sort directories by priority
    discovered.directories.sort((a, b) => a.priority - b.priority);
    
    // Sort files by priority and relevance
    discovered.files.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.relevanceScore - a.relevanceScore;
    });
    
    return discovered;
  }
  
  /**
   * Scan a specific context directory
   * @param {string} dirPath - Directory path to scan
   * @returns {Object} Directory scan results
   */
  async scanContextDirectory(dirPath) {
    const result = {
      files: [],
      contextTypes: new Set(),
      totalSize: 0
    };
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subResult = await this.scanContextDirectory(fullPath);
          result.files.push(...subResult.files);
          result.totalSize += subResult.totalSize;
          subResult.contextTypes.forEach(type => result.contextTypes.add(type));
        } else if (entry.isFile() && this.isContextFile(entry.name)) {
          const fileInfo = await this.analyzeContextFile(fullPath);
          result.files.push(fileInfo);
          result.totalSize += fileInfo.size;
          result.contextTypes.add(fileInfo.contextType);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not scan directory ${dirPath}: ${error.message}`));
    }
    
    return result;
  }
  
  /**
   * Analyze a context file to determine its type and relevance
   * @param {string} filePath - Path to the file
   * @returns {Object} File analysis results
   */
  async analyzeContextFile(filePath) {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    const dirPath = path.dirname(filePath);
    
    const fileInfo = {
      path: filePath,
      name: fileName,
      size: stats.size,
      modified: stats.mtime,
      priority: this.getDirectoryPriority(dirPath),
      contextType: this.determineContextType(filePath),
      relevanceScore: this.calculateRelevanceScore(filePath)
    };
    
    return fileInfo;
  }
  
  /**
   * Determine the context type of a file
   * @param {string} filePath - Path to the file
   * @returns {string} Context type
   */
  determineContextType(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const dirPath = path.dirname(filePath);
    
    // Spec files
    if (dirPath.includes('.kiro/specs') || fileName.includes('spec')) {
      if (fileName.includes('requirement')) return 'requirements';
      if (fileName.includes('design')) return 'design';
      if (fileName.includes('task')) return 'tasks';
      return 'specification';
    }
    
    // Project context files
    if (dirPath.includes('.project')) {
      if (fileName.includes('architecture')) return 'architecture';
      if (fileName.includes('overview')) return 'overview';
      if (fileName.includes('context')) return 'context';
      if (fileName.includes('constraint')) return 'constraints';
      return 'project-context';
    }
    
    // Documentation files
    if (dirPath.includes('docs') || dirPath.includes('.docs')) {
      if (fileName.includes('api')) return 'api-documentation';
      if (fileName.includes('config')) return 'configuration';
      if (fileName.includes('quick') || fileName.includes('start')) return 'getting-started';
      return 'documentation';
    }
    
    // General context
    return 'general-context';
  }
  
  /**
   * Calculate relevance score for a context file
   * @param {string} filePath - Path to the file
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    let score = 0.5; // Base score
    
    // High-value files
    if (fileName.includes('requirement')) score += 0.3;
    if (fileName.includes('design')) score += 0.25;
    if (fileName.includes('architecture')) score += 0.25;
    if (fileName.includes('overview')) score += 0.2;
    if (fileName.includes('api')) score += 0.15;
    
    // File type bonuses
    if (fileName.endsWith('.md')) score += 0.1;
    if (fileName.includes('readme')) score += 0.15;
    
    // Directory bonuses
    const dirPath = path.dirname(filePath);
    if (dirPath.includes('.kiro/specs')) score += 0.2;
    if (dirPath.includes('.project')) score += 0.15;
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Get directory priority (lower number = higher priority)
   * @param {string} dirPath - Directory path
   * @returns {number} Priority value
   */
  getDirectoryPriority(dirPath) {
    if (dirPath.includes('.kiro/specs')) return 1;
    if (dirPath.includes('.project')) return 2;
    if (dirPath.includes('docs') || dirPath.includes('.docs')) return 3;
    if (dirPath.includes('context') || dirPath.includes('.context')) return 4;
    return 5;
  }
  
  /**
   * Check if a file is considered a context file
   * @param {string} fileName - Name of the file
   * @returns {boolean} True if it's a context file
   */
  isContextFile(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contextExtensions = ['.md', '.txt', '.yaml', '.yml', '.json'];
    
    // Skip hidden files and common non-context files
    if (fileName.startsWith('.')) return false;
    if (fileName.includes('node_modules')) return false;
    if (fileName.includes('.git')) return false;
    if (fileName.includes('package-lock')) return false;
    
    return contextExtensions.includes(ext);
  }
  
  /**
   * Start watching context directories for changes
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
      console.log(chalk.yellow('No context directories found to watch'));
      return;
    }
    
    this.watcher = chokidar.watch(existingPaths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log'
      ],
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('add', (filePath) => this.handleFileChange('added', filePath));
    this.watcher.on('change', (filePath) => this.handleFileChange('modified', filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileChange('deleted', filePath));
    
    this.watcher.on('error', (error) => {
      console.error(chalk.red('Context watcher error:'), error.message);
    });
    
    this.isWatching = true;
    console.log(chalk.green(`📁 Watching ${existingPaths.length} context directories for changes`));
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
   * Handle file change events
   * @param {string} changeType - Type of change (added, modified, deleted)
   * @param {string} filePath - Path to the changed file
   */
  async handleFileChange(changeType, filePath) {
    // Only process context files
    if (!this.isContextFile(path.basename(filePath))) {
      return;
    }
    
    const changeEvent = {
      event_type: 'context_change',
      changed_path: filePath,
      change_type: changeType,
      timestamp: new Date().toISOString(),
      requires_rebuild: true,
      context_type: this.determineContextType(filePath)
    };
    
    console.log(chalk.blue(`📝 Context change detected: ${changeType} ${filePath}`));
    
    if (this.onChangeCallback) {
      try {
        await this.onChangeCallback(changeEvent);
      } catch (error) {
        console.error(chalk.red('Error handling context change:'), error.message);
      }
    }
  }
  
  /**
   * Get context monitoring status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedPaths: this.isWatching ? this.watcher.getWatched() : {},
      contextPaths: this.contextPaths,
      totalWatchedFiles: this.isWatching ? Object.keys(this.watcher.getWatched()).length : 0
    };
  }
}

module.exports = { ContextMonitor };