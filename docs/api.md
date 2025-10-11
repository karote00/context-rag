# API Reference

## CLI Commands

### `context-rag init`

Initialize context-rag in the current directory.

```bash
context-rag init
```

**Creates:**
- `.context-rag.config.json` - Configuration file
- `.context-rag/` - Cache directory structure

### `context-rag index [path]`

Build semantic index for project files.

```bash
context-rag index                    # Index current directory
context-rag index ./src              # Index specific directory
context-rag index --force            # Force rebuild existing index
```

**Branch-Aware Indexing:**
- **Main branch**: Indexes project context (docs/, .project/, README.md)
- **Feature branches**: Indexes specs (requirements, design, .kiro/specs/)
- **Automatic detection**: Uses git branch to determine indexing strategy

**Options:**
- `[path]` - Target directory (default: current directory)
- `-f, --force` - Force rebuild of existing index

### `context-rag query <query>`

Search project context using natural language.

```bash
context-rag query "authentication middleware"        # Interactive mode
context-rag query "database connection" --json      # Clean JSON mode
```

**Arguments:**
- `<query>` - Natural language search query

**Options:**
- `-k, --top-k <number>` - Number of results to return (default: 5)
- `--json` - Output clean JSON format (for programmatic use)

**Output Modes:**
- **Interactive mode** (default): Colorful output with hints and suggestions
- **JSON mode** (`--json` flag): Clean JSON output, no extra text or colors
- **Programmatic use**: Use `--json` flag for AI agents and scripts

### `context-rag watch`

Watch for file changes and auto-update index.

```bash
context-rag watch
```

Monitors file system for changes and incrementally updates the index.

### `context-rag branch`

Manage branch-specific caches.

```bash
context-rag branch                   # Show current branch status
context-rag branch --list            # List all cached branches
context-rag branch --clear <branch>  # Clear cache for specific branch
```

**Options:**
- `-l, --list` - List all cached branches
- `-c, --clear <branch>` - Clear cache for specific branch

### `context-rag status`

Show index and context status.

```bash
context-rag status                   # Human-readable status
context-rag status --json            # JSON status output
```

**Options:**
- `--json` - Output in JSON format

### `context-rag ai <query>`

Get project context for AI agents with clean JSON output.

```bash
context-rag ai "explain the architecture"
context-rag ai "how to implement authentication"
```

**Arguments:**
- `<query>` - Natural language query about the project

**Options:**
- `-k, --top-k <number>` - Number of results to return (default: 5)

**Output Behavior:**
- **Always outputs clean JSON** - no hints, colors, or extra text
- **Structured error responses** with error codes
- **Direct stdout output** - ready for parsing by AI agents
- **No console noise** - only the JSON response reaches stdout

**Purpose:** AI agents call this command to get relevant project context instead of sending entire codebase, achieving 90% token savings.

### `context-rag plugins`

Manage result transformer plugins.

```bash
context-rag plugins                  # Show plugin status
context-rag plugins --list           # List available transformers
```

**Options:**
- `-l, --list` - List available transformers

### `context-rag watch`

Watch for file changes and auto-update index.

```bash
context-rag watch
```

Monitors file system for changes and incrementally updates the index.

## JSON API Responses

### Query Response

```json
{
  "query": "authentication middleware",
  "results": [
    {
      "file_path": "src/middleware/auth.js",
      "content": "const authenticate = (req, res, next) => { ... }",
      "snippet": "const authenticate = (req, res, next) => { ... }",
      "similarity": 0.95,
      "chunk_index": 0,
      "source_type": "project-file",
      "context_category": "code",
      "priority_score": 0,
      "is_context": false,
      "context_type": null
    }
  ],
  "total_results": 1,
  "search_options": { "topK": 5 },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Status Response

```json
{
  "index": {
    "branch": "main",
    "cache_path": ".context-rag/main_index.db",
    "cache_exists": true,
    "cache_size": 1024000,
    "last_modified": "2024-01-01T12:00:00.000Z",
    "total_files": 150,
    "total_chunks": 1200,
    "has_context": true,
    "context_files": 5,
    "context_path": ".project"
  },
  "branches": {
    "current_branch": "main",
    "cached_branches": [
      {
        "name": "main",
        "size": 1024000,
        "modified": "2024-01-01T12:00:00.000Z"
      }
    ],
    "changed_files": [],
    "total_cached_branches": 1,
    "has_changes": false
  },
  "context": {
    "has_context": true,
    "context_path": ".project",
    "context_files": [
      {
        "name": "architecture.md",
        "type": "architecture",
        "path": ".project/architecture.md",
        "size": 2048
      }
    ],
    "total_context_files": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### AI Response (Clean JSON)

```json
{
  "status": "success",
  "context": {
    "query": "explain the architecture",
    "context_summary": "Found 5 relevant sources including architecture docs and code files",
    "code_context": [
      {
        "file": ".project/architecture.md",
        "snippet": "The system follows a microservices architecture...",
        "relevance": 0.95
      },
      {
        "file": "src/app.js",
        "snippet": "const app = express(); ...",
        "relevance": 0.87
      }
    ],
    "total_results": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Query JSON Response (Clean)

```json
{
  "status": "success",
  "query": "authentication middleware",
  "results": [
    {
      "file_path": "src/middleware/auth.js",
      "content": "const authenticate = (req, res, next) => { ... }",
      "snippet": "const authenticate = (req, res, next) => { ... }",
      "similarity": 0.95,
      "chunk_index": 0,
      "is_context": false
    }
  ],
  "total_results": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response (Clean)

```json
{
  "status": "error",
  "message": "Index not found. Run 'context-rag index' to create an index first.",
  "error_code": "INDEX_NOT_FOUND",
  "results": [],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Configuration File

### `.context-rag.config.json`

```json
{
  "index": {
    "include": [
      "docs/",
      "README.md",
      "src/**/*.js",
      "src/**/*.ts"
    ],
    "exclude": [
      "node_modules/",
      ".git/",
      "dist/",
      "build/"
    ]
  },
  "embedder": {
    "type": "python",
    "model": "sentence-transformers/all-MiniLM-L6-v2"
  },
  "search": {
    "engine": "rust",
    "top_k": 5,
    "expanded_search": {
      "enabled": false,
      "max_passes": 3,
      "enable_code_references": true,
      "enable_co_occurrence": true
    }
  },
  "storage": {
    "type": "sqlite",
    "path": ".context-rag/index.db"
  },
  "cache": {
    "enabled": true,
    "branch_aware": true,
    "max_size": "1GB"
  }
}
```

### Configuration Options

#### `index`
- `include` - Array of glob patterns for files to include
- `exclude` - Array of glob patterns for files to exclude

#### `embedder`
- `type` - Embedder type: "python" or "rust"
- `model` - Model name for embeddings

#### `search`
- `engine` - Search engine: "rust" or "javascript"
- `top_k` - Default number of results to return

#### `storage`
- `type` - Storage type: "sqlite"
- `path` - Path to index database

#### `cache`
- `enabled` - Enable caching
- `branch_aware` - Enable branch-specific caching
- `max_size` - Maximum cache size

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Index not found
- `4` - Search error

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for AI-powered features
- `NODE_OPTIONS` - Node.js options (e.g., memory limits)
- `CONTEXT_RAG_DEBUG` - Enable debug logging

## Programmatic Usage

### Node.js API

```javascript
const { APIService } = require('context-rag');

const config = {
  // ... configuration
};

const apiService = new APIService(config);

// Perform search
const results = await apiService.query('authentication', { topK: 10 });

// Get status
const status = await apiService.getIndexStatus();

// Format for AI
const aiResponse = apiService.formatForAI(results);
```

### Plugin Development

```javascript
// Custom transformer plugin
module.exports = {
  name: 'My Custom Plugin',
  version: '1.0.0',
  description: 'Custom transformers for my use case',
  
  transformers: {
    'my-transformer': {
      name: 'My Transformer',
      description: 'Custom result transformation',
      transform: async (results, config) => {
        // Transform results
        return {
          format: 'my-format',
          data: processedResults
        };
      }
    }
  },
  
  embedders: {
    'my-embedder': {
      name: 'My Embedder',
      description: 'Custom embedding generation',
      create: (config) => {
        return {
          embedText: async (text) => {
            // Generate embeddings
            return embedding;
          }
        };
      }
    }
  }
};
```