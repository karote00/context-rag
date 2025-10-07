# AI Agent Auto-Discovery Integration

**Zero-configuration integration using industry-standard auto-discovery patterns.**

## 🎯 **How It Works**

AI agents automatically discover and use context-rag without any configuration:

1. **Discovery**: AI checks if `context-rag` command is available
2. **Usage**: AI calls `context-rag ai "user question"` for project questions  
3. **Fallback**: AI provides general answers if context-rag unavailable

## 🔧 **Implementation for AI Agents**

### **Auto-Discovery Code**
```javascript
async function discoverContextRag() {
  try {
    // Check if context-rag is available
    await exec('which context-rag');
    return {
      available: true,
      command: 'context-rag ai',
      description: 'Get project context for coding questions'
    };
  } catch (error) {
    return { available: false };
  }
}

async function handleUserQuery(userQuery) {
  const contextRag = await discoverContextRag();
  
  if (contextRag.available && isProjectQuestion(userQuery)) {
    // Get project context
    const context = await getProjectContext(userQuery);
    return generateContextAwareResponse(userQuery, context);
  } else {
    // Provide general response
    return generateGeneralResponse(userQuery);
  }
}

async function getProjectContext(query) {
  try {
    const { stdout } = await exec(`context-rag ai "${query}"`);
    const result = JSON.parse(stdout);
    return result.status === 'success' ? result.context : null;
  } catch (error) {
    return null;
  }
}

function isProjectQuestion(query) {
  // Simple heuristics to detect project-specific questions
  const projectIndicators = [
    'how does', 'how do i', 'explain the', 'what does',
    'implement', 'add', 'create', 'debug', 'fix',
    'this project', 'our code', 'my code', 'architecture'
  ];
  
  return projectIndicators.some(indicator => 
    query.toLowerCase().includes(indicator)
  );
}
```

### **Standard Interface**

**Command**: `context-rag ai "user question"`

**Input**: Natural language query about the project

**Output**: JSON with structured context
```json
{
  "status": "success",
  "context": {
    "query": "how does authentication work",
    "total_results": 5,
    "structured_context": [...],
    "code_context": [...],
    "context_summary": "Found authentication middleware and JWT handling"
  }
}
```

**Error Output**: 
```json
{
  "status": "error", 
  "message": "Index not found. Run 'context-rag index' first.",
  "context": null
}
```

## 🎮 **User Experience**

### **Setup (One-time)**
```bash
npm install -g context-rag
cd my-project
context-rag init
context-rag index
```

### **Usage (Automatic)**
```
User: "How does authentication work in this project?"

AI Agent:
1. Discovers context-rag is available
2. Runs: context-rag ai "authentication work project"  
3. Gets project-specific context
4. Responds: "Based on your project, I can see you're using JWT..."

User: "What is JWT?"

AI Agent:
1. Detects this is a general question
2. Responds directly: "JWT (JSON Web Token) is..."
```

## ✅ **Benefits**

### **For Users**
- **Zero configuration** - just install and use
- **Works with any AI** - universal compatibility
- **Graceful fallback** - works without context-rag too
- **Natural interaction** - just ask questions normally

### **For AI Agents**  
- **Simple discovery** - standard `which` command
- **Predictable interface** - always same command format
- **Standard output** - always JSON structure
- **No configuration files** - pure auto-discovery

### **For Developers**
- **Convention over configuration** - follows industry standards
- **Composable** - works with any AI system
- **Maintainable** - no custom integration per AI
- **Future-proof** - standard patterns that scale

## 🔍 **Tool Manifest**

Context-rag creates `.context-rag/tool-manifest.json` for advanced discovery:

```json
{
  "name": "context-rag",
  "description": "Semantic search for project context using RAG",
  "type": "ai-tool",
  "discovery": {
    "command": "context-rag",
    "check": "which context-rag"
  },
  "capabilities": {
    "search": {
      "command": "context-rag ai",
      "description": "Get project context for a query",
      "input": "Natural language query about the project",
      "output": "JSON with structured project context"
    }
  }
}
```

## 🚀 **Getting Started**

### **For AI Agent Developers**
1. Add auto-discovery code above to your agent
2. Test with `which context-rag` check
3. Use `context-rag ai "query"` for project questions
4. Parse JSON response and integrate into your responses

### **For Users**
1. Install: `npm install -g context-rag`
2. Setup: `context-rag init && context-rag index`
3. Use: Ask your AI natural questions about your project
4. Enjoy: AI automatically gets project context!

**That's it! Zero configuration, maximum compatibility.** 🎯