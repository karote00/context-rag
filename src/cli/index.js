const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { ContextRagIndexer } = require('../services/indexer');
const { GitService } = require('../services/git');

async function indexCommand(targetPath = '.', options = {}) {
  try {
    console.log(chalk.blue('🔍 Starting indexing process...'));
    
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    console.log(chalk.gray(`Target path: ${path.resolve(targetPath)}`));
    console.log(chalk.gray(`Force rebuild: ${options.force ? 'Yes' : 'No'}`));

    // Initialize Git service for branch-aware caching
    const gitService = new GitService(config);
    const currentBranch = await gitService.getCurrentBranch();
    
    if (currentBranch) {
      console.log(chalk.blue(`🌿 Current branch: ${currentBranch}`));
      
      // Try to merge cache from base branch if this is a feature branch
      if (!options.force && currentBranch !== 'main' && currentBranch !== 'master') {
        await gitService.mergeCacheFromBase('main');
      }
    }

    // Get branch-specific cache path
    const branchCachePath = await gitService.getBranchCachePath();
    
    // Update config to use branch-specific path
    const branchConfig = { ...config };
    branchConfig.storage.path = branchCachePath;

    // Check if index exists and force rebuild is not set
    if (!options.force && fs.existsSync(branchCachePath)) {
      const shouldRebuild = await gitService.shouldRebuildIndex();
      if (!shouldRebuild) {
        console.log(chalk.green('✅ Index is up to date for current branch.'));
        console.log(chalk.gray('Use --force to rebuild anyway.'));
        return;
      } else {
        console.log(chalk.yellow('🔄 Index needs updating due to recent changes.'));
      }
    }

    // Initialize indexer with branch-specific config
    const indexer = new ContextRagIndexer(branchConfig);
    
    // Start indexing
    console.log(chalk.blue('🚀 Building semantic index...'));
    const result = await indexer.indexDirectory(targetPath, options);
    
    // Display results
    console.log(chalk.green('\n✅ Indexing completed successfully!'));
    console.log(chalk.cyan(`📁 Files indexed: ${result.indexed_files}`));
    console.log(chalk.cyan(`📄 Total chunks: ${result.total_chunks}`));
    console.log(chalk.cyan(`⏱️  Processing time: ${result.processing_time_ms}ms`));
    
    if (currentBranch) {
      console.log(chalk.gray(`🌿 Branch: ${currentBranch}`));
    }
    console.log(chalk.gray(`💾 Index saved to: ${branchCachePath}`));
    
    // Show next steps
    console.log(chalk.blue('\n🎯 Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag query \'your question\'" to search'));
    console.log(chalk.gray('  2. Use "context-rag branch" to manage branch caches'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during indexing:'), error.message);
    process.exit(1);
  }
}

module.exports = indexCommand;