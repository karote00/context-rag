# Simple AI Agent Integration

**What users should add to their AGENTS.md or AI configuration file.**

## 🎯 **User Hint Approach (Recommended)**

Let users control when to use context-rag with simple prefixes:

```
CONTEXT-RAG INTEGRATION:

TRIGGER: When user message starts with "context-rag:" or "ctx:"
ACTION: Run: context-rag ai "[user question without prefix]" --expand

EXAMPLES:
User: "context-rag: how does authentication work?"
→ AI runs: context-rag ai "how does authentication work" --expand
→ AI uses project context in response

User: "general: what is JWT?"  
→ AI answers directly without context-rag

User: "how does authentication work?"
→ AI decides based on your preference (see options below)

DEFAULT BEHAVIOR OPTIONS:
Option A: Always use context-rag unless "general:" prefix
Option B: Never use context-rag unless "context-rag:" prefix  
Option C: AI tries to guess (not recommended)
```

## 🎯 **Alternative: Simple Keywords**

```
CONTEXT-RAG TRIGGERS:
- "context-rag:" or "ctx:" → Always use context
- "general:" → Never use context  
- "project:" → Always use context
- No prefix → Your choice (always/never/guess)
```

## 🔧 **Simple Code Example**

```javascript
async function handleUserQuery(userMessage) {
  // Parse user hints
  if (userMessage.startsWith('context-rag:') || userMessage.startsWith('ctx:')) {
    const query = userMessage.replace(/^(context-rag:|ctx:)\s*/, '');
    const context = await getProjectContext(query);
    return generateContextResponse(query, context);
  }
  
  if (userMessage.startsWith('general:')) {
    const query = userMessage.replace(/^general:\s*/, '');
    return generateGeneralResponse(query);
  }
  
  // No prefix - use your default behavior
  return handleDefaultBehavior(userMessage);
}

async function getProjectContext(query) {
  try {
    const { exec } = require('child_process');
    const { stdout } = await exec(`context-rag ai "${query}" --expand`);
    const result = JSON.parse(stdout);
    return result.status === 'success' ? result.context : null;
  } catch (error) {
    return null;
  }
}
```

## ✅ **That's It!**

Users only need to add the system prompt above (~10 lines) to enable context-rag integration.

The full AGENTS.md file is for developers who want to understand the complete implementation details.