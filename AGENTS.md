# AI Agent Integration

**Simple integration for AI agents to get project context and save tokens.**

## 🎯 Core Concept

AI agents call `context-rag ai "user question"` to get relevant project context, then send both the question and context to the LLM for token-efficient, project-specific responses.

## 🔄 Workflow

```
User: "Help me implement authentication"
  ↓
AI: context-rag ai "implement authentication"  
  ↓
Context-RAG: Returns relevant auth code, patterns, middleware
  ↓  
AI: Sends to LLM: original question + project context
  ↓
LLM: Project-specific response using actual codebase patterns
```

## 💰 Token Savings

**Without Context-RAG:**
- User question (10 tokens) + entire conversation history (2000+ tokens) = 2010+ tokens
- Generic response that may not match project

**With Context-RAG:**  
- User question (10 tokens) + relevant context (200 tokens) = 210 tokens
- **90% token savings** + project-specific response

## 🔧 Implementation

### **Command**
```bash
context-rag ai "user's question here"
```

### **Clean JSON Output**
The `ai` command **always outputs clean JSON** - no hints, colors, or extra text that needs parsing:

```json
{
  "status": "success",
  "context": {
    "query": "implement authentication",
    "context_summary": "Found JWT middleware and token validation",
    "code_context": [
      {
        "file": "src/auth/middleware.js",
        "snippet": "function authenticateUser(req, res, next) {...}",
        "relevance": 0.95
      }
    ],
    "total_results": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### **Error Response Format**
```json
{
  "status": "error",
  "message": "Index not found. Run 'context-rag index' first.",
  "error_code": "INDEX_NOT_FOUND",
  "context": null,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### **Simple Integration Code**
```javascript
async function handleUserQuery(userQuery) {
  // Check if this is a project-specific question
  if (isProjectQuestion(userQuery)) {
    try {
      // Get clean project context (always pure JSON)
      const { stdout } = await exec(`context-rag ai "${userQuery}"`);
      const result = JSON.parse(stdout); // Always valid JSON, no parsing needed
      
      if (result.status === 'success') {
        // Send question + context to LLM
        return await callLLM({
          prompt: userQuery,
          context: result.context
        });
      } else {
        // Handle structured error
        console.log(`Context error: ${result.message}`);
      }
    } catch (error) {
      // Fallback to general response
      console.log(`Context-rag error: ${error.message}`);
    }
  }
  
  // General response without context
  return await callLLM({ prompt: userQuery });
}

function isProjectQuestion(query) {
  const indicators = ['implement', 'add', 'create', 'how does', 'explain the', 'debug', 'fix'];
  return indicators.some(indicator => query.toLowerCase().includes(indicator));
}
```

## ✅ User Setup

Users just need to:
```bash
npm install -g context-rag
cd their-project
context-rag init    # Creates context/specs separation automatically
context-rag index   # Branch-aware: main=project context, feature=specs
```

**Branch Intelligence:**
- **Main branch**: AI gets project context (docs, architecture, overview)
- **Feature branch**: AI gets implementation specs (requirements, design, tasks)
- **Automatic**: No manual configuration needed

Then AI agents automatically get relevant context for better responses with massive token savings.

## 🎯 Benefits

- **90% token savings** by sending only relevant context
- **Project-specific responses** instead of generic answers  
- **Universal compatibility** with any AI service
- **Zero user configuration** after initial setup
- **Automatic context discovery** from actual codebase
- **Clean JSON output** - no parsing required, direct consumption
- **Structured error handling** - predictable error responses
- **No console noise** - only the data you need reaches stdout