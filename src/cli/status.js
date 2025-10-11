const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { APIService } = require('../services/api');

async function statusCommand(options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const apiService = new APIService(config);
    
    // Get all status information
    const [indexStatus, branchInfo, contextInfo] = await Promise.all([
      apiService.getIndexStatus(),
      apiService.getBranchInfo(),
      apiService.getContextInfo()
    ]);

    if (options.json) {
      const status = {
        index: indexStatus,
        branches: branchInfo,
        context: contextInfo,
        timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.blue('📊 Context-RAG Status\n'));

    // Index Status
    console.log(chalk.cyan('📋 Index Status:'));
    if (indexStatus.cache_exists) {
      console.log(chalk.green('   ✅ Index exists'));
      console.log(chalk.gray(`   📁 Files: ${indexStatus.total_files}`));
      console.log(chalk.gray(`   📄 Chunks: ${indexStatus.total_chunks}`));
      console.log(chalk.gray(`   💾 Size: ${(indexStatus.cache_size / 1024).toFixed(1)} KB`));
      console.log(chalk.gray(`   🕒 Modified: ${new Date(indexStatus.last_modified).toLocaleString()}`));
    } else {
      console.log(chalk.red('   ❌ No index found'));
      console.log(chalk.gray('   Run "context-rag index" to create an index'));
    }

    // Branch Status
    console.log(chalk.cyan('\n🌿 Branch Status:'));
    if (branchInfo.current_branch) {
      console.log(chalk.green(`   📍 Current: ${branchInfo.current_branch}`));
      console.log(chalk.gray(`   📋 Cached branches: ${branchInfo.total_cached_branches}`));
      
      if (branchInfo.has_changes) {
        console.log(chalk.yellow(`   🔄 Changed files: ${branchInfo.changed_files.length}`));
      } else {
        console.log(chalk.green('   ✅ No uncommitted changes'));
      }
    } else {
      console.log(chalk.yellow('   ⚠️  Not in a git repository'));
    }

    // Check specs and project context
    const { SpecsMonitor } = require('../services/context-monitor');
    const { ProjectContextIndexer } = require('../services/project-context-indexer');
    
    const specsMonitor = new SpecsMonitor(config);
    const projectContextIndexer = new ProjectContextIndexer(config);
    
    const specsDiscovery = await specsMonitor.discoverContextFiles();
    const projectContextFiles = await projectContextIndexer.discoverContextFiles(
      projectContextIndexer.getContextPaths()
    );
    
    // Check for handoff-ai integration
    const hasHandoffAI = require('fs').existsSync('.project') && 
      require('fs').statSync('.project').isDirectory() &&
      require('fs').readdirSync('.project').some(file => 
        file.includes('context') || file.includes('overview') || 
        file.includes('architecture') || file.endsWith('.md')
      );

    // Context & Specs Status
    console.log(chalk.cyan('\n🎯 Content Status:'));
    
    // Project Context (main branch)
    if (projectContextFiles.length > 0) {
      console.log(chalk.green(`   📚 Project Context: ${projectContextFiles.length} files`));
      console.log(chalk.gray(`      Used by: main branch (stable project knowledge)`));
      projectContextFiles.slice(0, 3).forEach(file => {
        console.log(chalk.gray(`      ${file.path}`));
      });
      if (projectContextFiles.length > 3) {
        console.log(chalk.gray(`      ... and ${projectContextFiles.length - 3} more`));
      }
    } else {
      console.log(chalk.yellow('   ⚠️  No project context files found'));
      console.log(chalk.gray('      Configure context.include for docs/, .project/, README.md'));
    }
    
    // Specs (feature branches)
    if (specsDiscovery.totalFiles > 0) {
      console.log(chalk.green(`   📋 Feature Specs: ${specsDiscovery.totalFiles} files`));
      console.log(chalk.gray(`      Used by: feature branches (implementation docs)`));
      specsDiscovery.directories.forEach(dir => {
        console.log(chalk.gray(`      ${dir.path} (${dir.files.length} files)`));
      });
    } else {
      console.log(chalk.yellow('   ⚠️  No specs files found'));
      console.log(chalk.gray('      Configure specs.include for .kiro/specs/, requirements/, design/'));
    }
    
    if (hasHandoffAI) {
      console.log(chalk.green('   🤖 Handoff-AI integration detected'));
    }

    // Detect embedding engine
    const { EmbeddingService } = require('../services/embedder');
    const embedder = new EmbeddingService(config);
    const engine = await embedder.detectEmbeddingEngine();

    // Configuration
    console.log(chalk.cyan('\n⚙️  Configuration:'));
    console.log(chalk.gray(`   🧠 Embedder: ${config.embedder.model}`));
    console.log(chalk.gray(`   🔍 Search engine: ${config.search.engine}`));
    console.log(chalk.gray(`   📊 Top-K results: ${config.search.top_k}`));
    console.log(chalk.gray(`   ⚡ Engine: ${engine} ${engine === 'rust' ? '(fastest)' : engine === 'python' ? '(recommended)' : '(basic)'}`));

    // Show recommendations
    console.log(chalk.blue('\n💡 Recommendations:'));
    
    if (!indexStatus.cache_exists) {
      console.log(chalk.yellow('   • Run "context-rag index" to create your first index'));
    } else if (branchInfo.has_changes) {
      console.log(chalk.yellow('   • Run "context-rag index" to update index with recent changes'));
    }
    
    if (!contextInfo.has_context && !hasHandoffAI) {
      console.log(chalk.gray('   • Consider using handoff-ai to generate .project/ context'));
      console.log(chalk.gray('   • Or add structured context manually in .project/ folder'));
    }
    
    if (branchInfo.total_cached_branches > 5) {
      console.log(chalk.gray('   • Use "context-rag branch --list" to manage cached branches'));
    }

    // Performance recommendations - prioritize Rust first
    if (engine === 'nodejs') {
      console.log(chalk.yellow('   • For best performance, install Rust: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'));
      console.log(chalk.gray('   • Or install Python alternative: pip install sentence-transformers'));
    } else if (engine === 'python') {
      console.log(chalk.yellow('   • For fastest performance, install Rust: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'));
    }

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2));
    } else {
      console.error(chalk.red('❌ Error getting status:'), error.message);
    }
    process.exit(1);
  }
}

module.exports = statusCommand;