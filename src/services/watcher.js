const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
  constructor(config, gitService) {
    super();
    this.config = config;
    this.gitService = gitService;
    this.watchers = new Map();
    this.fileHashes = new Map();
    this.isWatching = false;
  }

  async startWatching(targetPath = '.') {
    if (this.isWatching) {
      console.log(chalk.yellow('⚠️  Already watching for changes'));
      return;
    }

    this.isWatching = true;
    console.log(chalk.blue('👀 Starting file watcher...'));
    
    // Get initial file list and hashes
    await this.scanInitialFiles(targetPath);
    
    // Watch for file changes
    this.watchDirectory(targetPath);
    
    // Watch for git branch changes
    this.watchGitBranch();
    
    console.log(chalk.green('✅ File watcher started'));
    console.log(chalk.gray('   Watching for file changes and git branch switches'));
    console.log(chalk.gray('   Press Ctrl+C to stop'));
  }

  stopWatching() {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;
    
    // Close all file watchers
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    
    console.log(chalk.blue('👋 File watcher stopped'));
  }

  async scanInitialFiles(targetPath) {
    const files = await this.getWatchableFiles(targetPath);
    
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hash = this.calculateHash(content);
        this.fileHashes.set(filePath, {
          hash,
          mtime: fs.statSync(filePath).mtime.getTime()
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    console.log(chalk.gray(`📋 Tracking ${this.fileHashes.size} files for changes`));
  }

  watchDirectory(targetPath) {
    const watchOptions = {
      recursive: true,
      persistent: true
    };

    try {
      const watcher = fs.watch(targetPath, watchOptions, (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.resolve(targetPath, filename);
        this.handleFileChange(eventType, fullPath);
      });

      this.watchers.set(targetPath, watcher);
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not watch directory ${targetPath}: ${error.message}`));
    }
  }

  async handleFileChange(eventType, filePath) {
    // Check if file should be watched
    if (!this.shouldWatchFile(filePath)) {
      return;
    }

    try {
      const exists = fs.existsSync(filePath);
      
      if (!exists) {
        // File deleted
        if (this.fileHashes.has(filePath)) {
          this.fileHashes.delete(filePath);
          console.log(chalk.red(`🗑️  File deleted: ${filePath}`));
          this.emit('fileDeleted', filePath);
        }
        return;
      }

      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const newHash = this.calculateHash(content);
      const newMtime = stats.mtime.getTime();
      
      const existing = this.fileHashes.get(filePath);
      
      if (!existing) {
        // New file
        this.fileHashes.set(filePath, { hash: newHash, mtime: newMtime });
        console.log(chalk.green(`📄 New file: ${filePath}`));
        this.emit('fileAdded', filePath, content);
        
      } else if (existing.hash !== newHash) {
        // File modified
        this.fileHashes.set(filePath, { hash: newHash, mtime: newMtime });
        console.log(chalk.yellow(`📝 File modified: ${filePath}`));
        this.emit('fileModified', filePath, content);
      }
      
    } catch (error) {
      // Skip files that can't be processed
    }
  }

  watchGitBranch() {
    // Watch .git/HEAD for branch changes
    const gitHeadPath = '.git/HEAD';
    
    if (!fs.existsSync(gitHeadPath)) {
      return; // Not a git repository
    }

    let currentBranch = null;
    
    const checkBranch = async () => {
      try {
        const newBranch = await this.gitService.getCurrentBranch();
        if (currentBranch && newBranch && currentBranch !== newBranch) {
          console.log(chalk.blue(`🌿 Branch changed: ${currentBranch} → ${newBranch}`));
          this.emit('branchChanged', currentBranch, newBranch);
        }
        currentBranch = newBranch;
      } catch (error) {
        // Ignore git errors
      }
    };

    // Initial branch check
    checkBranch();

    // Watch for branch changes
    try {
      const watcher = fs.watch(gitHeadPath, () => {
        setTimeout(checkBranch, 100); // Small delay to ensure file is written
      });
      
      this.watchers.set(gitHeadPath, watcher);
    } catch (error) {
      // Git watching not critical
    }
  }

  async getWatchableFiles(targetPath) {
    const files = [];
    
    const scanDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (this.shouldWatchDirectory(fullPath)) {
              scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            if (this.shouldWatchFile(fullPath)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    scanDir(targetPath);
    return files;
  }

  shouldWatchFile(filePath) {
    const { include, exclude } = this.config.index;
    
    // Check exclusions first
    for (const excludePattern of exclude) {
      if (filePath.includes(excludePattern)) {
        return false;
      }
    }
    
    // Check inclusions
    for (const includePattern of include) {
      if (includePattern.startsWith('*.')) {
        const ext = includePattern.slice(2);
        if (filePath.endsWith(`.${ext}`)) {
          return true;
        }
      } else if (includePattern.endsWith('/')) {
        if (filePath.includes(includePattern)) {
          return true;
        }
      } else {
        if (filePath.includes(includePattern)) {
          return true;
        }
      }
    }
    
    return false;
  }

  shouldWatchDirectory(dirPath) {
    const { exclude } = this.config.index;
    
    for (const excludePattern of exclude) {
      if (dirPath.includes(excludePattern)) {
        return false;
      }
    }
    
    return true;
  }

  calculateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

module.exports = { FileWatcher };