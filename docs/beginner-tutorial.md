# Complete Beginner's Guide to Context-RAG

Welcome! This guide will teach you everything about context-rag, even if you're new to coding. We'll go step by step! 🚀

## What is Context-RAG? (In Simple Terms)

Imagine you have a huge library with thousands of books, and you want to ask questions about specific topics. Instead of reading every book, you want a smart librarian who can:

1. **Quickly find** the most relevant books for your question
2. **Show you only** the important pages (not the whole books)
3. **Save you time** by giving you exactly what you need

That's what context-rag does for your code projects! 📚

## Why Should You Care?

When you ask AI (like ChatGPT) about your code:
- **Without context-rag**: "I don't know about your specific project..."
- **With context-rag**: "Based on your auth.js file, here's exactly how to fix it..."

Plus, it saves you money by using fewer AI tokens! 💰

---

## Step 1: Installation (Don't Worry, It's Easy!)

### What You Need First
- **Node.js** installed on your computer ([Download here](https://nodejs.org))
- A **terminal/command prompt** (we'll show you how to use it!)

### Install Context-RAG

Open your terminal (don't panic! 😅) and type this:

```bash
npm install -g context-rag
```

**What this does**: Downloads and installs context-rag on your computer so you can use it anywhere.

### Check if it worked

Type this to make sure it installed correctly:

```bash
context-rag --version
```

You should see something like `1.0.0`. If you do, great! 🎉

---

## Step 2: Your First Project Setup

Let's practice with a simple example project!

### Create a Practice Project

```bash
# Create a new folder for practice
mkdir my-first-context-rag-project
cd my-first-context-rag-project

# Create some example files
echo "# My Awesome Project" > README.md
echo "This project helps users manage their tasks" >> README.md

mkdir src
echo "function login(username, password) { /* login logic */ }" > src/auth.js
echo "function createTask(title) { /* task creation */ }" > src/tasks.js

mkdir docs
echo "# API Documentation" > docs/api.md
echo "## Authentication: Use POST /login" >> docs/api.md
```

**What we just did**: Created a fake project with some files that context-rag can learn about.

### Initialize Context-RAG

```bash
context-rag init
```

**What this does**: 
- Creates a `.context-rag.config.json` file (the settings)
- Creates a `.context-rag` folder (where it stores its brain)

You should see: `✨ Context-RAG initialized successfully!`

---

## Step 3: Build Your First Index (Teach Context-RAG About Your Project)

```bash
context-rag index
```

**What this does**: Context-rag reads all your files and creates a "smart index" - like a super-organized filing system that knows what's in each file.

You should see something like:
```
🚀 Building semantic index...
✅ Indexing completed successfully!
📁 Files indexed: 4
📄 Total chunks: 8
```

---

## Step 4: Your First Search! 🔍

Now the fun part - ask context-rag questions about your project:

```bash
context-rag query "How do I handle user authentication?"
```

**What you'll see**: Context-rag will show you the most relevant parts of your code related to authentication!

Try more questions:
```bash
context-rag query "What does this project do?"
context-rag query "How do I create a task?"
context-rag query "API documentation"
```

---

## Step 5: Get Context for AI (The Magic Part! ✨)

This is where context-rag becomes super powerful:

```bash
context-rag ai "How do I add user registration?"
```

**What this gives you**: Perfect context to copy-paste into ChatGPT, Claude, or any AI!

### How to Use This with AI:

1. **Run the command above**
2. **Copy the output** 
3. **Go to ChatGPT/Claude** and paste it
4. **Ask your question** with the context

**Example**:
```
[Paste the context-rag output]

Based on this context from my project, how do I add user registration functionality?
```

The AI will give you a much better, project-specific answer! 🎯

---

## Step 6: Understanding Different Output Formats

Context-rag can give you information in different ways:

### JSON Format (for copying to AI)
```bash
context-rag query "authentication" --json
```

### Markdown Format (nice to read)
```bash
context-rag query "authentication" --format markdown
```

### Summary Format (quick overview)
```bash
context-rag query "authentication" --format summary
```

### Code Format (focused on code)
```bash
context-rag query "authentication" --format code
```

---

## Step 7: Check Your Project Status

Want to see what context-rag knows about your project?

```bash
context-rag status
```

This shows you:
- How many files are indexed
- What branch you're on (if using git)
- Whether everything is working properly

---

## Step 8: Working with Git Branches (Advanced but Cool!)

If you use git, context-rag is super smart about branches:

```bash
# See branch information
context-rag branch

# List all cached branches
context-rag branch --list
```

**Why this is cool**: Context-rag remembers different versions of your project for different branches!

---

## Step 9: Watch Mode (Auto-Updates!)

Want context-rag to automatically update when you change files?

```bash
context-rag watch
```

**What this does**: Watches your files and updates the index automatically when you make changes. Press `Ctrl+C` to stop.

---

## Step 10: Measure Your Token Savings! 💰

Want to see how much context-rag saves you?

```bash
node tools/context-efficiency.js
```

This shows you:
- How many tokens you would use without context-rag
- How many tokens you actually use with context-rag
- How much you save!

---

## Real-World Example: Getting Help with Your Code

Let's say you're stuck on something. Here's the complete workflow:

### The Old Way (Frustrating 😤)
1. Ask ChatGPT: "How do I add authentication to my app?"
2. ChatGPT: "Here's a generic example..."
3. You: "But how does this work with my existing code?"
4. ChatGPT: "I don't know your specific code..."
5. You: *Copy-paste entire files*
6. ChatGPT: "That's too much code, can you be more specific?"

### The Context-RAG Way (Amazing! 🌟)
1. Run: `context-rag ai "How do I add authentication?"`
2. Copy the output to ChatGPT
3. Ask: "Based on this context, how do I add authentication?"
4. ChatGPT: "Looking at your existing auth.js file, here's exactly what to do..."

**Result**: Better answer, less frustration, fewer tokens used!

---

## Common Beginner Questions

### "What files should I include?"

Context-rag automatically includes:
- Documentation files (`.md`, `.txt`)
- Code files (`.js`, `.ts`, `.py`, etc.)
- Configuration files

It automatically excludes:
- `node_modules` folder
- `.git` folder
- Build folders (`dist`, `build`)

### "How often should I update the index?"

- **After adding new files**: Run `context-rag index`
- **After major changes**: Run `context-rag index`
- **Or just use**: `context-rag watch` to auto-update!

### "What if I get no results?"

1. Check if files are indexed: `context-rag status`
2. Try broader search terms
3. Rebuild the index: `context-rag index --force`

### "Can I use this with any AI?"

Yes! Context-rag works with:
- ChatGPT
- Claude
- Google Gemini
- Local AI models
- Any AI that accepts text input

---

## Tips for Beginners

1. **Start small**: Try it on a simple project first
2. **Use descriptive queries**: Instead of "auth", try "user authentication login"
3. **Experiment with formats**: Try `--json`, `--format markdown`, etc.
4. **Keep your index updated**: Run `context-rag index` after big changes
5. **Use the AI command**: `context-rag ai "question"` is perfect for copying to ChatGPT

---

## What's Next?

Once you're comfortable with the basics:

1. **Explore plugins**: `context-rag plugins --list`
2. **Try advanced queries**: More specific questions get better results
3. **Set up watch mode**: For automatic updates
4. **Measure your savings**: Use the token efficiency tools

---

## Getting Help

If you get stuck:

1. **Check status**: `context-rag status`
2. **See all commands**: `context-rag --help`
3. **Read the docs**: Check the `docs/` folder
4. **Start fresh**: Delete `.context-rag` folder and run `context-rag init` again

---

## Congratulations! 🎉

You now know how to:
- ✅ Install and set up context-rag
- ✅ Index your project files
- ✅ Search for relevant code and documentation
- ✅ Get perfect context for AI conversations
- ✅ Save tokens and get better AI responses
- ✅ Use different output formats
- ✅ Monitor and maintain your index

You're ready to make your AI conversations much more effective! 🚀

**Remember**: The more you use context-rag, the more time and money you'll save on AI interactions. Happy coding! 😊