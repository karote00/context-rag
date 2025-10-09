const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { ContextRagIndexer } = require('../services/indexer');
const { GitService } = require('../services/git');
const { ContextService } = require('../services/context');

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

    // Initialize services
    const gitService = new GitService(config);
    const contextService = new ContextService(config);
    const currentBranch = await gitService.getCurrentBranch();
    
    if (currentBranch) {
      console.log(chalk.blue(`🌿 Current branch: ${currentBranch}`));
      
      // Check if this is the first index and we're not on main branch
      const mainBranchCache = path.join('.context-rag', 'cache', 'main.db');
      const masterBranchCache = path.join('.context-rag', 'cache', 'master.db');
      const hasMainBaseline = fs.existsSync(mainBranchCache) || fs.existsSync(masterBranchCache);
      
      if (!hasMainBaseline && currentBranch !== 'main' && currentBranch !== 'master' && !options.skipBranchCheck) {
        console.log(chalk.yellow('⚠️  First-time indexing detected on feature branch!'));
        console.log(chalk.red('❌ Cannot create baseline index from feature branch.'));
        console.log(chalk.gray(''));
        console.log(chalk.gray('To establish proper branch-aware caching:'));
        console.log(chalk.cyan('  1. Switch to main branch: git checkout main'));
        console.log(chalk.cyan('  2. Run initial index: context-rag index'));
        console.log(chalk.cyan('  3. Switch back to feature branch: git checkout ' + currentBranch));
        console.log(chalk.cyan('  4. Run index again for branch-specific changes'));
        console.log(chalk.gray(''));
        console.log(chalk.gray('This ensures proper diff tracking between main and feature branches.'));
        console.log(chalk.gray('Use --skip-branch-check to bypass this safety check.'));
        process.exit(1);
      }
      
      // Try to merge cache from base branch if this is a feature branch
      if (!options.force && currentBranch !== 'main' && currentBranch !== 'master') {
        await gitService.mergeCacheFromBase('main');
      }
    }

    // Check for project context
    const contextInfo = await contextService.detectProjectContext();
    if (contextInfo) {
      console.log(chalk.green(`🎯 Using structured context index (${contextInfo.totalFiles} context files)`));
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
    
    // Index regular files
    const result = await indexer.indexDirectory(targetPath, options);
    
    // Index project context if available
    let contextResult = null;
    if (contextInfo) {
      contextResult = await contextService.indexContextFiles(indexer);
      
      if (contextResult) {
        // Merge context chunks with regular index
        const indexContent = fs.readFileSync(branchCachePath, 'utf8');
        const indexData = JSON.parse(indexContent);
        
        // Add context chunks to the index
        indexData.chunks = [...indexData.chunks, ...contextResult.chunks];
        indexData.context_metadata = contextResult.metadata;
        
        // Save updated index
        fs.writeFileSync(branchCachePath, JSON.stringify(indexData, null, 2));
      }
    }
    
    // Display results
    console.log(chalk.green('\n✅ Indexing completed successfully!'));
    console.log(chalk.cyan(`📁 Files indexed: ${result.indexed_files}`));
    console.log(chalk.cyan(`📄 Total chunks: ${result.total_chunks}`));
    
    if (contextResult) {
      console.log(chalk.cyan(`🎯 Context chunks: ${contextResult.metadata.total_chunks}`));
      console.log(chalk.cyan(`📋 Context files: ${contextResult.metadata.context_files}`));
    }
    
    console.log(chalk.cyan(`⏱️  Processing time: ${result.processing_time_ms}ms`));
    
    if (currentBranch) {
      console.log(chalk.gray(`🌿 Branch: ${currentBranch}`));
    }
    console.log(chalk.gray(`💾 Index saved to: ${branchCachePath}`));
    
    // Show next steps
    console.log(chalk.blue('\n🎯 Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag query \'your question\'" to search'));
    if (contextInfo) {
      console.log(chalk.gray('  2. Context-aware search will prioritize project context'));
    }
    console.log(chalk.gray('  3. Use "context-rag branch" to manage branch caches'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during indexing:'), error.message);
    process.exit(1);
  }
}

module.exports = indexCommand;