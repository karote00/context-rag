# Configuration Reference

Complete guide to configuring context-rag for your project.

## Configuration File

Context-rag uses `.context-rag.config.json` in your project root for configuration.

### Default Configuration

When you run `context-rag init`, this default configuration is created:

```json
{
  "index": {
    "include": ["docs/", "README.md", "*.md"],
    "exclude": ["node_modules/", ".git/", "dist/", "build/"]
  },
  "embedder": {
    "type": "python",
    "model": "sentence-transformers/all-MiniLM-L6-v2"
  },
  "search": {
    "engine": "rust",
    "top_k": 5
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

## Configuration Options

### `index` Section

Controls which files are processed during indexing.

#### `include` (Array of strings)
Glob patterns for files to include in the index.

**Examples:**
```json
"include": [
  "docs/",           // All files in docs directory
  "src/**/*.js",     // All JavaScript files in src and subdirectories
  "*.md",            // All markdown files in root
  "README.md",       // Specific file
  "api/**/*.yaml"    // All YAML files in api directory
]
```

**Common patterns:**
- `"docs/"` - Include entire docs directory
- `"src/**/*.{js,ts}"` - JavaScript and TypeScript files
- `"*.{md,txt}"` - Markdown and text files
- `"**/*.py"` - All Python files recursively

#### `exclude` (Array of strings)
Patterns for files/directories to exclude.

**Default exclusions:**
```json
"exclude": [
  "node_modules/",   // Node.js dependencies
  ".git/",           // Git repository data
  "dist/",           // Build output
  "build/",          // Build output
  "coverage/",       // Test coverage reports
  "*.log"            // Log files
]
```

### `embedder` Section

Controls how semantic embeddings are generated.

#### `type` (String)
The embedder implementation to use.

**Options:**
- `"python"` - Use Python sentence-transformers (recommended)
- `"rust"` - Use Rust-based embeddings (future)
- `"openai"` - Use OpenAI embeddings API (via plugin)

#### `model` (String)
The specific model to use for embeddings.

**For Python embedder:**
- `"sentence-transformers/all-MiniLM-L6-v2"` - Fast, good quality (default)
- `"sentence-transformers/all-mpnet-base-v2"` - Higher quality, slower
- `"sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"` - Multilingual

**For OpenAI embedder:**
- `"text-embedding-ada-002"` - OpenAI's embedding model

### `search` Section

Controls search behavior and performance.

#### `engine` (String)
The search engine implementation.

**Options:**
- `"rust"` - High-performance Rust implementation (default)
- `"javascript"` - Pure JavaScript implementation

#### `top_k` (Number)
Default number of results to return for queries.

**Recommended values:**
- `5` - Good balance (default)
- `3` - Fewer, more focused results
- `10` - More comprehensive results

### `storage` Section

Controls how the index is stored.

#### `type` (String)
Storage backend type.

**Options:**
- `"sqlite"` - SQLite database (default, recommended)

#### `path` (String)
Path to the index database file.

**Default:** `".context-rag/index.db"`

**Branch-aware paths:**
When using git, context-rag automatically creates branch-specific paths:
- `.context-rag/main_index.db`
- `.context-rag/feature_branch_index.db`

### `cache` Section

Controls caching behavior.

#### `enabled` (Boolean)
Enable or disable caching.

**Default:** `true`

#### `branch_aware` (Boolean)
Enable branch-specific caching for git repositories.

**Default:** `true`

When enabled:
- Each git branch gets its own cache
- Automatic cache merging from base branches
- Incremental updates for changed files only

#### `max_size` (String)
Maximum cache size before cleanup.

**Default:** `"1GB"`

**Format:** Number + unit (KB, MB, GB)

## Environment Variables

### `OPENAI_API_KEY`
Required for OpenAI-based plugins and embedders.

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### `CONTEXT_RAG_DEBUG`
Enable debug logging.

```bash
export CONTEXT_RAG_DEBUG=1
```

### `NODE_OPTIONS`
Node.js options, useful for large projects.

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Advanced Configuration

### Custom File Patterns

For complex projects, you can use sophisticated include/exclude patterns:

```json
{
  "index": {
    "include": [
      "src/**/*.{js,ts,jsx,tsx}",
      "docs/**/*.{md,mdx}",
      "api/**/*.{yaml,yml,json}",
      "config/*.{json,js}",
      "README.md",
      "CHANGELOG.md"
    ],
    "exclude": [
      "src/**/*.test.{js,ts}",
      "src/**/*.spec.{js,ts}",
      "**/*.min.js",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**"
    ]
  }
}
```

### Performance Tuning

For large projects:

```json
{
  "search": {
    "engine": "rust",
    "top_k": 10
  },
  "cache": {
    "enabled": true,
    "branch_aware": true,
    "max_size": "2GB"
  },
  "embedder": {
    "type": "python",
    "model": "sentence-transformers/all-MiniLM-L6-v2"
  }
}
```

### Multi-language Projects

For projects with multiple programming languages:

```json
{
  "index": {
    "include": [
      "frontend/**/*.{js,ts,jsx,tsx,vue}",
      "backend/**/*.{py,java,go,rs}",
      "mobile/**/*.{swift,kt,dart}",
      "docs/**/*.md",
      "api/**/*.{yaml,json}",
      "scripts/**/*.{sh,ps1,py}"
    ]
  }
}
```

## Validation

Context-rag validates your configuration on startup. Common validation errors:

### Missing Required Fields
```
❌ Missing required configuration field: index.include
```

**Fix:** Ensure all required fields are present in your config.

### Invalid Patterns
```
❌ Invalid glob pattern in include: [invalid-pattern]
```

**Fix:** Use valid glob patterns (*, **, ?, [abc], {a,b,c}).

### Invalid Model
```
❌ Embedder model not found: invalid-model-name
```

**Fix:** Use a valid model name for your chosen embedder type.

## Configuration Examples

### Documentation-Heavy Project
```json
{
  "index": {
    "include": [
      "docs/**/*.md",
      "wiki/**/*.md",
      "README.md",
      "CONTRIBUTING.md",
      "api/**/*.yaml"
    ],
    "exclude": ["node_modules/", ".git/"]
  },
  "search": {
    "top_k": 8
  }
}
```

### Code-Heavy Project
```json
{
  "index": {
    "include": [
      "src/**/*.{js,ts}",
      "lib/**/*.{js,ts}",
      "README.md"
    ],
    "exclude": [
      "**/*.test.js",
      "**/*.spec.ts",
      "node_modules/",
      "dist/"
    ]
  },
  "search": {
    "top_k": 5
  }
}
```

### Multilingual Project
```json
{
  "embedder": {
    "type": "python",
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  },
  "index": {
    "include": [
      "docs/**/*.{md,txt}",
      "src/**/*.{js,py,java,go}",
      "i18n/**/*.json"
    ]
  }
}
```

## Troubleshooting Configuration

### Config Not Loading
1. Check file exists: `.context-rag.config.json`
2. Validate JSON syntax
3. Run `context-rag status` to see config status

### No Files Being Indexed
1. Check include patterns match your files
2. Verify exclude patterns aren't too broad
3. Run `context-rag index --force` to rebuild

### Poor Search Results
1. Increase `top_k` value
2. Check if relevant files are being indexed
3. Try different embedding models
4. Verify file content is in supported languages

### Performance Issues
1. Reduce include patterns scope
2. Add more exclude patterns
3. Increase cache max_size
4. Use faster embedding models

## Best Practices

1. **Start Simple**: Begin with default config, then customize
2. **Be Specific**: Use precise include patterns rather than broad ones
3. **Exclude Aggressively**: Exclude test files, build outputs, dependencies
4. **Monitor Size**: Check index size with `context-rag status`
5. **Update Regularly**: Run `context-rag index` after major changes
6. **Use Branch Awareness**: Enable for git projects
7. **Test Patterns**: Use `context-rag status` to verify file counts