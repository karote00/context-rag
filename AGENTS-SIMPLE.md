# Simple AI Agent Integration

**What users should add to their AGENTS.md or AI configuration file.**

## 🎯 **Minimal Integration (Copy This)**

Add this to your AI agent's system prompt or AGENTS.md:

```
CONTEXT-RAG INTEGRATION:

For project-specific coding questions, gather context first:
1. Run: context-rag ai "[user question]" --expand
2. Parse JSON response from stdout
3. Use context in your answer, or fall back to general guidance if no context

PROJECT QUESTIONS (use context-rag):
- "How does [feature] work in this project?"
- "How do I implement/add/fix [something]?"
- "Explain the architecture/structure"
- "Debug/troubleshoot [issue]"

GENERAL QUESTIONS (answer directly):
- "What is [technology]?"
- "Difference between X and Y?"
- "Best practices for [general topic]"

COMMAND: context-rag ai "user question" --expand
OUTPUT: JSON with project context or error message
```

## 🔧 **Simple Code Example**

If your agent supports custom functions, add this:

```javascript
async function getProjectContext(query) {
  try {
    const { exec } = require('child_process');
    const { stdout } = await exec(`context-rag ai "${query}" --expand`);
    const result = JSON.parse(stdout);
    return result.status === 'success' ? result.context : null;
  } catch (error) {
    return null; // No context available
  }
}

// Use in your agent:
const context = await getProjectContext(userQuery);
if (context) {
  // Answer with project-specific context
} else {
  // Answer with general guidance
}
```

## ✅ **That's It!**

Users only need to add the system prompt above (~10 lines) to enable context-rag integration.

The full AGENTS.md file is for developers who want to understand the complete implementation details.