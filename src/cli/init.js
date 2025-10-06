const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const defaultConfig = {
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
    top_k: 5,
    expanded_search: {
      enabled: false,
      max_passes: 3,
      enable_code_references: true,
      enable_co_occurrence: true
    }
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

    // Write default configuration
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log(chalk.green(`Created configuration file: ${configPath}`));

    // Create subdirectories
    const subdirs = ['cache', 'embeddings', 'indices'];
    subdirs.forEach(dir => {
      const dirPath = path.join(cacheDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    console.log(chalk.blue('\n✨ Context-RAG initialized successfully!'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Run "context-rag index" to build your first index'));
    console.log(chalk.gray('  2. Try "context-rag query \'your question\'" to search'));
    
  } catch (error) {
    console.error(chalk.red('Error during initialization:'), error.message);
    process.exit(1);
  }
}

module.exports = initCommand;