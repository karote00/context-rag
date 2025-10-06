# context-rag

A lightweight CLI tool for semantic search (RAG) on project context, with branch-aware caching and AI integration.

---

## Features

- **🔍 Semantic Search**: Intelligent context filtering that saves 80-95% of AI tokens
- **🔄 Iterative Context Discovery**: Multi-pass expanded search finds related context automatically
- **🌿 Branch-Aware Caching**: Automatic git branch detection with smart cache merging
- **🤖 AI Integration**: Perfect context formatting for ChatGPT, Claude, Gemini, and any AI service
- **🎯 Context Filtering**: Smart selection of relevant code/docs instead of dumping entire files
- **🔧 Multi-Language Support**: Node.js core with Rust indexing and Python embeddings
- **🔌 Plugin System**: Extensible transformers and embedders (OpenAI, RustBert examples included)
- **📊 Token Efficiency**: Universal savings that work with any AI service pricing model
- **⚡ Real-time Updates**: Watch mode for automatic index updates on file changes

---

## Installation

```bash
npm install -g context-rag
```

For detailed installation instructions including Python and Rust dependencies, see the [Installation Guide](./docs/installation.md).

---

## Core Commands

### Setup & Indexing
```bash
context-rag init                    # Initialize in your project
context-rag index                   # Build semantic index
context-rag index --force           # Force rebuild
```

### Smart Search
```bash
context-rag query "authentication middleware"
context-rag query "database schema" --json
context-rag query "error handling" --format markdown
context-rag query "drag resize element" --expand    # Multi-pass context discovery
context-rag ai "how do I add user registration?"    # Perfect for AI tools
```

### Project Management
```bash
context-rag status                  # Check project status
context-rag watch                   # Auto-update on file changes
context-rag branch --list           # Manage branch caches
```

### Plugin System
```bash
context-rag plugins --list          # Available transformers
context-rag query "auth" --format summary
context-rag query "auth" --transform openai-summary
```

### Token Efficiency Analysis
```bash
node tools/context-efficiency.js    # Measure token savings
node tools/interactive-tutorial.js  # Beginner tutorial
```

---

## Key Features in Detail

### 🎯 Context Filtering Efficiency
Instead of sending 10,000+ tokens of entire files to AI:
- **Smart filtering** reduces context to 200-500 relevant tokens
- **80-95% token savings** across all AI services
- **Universal compatibility** with OpenAI, Claude, Gemini, local models

### 🌿 Git Branch Intelligence
- **Automatic branch detection** with separate caches per branch
- **Smart cache merging** from base to feature branches
- **Incremental updates** only for changed files
- **Real-time file watching** with automatic index updates

### 🤖 AI Integration Ready
- **Structured JSON output** for programmatic use
- **AI-optimized formatting** with `context-rag ai` command
- **Multiple output formats**: markdown, summary, code-focused
- **Plugin system** for custom transformers and embedders

### 📊 Production Ready
- ✅ **Complete test suite** (unit, integration, performance)
- ✅ **Comprehensive documentation** with beginner tutorials
- ✅ **Plugin examples** (OpenAI, RustBert)
- ✅ **Token efficiency tools** for ROI measurement
- ✅ **Multi-language architecture** (Node.js + Rust + Python)  

---

## Quick Start

```bash
# Install globally
npm install -g context-rag

# Initialize in your project
cd your-project
context-rag init

# Build semantic index
context-rag index

# Search your codebase
context-rag query "authentication middleware"
context-rag query "database connection" --json
context-rag query "error handling" --format markdown
context-rag query "drag resize element" --expand  # Multi-pass discovery
```

For a complete walkthrough, see the [Quick Start Guide](./docs/quick-start.md).

---

## Documentation

### For Beginners 🌟
- [Complete Beginner's Guide](./docs/beginner-tutorial.md) - Step-by-step tutorial with examples
- [Interactive Tutorial](./tools/interactive-tutorial.js) - Hands-on guided walkthrough  
- [Cheat Sheet](./docs/cheat-sheet.md) - Quick reference for all commands

### For Everyone
- [Quick Start Guide](./docs/quick-start.md) - Get started in minutes  
- [Installation Guide](./docs/installation.md) - Setup and dependencies
- [Configuration Reference](./docs/configuration.md) - Complete configuration options
- [API Reference](./docs/api.md) - Complete command and API documentation
- [Expanded Search Guide](./docs/expanded-search.md) - Multi-pass context discovery
- [Plugin Development](./docs/plugins.md) - Creating custom transformers
- [Token Efficiency Tools](./tools/README.md) - Measure your savings

## Development

```bash
# Clone and setup
git clone https://github.com/yourusername/context-rag.git
cd context-rag
npm install

# Run tests
npm test

# Run benchmarks
npm run test test/performance/

# Link for development
npm link
```

## Contributing

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/xxx`)  
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit changes and open a PR

## License

MIT License
