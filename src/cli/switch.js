const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');

async function promptUserChoice(question, choices) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(chalk.blue(question));
    choices.forEach((choice, index) => {
      console.log(chalk.gray(`  ${index + 1}. ${choice.name} ${choice.description ? '- ' + choice.description : ''}`));
    });
    console.log('');

    rl.question(chalk.cyan('Enter your choice (1-' + choices.length + '): '), (answer) => {
      rl.close();
      const choiceIndex = parseInt(answer) - 1;
      if (choiceIndex >= 0 && choiceIndex < choices.length) {
        resolve(choices[choiceIndex]);
      } else {
        console.log(chalk.yellow('Invalid choice, keeping current setting...'));
        resolve(null);
      }
    });
  });
}

async function switchCommand(options = {}) {
  const configPath = '.context-rag.config.json';
  
  try {
    // Check if config exists
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ No configuration found!'));
      console.log(chalk.gray('Run "context-rag init" first to create a configuration.'));
      return;
    }

    // Read current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const currentEngine = config.embedder?.type || 'auto';
    
    console.log(chalk.blue('🔧 Switch Embedding Engine'));
    console.log(chalk.gray(`Current engine: ${currentEngine}`));
    console.log('');

    // Engine options
    const engineChoices = [
      { 
        value: 'auto', 
        name: 'Auto-detect', 
        description: 'Let context-rag choose the best available engine' 
      },
      { 
        value: 'rust', 
        name: 'Rust', 
        description: 'Fastest option (if available)' 
      },

      { 
        value: 'python-fast', 
        name: 'Python-Fast', 
        description: 'Lightweight Python embedder' 
      },
      { 
        value: 'nodejs', 
        name: 'Node.js', 
        description: 'Always available built-in option' 
      }
    ];

    const chosenEngine = await promptUserChoice('Which embedding engine would you like to use?', engineChoices);
    
    if (!chosenEngine) {
      console.log(chalk.yellow('No changes made.'));
      return;
    }

    // Update config
    if (chosenEngine.value === 'auto') {
      // Remove the type to let auto-detection work
      delete config.embedder.type;
    } else {
      config.embedder.type = chosenEngine.value;
    }

    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(chalk.green(`✅ Switched to ${chosenEngine.name} embedder`));
    
    if (chosenEngine.value !== currentEngine) {
      console.log(chalk.yellow('⚠️  You may want to rebuild your index for consistency:'));
      console.log(chalk.cyan('   context-rag index --force'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error switching embedder:'), error.message);
    process.exit(1);
  }
}

module.exports = switchCommand;