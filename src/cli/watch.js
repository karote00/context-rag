const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { FileWatcher } = require('../services/watcher');
const { GitService } = require('../services/git');
const { ContextRagIndexer } = require('../services/indexer');
const { SpecsMonitor } = require('../services/context-monitor');
const { SpecsIndexer } = require('../services/context-indexer');

async function watchCommand() {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const gitService = new GitService(config);
    const watcher = new FileWatcher(config, gitService);
    const specsMonitor = new SpecsMonitor(config);
    const specsIndexer = new SpecsIndexer(config);
    
    // Set up event handlers
    watcher.on('fileAdded', async (filePath, content) => {
      console.log(chalk.green(`➕ Indexing new file: ${filePath}`));
      await updateIndexForFile(filePath, config, gitService);
    });

    watcher.on('fileModified', async (filePath, content) => {
      console.log(chalk.yellow(`🔄 Re-indexing modified file: ${filePath}`));
      await updateIndexForFile(filePath, config, gitService);
    });

    watcher.on('fileDeleted', async (filePath) => {
      console.log(chalk.red(`🗑️  Removing deleted file from index: ${filePath}`));
      await removeFileFromIndex(filePath, config, gitService);
    });

    watcher.on('branchChanged', async (oldBranch, newBranch) => {
      console.log(chalk.blue(`🌿 Branch changed: ${oldBranch} → ${newBranch}`));
      
      // Use simplified branch handling
      await gitService.handleBranchOperation('switch', {
        from: oldBranch,
        to: newBranch
      });
    });

    // Set up specs monitoring (for feature branches)
    await specsMonitor.startWatching(async (changeEvent) => {
      const currentBranch = await gitService.getCurrentBranch();
      
      if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
        console.log(chalk.yellow(`🔨 Rebuilding specs cache for feature branch ${currentBranch}...`));
        
        try {
          await specsIndexer.indexSpecsOnly(currentBranch);
          console.log(chalk.green(`✅ Specs cache rebuilt successfully`));
        } catch (error) {
          console.error(chalk.red(`❌ Failed to rebuild specs cache: ${error.message}`));
        }
      } else {
        console.log(chalk.gray('📝 Specs change detected on main branch - no action needed'));
        console.log(chalk.gray('   Main branch uses project context, not specs'));
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.blue('\n🛑 Stopping watch mode...'));
      watcher.stopWatching();
      await specsMonitor.stopWatching();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      watcher.stopWatching();
      await specsMonitor.stopWatching();
      process.exit(0);
    });

    // Start watching
    console.log(chalk.blue('🔍 Starting file and context monitoring...'));
    await watcher.startWatching('.');
    
    console.log(chalk.green('✅ Watch mode active'));
    console.log(chalk.gray('   📁 Monitoring file changes'));
    console.log(chalk.gray('   📋 Monitoring specs changes (feature branches)'));
    console.log(chalk.gray('   🌿 Monitoring branch changes'));
    console.log(chalk.gray('   Press Ctrl+C to stop'));
    
    // Keep process alive
    const keepAlive = () => {
      setTimeout(keepAlive, 1000);
    };
    keepAlive();
    
  } catch (error) {
    console.error(chalk.red('❌ Error in watch mode:'), error.message);
    process.exit(1);
  }
}

async function updateIndexForFile(filePath, config, gitService) {
  try {
    // Get branch-specific cache path
    const branchCachePath = await gitService.getBranchCachePath();
    const branchConfig = { ...config };
    branchConfig.storage.path = branchCachePath;

    // Load existing index
    const fs = require('fs');
    let indexData = { files: {}, chunks: [], metadata: {} };
    
    if (fs.existsSync(branchCachePath)) {
      const indexContent = fs.readFileSync(branchCachePath, 'utf8');
      indexData = JSON.parse(indexContent);
    }

    // Remove existing chunks for this file
    indexData.chunks = indexData.chunks.filter(chunk => chunk.file_path !== filePath);
    delete indexData.files[filePath];

    // Add new chunks for the file
    const indexer = new ContextRagIndexer(branchConfig);
    const content = fs.readFileSync(filePath, 'utf8');
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    const stats = fs.statSync(filePath);
    
    const chunks = indexer.chunkContent(content);
    
    indexData.files[filePath] = {
      hash: fileHash,
      modified: stats.mtime.getTime(),
      chunks: chunks.length
    };

    chunks.forEach((chunk, index) => {
      indexData.chunks.push({
        file_path: filePath,
        content: chunk,
        chunk_index: index,
        file_hash: fileHash,
        modified_time: stats.mtime.getTime()
      });
    });

    // Save updated index
    fs.writeFileSync(branchCachePath, JSON.stringify(indexData, null, 2));
    
    console.log(chalk.gray(`   ✅ Updated index with ${chunks.length} chunks`));
    
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Failed to update index for ${filePath}: ${error.message}`));
  }
}

async function removeFileFromIndex(filePath, config, gitService) {
  try {
    const branchCachePath = await gitService.getBranchCachePath();
    const fs = require('fs');
    
    if (!fs.existsSync(branchCachePath)) {
      return;
    }

    const indexContent = fs.readFileSync(branchCachePath, 'utf8');
    const indexData = JSON.parse(indexContent);

    // Remove chunks for this file
    const originalChunkCount = indexData.chunks.length;
    indexData.chunks = indexData.chunks.filter(chunk => chunk.file_path !== filePath);
    delete indexData.files[filePath];

    // Save updated index
    fs.writeFileSync(branchCachePath, JSON.stringify(indexData, null, 2));
    
    const removedChunks = originalChunkCount - indexData.chunks.length;
    console.log(chalk.gray(`   ✅ Removed ${removedChunks} chunks from index`));
    
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Failed to remove ${filePath} from index: ${error.message}`));
  }
}

module.exports = watchCommand;