const chalk = require('chalk');
const { loadConfig } = require('../services/config');
const { PluginManager } = require('../services/plugins');

async function pluginsCommand(options = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    if (!config) {
      process.exit(1);
    }

    const pluginManager = new PluginManager(config);
    await pluginManager.loadPlugins();

    if (options.list) {
      const transformers = pluginManager.listTransformers();
      
      console.log(chalk.blue('🔌 Available Result Transformers:\n'));
      
      if (transformers.length === 0) {
        console.log(chalk.gray('   No transformers available'));
        return;
      }

      transformers.forEach(transformer => {
        console.log(chalk.cyan(`   ${transformer.name}`));
        console.log(chalk.gray(`     ${transformer.description}`));
        console.log();
      });

      console.log(chalk.blue('💡 Usage Examples:'));
      console.log(chalk.gray('   context-rag query "your question" --format markdown'));
      console.log(chalk.gray('   context-rag query "your question" --format summary'));
      console.log(chalk.gray('   context-rag query "your question" --transform markdown,summary'));
      
      return;
    }

    // Default: show plugin status
    const transformers = pluginManager.listTransformers();
    
    console.log(chalk.blue('🔌 Plugin Manager Status\n'));
    console.log(chalk.cyan(`📊 Total transformers: ${transformers.length}`));
    
    const builtinCount = transformers.filter(t => !t.name.includes(':')).length;
    const externalCount = transformers.filter(t => t.name.includes(':')).length;
    
    console.log(chalk.gray(`   Built-in: ${builtinCount}`));
    console.log(chalk.gray(`   External: ${externalCount}`));
    
    console.log(chalk.blue('\n🎯 Available Formats:'));
    console.log(chalk.gray('   • json      - Raw JSON output'));
    console.log(chalk.gray('   • markdown  - Formatted markdown'));
    console.log(chalk.gray('   • summary   - Results summary'));
    console.log(chalk.gray('   • code      - Code-focused format'));
    console.log(chalk.gray('   • context   - Context extraction'));
    
    console.log(chalk.blue('\n💡 Next Steps:'));
    console.log(chalk.gray('   • Use --list to see all available transformers'));
    console.log(chalk.gray('   • Try different formats with --format option'));
    console.log(chalk.gray('   • Chain transformers with --transform option'));

  } catch (error) {
    console.error(chalk.red('❌ Error managing plugins:'), error.message);
    process.exit(1);
  }
}

module.exports = pluginsCommand;