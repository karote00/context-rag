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
- **⚡ Smart Auto-Detection**: Automatically detects and optimizes for your setup
- **🚀 Cascading Performance**: Rust → Python → Node.js fallback for best speed
- **🎯 Handoff-AI Integration**: Auto-optimizes for projects with `.project/` context
- **🌿 Branch-Aware**: Automatic git branch detection and caching
- **🛡️ Branch Safety**: Prevents indexing mistakes with smart baseline enforcement

---

## Installation

```bash
npm install -g context-rag
```

That's it! Context-rag works out of the box with intelligent auto-detection:

- **🦀 Rust**: Best performance (auto-detected if available)
- **🐍 Python**: Great performance with `pip install sentence-transformers`
- **📦 Node.js**: Always works as fallback (built-in)

---

## 🚀 Quick Start

### Setup (One-time)
```bash
npm install -g context-rag
cd your-project
context-rag init          # Auto-detects handoff-ai, shows performance tips
context-rag index         # Smart: run from main branch first for proper baseline
```

**Smart Features:**
- **Handoff-AI Projects**: Automatically configures to index only `.project/` directory
- **Performance Tips**: Shows installation commands for better embedding engines
- **Branch Safety**: Guides you to create proper main branch baseline first

### Usage (AI Agents)
```bash
# AI agents call this to get project context
context-rag ai "how to implement authentication"
context-rag ai "explain the project structure"
context-rag ai "how to add new API endpoint"
```

### Manual Usage
```bash
context-rag query "authentication middleware"
context-rag status                  # Check index status, embedding engine, integrations
context-rag branch --list           # Manage branch-specific caches
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

## 🧠 Smart Features

### 🔄 Cascading Embedding Engines
Context-rag automatically detects and uses the best available embedding engine:

1. **🦀 Rust** (fastest) - Uses compiled embedder for maximum speed
2. **🐍 Python** (recommended) - High-quality embeddings with sentence-transformers  
3. **📦 Node.js** (fallback) - Enhanced keyword-based embeddings, always works

```bash
context-rag init
# 🔍 Auto-detecting embedding engine...
# ✅ Using Python embedder (good performance)
# 💡 Performance Tip: Install Rust for fastest performance
```

### 🎯 Handoff-AI Integration
Automatically detects and optimizes for handoff-ai projects:

```bash
# If .project/ directory exists with context files:
context-rag init
# 🎯 Handoff-AI detected!
# Configured to index .project/ directory for optimal context
```

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
