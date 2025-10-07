# Copy-Paste Template for AI Agents

**After running `context-rag init`, just add this one line to your AGENTS.md:**

```
#[[file:.context-rag/AGENTS.md]]
```

**Alternative: Manual Integration**

If you prefer to copy-paste manually instead of using the file reference:

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