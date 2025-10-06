# Token Benchmarking Tools

Tools to measure and compare token usage with and without context-rag.

## Quick Start

### 1. Simple Benchmark (Recommended)

```bash
# In your project directory (after context-rag init && context-rag index)
./tools/quick-benchmark.sh
```

This runs a quick comparison across common queries and shows:
- Token usage with/without context-rag
- Cost estimates
- Summary analysis

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

### Token Overhead vs. Quality Improvement

Context-rag typically:
- **Adds 50-200 tokens** of context per query
- **Saves 1-3 follow-up queries** by providing better context
- **Improves response accuracy** with project-specific information

### Example Analysis

```
Without context-rag: 180 tokens
  • Query: 30 tokens
  • Response: 150 tokens

With context-rag: 280 tokens  
  • Query: 30 tokens
  • Context: 100 tokens
  • Response: 150 tokens

Analysis:
  • Token overhead: +100 tokens
  • But likely saves 2 follow-up queries (360 tokens)
  • Net savings: ~260 tokens
  • Plus higher quality, project-specific responses
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

## Cost Analysis

### Token Pricing (as of 2024)
- **GPT-3.5**: $0.002 per 1K tokens
- **GPT-4**: $0.03 per 1K tokens  
- **Claude**: $0.008 per 1K tokens

### Typical Savings
- **Upfront cost**: +50-200 tokens per query
- **Saved follow-ups**: 1-3 queries (150-450 tokens each)
- **Net result**: Usually 20-60% token savings
- **Quality improvement**: Project-specific, accurate responses

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