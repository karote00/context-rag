# Copy-Paste Template for AI Agents

**Copy this section and paste it into your AGENTS.md or AI configuration:**

---

## Context-RAG Integration

**User Hint System**: Let users control when to use context-rag with prefixes:

**Triggers**:
- `context-rag:` or `ctx:` → Use context-rag for this question
- `general:` → Answer without context-rag  
- `project:` → Use context-rag for this question

**Examples**:
```
User: "context-rag: how does authentication work?"
→ Run: context-rag ai "how does authentication work" --expand
→ Use project context in response

User: "general: what is JWT?"
→ Answer directly without context-rag

User: "how does authentication work?" 
→ Choose your default behavior (always/never/guess)
```

**Command**: `context-rag ai "[user question without prefix]" --expand`
**Output**: JSON with project context or error message

---

**That's it! Users can now explicitly control when to use context-rag.**