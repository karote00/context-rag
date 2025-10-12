# Quick Start Guide

Get up and running with context-rag in minutes.

## 1. Installation

```bash
npm install -g context-rag
```

## 2. Initialize Your Project

Navigate to your project directory and initialize context-rag:

```bash
cd your-project
context-rag init
```

This creates:
- `.context-rag.config.json` - Configuration file
- `.context-rag/` - Cache directory

## 3. Build Your First Index

Index your project files (branch-aware):

```bash
context-rag index
```

**What happens:**
- **Main branch**: Indexes project context (docs/, .project/, README.md)
- **Feature branch**: Indexes specs (.kiro/specs/, requirements/, design/)
- **Smart detection**: Automatically uses appropriate strategy per branch
- **Clean separation**: No overlap between project knowledge and feature specs

## 4. Search Your Content

Now you can search using natural language (branch-aware):

```bash
# On main branch: searches project context
context-rag query "how to configure the database"
context-rag query "project architecture"

# On feature branch: searches implementation specs  
context-rag query "authentication requirements"
context-rag query "design decisions"
```

## 5. Explore Advanced Features

### JSON Output for AI Integration

```bash
context-rag query "architecture overview" --json
context-rag ai "explain the main components"
```

### Clean Output for AI Integration

```bash
# AI command always outputs clean JSON
context-rag ai "user management patterns"

# Query command with --json flag for clean output  
context-rag query "API endpoints" --json

# Interactive vs Clean output comparison:
context-rag query "auth"        # 🎨 Colors, hints, suggestions
context-rag query "auth" --json # 📄 Pure JSON, no extra text
```

### Branch-Aware Caching

```bash
# Check branch status
context-rag branch

# List cached branches
context-rag branch --list

# Clear cache for a branch
context-rag branch --clear feature/old-feature
```

### Watch Mode for Auto-Updates

```bash
context-rag watch
```

This monitors file changes and automatically updates the index.

## 6. Check System Status

```bash
context-rag status
```

Shows:
- Index status and statistics
- Branch information
- Context detection (project context)
- Configuration summary

## Output Modes

### Interactive Mode (Human-Friendly)
```bash
context-rag query "authentication logic"
# 📋 Found 3 relevant results:
# 
# 1. 🎯 src/auth/middleware.js
#    Similarity: 95.2% | Chunk: 0
#    const authenticate = (req, res, next) => {
# 
# 💡 Showing top 5 results. Use --top-k to see more.
```

### Clean JSON Mode (AI-Friendly)
```bash
context-rag query "authentication logic" --json
# {
#   "status": "success",
#   "query": "authentication logic",
#   "results": [
#     {
#       "file_path": "src/auth/middleware.js",
#       "snippet": "const authenticate = (req, res, next) => {",
#       "similarity": 0.952
#     }
#   ],
#   "total_results": 3,
#   "timestamp": "2024-01-01T12:00:00.000Z"
# }
```

### AI Command (Always Clean)
```bash
context-rag ai "how does authentication work"
# Always outputs clean JSON - no --json flag needed
# Perfect for AI agents and programmatic use
```

## Common Workflows

### Daily Development

```bash
# Morning: Update index with recent changes
context-rag index

# During development: Search for relevant code
context-rag query "similar functionality to what I'm building"

# Before commit: Check related code
context-rag query "tests for this feature"
```

### Code Review

```bash
# Find related code for review context
context-rag query "authentication logic" --format summary

# Get architectural context
context-rag ai "explain how this component fits in the system"
```

### Documentation

```bash
# Generate markdown documentation
context-rag query "API documentation" --format markdown > api-docs.md

# Extract code examples
context-rag query "usage examples" --format code
```

## Configuration Tips

### Include/Exclude Patterns

Edit `.context-rag.config.json`:

```json
{
  "index": {
    "include": [
      "src/**/*.js",
      "src/**/*.ts", 
      "docs/**/*.md",
      "README.md"
    ],
    "exclude": [
      "node_modules/",
      "dist/",
      "*.test.js",
      ".git/"
    ]
  }
}
```

### Embedding Models

For better semantic search, configure embeddings:

```json
{
  "embedder": {
    "type": "python-fast",
    "model": "fast-embedder"
  }
}
```

### Search Tuning

Adjust search behavior:

```json
{
  "search": {
    "engine": "rust",
    "top_k": 10
  }
}
```

## Project Context Integration

If you have structured project context:

1. Create context files in `.project/` folder (architecture.md, constraints.md, etc.)
2. Run `context-rag index` - it will auto-detect structured context
3. Searches will prioritize structured context over code files

## Troubleshooting

### No Results Found

1. Check if index exists: `context-rag status`
2. Verify include patterns match your files
3. Try broader search terms
4. Rebuild index: `context-rag index --force`

### Slow Performance

1. Install Python dependencies for faster embeddings
2. Exclude large directories (node_modules, etc.)
3. Use more specific include patterns
4. Clear old branch caches: `context-rag branch --list`

### Python Errors

1. Ensure Python 3.x is installed: `python3 --version`
2. The fast embedder requires no external dependencies
3. If Python is missing, install from https://python.org/downloads

## Next Steps

- [Configuration Reference](./configuration.md) - Detailed configuration options
- [API Documentation](./api.md) - Programmatic usage
- [Plugin Development](./plugins.md) - Creating custom transformers
- [Advanced Usage](./advanced.md) - Power user features