const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { ContextRagIndexer } = require('../services/indexer');
const { GitService } = require('../services/git');
const { ContextService } = require('../services/context');
const { SpecsIndexer } = require('../services/context-indexer');
const { SpecsMonitor } = require('../services/context-monitor');
const { ProjectContextIndexer } = require('../services/project-context-indexer');

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
    const specsIndexer = new SpecsIndexer(config);
    const projectContextIndexer = new ProjectContextIndexer(config);
    const specsMonitor = new SpecsMonitor(config);
    
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

    // Check for different types of files
    const specsDiscovery = await specsMonitor.discoverContextFiles();
    const projectContextDiscovery = await projectContextIndexer.discoverContextFiles(
      projectContextIndexer.getContextPaths()
    );
    
    const hasSpecsFiles = specsDiscovery.totalFiles > 0;
    const hasProjectContext = projectContextDiscovery.length > 0;
    
    if (hasSpecsFiles) {
      console.log(chalk.green(`📋 Found ${specsDiscovery.totalFiles} specs files in ${specsDiscovery.directories.length} directories`));
    }
    
    if (hasProjectContext) {
      console.log(chalk.green(`📚 Found ${projectContextDiscovery.length} project context files`));
    }
    
    if (!hasSpecsFiles && !hasProjectContext) {
      console.log(chalk.yellow('⚠️  No context or specs files found'));
      console.log(chalk.gray('Consider adding docs/, .project/ (project context) or .kiro/specs/ (feature specs)'));
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
    
    if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
      // Feature branch - use specs-focused indexing
      console.log(chalk.blue('🚀 Building specs-focused index for feature branch...'));
      result = await specsIndexer.indexSpecsOnly(currentBranch);
      
      // Save the specs-focused index
      fs.writeFileSync(branchCachePath, JSON.stringify(result.index_data, null, 2));
      
      // Generate embeddings for specs
      if (result.index_data && result.index_data.chunks.length > 0) {
        await generateEmbeddingsForIndex(result.index_data.chunks, branchCachePath, config);
      }
      
    } else {
      // Main branch - use project context indexing
      console.log(chalk.blue('🚀 Building project context index for main branch...'));
      result = await projectContextIndexer.indexProjectContext();
      
      // Save the project context index
      fs.writeFileSync(branchCachePath, JSON.stringify(result.index_data, null, 2));
      
      // Generate embeddings for project context
      if (result.index_data && result.index_data.chunks.length > 0) {
        await generateEmbeddingsForIndex(result.index_data.chunks, branchCachePath, config);
      }
    }
    
    // Display results
    console.log(chalk.green('\n✅ Indexing completed successfully!'));
    console.log(chalk.cyan(`📁 Files indexed: ${result.indexed_files}`));
    console.log(chalk.cyan(`📄 Total chunks: ${result.total_chunks}`));
    
    if (result.specs_focused) {
      console.log(chalk.cyan(`📋 Specs-focused indexing used (feature branch)`));
    } else if (result.context_type === 'project_context') {
      console.log(chalk.cyan(`📚 Project context indexing used (main branch)`));
    }
    
    console.log(chalk.cyan(`⏱️  Processing time: ${result.processing_time_ms}ms`));
    
    if (currentBranch) {
      console.log(chalk.gray(`🌿 Branch: ${currentBranch}`));
    }
    console.log(chalk.gray(`💾 Index saved to: ${branchCachePath}`));
    
    // Show next steps
    console.log(chalk.blue('\n🎯 Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag query \'your question\'" to search'));
    if (currentBranch === 'main' || currentBranch === 'master') {
      console.log(chalk.gray('  2. Main branch: searches project context (docs, architecture)'));
    } else {
      console.log(chalk.gray('  2. Feature branch: searches specs (requirements, design, tasks)'));
    }
    console.log(chalk.gray('  3. Use "context-rag branch" to manage branch caches'));
    console.log(chalk.gray('  4. Use "context-rag watch" to auto-update on specs changes'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error during indexing:'), error.message);
    process.exit(1);
  }
}

async function generateEmbeddingsForIndex(chunks, indexPath, config) {
  try {
    console.log(chalk.blue('🧠 Generating embeddings...'));
    
    const { EmbeddingService } = require('../services/embedder');
    const embeddingService = new EmbeddingService(config);
    
    const embeddedChunks = await embeddingService.generateEmbeddings(chunks);
    
    // Save embeddings separately for better performance
    const embeddingsPath = indexPath.replace('.db', '_embeddings.json');
    const embeddingsData = {
      model: config.embedder.model,
      chunks: embeddedChunks
    };
    
    fs.writeFileSync(embeddingsPath, JSON.stringify(embeddingsData, null, 2));
    
    console.log(chalk.green(`✅ Generated embeddings for ${embeddedChunks.length} chunks`));
    console.log(chalk.gray(`💾 Embeddings saved to: ${embeddingsPath}`));
    
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Failed to generate embeddings: ${error.message}`));
    console.log(chalk.gray('Search functionality will be limited without embeddings'));
  }
}

module.exports = indexCommand;