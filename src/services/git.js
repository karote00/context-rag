const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { BranchCacheManager } = require('./branch-cache-manager');

class GitService {
  constructor(config) {
    this.config = config;
    this.git = simpleGit();
    this.cacheDir = '.context-rag/cache';
    this.branchCacheManager = new BranchCacheManager(config);
    this.lastKnownBranch = null;
  }

  async getCurrentBranch() {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      return null; // Not a git repository
    }
  }

  /**
   * Detect and handle branch changes using simplified strategy
   */
  async detectAndHandleBranchChange() {
    const currentBranch = await this.getCurrentBranch();
    
    if (!currentBranch) {
      return null; // Not in a git repository
    }
    
    // Check if branch has changed
    if (this.lastKnownBranch && this.lastKnownBranch !== currentBranch) {
      console.log(chalk.blue(`🔄 Branch change detected: ${this.lastKnownBranch} → ${currentBranch}`));
      
      // Handle branch switch with simplified strategy
      await this.branchCacheManager.handleBranchOperation('switch', {
        from: this.lastKnownBranch,
        to: currentBranch
      });
    }
    
    this.lastKnownBranch = currentBranch;
    return currentBranch;
  }

  /**
   * Handle merge operations with simplified strategy
   */
  async handleMergeOperation(targetBranch, sourceBranch) {
    console.log(chalk.blue(`🔀 Handling merge operation: ${sourceBranch} → ${targetBranch}`));
    
    return await this.branchCacheManager.handleBranchOperation('merge', {
      target: targetBranch,
      source: sourceBranch
    });
  }

  /**
   * Handle branch creation with simplified strategy
   */
  async handleBranchCreate(branchName, baseBranch = 'main') {
    console.log(chalk.blue(`🌱 Handling branch creation: ${branchName} from ${baseBranch}`));
    
    return await this.branchCacheManager.handleBranchOperation('create', {
      branchName,
      baseBranch
    });
  }

  async getBranchCachePath(branch = null) {
    if (!branch) {
      branch = await this.getCurrentBranch();
    }
    
    if (!branch) {
      return this.config.storage.path; // Fallback to default path
    }
    
    // Use the branch cache manager for consistent path handling
    return this.branchCacheManager.getBranchCachePath(branch);
  }

  async getEmbeddingsCachePath(branch = null) {
    const indexPath = await this.getBranchCachePath(branch);
    return indexPath.replace('.db', '_embeddings.json');
  }

  async ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async listCachedBranches() {
    // Use the branch cache manager for consistent branch listing
    return await this.branchCacheManager.listCachedBranches();
  }

  async clearBranchCache(branchName) {
    // Use the branch cache manager for consistent cache clearing
    return await this.branchCacheManager.cleanBranchCache(branchName);
  }

  async getChangedFiles(baseBranch = 'main') {
    try {
      const currentBranch = await this.getCurrentBranch();
      if (!currentBranch || currentBranch === baseBranch) {
        return [];
      }
      
      const diff = await this.git.diff([`${baseBranch}...${currentBranch}`, '--name-only']);
      return diff.split('\n').filter(file => file.trim().length > 0);
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not get changed files: ${error.message}`));
      return [];
    }
  }

  async getFileModificationTime(filePath) {
    try {
      const log = await this.git.log({ file: filePath, maxCount: 1 });
      if (log.latest) {
        return new Date(log.latest.date);
      }
    } catch (error) {
      // Fallback to filesystem modification time
    }
    
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      return new Date();
    }
  }

  async shouldRebuildIndex() {
    const currentBranch = await this.getCurrentBranch();
    if (!currentBranch) {
      return false; // Not in a git repo
    }
    
    // Use simplified strategy: check if context has changed
    return await this.branchCacheManager.shouldRebuildForBranch(currentBranch);
  }

  /**
   * Simplified approach: no complex merging, just clean rebuild
   * @deprecated Use handleBranchOperation instead
   */
  async mergeCacheFromBase(baseBranch = 'main') {
    const currentBranch = await this.getCurrentBranch();
    
    console.log(chalk.yellow('⚠️  Using deprecated mergeCacheFromBase. Consider using simplified branch operations.'));
    
    if (!currentBranch || currentBranch === baseBranch) {
      return null;
    }
    
    // In simplified approach, we just trigger a rebuild if needed
    const needsRebuild = await this.shouldRebuildIndex();
    
    if (needsRebuild) {
      console.log(chalk.blue(`🔨 Triggering context rebuild for ${currentBranch} (simplified strategy)`));
      // The actual rebuild will be handled by the indexing process
    }
    
    return await this.getBranchCachePath(currentBranch);
  }

  /**
   * Get cache status for current branch
   */
  async getCacheStatus() {
    const currentBranch = await this.getCurrentBranch();
    
    if (!currentBranch) {
      return {
        branch: null,
        isGitRepo: false,
        cacheExists: false
      };
    }
    
    return await this.branchCacheManager.getCacheStatus(currentBranch);
  }

  /**
   * Initialize branch tracking
   */
  async initializeBranchTracking() {
    const currentBranch = await this.getCurrentBranch();
    this.lastKnownBranch = currentBranch;
    return currentBranch;
  }
}

module.exports = { GitService };