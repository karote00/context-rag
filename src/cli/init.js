const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

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

function detectHandoffAI() {
  // Check for .project directory (handoff-ai generated context)
  if (fs.existsSync('.project') && fs.statSync('.project').isDirectory()) {
    const projectFiles = fs.readdirSync('.project');
    // Look for typical handoff-ai generated files
    const hasContext = projectFiles.some(file => 
      file.includes('context') || 
      file.includes('overview') || 
      file.includes('architecture') ||
      file.endsWith('.md')
    );
    return hasContext;
  }
  return false;
}

function createConfig() {
  const hasHandoffAI = detectHandoffAI();
  
  if (hasHandoffAI) {
    // Handoff-AI detected - focus on .project directory
    return {
      index: {
        include: [".project/"],
        exclude: ["node_modules/", ".git/", "dist/", "build/"]
      },
      embedder: {
        type: "python",
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
  } else {
    // Standard configuration
    return {
      index: {
        include: ["docs/", "README.md", "*.md"],
        exclude: ["node_modules/", ".git/", "dist/", "build/"]
      },
      embedder: {
        type: "python",
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

    // Detect handoff-ai and create appropriate configuration
    const config = createConfig();
    const hasHandoffAI = detectHandoffAI();
    
    // Write configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`Created configuration file: ${configPath}`));
    
    if (hasHandoffAI) {
      console.log(chalk.blue('🎯 Handoff-AI detected!'));
      console.log(chalk.gray('   Configured to index .project/ directory for optimal context'));
      console.log(chalk.gray('   You can add more paths to "include" in .context-rag.config.json if needed'));
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

    // Detect and show available embedding engine
    const { EmbeddingService } = require('../services/embedder');
    const embedder = new EmbeddingService(config);
    const engine = await embedder.detectEmbeddingEngine();

    console.log(chalk.blue('\n✨ Context-RAG initialized successfully!'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag index" to build your project index'));
    console.log(chalk.gray('     📝 Note: First index should be run from main branch for proper branch-aware caching'));
    console.log(chalk.gray('  2. AI agents can now call "context-rag ai <question>" for context'));
    console.log(chalk.gray('  3. Enjoy 90% token savings with project-specific responses!'));
    
    // Show performance recommendations - prioritize Rust first
    if (engine === 'nodejs') {
      console.log(chalk.yellow('\n💡 Performance Tip:'));
      console.log(chalk.gray('   For best performance, install Rust (recommended):'));
      console.log(chalk.cyan('   curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'));
      console.log(chalk.gray('   Or install Python + sentence-transformers (alternative):'));
      console.log(chalk.cyan('   pip install sentence-transformers'));
    } else if (engine === 'python') {
      console.log(chalk.yellow('\n💡 Performance Tip:'));
      console.log(chalk.gray('   Install Rust for fastest performance (optional):'));
      console.log(chalk.cyan('   curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}

module.exports = initCommand;