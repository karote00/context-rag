# AI Agent Integration Guide (Advanced)

> **🚀 Quick Start**: Most users should use [AGENTS-SIMPLE.md](./AGENTS-SIMPLE.md) instead (just 10 lines to add to your AI config).
> 
> This document is for developers who want complete implementation details.

This document explains how AI agents should integrate with context-rag to provide intelligent, context-aware assistance.

## 🤖 **Agent Workflow**

### **Step 1: Determine If Context Is Needed**
AI agents should **intelligently decide** when to gather context. Use context-rag for:

**✅ Use Context-RAG For:**
- Code-related questions ("How does authentication work?")
- Implementation questions ("How do I add a new feature?")
- Debugging questions ("Why is X not working?")
- Architecture questions ("Explain the project structure")
- File/function specific questions ("What does validateToken do?")

**❌ Don't Use Context-RAG For:**
- General programming questions ("What is React?")
- Theoretical questions ("What's the difference between SQL and NoSQL?")
- Personal questions ("What's your favorite framework?")
- Questions clearly not about the current project

### **Step 2: Gather Context When Needed**
When the question IS about the current project, gather relevant context using context-rag:

```bash
# For general queries
context-rag ai "user's question here"

# For comprehensive context discovery
context-rag ai "user's question here" --expand

# For specific file types or focused results
context-rag ai "user's question here" --top-k 10
```

### **Step 2: Process Context**
Parse the JSON response to understand:
- **Structured context** (documentation, architecture)
- **Code context** (relevant code snippets)
- **Relevance scores** (prioritize high-relevance results)
- **File sources** (understand the codebase structure)

### **Step 3: Provide Informed Response**
Use the gathered context to provide accurate, project-specific answers.

## 📋 **Integration Examples**

### **Example 1: Code Explanation**
```
User: "How does authentication work in this project?"

Agent Process:
1. Run: context-rag ai "authentication flow" --expand
2. Receive structured context about auth middleware, JWT handling, etc.
3. Provide explanation based on actual project implementation
```

### **Example 2: Feature Implementation**
```
User: "How do I add a new API endpoint?"

Agent Process:
1. Run: context-rag ai "API endpoint implementation" --expand
2. Find existing API patterns, middleware, validation
3. Provide step-by-step guide using project's conventions
```

### **Example 3: Bug Investigation**
```
User: "Why is the login failing?"

Agent Process:
1. Run: context-rag ai "login authentication error handling" --expand
2. Find auth flow, error handling, validation logic
3. Guide user through debugging based on actual code
```

## 🔧 **How AI Gets Tool Response**

**Yes, you're exactly right!** The flow is:

1. **AI calls context-rag CLI**: `context-rag ai "user question" --expand`
2. **CLI outputs JSON to stdout**: Structured context data
3. **AI reads the stdout**: Parses JSON response
4. **AI uses context**: Incorporates into response

### **Basic Integration**
```javascript
async function getProjectContext(userQuery) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    // Step 1: AI calls context-rag CLI
    const { stdout } = await execAsync(`context-rag ai "${userQuery}" --expand`);
    
    // Step 2: CLI outputs JSON to stdout
    // Step 3: AI reads and parses the stdout
    const context = JSON.parse(stdout);
    
    if (context.status === 'success') {
      return context.context;
    } else {
      return null;
    }
  } catch (error) {
    console.warn('Context-rag not available:', error.message);
    return null;
  }
}

/**
 * Smart decision making - when to use context-rag
 */
function shouldUseContextRag(userQuery) {
  const query = userQuery.toLowerCase();
  
  // Project-specific indicators
  const projectIndicators = [
    'how does', 'how do i', 'how can i',
    'explain the', 'what does', 'where is',
    'implement', 'add', 'create', 'build',
    'debug', 'fix', 'error', 'issue',
    'architecture', 'structure', 'design',
    'this project', 'our code', 'my code'
  ];
  
  // General question indicators
  const generalIndicators = [
    'what is', 'what are', 'define',
    'difference between', 'vs', 'versus',
    'best practice', 'should i use',
    'which is better', 'pros and cons'
  ];
  
  // Check for project indicators
  const hasProjectIndicators = projectIndicators.some(indicator => 
    query.includes(indicator)
  );
  
  // Check for general indicators
  const hasGeneralIndicators = generalIndicators.some(indicator => 
    query.includes(indicator)
  );
  
  // If clearly general, don't use context
  if (hasGeneralIndicators && !hasProjectIndicators) {
    return false;
  }
  
  // If clearly project-specific, use context
  if (hasProjectIndicators) {
    return true;
  }
  
  // For ambiguous cases, try context (it will return null if no relevant results)
  return true;
}

async function answerUserQuestion(userQuery) {
  // Step 1: Decide if context is needed
  const needsContext = shouldUseContextRag(userQuery);
  
  let projectContext = null;
  if (needsContext) {
    // Step 2: Get context if needed
    projectContext = await getProjectContext(userQuery);
  }
  
  // Step 3: Generate appropriate response
  if (projectContext) {
    return generateContextAwareResponse(userQuery, projectContext);
  } else if (needsContext) {
    return generateNoContextResponse(userQuery);
  } else {
    return generateGeneralResponse(userQuery);
  }
}

function generateNoContextResponse(userQuery) {
  return `I don't see specific implementation details in your project for "${userQuery}". Here's some general guidance that might help...`;
}

function generateGeneralResponse(userQuery) {
  return `Here's a general explanation of ${userQuery}...`;
}
```

### **Advanced Integration with Error Handling**
```javascript
class ContextAwareAgent {
  async getContext(query, options = {}) {
    const flags = [
      options.expand ? '--expand' : '',
      options.topK ? `--top-k ${options.topK}` : '',
      options.format ? `--format ${options.format}` : ''
    ].filter(Boolean).join(' ');
    
    const command = `context-rag ai "${query}" ${flags}`;
    
    try {
      const { stdout } = await execAsync(command);
      const result = JSON.parse(stdout);
      
      switch (result.status) {
        case 'success':
          return result.context;
        case 'no_results':
          console.log('No relevant context found for:', query);
          return null;
        case 'error':
          console.warn('Context-rag error:', result.message);
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.warn('Failed to get context:', error.message);
      return null;
    }
  }
  
  async handleUserRequest(userQuery) {
    // Always try to get context first
    const context = await this.getContext(userQuery, { expand: true });
    
    if (context) {
      return this.generateContextAwareResponse(userQuery, context);
    } else {
      return this.generateGenericResponse(userQuery);
    }
  }
  
  generateContextAwareResponse(query, context) {
    // Use structured context to provide specific answers
    const { structured_context, code_context, context_summary } = context;
    
    return `Based on your project:
    
${context_summary}

[Detailed response using actual project context...]`;
  }
}
```

## 🎯 **Best Practices for Agents**

### **1. Always Check for Context First**
```javascript
// ✅ Good
const context = await getProjectContext(userQuery);
if (context) {
  // Use project-specific information
} else {
  // Fall back to general advice
}

// ❌ Bad - answering without context
return "Here's how authentication typically works..."
```

### **2. Use Expanded Search for Complex Queries**
```bash
# ✅ Good for complex topics
context-rag ai "user authentication flow" --expand

# ✅ Good for simple lookups  
context-rag ai "Button component" --top-k 3

# ❌ Less effective for broad topics
context-rag ai "code"
```

### **3. Handle Context Gracefully**
```javascript
// ✅ Good - graceful degradation
if (context && context.code_context.length > 0) {
  return `Based on your ${context.code_context[0].file}...`;
} else {
  return "I don't see specific implementation details, but generally...";
}
```

### **4. Prioritize High-Relevance Results**
```javascript
// ✅ Good - use relevance scores
const highRelevanceResults = context.code_context
  .filter(item => item.relevance > 0.8)
  .slice(0, 3);
```

## 📊 **CLI Output Format**

### **How the CLI Communication Works**

```bash
# AI executes this command
context-rag ai "authentication flow" --expand

# CLI outputs JSON to stdout (what AI reads)
{
  "status": "success",
  "context": {
    "query": "authentication flow",
    "total_results": 5,
    "structured_context": [...],
    "code_context": [...]
  }
}

# AI parses this JSON and uses it in response
```

**Important Notes:**
- **stdout**: Contains the JSON response (what AI needs)
- **stderr**: Contains progress messages (AI should ignore)
- **Exit code**: 0 for success, 1 for error

## 📊 **Context Response Format**

### **Success Response**
```json
{
  "status": "success",
  "context": {
    "query": "authentication flow",
    "total_results": 5,
    "context_sources": 2,
    "code_sources": 3,
    "structured_context": [
      {
        "type": "architecture",
        "content": "Authentication uses JWT tokens...",
        "relevance": 0.95,
        "source": "docs/auth.md"
      }
    ],
    "code_context": [
      {
        "file": "src/auth/middleware.js",
        "snippet": "const authenticate = (req, res, next) => {...}",
        "relevance": 0.87
      }
    ],
    "context_summary": "Found 5 relevant sources including auth docs and middleware"
  }
}
```

### **Error Response**
```json
{
  "status": "error",
  "message": "Index not found. Run 'context-rag index' first.",
  "context": null
}
```

### **No Results Response**
```json
{
  "status": "no_results", 
  "message": "No relevant context found for the query",
  "query": "nonexistent feature",
  "context": null
}
```

## 🚀 **Agent Setup Instructions**

### **Prerequisites**
1. **Install context-rag**: `npm install -g context-rag`
2. **Initialize in project**: `context-rag init`
3. **Build index**: `context-rag index`
4. **Test**: `context-rag ai "test query"`

### **Agent Configuration**
Add to your agent's system prompt or instructions:

```
CONTEXT DECISION LOGIC:
1. Analyze if the user's question is about the current project/codebase
2. If YES and it's code-related, gather context first using:
   context-rag ai "[user's question]" --expand
3. If NO or it's a general question, answer directly without context

PROJECT-RELATED INDICATORS:
- Mentions specific files, functions, or components
- Asks "how does [feature] work in this project"
- Debugging or implementation questions
- Architecture or structure questions

GENERAL QUESTION INDICATORS:
- Theoretical programming concepts
- "What is..." questions about technologies
- Best practices not specific to the project
- Personal opinions or preferences
```

## 💡 **Example Agent Prompts**

### **System Prompt Addition**
```
You are a coding assistant with access to the user's project context via context-rag.

WORKFLOW:
1. For any code/project question, first run: context-rag ai "[question]" --expand
2. Parse the JSON response for relevant context
3. Answer based on actual project implementation
4. If no context available, provide general guidance but mention the limitation

CONTEXT USAGE:
- Prioritize high-relevance results (>0.8 relevance score)
- Reference specific files and code snippets from context
- Use project's actual patterns and conventions
- Mention when context is limited or unavailable
```

### **Example Interactions**

**Example 1: Project-Specific Question (Use Context-RAG)**
```
User: "How do I add error handling to API calls?"

Agent Decision: This is about the current project → Use context-rag
[Runs: context-rag ai "API error handling" --expand]

Agent Response: "Based on your project, I can see you're using:
- Express middleware for error handling in `src/middleware/errorHandler.js`
- Try-catch blocks with async/await in `src/api/userController.js`
- Custom error classes in `src/utils/errors.js`

Here's how to add error handling following your project's patterns..."
```

**Example 2: General Question (Don't Use Context-RAG)**
```
User: "What's the difference between REST and GraphQL?"

Agent Decision: This is a general programming question → Answer directly

Agent Response: "REST and GraphQL are both API design approaches:
- REST uses multiple endpoints with HTTP methods...
- GraphQL uses a single endpoint with flexible queries...
[Provides general explanation without project context]"
```

**Example 3: Ambiguous Question (Smart Decision)**
```
User: "How does authentication work?"

Agent Decision: Could be general OR project-specific → Try context first

[Runs: context-rag ai "authentication" --expand]

If context found: "In your project, authentication works using JWT tokens..."
If no context: "Generally, authentication can work in several ways..."
```

## 🔍 **Troubleshooting**

### **Common Issues**
1. **"Index not found"** - User needs to run `context-rag index`
2. **"No results"** - Query might be too specific or files not indexed
3. **Command not found** - Context-rag not installed or not in PATH

### **Fallback Strategies**
```javascript
// Handle common issues gracefully
try {
  const context = await getProjectContext(query);
  return generateContextAwareResponse(query, context);
} catch (error) {
  if (error.message.includes('Index not found')) {
    return "I'd need you to run 'context-rag index' first to analyze your project. For now, here's general guidance...";
  } else if (error.message.includes('command not found')) {
    return "Context-rag isn't available. Here's general guidance...";
  } else {
    return generateGenericResponse(query);
  }
}
```

---

## 🎯 **Summary**

The key principle: **Context First, Then Answer**

1. **Always** try to get project context with `context-rag ai`
2. **Parse** the structured response
3. **Prioritize** high-relevance results
4. **Answer** based on actual project implementation
5. **Fall back** gracefully when context isn't available

This approach ensures AI agents provide accurate, project-specific assistance rather than generic advice.