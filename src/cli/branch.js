const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { GitService } = require('../services/git');

async function branchCommand(options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const gitService = new GitService(config);

    if (options.list) {
      console.log(chalk.blue('📋 Cached branches:'));
      
      const cachedBranches = await gitService.listCachedBranches();
      
      if (cachedBranches.length === 0) {
        console.log(chalk.gray('   No cached branches found'));
        console.log(chalk.gray('   Run "context-rag index" to create cache for current branch'));
        return;
      }
      
      cachedBranches.forEach(branch => {
        const sizeKB = (branch.size / 1024).toFixed(1);
        const modifiedDate = branch.modified.toLocaleDateString();
        console.log(chalk.cyan(`   ${branch.name}`));
        console.log(chalk.gray(`     Size: ${sizeKB} KB | Modified: ${modifiedDate}`));
      });
      
      return;
    }

    if (options.clear) {
      console.log(chalk.blue(`🗑️  Clearing cache for branch: ${options.clear}`));
      
      const cleared = await gitService.clearBranchCache(options.clear);
      
      if (cleared > 0) {
        console.log(chalk.green(`✅ Cleared ${cleared} cache file(s) for branch: ${options.clear}`));
      } else {
        console.log(chalk.yellow(`⚠️  No cache found for branch: ${options.clear}`));
      }
      
      return;
    }

    // Show current branch info
    const currentBranch = await gitService.getCurrentBranch();
    
    if (!currentBranch) {
      console.log(chalk.yellow('⚠️  Not in a git repository'));
      console.log(chalk.gray('Branch-aware caching is only available in git repositories'));
      return;
    }
    
    console.log(chalk.green(`📍 Current branch: ${currentBranch}`));
    
    const branchCachePath = await gitService.getBranchCachePath();
    const cacheExists = require('fs').existsSync(branchCachePath);
    
    console.log(chalk.gray(`💾 Cache path: ${branchCachePath}`));
    console.log(chalk.gray(`📋 Cache exists: ${cacheExists ? 'Yes' : 'No'}`));
    
    if (cacheExists) {
      const fs = require('fs');
      const stats = fs.statSync(branchCachePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(chalk.gray(`📊 Cache size: ${sizeKB} KB`));
      console.log(chalk.gray(`🕒 Last modified: ${stats.mtime.toLocaleString()}`));
    }
    
    // Check if rebuild is recommended
    const shouldRebuild = await gitService.shouldRebuildIndex();
    if (shouldRebuild) {
      console.log(chalk.yellow('⚠️  Index rebuild recommended'));
      console.log(chalk.gray('   Run "context-rag index" to update the cache'));
    } else {
      console.log(chalk.green('✅ Cache is up to date'));
    }
    
    // Show changed files info
    const changedFiles = await gitService.getChangedFiles();
    if (changedFiles.length > 0) {
      console.log(chalk.blue(`🔄 Changed files since main: ${changedFiles.length}`));
      if (changedFiles.length <= 5) {
        changedFiles.forEach(file => {
          console.log(chalk.gray(`   ${file}`));
        });
      } else {
        changedFiles.slice(0, 3).forEach(file => {
          console.log(chalk.gray(`   ${file}`));
        });
        console.log(chalk.gray(`   ... and ${changedFiles.length - 3} more`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error in branch command:'), error.message);
    process.exit(1);
  }
}

module.exports = branchCommand;