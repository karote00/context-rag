# Context Filtering Efficiency Tools

Tools to measure how much context-rag reduces token usage through intelligent context filtering, regardless of which AI service you use.

## 🎯 Key Insight

Instead of dumping entire files into your AI prompts, context-rag intelligently filters and selects only the most relevant context. This saves tokens universally across all AI services!

## Quick Start

### 1. Context Filtering Efficiency (Recommended)

```bash
# In your project directory (after context-rag init && context-rag index)
node tools/context-efficiency.js
```

This shows the **core value** of context-rag:
- Raw context tokens (all relevant files)
- Filtered context tokens (context-rag's smart selection)  
- Universal token savings regardless of AI service

### 2. Detailed Token Tracking

For precise measurements of your specific queries:

```bash
# Start a comparison session
sessionId=$(node tools/token-tracker.js start "My authentication query")

# Record response WITHOUT context-rag
node tools/token-tracker.js without $sessionId \
  "How do I implement user authentication?" \
  "You can implement authentication using JWT tokens. Here's a basic approach..."

# Get context from context-rag
context=$(context-rag ai "How do I implement user authentication?")

# Record response WITH context-rag (using the context in your AI prompt)
node tools/token-tracker.js with $sessionId \
  "How do I implement user authentication?" \
  "$context" \
  "Based on your existing auth.js middleware, you can extend the authenticate function..."

# Compare the results
node tools/token-tracker.js compare $sessionId

# Save results
node tools/token-tracker.js save $sessionId
```

### 3. Automated Benchmark Suite

```bash
# Run comprehensive benchmarks (requires context-rag to be set up)
node tools/token-benchmark.js
```

## Understanding the Results

### Context Filtering Efficiency

Context-rag's main value is **intelligent context filtering**:
- **Scans all relevant files** in your project (could be 10,000+ tokens)
- **Filters to most relevant context** (typically 200-500 tokens)
- **Saves 80-95% of context tokens** while maintaining quality

### Example Analysis

```
📁 Raw Context (all relevant files):
  • Files found: 25 files
  • Total tokens: 8,500 tokens

🎯 Filtered Context (context-rag selection):
  • Sources selected: 3 most relevant
  • Filtered tokens: 420 tokens

⚡ Efficiency Metrics:
  • Token savings: 8,080 tokens per query
  • Efficiency ratio: 20.2x
  • Compression ratio: 95.1%
  • Works with ANY AI service!
```

## Real-World Workflow

### Manual Testing

1. **Prepare two AI sessions** (ChatGPT, Claude, etc.)
2. **Session A**: Ask questions directly without context
3. **Session B**: Use `context-rag ai "your question"` to get context, then ask AI with that context
4. **Compare**: Token usage, response quality, follow-up questions needed

### Example Comparison

**Without context-rag:**
```
User: "How do I handle authentication in this project?"
AI: "Here are general authentication patterns you can use..."
User: "But what about the existing auth middleware?"
AI: "I don't have access to your specific code..."
User: "Let me show you the auth.js file..."
```
*Total: ~3 queries, ~500 tokens*

**With context-rag:**
```
User: Gets context with `context-rag ai "authentication"`
User: "Based on this context: [context-rag output], how do I handle authentication?"
AI: "Looking at your existing auth.js middleware, you can extend it by..."
```
*Total: 1 query, ~300 tokens, more accurate response*

## Universal Token Savings

The beauty of context-rag is that **token savings work with any AI service**:

- **OpenAI GPT-3.5/GPT-4**: Save tokens on input costs
- **Anthropic Claude**: Save tokens on message costs  
- **Google Gemini**: Save tokens on prompt costs
- **Local models**: Faster inference with less context
- **Any future AI service**: Savings are universal!

### Typical Efficiency
- **Context reduction**: 80-95% fewer context tokens
- **Quality maintained**: Smart filtering keeps relevance high
- **Universal benefit**: Works regardless of AI pricing model

## Tips for Maximum Efficiency

1. **Use context-rag for complex queries** about your specific codebase
2. **Skip context-rag for general questions** (language syntax, concepts)
3. **Combine multiple related questions** to amortize context cost
4. **Keep your index updated** for best context quality

## Troubleshooting

### "context-rag not found"
```bash
npm install -g context-rag
```

### "No configuration found"
```bash
cd your-project
context-rag init
context-rag index
```

### "No results from context-rag"
- Check if your files match the include patterns in `.context-rag.config.json`
- Try `context-rag status` to verify index exists
- Rebuild with `context-rag index --force`

## Advanced Usage

### Custom Benchmark Queries

Edit `tools/token-benchmark.js` to add your specific queries:

```javascript
const benchmarkQueries = [
  {
    query: "Your specific question about your codebase",
    description: "Custom benchmark"
  }
];
```

### Integration with CI/CD

Add token benchmarking to your development workflow:

```bash
# In your CI pipeline
npm install -g context-rag
context-rag init
context-rag index
./tools/quick-benchmark.sh > token-report.txt
```

This helps track how context-rag efficiency changes as your codebase evolves.