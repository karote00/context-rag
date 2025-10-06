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
      const embedders = pluginManager.listEmbedders();
      const loadedPlugins = pluginManager.listLoadedPlugins();
      
      console.log(chalk.blue('🔌 Loaded Plugins:\n'));
      
      if (loadedPlugins.length > 0) {
        loadedPlugins.forEach(plugin => {
          console.log(chalk.green(`   ${plugin.name} v${plugin.version}`));
          console.log(chalk.gray(`     ${plugin.description}`));
          if (plugin.transformers.length > 0) {
            console.log(chalk.gray(`     Transformers: ${plugin.transformers.join(', ')}`));
          }
          if (plugin.embedders.length > 0) {
            console.log(chalk.gray(`     Embedders: ${plugin.embedders.join(', ')}`));
          }
          console.log();
        });
      } else {
        console.log(chalk.gray('   No external plugins loaded'));
      }
      
      console.log(chalk.blue('🔧 Available Transformers:\n'));
      
      if (transformers.length === 0) {
        console.log(chalk.gray('   No transformers available'));
      } else {
        transformers.forEach(transformer => {
          console.log(chalk.cyan(`   ${transformer.name}`));
          console.log(chalk.gray(`     ${transformer.description}`));
          console.log();
        });
      }

      console.log(chalk.blue('🧠 Available Embedders:\n'));
      
      if (embedders.length === 0) {
        console.log(chalk.gray('   No custom embedders available'));
      } else {
        embedders.forEach(embedder => {
          console.log(chalk.cyan(`   ${embedder.name}`));
          console.log(chalk.gray(`     ${embedder.description}`));
          console.log();
        });
      }

      console.log(chalk.blue('💡 Usage Examples:'));
      console.log(chalk.gray('   context-rag query "your question" --format markdown'));
      console.log(chalk.gray('   context-rag query "your question" --format summary'));
      console.log(chalk.gray('   context-rag query "your question" --transform markdown,summary'));
      console.log(chalk.gray('   context-rag query "your question" --transform context-rag-plugin-openai:openai-summary'));
      
      return;
    }

    // Default: show plugin status
    const transformers = pluginManager.listTransformers();
    const embedders = pluginManager.listEmbedders();
    const loadedPlugins = pluginManager.listLoadedPlugins();
    
    console.log(chalk.blue('🔌 Plugin Manager Status\n'));
    console.log(chalk.cyan(`📦 Loaded plugins: ${loadedPlugins.length}`));
    console.log(chalk.cyan(`🔧 Total transformers: ${transformers.length}`));
    console.log(chalk.cyan(`🧠 Total embedders: ${embedders.length}`));
    
    const builtinTransformers = transformers.filter(t => !t.name.includes(':')).length;
    const externalTransformers = transformers.filter(t => t.name.includes(':')).length;
    
    console.log(chalk.gray(`   Built-in transformers: ${builtinTransformers}`));
    console.log(chalk.gray(`   External transformers: ${externalTransformers}`));
    console.log(chalk.gray(`   External embedders: ${embedders.length}`));
    
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