const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class GitService {
  constructor(config) {
    this.config = config;
    this.git = simpleGit();
    this.cacheDir = '.context-rag/cache';
  }

  async getCurrentBranch() {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      return null; // Not a git repository
    }
  }

  async getBranchCachePath(branch = null) {
    if (!branch) {
      branch = await this.getCurrentBranch();
    }
    
    if (!branch) {
      return this.config.storage.path; // Fallback to default path
    }
    
    const safeBranchName = branch.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${safeBranchName}_index.db`);
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
    await this.ensureCacheDirectory();
    
    const branches = [];
    const files = fs.readdirSync(this.cacheDir);
    
    for (const file of files) {
      if (file.endsWith('_index.db')) {
        const branchName = file.replace('_index.db', '').replace(/_/g, '/');
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        
        branches.push({
          name: branchName,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        });
      }
    }
    
    return branches;
  }

  async clearBranchCache(branchName) {
    const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const indexPath = path.join(this.cacheDir, `${safeBranchName}_index.db`);
    const embeddingsPath = path.join(this.cacheDir, `${safeBranchName}_embeddings.json`);
    
    let cleared = 0;
    
    if (fs.existsSync(indexPath)) {
      fs.unlinkSync(indexPath);
      cleared++;
    }
    
    if (fs.existsSync(embeddingsPath)) {
      fs.unlinkSync(embeddingsPath);
      cleared++;
    }
    
    return cleared;
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
    
    const branchCachePath = await this.getBranchCachePath(currentBranch);
    
    if (!fs.existsSync(branchCachePath)) {
      return true; // No cache exists for this branch
    }
    
    try {
      const cacheStats = fs.statSync(branchCachePath);
      const status = await this.git.status();
      
      // Check if there are uncommitted changes
      if (status.files.length > 0) {
        console.log(chalk.yellow(`⚠️  Detected ${status.files.length} uncommitted changes`));
        return true;
      }
      
      // Check if cache is older than recent commits
      const recentCommits = await this.git.log({ maxCount: 5 });
      if (recentCommits.latest) {
        const lastCommitDate = new Date(recentCommits.latest.date);
        if (lastCommitDate > cacheStats.mtime) {
          console.log(chalk.yellow('⚠️  Cache is older than recent commits'));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not check git status: ${error.message}`));
      return false;
    }
  }

  async mergeCacheFromBase(baseBranch = 'main') {
    const currentBranch = await this.getCurrentBranch();
    if (!currentBranch || currentBranch === baseBranch) {
      return null;
    }
    
    const baseCachePath = await this.getBranchCachePath(baseBranch);
    const currentCachePath = await this.getBranchCachePath(currentBranch);
    
    if (!fs.existsSync(baseCachePath)) {
      console.log(chalk.yellow(`⚠️  No base cache found for branch: ${baseBranch}`));
      return null;
    }
    
    if (fs.existsSync(currentCachePath)) {
      return currentCachePath; // Current branch cache already exists
    }
    
    try {
      // Copy base cache as starting point
      const baseIndexData = JSON.parse(fs.readFileSync(baseCachePath, 'utf8'));
      const baseEmbeddingsPath = baseCachePath.replace('.db', '_embeddings.json');
      
      // Get changed files to filter out outdated entries
      const changedFiles = await this.getChangedFiles(baseBranch);
      
      if (changedFiles.length > 0) {
        console.log(chalk.blue(`🔄 Merging base cache, filtering ${changedFiles.length} changed files`));
        
        // Filter out chunks from changed files
        baseIndexData.chunks = baseIndexData.chunks.filter(chunk => 
          !changedFiles.some(changedFile => chunk.file_path.includes(changedFile))
        );
        
        // Update file metadata
        for (const filePath of Object.keys(baseIndexData.files)) {
          if (changedFiles.some(changedFile => filePath.includes(changedFile))) {
            delete baseIndexData.files[filePath];
          }
        }
      }
      
      // Save merged cache for current branch
      await this.ensureCacheDirectory();
      fs.writeFileSync(currentCachePath, JSON.stringify(baseIndexData, null, 2));
      
      // Copy embeddings if they exist
      if (fs.existsSync(baseEmbeddingsPath)) {
        const currentEmbeddingsPath = await this.getEmbeddingsCachePath(currentBranch);
        const embeddingsData = JSON.parse(fs.readFileSync(baseEmbeddingsPath, 'utf8'));
        
        if (changedFiles.length > 0) {
          embeddingsData.chunks = embeddingsData.chunks.filter(chunk => 
            !changedFiles.some(changedFile => chunk.file_path.includes(changedFile))
          );
        }
        
        fs.writeFileSync(currentEmbeddingsPath, JSON.stringify(embeddingsData, null, 2));
      }
      
      console.log(chalk.green(`✅ Merged base cache from ${baseBranch} to ${currentBranch}`));
      return currentCachePath;
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to merge base cache: ${error.message}`));
      return null;
    }
  }
}

module.exports = { GitService };