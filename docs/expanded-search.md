# Expanded Search (Iterative Context Discovery)

The expanded search feature provides multi-pass context discovery that automatically finds related code and documentation through intelligent term expansion.

## Overview

Traditional search finds results based on your exact query terms. Expanded search goes further by:

1. **Finding initial results** based on your query
2. **Extracting related terms** from those results (function names, imports, related concepts)
3. **Searching again** with the expanded terms
4. **Repeating** for multiple passes to discover comprehensive context
5. **Deduplicating and ranking** the final results

## How It Works

### Multi-Pass Discovery

```bash
# Regular search
context-rag query "drag resize"
# → Finds files mentioning "drag" and "resize"

# Expanded search  
context-rag query "drag resize" --expand
# → Pass 1: Finds files with "drag" and "resize"
# → Pass 2: Discovers "mousemove", "mouseup", "preventDefault" from results
# → Pass 3: Finds event handling, state management code
# → Returns comprehensive context about drag-resize functionality
```

### Expansion Strategies

#### 1. Code Reference Extraction
Automatically extracts and searches for:
- **Function calls**: `handleMouseDown()` → searches for "handleMouseDown"
- **Imports**: `import { useState }` → searches for "useState"
- **Class names**: `class EventManager` → searches for "EventManager"

#### 2. Pattern-Based Rules
Built-in expansion rules for common patterns:

**UI Interaction Patterns**
- `mousedown` → expands to `mousemove`, `mouseup`, `preventDefault`
- `click` → expands to `event`, `handler`, `listener`
- `drag` → expands to `drop`, `position`, `coordinates`

**API Patterns**
- `fetch` → expands to `error`, `response`, `catch`, `async`
- `api` → expands to `endpoint`, `request`, `status`

**Database Patterns**
- `query` → expands to `transaction`, `connection`, `schema`
- `insert` → expands to `validation`, `migration`

**Authentication Patterns**
- `login` → expands to `password`, `hash`, `session`, `token`
- `auth` → expands to `middleware`, `validation`, `user`

#### 3. Co-occurrence Analysis
Finds terms that commonly appear together:
- `mousedown` context → suggests `mousemove`, `mouseup`
- `fetch` context → suggests `error`, `response`, `catch`
- `database` context → suggests `transaction`, `connection`

## Usage

### Command Line

```bash
# Basic expanded search
context-rag query "authentication" --expand

# Control number of passes
context-rag query "drag resize" --expand --max-passes 2

# Combine with other options
context-rag query "api error" --expand --format json --top-k 10

# AI integration with expansion
context-rag ai "how does authentication work" --expand
```

### Configuration

Enable expanded search by default in `.context-rag.config.json`:

```json
{
  "search": {
    "engine": "rust",
    "top_k": 5,
    "expanded_search": {
      "enabled": true,
      "max_passes": 3,
      "enable_code_references": true,
      "enable_co_occurrence": true
    }
  }
}
```

**Configuration Options:**
- `enabled` - Enable expanded search by default
- `max_passes` - Maximum number of search passes (default: 3)
- `enable_code_references` - Extract function/class references (default: true)
- `enable_co_occurrence` - Use co-occurrence patterns (default: true)

## Examples

### Example 1: UI Component Discovery

```bash
$ context-rag query "button click handler" --expand

🔍 Starting expanded search with 3 passes...
   Pass 1: Searching for [button, click, handler]
   Pass 2: Searching for [onClick, addEventListener, handleClick, preventDefault]
   Pass 3: Searching for [event, state, component, props]
✅ Expanded search completed: 8 unique results

📋 Found 8 relevant results:

1. src/components/Button.jsx
   Similarity: 95.2% | Chunk: 0
   const Button = ({ onClick, children }) => { ... }

2. src/hooks/useClickHandler.js  
   Similarity: 89.1% | Chunk: 0
   export const useClickHandler = (callback) => { ... }

3. src/utils/eventHelpers.js
   Similarity: 84.7% | Chunk: 1
   export const preventDefault = (event) => { ... }
```

### Example 2: API Integration Discovery

```bash
$ context-rag query "user authentication api" --expand --max-passes 2

🔍 Starting expanded search with 2 passes...
   Pass 1: Searching for [user, authentication, api]
   Pass 2: Searching for [login, token, middleware, validation, error, response]
✅ Expanded search completed: 12 unique results

📋 Found 12 relevant results:

1. src/api/auth.js
   Similarity: 96.8% | Chunk: 0
   export const authenticateUser = async (credentials) => { ... }

2. src/middleware/authMiddleware.js
   Similarity: 92.3% | Chunk: 0  
   const authMiddleware = (req, res, next) => { ... }

3. src/utils/tokenValidator.js
   Similarity: 88.9% | Chunk: 0
   export const validateToken = (token) => { ... }
```

## Performance Considerations

### Efficiency
- **Smart term filtering**: Removes stop words and common functions
- **Duplicate prevention**: Avoids re-searching processed terms
- **Result deduplication**: Ensures unique results across passes
- **Early termination**: Stops when no new terms are discovered

### Resource Usage
- **Controlled expansion**: Limited by `max_passes` setting
- **Relevance filtering**: Only expands terms relevant to original query
- **Result limiting**: Respects `top_k` limits per pass

## Best Practices

### When to Use Expanded Search

**✅ Good for:**
- Exploring unfamiliar codebases
- Finding related functionality across files
- Discovering implementation patterns
- Understanding system architecture
- Comprehensive context for AI tools

**❌ Less useful for:**
- Exact file/function lookups
- Simple keyword searches
- When you know exactly what you're looking for

### Optimization Tips

1. **Start with specific terms**: More specific queries lead to better expansions
2. **Use appropriate pass limits**: 2-3 passes usually sufficient
3. **Combine with filters**: Use `--format` and `--top-k` to focus results
4. **Enable for AI workflows**: Expanded search provides richer context for AI

### Query Examples

```bash
# Good: Specific functionality
context-rag query "drag drop file upload" --expand

# Good: System component
context-rag query "user session management" --expand  

# Good: Error scenarios
context-rag query "api error handling retry" --expand

# Less optimal: Too broad
context-rag query "code" --expand

# Less optimal: Single word
context-rag query "function" --expand
```

## Integration with AI Tools

Expanded search is particularly powerful when integrated with AI tools:

```bash
# Comprehensive context for AI
context-rag ai "explain the authentication flow" --expand

# Rich context for code analysis  
context-rag ai "how to add new user registration" --expand
```

The expanded search provides AI tools with:
- **Broader context** about related functionality
- **Implementation patterns** across the codebase  
- **Related files** that might not match exact keywords
- **System architecture** understanding

## Troubleshooting

### No Additional Results Found
- Query might be too specific
- Try broader initial terms
- Check if relevant files are indexed
- Increase `max_passes` if needed

### Too Many Irrelevant Results
- Use more specific initial query
- Reduce `max_passes` setting
- Combine with `--format` filters
- Add more exclude patterns to config

### Performance Issues
- Reduce `max_passes` (try 2 instead of 3)
- Use more specific queries
- Increase cache size in config
- Consider excluding large directories

## Technical Details

### Expansion Algorithm
1. **Term Extraction**: Parse query into meaningful terms
2. **Initial Search**: Perform semantic search with original terms
3. **Context Analysis**: Extract references and apply expansion rules
4. **Term Expansion**: Generate new search terms from results
5. **Iterative Search**: Repeat with expanded terms
6. **Result Merging**: Combine and deduplicate all results
7. **Final Ranking**: Sort by relevance and return top results

### Expansion Rules
The system includes built-in rules for:
- Programming language patterns (imports, function calls)
- Web development patterns (events, APIs, state management)
- Database patterns (queries, transactions, schemas)
- Authentication patterns (tokens, sessions, validation)
- Testing patterns (mocks, assertions, fixtures)

These rules are automatically applied based on the content found in your codebase.