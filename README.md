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
- **⚡ Zero Configuration**: Install, index, use - that's it
- **🌿 Branch-Aware**: Automatic git branch detection and caching

---

## Installation

```bash
npm install -g context-rag
```

That's it! Context-rag works out of the box.

---

## 🚀 Quick Start

### Setup (One-time)
```bash
npm install -g context-rag
cd your-project
context-rag init
context-rag index
```

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
context-rag status                  # Check index status
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

## 📚 Documentation

- [AI Agent Integration](./AGENTS.md) - How AI agents use context-rag for token savings
- [API Reference](./docs/api.md) - Complete command documentation  
- [Configuration](./docs/configuration.md) - Setup and options
- [Quick Start Guide](./docs/quick-start.md) - Detailed setup instructions

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
