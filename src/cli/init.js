const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');

const agentsIntegration = `
## Context-RAG Integration

**User Hint System**: Control when AI uses context-rag with simple prefixes:

**Triggers**:
- \`context-rag:\` or \`ctx:\` → Use context-rag for this question
- \`general:\` → Answer without context-rag  
- \`project:\` → Use context-rag for this question

**Examples**:
\`\`\`
User: "context-rag: how does authentication work?"
→ Run: context-rag ai "how does authentication work" --expand
→ Use project context in response

User: "general: what is JWT?"
→ Answer directly without context-rag

User: "how does authentication work?" 
→ Use your default behavior (always/never/guess)
\`\`\`

**Command**: \`context-rag ai "[user question without prefix]" --expand\`
**Output**: JSON with project context or error message

**Setup**: Choose your default behavior when no prefix is used:
- Option A: Always use context-rag unless "general:" prefix
- Option B: Never use context-rag unless "context-rag:" prefix  
- Option C: AI tries to guess (not recommended)
`;

function detectProjectContext() {
  // Check for .project directory (handoff-ai or similar)
  if (fs.existsSync('.project') && fs.statSync('.project').isDirectory()) {
    const projectFiles = fs.readdirSync('.project');
    const hasContext = projectFiles.some(file => 
      file.includes('context') || 
      file.includes('overview') || 
      file.includes('architecture') ||
      file.endsWith('.md')
    );
    if (hasContext) {
      return { type: 'handoff-ai', path: '.project/' };
    }
  }

  // Check for other common context directories
  const commonContextDirs = [
    { path: 'docs/', name: 'documentation' },
    { path: '.docs/', name: 'hidden docs' },
    { path: 'context/', name: 'context directory' },
    { path: '.context/', name: 'hidden context' }
  ];

  for (const dir of commonContextDirs) {
    if (fs.existsSync(dir.path) && fs.statSync(dir.path).isDirectory()) {
      const files = fs.readdirSync(dir.path);
      if (files.some(file => file.endsWith('.md'))) {
        return { type: 'custom', path: dir.path, name: dir.name };
      }
    }
  }

  return null;
}

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
        console.log(chalk.yellow('Invalid choice, using default...'));
        resolve(choices[0]); // Default to first choice
      }
    });
  });
}

async function checkEngineAvailability(engineType) {
  const { promisify } = require('util');
  const exec = require('child_process').exec;
  const execAsync = promisify(exec);
  
  try {
    switch (engineType) {
      case 'rust':
        await execAsync('cargo --version');
        // Check if embedder is compiled
        const rustEmbedderPath = path.join(__dirname, '../../target/release/context-rag-embedder');
        if (fs.existsSync(rustEmbedderPath)) {
          return { available: true, message: 'Rust embedder ready' };
        } else {
          return { 
            available: false, 
            message: 'Rust toolchain found but embedder not compiled',
            suggestion: 'Run: cargo build --release'
          };
        }
      case 'python':
        await execAsync('python3 --version');
        await execAsync('python3 -c "import sentence_transformers"');
        return { available: true, message: 'Python + sentence-transformers ready' };
      case 'nodejs':
        return { available: true, message: 'Node.js fallback (always available)' };
      default:
        return { available: false, message: 'Unknown engine type' };
    }
  } catch (error) {
    switch (engineType) {
      case 'rust':
        return { 
          available: false, 
          message: 'Rust not installed',
          suggestion: 'Install Rust: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh',
          fallback: 'You can use Python or Node.js instead for now'
        };
      case 'python':
        // Check if it's Python missing or just sentence-transformers
        try {
          await execAsync('python3 --version');
          return { 
            available: false, 
            message: 'Python found but sentence-transformers not installed',
            suggestion: 'Install: pip install sentence-transformers'
          };
        } catch {
          return { 
            available: false, 
            message: 'Python not installed',
            suggestion: 'Install Python: https://python.org/downloads then run: pip install sentence-transformers',
            fallback: 'You can use Node.js fallback for now'
          };
        }
      default:
        return { available: false, message: 'Engine not available' };
    }
  }
}

function createConfig(contextInfo, embedderChoice) {
  const baseConfig = {
    embedder: {
      type: embedderChoice,
      model: "sentence-transformers/all-MiniLM-L6-v2"
    },
    search: {
      engine: "rust",
      top_k: 5
    },
    storage: {
      type: "sqlite",
      path: ".context-rag/index.db"
    },
    cache: {
      enabled: true,
      branch_aware: true,
      max_size: "1GB"
    }
  };

  if (contextInfo) {
    // Organized context detected - use it
    return {
      ...baseConfig,
      index: {
        include: [contextInfo.path],
        exclude: ["node_modules/", ".git/", "dist/", "build/"]
      }
    };
  } else {
    // No organized context - provide educational default
    return {
      ...baseConfig,
      index: {
        include: [".project/"],
        exclude: ["node_modules/", ".git/", "dist/", "build/"]
      }
    };
  }
}

function createToolManifest() {
  const toolManifestPath = '.context-rag/tool-info.json';
  
  const toolInfo = {
    name: 'context-rag',
    version: require('../../package.json').version,
    description: 'Get project context for AI agents to save tokens',
    command: 'context-rag ai',
    purpose: 'AI agents call this to get relevant project context instead of sending entire codebase'
  };
  
  fs.writeFileSync(toolManifestPath, JSON.stringify(toolInfo, null, 2));
  console.log(chalk.green('Created tool info for AI integration'));
}

async function initCommand() {
  const configPath = '.context-rag.config.json';
  const cacheDir = '.context-rag';
  
  try {
    // Check if config already exists
    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow('Configuration file already exists!'));
      console.log(chalk.gray(`Found: ${configPath}`));
      return;
    }

    // Create cache directory
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(chalk.green(`Created cache directory: ${cacheDir}`));
    }

    // Detect organized project context
    const contextInfo = detectProjectContext();
    
    if (!contextInfo) {
      // No organized context found - educate the user
      console.log(chalk.yellow('⚠️  No organized project context found!'));
      console.log(chalk.gray(''));
      console.log(chalk.gray('Context-RAG works best with organized project context.'));
      console.log(chalk.gray('This ensures AI gets high-quality, relevant information instead of scattered files.'));
      console.log(chalk.gray(''));
      console.log(chalk.blue('📋 Recommended approach:'));
      console.log(chalk.cyan('  1. Use handoff-ai (recommended):'));
      console.log(chalk.gray('     npm install -g handoff-ai'));
      console.log(chalk.gray('     handoff-ai init'));
      console.log(chalk.gray(''));
      console.log(chalk.cyan('  2. Or create .project/ directory manually with:'));
      console.log(chalk.gray('     - overview.md (project summary)'));
      console.log(chalk.gray('     - architecture.md (technical architecture)'));
      console.log(chalk.gray('     - context.md (key patterns and decisions)'));
      console.log(chalk.gray(''));
      console.log(chalk.gray('After organizing your context, run "context-rag init" again.'));
      console.log(chalk.gray('You can also edit the "include" paths in .context-rag.config.json manually.'));
      console.log(chalk.gray(''));
    }

    // Ask user to choose embedding engine
    console.log(chalk.blue('\n🔧 Choose your embedding engine:'));
    const engineChoices = [
      { 
        value: 'rust', 
        name: 'Rust', 
        description: 'Fastest performance (recommended)' 
      },
      { 
        value: 'python', 
        name: 'Python', 
        description: 'High-quality embeddings with sentence-transformers' 
      },
      { 
        value: 'nodejs', 
        name: 'Node.js', 
        description: 'Always works, basic functionality' 
      }
    ];

    const chosenEngine = await promptUserChoice('Which embedding engine would you like to use?', engineChoices);
    
    // Check if chosen engine is available
    console.log(chalk.gray(`\nChecking ${chosenEngine.name} availability...`));
    const availability = await checkEngineAvailability(chosenEngine.value);
    
    if (availability.available) {
      console.log(chalk.green(`✅ ${availability.message}`));
    } else {
      console.log(chalk.yellow(`⚠️  ${availability.message}`));
      if (availability.suggestion) {
        console.log(chalk.cyan(`   Install: ${availability.suggestion}`));
      }
      if (availability.fallback) {
        console.log(chalk.gray(`   Fallback: ${availability.fallback}`));
      }
      console.log(chalk.gray('   Continuing with this choice - you can install dependencies later.'));
    }

    // Create configuration
    const config = createConfig(contextInfo, chosenEngine.value);
    
    // Write configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\nCreated configuration file: ${configPath}`));
    
    if (contextInfo) {
      if (contextInfo.type === 'handoff-ai') {
        console.log(chalk.blue('🎯 Handoff-AI context detected!'));
        console.log(chalk.gray('   Configured to index .project/ directory for optimal context'));
      } else {
        console.log(chalk.blue(`🎯 Organized context detected: ${contextInfo.name}`));
        console.log(chalk.gray(`   Configured to index ${contextInfo.path} directory`));
      }
      console.log(chalk.gray('   You can modify "include" paths in .context-rag.config.json if needed'));
    }

    // Create tool info for AI integration
    createToolManifest();

    // Create subdirectories
    const subdirs = ['cache', 'embeddings', 'indices'];
    subdirs.forEach(dir => {
      const dirPath = path.join(cacheDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    if (contextInfo) {
      console.log(chalk.blue('\n✨ Context-RAG initialized successfully!'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Run "context-rag index" to build your project index'));
      console.log(chalk.gray('     📝 Note: First index should be run from main branch for proper branch-aware caching'));
      console.log(chalk.gray('  2. AI agents can now call "context-rag ai <question>" for context'));
      console.log(chalk.gray('  3. Enjoy 90% token savings with project-specific responses!'));
    } else {
      console.log(chalk.yellow('\n⚠️  Context-RAG initialized with default configuration.'));
      console.log(chalk.gray('Please organize your project context first for optimal results.'));
    }
    
    // Show additional tips based on chosen engine availability
    if (!availability.available) {
      console.log(chalk.yellow('\n💡 To get optimal performance:'));
      if (availability.suggestion) {
        console.log(chalk.cyan(`   ${availability.suggestion}`));
      }
      if (availability.fallback) {
        console.log(chalk.gray(`   Or ${availability.fallback.toLowerCase()}`));
      }
      console.log(chalk.gray('   Context-RAG will work with any engine, but faster engines give better performance.'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}

module.exports = initCommand;