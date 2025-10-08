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

### **Response Format**
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
    ]
  }
}
```

### **Simple Integration Code**
```javascript
async function handleUserQuery(userQuery) {
  // Check if this is a project-specific question
  if (isProjectQuestion(userQuery)) {
    try {
      // Get project context
      const { stdout } = await exec(`context-rag ai "${userQuery}"`);
      const result = JSON.parse(stdout);
      
      if (result.status === 'success') {
        // Send question + context to LLM
        return await callLLM({
          prompt: userQuery,
          context: result.context
        });
      }
    } catch (error) {
      // Fallback to general response
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
context-rag init
context-rag index
```

Then AI agents automatically get project context for better responses with massive token savings.

## 🎯 Benefits

- **90% token savings** by sending only relevant context
- **Project-specific responses** instead of generic answers  
- **Universal compatibility** with any AI service
- **Zero user configuration** after initial setup
- **Automatic context discovery** from actual codebase