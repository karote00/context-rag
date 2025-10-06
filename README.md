# context-rag

A lightweight CLI tool for semantic search (RAG) on project context, with branch-aware caching and AI integration.

---

## Features

- **Context RAG Queries**: Perform precise semantic search on project files or handoff-ai context.  
- **Branch-aware Cache**: Supports Git branch and feature branch incremental indexing.  
- **CLI & API Mode**: Query directly via CLI or integrate with any AI pipeline.  
- **Multi-language Support**: Node.js, Rust, and Python modules for high performance.  
- **Plugin System**: Extend embedder, search, transformer functionality (Coming in Phase 6).  
- **Offline Ready**: Query local data even without AI tokens.

---

## Installation

```bash
npm install -g context-rag
```

For detailed installation instructions including Python and Rust dependencies, see the [Installation Guide](./docs/installation.md).

---

## Usage Examples

### Initialize Project

```bash
context-rag init
```

### Build Index

```bash
context-rag index
```

### Query Data

```bash
context-rag query "Explain architecture of reactive-events"
context-rag query "how to setup reactive events" --json
```

### Watch for Changes

```bash
context-rag watch
```

### Manage Branch Caches

```bash
context-rag branch
context-rag branch --list
context-rag branch --clear feature-branch
```

### Plugin System (Coming in Phase 6)

```bash
# These commands will be available in Phase 6
context-rag plugin list
context-rag plugin add context-rag-plugin-openai
```

---

## Git-aware Branch Cache (Coming in Phase 3)

context-rag will automatically detect branch switches and PR merges:

- Base cache + feature cache are automatically merged  
- Only changed files are re-indexed  
- Fallback to main branch cache if necessary  

---

## Handoff-AI Context Integration (Coming in Phase 4)

If the project uses handoff-ai to generate detail context, context-rag will prioritize structured data:

- Architecture, golden-path, design-principles, constraints, etc.  
- Automatically match the most relevant context for queries  
- Fallback to general file index if handoff-ai context is absent  

---

## Development Status

context-rag follows a phased development workflow (see `.kiro/specs/context-rag/tasks.md`):

- ✅ **Phase 1**: Core Infrastructure Setup (CLI scaffold complete)
- 🚧 **Phase 2**: Embedding & Search (In development)
- ⏳ **Phase 3**: Branch-aware Cache System
- ⏳ **Phase 4**: Detail Context Integration  
- ⏳ **Phase 5**: AI Pipeline Integration  
- ⏳ **Phase 6**: Plugin System  
- ⏳ **Phase 7**: Testing & Validation  
- ⏳ **Phase 8**: Distribution & Documentation  

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
- [API Reference](./docs/api.md) - Complete command and API documentation

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
