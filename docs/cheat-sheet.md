# Context-RAG Cheat Sheet

Quick reference for all the commands you'll use! 📋

## Essential Commands

### Setup (Do Once)
```bash
npm install -g context-rag    # Install context-rag
context-rag init              # Set up in your project
context-rag index             # Build the index
```

### Daily Usage
```bash
context-rag query "your question"           # Search your project
context-rag ai "your question"              # Get context for AI
context-rag status                          # Check everything is working
```

### When You Make Changes
```bash
context-rag index             # Update the index
context-rag watch             # Auto-update mode
```

## Search Commands

### Basic Search
```bash
context-rag query "authentication"
context-rag query "database connection"
context-rag query "error handling"
```

### Different Formats
```bash
context-rag query "auth" --json              # For copying to AI
context-rag query "auth" --format markdown   # Nice to read
context-rag query "auth" --format summary    # Quick overview
context-rag query "auth" --format code       # Code-focused
```

### AI-Ready Context
```bash
context-rag ai "How do I add authentication?"
# Copy the output to ChatGPT/Claude!
```

## Project Management

### Check Status
```bash
context-rag status            # See project info
context-rag status --json     # Machine-readable format
```

### Branch Management (Git Users)
```bash
context-rag branch            # Current branch info
context-rag branch --list     # All cached branches
context-rag branch --clear feature-branch  # Clear old cache
```

### Plugins
```bash
context-rag plugins           # Plugin status
context-rag plugins --list    # Available transformers
```

## Troubleshooting

### Common Fixes
```bash
context-rag index --force     # Force rebuild index
context-rag init              # Reset configuration
context-rag --help            # See all commands
```

### Check What's Wrong
```bash
context-rag status            # Is everything set up?
context-rag query "test"      # Does search work?
ls .context-rag              # Does cache exist?
```

## File Locations

### Important Files
- `.context-rag.config.json` - Settings
- `.context-rag/` - Cache and index files
- `docs/` - Documentation you're reading

### Configuration
Edit `.context-rag.config.json` to change:
- Which files to include/exclude
- Search settings
- Cache settings

## Quick Workflows

### New Project Setup
```bash
cd your-project
context-rag init
context-rag index
context-rag query "what does this project do?"
```

### Getting AI Help
```bash
context-rag ai "your specific question"
# Copy output to ChatGPT/Claude
# Ask your question with the context
```

### After Making Changes
```bash
context-rag index             # Manual update
# OR
context-rag watch             # Auto-update (Ctrl+C to stop)
```

### Measuring Efficiency
```bash
node tools/context-efficiency.js    # See token savings
```

## Pro Tips

### Better Search Results
- ✅ Use specific terms: "user authentication login"
- ✅ Ask complete questions: "How do I handle API errors?"
- ❌ Avoid single words: "auth"

### Formats for Different Uses
- `--json` → Copy to AI tools
- `--format markdown` → Documentation
- `--format summary` → Quick overview
- `--format code` → Code examples

### Keep It Updated
- Run `context-rag index` after adding files
- Use `context-rag watch` during active development
- Check `context-rag status` if results seem outdated

## Emergency Reset

If everything breaks:
```bash
rm -rf .context-rag           # Delete cache
rm .context-rag.config.json   # Delete config
context-rag init              # Start fresh
context-rag index             # Rebuild
```

## Remember

- 🎯 **Main goal**: Get better context for AI conversations
- 💰 **Side benefit**: Save tokens and money
- 🔄 **Keep updated**: Index after changes
- 📋 **Check status**: When things seem wrong
- 🤖 **Use `ai` command**: Perfect for ChatGPT/Claude

Happy coding! 🚀