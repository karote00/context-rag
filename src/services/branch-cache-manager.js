const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { SpecsMonitor } = require('./context-monitor');

/**
 * Simplified branch cache manager
 * Uses clean and rebuild strategy instead of complex diff tracking
 */
class BranchCacheManager {
  constructor(config = {}) {
    this.config = config;
    this.specsMonitor = new SpecsMonitor(config);
    this.cacheDir = '.context-rag/cache';
    this.metadataDir = '.context-rag/metadata';
    
    // Ensure cache directories exist
    this.ensureCacheDirectories();
  }
  
  /**
   * Ensure cache directories exist
   */
  ensureCacheDirectories() {
    [this.cacheDir, this.metadataDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  /**
   * Handle branch operations with simplified strategy
   * @param {string} operation - Operation type (switch, merge, create)
   * @param {Object} branchInfo - Branch information
   */
  async handleBranchOperation(operation, branchInfo) {
    console.log(chalk.blue(`🌿 Handling branch ${operation}: ${JSON.stringify(branchInfo)}`));
    
    switch (operation) {
      case 'switch':
        return await this.handleBranchSwitch(branchInfo);
      case 'merge':
        return await this.handleMerge(branchInfo);
      case 'create':
        return await this.handleBranchCreate(branchInfo);
      default:
        console.warn(chalk.yellow(`Unknown branch operation: ${operation}`));
    }
  }
  
  /**
   * Handle branch switching with clean and rebuild strategy
   * @param {Object} branchInfo - Branch switch information
   */
  async handleBranchSwitch({ from, to }) {
    console.log(chalk.blue(`🔄 Switching from ${from} to ${to}`));
    
    // Clean old branch cache if switching away from it
    if (from && from !== to) {
      await this.cleanBranchCache(from);
      console.log(chalk.gray(`🗑️  Cleaned cache for branch: ${from}`));
    }
    
    // Rebuild cache for new branch if it's not main/master
    if (to && to !== 'main' && to !== 'master') {
      const rebuildNeeded = await this.shouldRebuildForBranch(to);
      
      if (rebuildNeeded) {
        console.log(chalk.yellow(`🔨 Rebuilding context cache for branch: ${to}`));
        await this.rebuildContextCache(to);
      } else {
        console.log(chalk.green(`✅ Cache for branch ${to} is up to date`));
      }
    } else if (to === 'main' || to === 'master') {
      console.log(chalk.green(`📍 Using main branch baseline cache`));
    }
    
    return {
      operation: 'switch',
      from,
      to,
      cacheRebuilt: to !== 'main' && to !== 'master'
    };
  }
  
  /**
   * Handle merge operations
   * @param {Object} mergeInfo - Merge information
   */
  async handleMerge({ target, source }) {
    console.log(chalk.blue(`🔀 Handling merge: ${source} → ${target}`));
    
    // Assume context changed after merge, rebuild target branch cache
    await this.rebuildContextCache(target);
    
    console.log(chalk.green(`✅ Rebuilt cache for target branch: ${target}`));
    
    return {
      operation: 'merge',
      target,
      source,
      cacheRebuilt: true
    };
  }
  
  /**
   * Handle branch creation
   * @param {Object} createInfo - Branch creation information
   */
  async handleBranchCreate({ branchName, baseBranch }) {
    console.log(chalk.blue(`🌱 Creating branch: ${branchName} from ${baseBranch}`));
    
    // New branches start with clean slate - no immediate cache needed
    // Cache will be built when first needed
    
    return {
      operation: 'create',
      branchName,
      baseBranch,
      cacheRebuilt: false
    };
  }
  
  /**
   * Clean cache for a specific branch
   * @param {string} branchName - Name of the branch
   */
  async cleanBranchCache(branchName) {
    const branchCachePath = this.getBranchCachePath(branchName);
    const branchMetadataPath = this.getBranchMetadataPath(branchName);
    
    try {
      // Remove cache file
      if (fs.existsSync(branchCachePath)) {
        fs.unlinkSync(branchCachePath);
        console.log(chalk.gray(`🗑️  Removed cache: ${branchCachePath}`));
      }
      
      // Remove metadata file
      if (fs.existsSync(branchMetadataPath)) {
        fs.unlinkSync(branchMetadataPath);
        console.log(chalk.gray(`🗑️  Removed metadata: ${branchMetadataPath}`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Error cleaning cache for ${branchName}:`), error.message);
      return false;
    }
  }
  
  /**
   * Rebuild context-focused cache for a branch
   * @param {string} branchName - Name of the branch
   */
  async rebuildContextCache(branchName) {
    try {
      console.log(chalk.blue(`🔨 Rebuilding context cache for branch: ${branchName}`));
      
      // Discover current specs files
      const specsFiles = await this.specsMonitor.discoverContextFiles();
      
      if (specsFiles.totalFiles === 0) {
        console.log(chalk.yellow(`⚠️  No specs files found for branch ${branchName}`));
        console.log(chalk.gray('Consider adding .kiro/specs/, requirements/, or design/ directories'));
        return null;
      }
      
      // Create cache metadata
      const metadata = {
        branch: branchName,
        cache_type: 'specs_focused',
        created: new Date().toISOString(),
        specs_sources: specsFiles.directories.map(d => d.path),
        indexed_files: specsFiles.totalFiles,
        specs_files: specsFiles.files.length,
        last_specs_change: new Date().toISOString(),
        fingerprint: await this.generateSpecsFingerprint(specsFiles.files)
      };
      
      // Save metadata
      const metadataPath = this.getBranchMetadataPath(branchName);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(chalk.green(`✅ Specs cache rebuilt for ${branchName}`));
      console.log(chalk.gray(`   📁 Specs directories: ${metadata.specs_sources.length}`));
      console.log(chalk.gray(`   📄 Specs files: ${metadata.specs_files}`));
      
      return metadata;
      
    } catch (error) {
      console.error(chalk.red(`Error rebuilding cache for ${branchName}:`), error.message);
      throw error;
    }
  }
  
  /**
   * Check if cache rebuild is needed for a branch
   * @param {string} branchName - Name of the branch
   * @returns {boolean} True if rebuild is needed
   */
  async shouldRebuildForBranch(branchName) {
    const metadataPath = this.getBranchMetadataPath(branchName);
    
    // If no metadata exists, rebuild is needed
    if (!fs.existsSync(metadataPath)) {
      return true;
    }
    
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check if specs have changed since last build
      const currentSpecsFiles = await this.specsMonitor.discoverContextFiles();
      const currentFingerprint = await this.generateSpecsFingerprint(currentSpecsFiles.files);
      
      if (metadata.fingerprint !== currentFingerprint) {
        console.log(chalk.yellow(`🔄 Specs fingerprint changed for ${branchName}`));
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read metadata for ${branchName}, rebuilding`));
      return true;
    }
  }
  
  /**
   * Generate a fingerprint for specs files
   * @param {Array} specsFiles - Array of specs file objects
   * @returns {string} Fingerprint hash
   */
  async generateSpecsFingerprint(specsFiles) {
    const crypto = require('crypto');
    
    // Create fingerprint from file paths, sizes, and modification times
    const fingerprintData = specsFiles
      .sort((a, b) => a.path.localeCompare(b.path))
      .map(file => `${file.path}:${file.size}:${file.modified.getTime()}`)
      .join('|');
    
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }
  
  /**
   * Get cache file path for a branch
   * @param {string} branchName - Name of the branch
   * @returns {string} Cache file path
   */
  getBranchCachePath(branchName) {
    const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${safeBranchName}.db`);
  }
  
  /**
   * Get metadata file path for a branch
   * @param {string} branchName - Name of the branch
   * @returns {string} Metadata file path
   */
  getBranchMetadataPath(branchName) {
    const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.metadataDir, `${safeBranchName}.json`);
  }
  
  /**
   * List all cached branches
   * @returns {Array} Array of cached branch information
   */
  async listCachedBranches() {
    const branches = [];
    
    try {
      if (!fs.existsSync(this.metadataDir)) {
        return branches;
      }
      
      const metadataFiles = fs.readdirSync(this.metadataDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of metadataFiles) {
        try {
          const metadataPath = path.join(this.metadataDir, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          const cachePath = this.getBranchCachePath(metadata.branch);
          const cacheExists = fs.existsSync(cachePath);
          const cacheSize = cacheExists ? fs.statSync(cachePath).size : 0;
          
          branches.push({
            name: metadata.branch,
            metadata,
            cacheExists,
            cacheSize,
            metadataPath,
            cachePath
          });
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read metadata file ${file}`));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error listing cached branches:'), error.message);
    }
    
    return branches.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * Get cache status for current branch
   * @param {string} currentBranch - Current branch name
   * @returns {Object} Cache status information
   */
  async getCacheStatus(currentBranch) {
    const metadataPath = this.getBranchMetadataPath(currentBranch);
    const cachePath = this.getBranchCachePath(currentBranch);
    
    const status = {
      branch: currentBranch,
      cacheExists: fs.existsSync(cachePath),
      metadataExists: fs.existsSync(metadataPath),
      cacheSize: 0,
      metadata: null,
      needsRebuild: false
    };
    
    if (status.cacheExists) {
      status.cacheSize = fs.statSync(cachePath).size;
    }
    
    if (status.metadataExists) {
      try {
        status.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        status.needsRebuild = await this.shouldRebuildForBranch(currentBranch);
      } catch (error) {
        status.needsRebuild = true;
      }
    } else {
      status.needsRebuild = true;
    }
    
    return status;
  }
  
  /**
   * Clear all branch caches
   * @returns {number} Number of caches cleared
   */
  async clearAllCaches() {
    let cleared = 0;
    
    try {
      // Clear cache files
      if (fs.existsSync(this.cacheDir)) {
        const cacheFiles = fs.readdirSync(this.cacheDir);
        for (const file of cacheFiles) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          cleared++;
        }
      }
      
      // Clear metadata files
      if (fs.existsSync(this.metadataDir)) {
        const metadataFiles = fs.readdirSync(this.metadataDir);
        for (const file of metadataFiles) {
          fs.unlinkSync(path.join(this.metadataDir, file));
        }
      }
      
      console.log(chalk.green(`🗑️  Cleared ${cleared} branch caches`));
    } catch (error) {
      console.error(chalk.red('Error clearing caches:'), error.message);
    }
    
    return cleared;
  }
}

module.exports = { BranchCacheManager };