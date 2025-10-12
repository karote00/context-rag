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
→ Run: context-rag ai "how does authentication work"
→ Use project context in response

User: "general: what is JWT?"
→ Answer directly without context-rag

User: "how does authentication work?" 
→ Use your default behavior (always/never/guess)
\`\`\`

**Command**: \`context-rag ai "[user question without prefix]"\`
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
      case 'python-fast':
        await execAsync('python3 --version');
        return { available: true, message: 'Fast Python embedder ready' };
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
      case 'python-fast':
        try {
          await execAsync('python3 --version');
          return { 
            available: false, 
            message: 'Python not installed',
            suggestion: 'Install Python: https://python.org/downloads'
          };
        } catch {
          return { 
            available: false, 
            message: 'Python not installed',
            suggestion: 'Install Python: https://python.org/downloads',
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

  // Project context configuration (main branch - stable knowledge)
  const contextConfig = {
    include: [
      ".project/",
      "docs/", 
      "README.md",
      "ARCHITECTURE.md"
    ],
    exclude: ["node_modules/", ".git/", "dist/", "build/"]
  };

  // Feature specs configuration (feature branches - implementation docs)
  const specsConfig = {
    include: [
      ".kiro/specs/",
      "requirements/",
      "design/"
    ],
    exclude: [
      "node_modules",
      ".git",
      "package-lock.json",
      "*.log"
    ],
    extensions: [".md", ".txt", ".yaml", ".yml", ".json"]
  };

  return {
    ...baseConfig,
    context: contextConfig,
    specs: specsConfig
  };
}

function updateGitignore(embedderChoice) {
  const gitignorePath = '.gitignore';
  const contextRagEntries = [
    '',
    '# Context-RAG cache and data',
    '.context-rag/',
  ];
  
  // Add engine-specific entries
  if (embedderChoice === 'rust') {
    contextRagEntries.push('');
    contextRagEntries.push('# Rust build artifacts (context-rag)');
    contextRagEntries.push('target/');
    contextRagEntries.push('Cargo.lock');
  }
  
  contextRagEntries.push('');
  
  let gitignoreContent = '';
  let needsUpdate = false;
  
  // Read existing .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    // Check if .context-rag/ is already ignored
    if (!gitignoreContent.includes('.context-rag/')) {
      needsUpdate = true;
    }
  } else {
    // Create new .gitignore
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    // Add context-rag entries to .gitignore
    const updatedContent = gitignoreContent + contextRagEntries.join('\n');
    fs.writeFileSync(gitignorePath, updatedContent);
    
    if (embedderChoice === 'rust') {
      console.log(chalk.green('Updated .gitignore to exclude .context-rag/ and Rust build artifacts'));
    } else {
      console.log(chalk.green('Updated .gitignore to exclude .context-rag/ directory'));
    }
  } else {
    console.log(chalk.gray('.gitignore already configured for context-rag'));
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

async function initCommand(options = {}) {
  const configPath = '.context-rag.config.json';
  const cacheDir = '.context-rag';
  const jsonOutput = options.json;
  
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
      // No organized context found - just inform, don't require action
      console.log(chalk.yellow('⚠️  No organized project context found'));
      console.log(chalk.gray('Consider creating .project/ directory with project documentation'));
      console.log(chalk.gray('You can modify "include" paths in .context-rag.config.json'));
    }

    // Ask user to choose embedding engine
    console.log(chalk.blue('\n🔧 Choose your embedding engine:'));
    const engineChoices = [
      { 
        value: 'rust', 
        name: 'Rust', 
        description: 'Recommended' 
      },
      { 
        value: 'python-fast', 
        name: 'Python-Fast', 
        description: 'Lightweight embeddings' 
      },
      { 
        value: 'nodejs', 
        name: 'Node.js', 
        description: 'Always available' 
      }
    ];

    const chosenEngine = await promptUserChoice('Which embedding engine would you like to use?', engineChoices);
    
    // Check if chosen engine is available
    console.log(chalk.gray(`\nChecking ${chosenEngine.name} availability...`));
    const availability = await checkEngineAvailability(chosenEngine.value);
    
    // Store the action required for exit code determination
    let actionRequired = false;
    
    if (availability.available) {
      console.log(chalk.green(`✅ ${chosenEngine.name} is ready`));
    } else {
      actionRequired = true;
      console.log(chalk.yellow(`⚠️  ${chosenEngine.name} requires installation`));
    }

    // Create configuration
    const config = createConfig(contextInfo, chosenEngine.value);
    
    // Write configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\nCreated configuration file: ${configPath}`));
    
    if (contextInfo) {
      if (contextInfo.type === 'handoff-ai') {
        console.log(chalk.green('✅ Handoff-AI context detected'));
      } else {
        console.log(chalk.green(`✅ Organized context detected: ${contextInfo.name}`));
      }
    }

    // Update .gitignore to exclude context-rag cache
    updateGitignore(chosenEngine.value);

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

    // Determine final status and exit code
    let exitCode = 0;
    let status = 'success';
    let actions = [];
    
    if (!availability.available && availability.suggestion) {
      actions.push({
        type: 'install_engine',
        command: availability.suggestion,
        description: `Install ${chosenEngine.name} engine`
      });
    }
    
    if (actions.length > 0) {
      exitCode = 2; // Success with action required
      status = 'action_required';
    }
    
    if (jsonOutput) {
      // JSON output for AI agents
      const result = {
        status,
        exit_code: exitCode,
        engine: {
          chosen: chosenEngine.value,
          available: availability.available
        },
        context: {
          detected: !!contextInfo,
          type: contextInfo?.type || null,
          path: contextInfo?.path || null
        },
        actions,
        next_command: actions.length === 0 ? 'context-rag index' : null
      };
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Human-readable output
      if (availability.available) {
        console.log(chalk.green('\n✅ Context-RAG initialized successfully!'));
        console.log(chalk.gray('Ready to run: context-rag index'));
      } else {
        console.log(chalk.yellow('\n⚠️  Context-RAG initialized - engine installation required'));
        if (actions.length > 0) {
          console.log(chalk.cyan('\nACTION_REQUIRED:'));
          actions.forEach(action => {
            console.log(chalk.white(`${action.command}`));
            console.log(chalk.gray(`# ${action.description}`));
          });
        }
        console.log(chalk.gray('\nAfter installation, run: context-rag index'));
      }
    }
    
    // Exit with appropriate code for AI agents
    process.exit(exitCode);
    
  } catch (error) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}

module.exports = initCommand;