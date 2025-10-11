const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { ContextRagIndexer } = require('../services/indexer');
const { GitService } = require('../services/git');
const { ContextService } = require('../services/context');
const { ContextIndexer } = require('../services/context-indexer');
const { ContextMonitor } = require('../services/context-monitor');

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
    const contextIndexer = new ContextIndexer(config);
    const contextMonitor = new ContextMonitor(config);
    
    // Detect and handle branch changes
    const currentBranch = await gitService.detectAndHandleBranchChange();
    
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
      
    }

    // Check for context files using new context monitor
    const contextDiscovery = await contextMonitor.discoverContextFiles();
    const hasContextFiles = contextDiscovery.totalFiles > 0;
    
    if (hasContextFiles) {
      console.log(chalk.green(`🎯 Found ${contextDiscovery.totalFiles} context files in ${contextDiscovery.directories.length} directories`));
      console.log(chalk.gray(`   Context types: ${Array.from(contextDiscovery.contextTypes).join(', ')}`));
    } else {
      console.log(chalk.yellow('⚠️  No context files found'));
      console.log(chalk.gray('Consider adding .kiro/specs/, .project/, or docs/ directories'));
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

    let result;
    
    // Use context-focused indexing for non-main branches with context files
    if (hasContextFiles && currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
      console.log(chalk.blue('🚀 Building context-focused index...'));
      result = await contextIndexer.indexContextOnly(currentBranch);
      
      // Save the context-focused index
      fs.writeFileSync(branchCachePath, JSON.stringify(result.index_data, null, 2));
      
    } else {
      // Use traditional indexing for main branch or when no context files
      console.log(chalk.blue('🚀 Building semantic index...'));
      
      const indexer = new ContextRagIndexer(branchConfig);
      result = await indexer.indexDirectory(targetPath, options);
      
      // Add context files if available
      if (hasContextFiles) {
        const contextResult = await contextIndexer.indexContextOnly(currentBranch || 'main');
        
        if (contextResult.index_data) {
          // Merge context chunks with regular index
          const indexContent = fs.readFileSync(branchCachePath, 'utf8');
          const indexData = JSON.parse(indexContent);
          
          // Add context chunks to the index
          indexData.chunks = [...indexData.chunks, ...contextResult.index_data.chunks];
          indexData.context_metadata = contextResult.index_data.context_metadata;
          
          // Save updated index
          fs.writeFileSync(branchCachePath, JSON.stringify(indexData, null, 2));
          
          console.log(chalk.green(`✅ Added ${contextResult.total_chunks} context chunks to index`));
        }
      }
    }
    
    // Display results
    console.log(chalk.green('\n✅ Indexing completed successfully!'));
    console.log(chalk.cyan(`📁 Files indexed: ${result.indexed_files}`));
    console.log(chalk.cyan(`📄 Total chunks: ${result.total_chunks}`));
    
    if (result.context_focused) {
      console.log(chalk.cyan(`🎯 Context-focused indexing used`));
      console.log(chalk.cyan(`📋 Context types: ${result.context_types?.join(', ') || 'N/A'}`));
    }
    
    console.log(chalk.cyan(`⏱️  Processing time: ${result.processing_time_ms}ms`));
    
    if (currentBranch) {
      console.log(chalk.gray(`🌿 Branch: ${currentBranch}`));
    }
    console.log(chalk.gray(`💾 Index saved to: ${branchCachePath}`));
    
    // Show next steps
    console.log(chalk.blue('\n🎯 Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag query \'your question\'" to search'));
    if (hasContextFiles) {
      console.log(chalk.gray('  2. Context-focused search will prioritize specs and docs'));
    }
    console.log(chalk.gray('  3. Use "context-rag branch" to manage branch caches'));
    console.log(chalk.gray('  4. Use "context-rag watch" to auto-update on context changes'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during indexing:'), error.message);
    process.exit(1);
  }
}

module.exports = indexCommand;