# context-rag

**Get relevant project context for AI agents to save 90% of tokens.**

A lightweight CLI tool that helps AI agents understand your project by providing focused context instead of sending entire codebases.

---

## 🎯 Core Value

**Problem**: AI agents waste tokens by sending entire conversation history or large code files  
**Solution**: AI agents call `context-rag ai "question"` to get only relevant project context  
**Result**: 90% token savings + project-specific responses

## ✨ Key Benefits

- **💰 90% Token Savings**: Send only relevant context, not entire codebase
- **🎯 Project-Specific Responses**: AI gets actual project patterns and code
- **🔌 Universal Compatibility**: Works with any AI service (OpenAI, Claude, Gemini, local models)
- **🎛️ Interactive Setup**: Choose your preferred engine with smart validation and guidance
- **🚀 Cascading Performance**: Rust → Python → Node.js with availability checking
- **📚 Smart Context**: Auto-detects organized documentation, works with any structure
- **🎯 Smart Integration**: Auto-detects docs/, and other context directories
- **🌿 Branch-Aware**: Automatic git branch detection and caching
- **🛡️ Branch Safety**: Prevents indexing mistakes with smart baseline enforcement
- **⚡ Multi-Engine Support**: Rust → Python → Python-Fast → Node.js with intelligent fallbacks

---

## Installation

```bash
npm install -g context-rag
```

That's it! Context-rag works out of the box with intelligent auto-detection:

- **🦀 Rust**: Fastest option with ML-quality embeddings (auto-detected if available)
- **⚡ Python-Fast**: Lightweight TF-IDF embeddings (~0.1s startup)
- **📦 Node.js**: Always available built-in fallback

---

## 🚀 Quick Start

### Setup (One-time)
```bash
npm install -g context-rag
cd your-project
context-rag init          # Interactive setup with engine selection
context-rag index         # Smart: run from main branch first for proper baseline
```

**Smart Branch-Aware Setup:**
- **Main Branch**: Indexes project context (docs/, README.md, architecture)
- **Feature Branches**: Indexes implementation specs (.kiro/specs/, requirements/, design/)
- **Engine Choice**: Choose Rust, Python, or Node.js with availability checking
- **Auto-Configuration**: Separate context/specs paths with sensible defaults

### Usage (AI Agents)
```bash
# AI agents call this to get clean JSON context (no parsing needed)
context-rag ai "how to implement authentication"
context-rag ai "explain the project structure"  
context-rag ai "how to add new API endpoint"

# Always outputs clean JSON - ready for direct consumption
# No hints, colors, or extra text to filter out
```

### Manual Usage
```bash
# Branch-aware searching
context-rag query "authentication middleware"      # Interactive mode (colors, hints)
context-rag query "auth middleware" --json         # Clean JSON mode (for scripts)

# Main branch: searches project context (docs, architecture)
# Feature branch: searches specs (requirements, design, tasks)

context-rag status                                  # Check index status, embedding engine
context-rag branch --list                           # Manage branch-specific caches
```

## 💡 How It Works

### Traditional Approach (Wasteful)
```
User: "How to implement auth?"
AI: Sends entire conversation + large code files (2000+ tokens)
LLM: Generic response that may not match your project
```

### With Context-RAG (Efficient)  
```
User: "How to implement auth?"
AI: context-rag ai "implement auth" → Gets relevant auth code (200 tokens)
AI: Sends question + focused context (210 tokens total)
LLM: Project-specific response using your actual patterns
```

**Result: 90% token savings + better answers**

---

## 🎯 Branch-Aware Intelligence

### **Main Branch (Project Context)**
```bash
git checkout main
context-rag index
# → Indexes: docs/, .project/, README.md, ARCHITECTURE.md
# → Stable project knowledge baseline
```

### **Feature Branch (Implementation Specs)**
```bash
git checkout feature/auth
context-rag index  
# → Indexes: .kiro/specs/, requirements/, design/
# → Feature-specific implementation docs
```

### **Smart Configuration**
```json
{
  "context": {
    "include": [".project/", "docs/", "README.md"]
  },
  "specs": {
    "include": [".kiro/specs/", "requirements/", "design/"],
    "extensions": [".md", ".txt", ".yaml"]
  }
}
```

**No Overlap**: Clear separation between project knowledge and feature specs

---

## 🧠 Smart Features

### 🎛️ Interactive Engine Selection
Context-rag lets you choose your preferred embedding engine with smart validation:

```bash
context-rag init

🔧 Choose your embedding engine:
  1. Rust - Recommended
  2. Python - High-quality embeddings
  3. Node.js - Always available

Enter your choice (1-3): 2

Checking Python availability...
✅ Fast Python embedder ready
```

**Smart Validation:**
- **Availability Checking**: Verifies if your chosen engine is installed
- **Install Guidance**: Provides exact commands to install missing dependencies
- **Fallback Options**: Shows alternatives if your first choice isn't available
- **Performance Tips**: Explains the benefits of each engine

> 🤔 **New to embeddings?** Check out our [complete guide](./docs/embeddings-explained.md) that explains what embeddings are and how each engine works!

### 📚 Smart Context Detection
Context-rag automatically detects and optimizes for organized project documentation:

```bash
# With organized context:
context-rag init
# ✅ Documentation context detected
# ✅ Python is ready for fast embeddings
# ✅ Context-RAG initialized successfully!

# Without organized context:
context-rag init
# ⚠️  No organized project context found
# Consider creating docs/ directory with project documentation
# ✅ Context-RAG initialized successfully!
```

**Smart Detection Features:**
- **Auto-detects**: `docs/`, `.docs/`, `context/` directories
- **Flexible Configuration**: Customize include/exclude paths in config
- **Works Everywhere**: Functions with any project structure
- **Optimization Tips**: Suggests improvements without blocking setup

### 🛡️ Branch Safety
Prevents common indexing mistakes:

```bash
# On feature branch without main baseline:
context-rag index
# ⚠️  First-time indexing detected on feature branch!
# ❌ Cannot create baseline index from feature branch.
# 
# To establish proper branch-aware caching:
#   1. Switch to main branch: git checkout main
#   2. Run initial index: context-rag index
#   3. Switch back to feature branch
```

---

## 📚 Documentation

- [How Embeddings Work](./docs/embeddings-explained.md) - **NEW!** Complete guide to embeddings in context-rag
- [AI Agent Integration](./AGENTS.md) - How AI agents use context-rag for token savings
- [API Reference](./docs/api.md) - Complete command documentation  
- [Configuration](./docs/configuration.md) - Setup and options
- [Quick Start Guide](./docs/quick-start.md) - Detailed setup instructions

## Development

```bash
# Clone and setup
git clone https://github.com/karote00/context-rag.git
cd context-rag
npm install

# Run tests (native Node.js test runner)
npm test

# Performance benchmarks included:
# - Indexing speed (256K+ lines/second)
# - Chunking throughput (15M+ KB/second)  
# - Hash calculation performance

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
