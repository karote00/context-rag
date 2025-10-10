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

Index your project files:

```bash
context-rag index
```

This will:
- Scan files matching your include patterns
- Create semantic chunks
- Generate embeddings (if Python dependencies available)
- Store everything in a searchable index

## 4. Search Your Code

Now you can search using natural language:

```bash
context-rag query "how to configure the database"
context-rag query "authentication middleware"
context-rag query "error handling patterns"
```

## 5. Explore Advanced Features

### JSON Output for AI Integration

```bash
context-rag query "architecture overview" --json
context-rag ai "explain the main components"
```

### JSON Output for AI Integration

```bash
context-rag query "user management" --json
context-rag ai "API endpoints overview"
context-rag status --json
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
    "type": "python",
    "model": "sentence-transformers/all-MiniLM-L6-v2"
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

1. Install Python dependencies: `pip install sentence-transformers`
2. The tool works without Python but with reduced functionality
3. Check Python version: `python3 --version` (needs 3.8+)

## Next Steps

- [Configuration Reference](./configuration.md) - Detailed configuration options
- [API Documentation](./api.md) - Programmatic usage
- [Plugin Development](./plugins.md) - Creating custom transformers
- [Advanced Usage](./advanced.md) - Power user features