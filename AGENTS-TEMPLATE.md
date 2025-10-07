# Copy-Paste Template for AI Agents

**Copy this section and paste it into your AGENTS.md or AI configuration:**

---

## Context-RAG Integration

For project-specific coding questions, gather context first using context-rag:

**Command**: `context-rag ai "[user question]" --expand`

**When to use**:
- Project-specific questions ("How does auth work in this project?")
- Implementation questions ("How do I add a new feature?") 
- Debugging questions ("Why is X failing?")
- Architecture questions ("Explain the project structure")

**When NOT to use**:
- General programming questions ("What is React?")
- Theoretical questions ("Difference between SQL and NoSQL?")

**Usage**:
1. Run the command above
2. Parse JSON response from stdout
3. Use context in answer, or provide general guidance if no context found

---

**That's it! Just copy the section above into your AI agent configuration.**