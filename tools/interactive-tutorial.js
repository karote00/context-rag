#!/usr/bin/env node

/**
 * Interactive Context-RAG Tutorial
 * 
 * A step-by-step guided tutorial for beginners
 */

const readline = require('readline');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class InteractiveTutorial {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.step = 0;
    this.tutorialDir = 'context-rag-tutorial';
  }

  async ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async runCommand(command, args = [], showOutput = true) {
    return new Promise((resolve) => {
      console.log(`\n💻 Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        stdio: showOutput ? 'inherit' : 'pipe'
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', (error) => {
        console.error(`❌ Error: ${error.message}`);
        resolve(false);
      });
    });
  }

  async pause(message = "\n📖 Press Enter to continue...") {
    await this.ask(message);
  }

  async start() {
    console.log(`
🎉 Welcome to the Context-RAG Interactive Tutorial!

This tutorial will teach you everything about context-rag step by step.
We'll create a practice project and show you all the features.

Ready to become a context-rag expert? Let's go! 🚀
    `);

    await this.pause();
    await this.step1_introduction();
    await this.step2_installation();
    await this.step3_createProject();
    await this.step4_initialize();
    await this.step5_buildIndex();
    await this.step6_firstSearch();
    await this.step7_aiContext();
    await this.step8_formats();
    await this.step9_status();
    await this.step10_efficiency();
    await this.conclusion();
  }

  async step1_introduction() {
    console.log(`
📚 STEP 1: What is Context-RAG?

Think of context-rag as a smart librarian for your code:

🔍 Instead of reading every file to answer a question...
✨ Context-rag finds exactly the relevant parts you need!

Example:
❌ Without context-rag: "I don't know about your specific project"
✅ With context-rag: "Based on your auth.js file, here's how to fix it"

Plus, it saves you money by using fewer AI tokens! 💰
    `);

    await this.pause();
  }

  async step2_installation() {
    console.log(`
🔧 STEP 2: Check Installation

First, let's make sure context-rag is installed correctly.
    `);

    const hasContextRag = await this.runCommand('context-rag', ['--version'], false);
    
    if (!hasContextRag) {
      console.log(`
❌ Context-rag is not installed or not working.

To install it, run this command in your terminal:
   npm install -g context-rag

Then come back and run this tutorial again!
      `);
      process.exit(1);
    }

    console.log(`
✅ Great! Context-rag is installed and working.
    `);

    await this.pause();
  }

  async step3_createProject() {
    console.log(`
📁 STEP 3: Create a Practice Project

Let's create a fake project to practice with.
This will help you understand how context-rag works!
    `);

    // Clean up any existing tutorial directory
    if (fs.existsSync(this.tutorialDir)) {
      fs.rmSync(this.tutorialDir, { recursive: true, force: true });
    }

    // Create tutorial project
    fs.mkdirSync(this.tutorialDir, { recursive: true });
    process.chdir(this.tutorialDir);

    // Create example files
    fs.writeFileSync('README.md', `# My Awesome Task Manager

This project helps users manage their daily tasks efficiently.

## Features
- User authentication
- Task creation and management
- Task categories and priorities
- Due date reminders

## Getting Started
1. Install dependencies
2. Set up database
3. Configure authentication
4. Run the application
`);

    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync('src/auth.js', `// Authentication module
function login(username, password) {
  // Validate user credentials
  if (!username || !password) {
    throw new Error('Username and password required');
  }
  
  // Check against database
  const user = database.findUser(username);
  if (user && user.password === hashPassword(password)) {
    return generateToken(user);
  }
  
  throw new Error('Invalid credentials');
}

function register(username, email, password) {
  // Create new user account
  if (database.userExists(username)) {
    throw new Error('Username already exists');
  }
  
  const user = {
    username,
    email,
    password: hashPassword(password),
    createdAt: new Date()
  };
  
  return database.createUser(user);
}

module.exports = { login, register };
`);

    fs.writeFileSync('src/tasks.js', `// Task management module
function createTask(title, description, priority = 'medium') {
  if (!title) {
    throw new Error('Task title is required');
  }
  
  const task = {
    id: generateId(),
    title,
    description,
    priority,
    completed: false,
    createdAt: new Date()
  };
  
  return database.saveTask(task);
}

function updateTask(taskId, updates) {
  const task = database.findTask(taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  
  Object.assign(task, updates);
  task.updatedAt = new Date();
  
  return database.saveTask(task);
}

function deleteTask(taskId) {
  return database.deleteTask(taskId);
}

module.exports = { createTask, updateTask, deleteTask };
`);

    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync('docs/api.md', `# API Documentation

## Authentication Endpoints

### POST /auth/login
Login with username and password.

**Request:**
\`\`\`json
{
  "username": "john_doe",
  "password": "secure_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "jwt_token_here",
  "user": {
    "username": "john_doe",
    "email": "john@example.com"
  }
}
\`\`\`

### POST /auth/register
Create a new user account.

## Task Endpoints

### GET /tasks
Get all tasks for the authenticated user.

### POST /tasks
Create a new task.

**Request:**
\`\`\`json
{
  "title": "Complete project",
  "description": "Finish the context-rag tutorial",
  "priority": "high"
}
\`\`\`
`);

    fs.writeFileSync('config.json', `{
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "taskmanager"
  },
  "auth": {
    "jwtSecret": "your-secret-key",
    "tokenExpiry": "24h"
  },
  "server": {
    "port": 3000,
    "cors": true
  }
}
`);

    console.log(`
✅ Created practice project with:
   📄 README.md - Project description
   🔐 src/auth.js - Authentication code
   📋 src/tasks.js - Task management code
   📚 docs/api.md - API documentation
   ⚙️  config.json - Configuration file

This gives us a realistic project to practice with!
    `);

    await this.pause();
  }

  async step4_initialize() {
    console.log(`
🚀 STEP 4: Initialize Context-RAG

Now let's tell context-rag about our project.
This creates the configuration and prepares everything.
    `);

    const success = await this.runCommand('context-rag', ['init']);
    
    if (success) {
      console.log(`
✅ Context-rag is now initialized!

What just happened:
📄 Created .context-rag.config.json (settings file)
📁 Created .context-rag/ folder (where the magic happens)
      `);
    } else {
      console.log(`❌ Something went wrong with initialization.`);
    }

    await this.pause();
  }

  async step5_buildIndex() {
    console.log(`
🧠 STEP 5: Build the Index (Teach Context-RAG About Your Project)

This is where context-rag reads all your files and creates a "smart index".
Think of it as context-rag studying your project to understand it!
    `);

    const success = await this.runCommand('context-rag', ['index']);
    
    if (success) {
      console.log(`
✅ Index built successfully!

Context-rag now knows about:
📄 Your README file
🔐 Your authentication code  
📋 Your task management code
📚 Your API documentation
⚙️  Your configuration

It's ready to answer questions! 🎉
      `);
    } else {
      console.log(`❌ Something went wrong with indexing.`);
    }

    await this.pause();
  }

  async step6_firstSearch() {
    console.log(`
🔍 STEP 6: Your First Search!

Now for the fun part - let's ask context-rag questions about our project!
    `);

    const queries = [
      "What does this project do?",
      "How do I authenticate users?",
      "How do I create a task?",
      "What API endpoints are available?"
    ];

    for (const query of queries) {
      console.log(`\n🤔 Let's ask: "${query}"`);
      await this.pause("Press Enter to see the results...");
      
      await this.runCommand('context-rag', ['query', query]);
      
      console.log(`\n💡 See how context-rag found the relevant parts of your project?`);
      await this.pause();
    }

    console.log(`
🎯 Amazing! Context-rag can answer questions about your specific project
by finding the most relevant code and documentation.
    `);

    await this.pause();
  }

  async step7_aiContext() {
    console.log(`
🤖 STEP 7: Get Perfect Context for AI (The Magic Part!)

This is where context-rag becomes super powerful.
Instead of just showing you results, it can prepare perfect context
for ChatGPT, Claude, or any AI!
    `);

    console.log(`\n🎯 Let's get AI-ready context for: "How do I add user registration?"`);
    await this.pause("Press Enter to see the AI-formatted context...");

    await this.runCommand('context-rag', ['ai', 'How do I add user registration?']);

    console.log(`
💡 How to use this:
1. Copy the output above
2. Go to ChatGPT/Claude
3. Paste it and ask: "Based on this context, how do I add user registration?"
4. Get a perfect, project-specific answer! ✨

The AI will understand your exact project structure and give you
much better answers than generic responses.
    `);

    await this.pause();
  }

  async step8_formats() {
    console.log(`
🎨 STEP 8: Different Output Formats

Context-rag can present information in different ways depending on what you need.
Let's try the same question with different formats!
    `);

    const formats = [
      { flag: '--json', description: 'Perfect for copying to AI tools' },
      { flag: '--format markdown', description: 'Nice formatted output to read' },
      { flag: '--format summary', description: 'Quick overview of results' },
      { flag: '--format code', description: 'Focused on code examples' }
    ];

    for (const format of formats) {
      console.log(`\n📋 ${format.description}:`);
      await this.pause("Press Enter to see this format...");
      
      await this.runCommand('context-rag', ['query', 'authentication', format.flag]);
      
      await this.pause();
    }

    console.log(`
🎯 Different formats for different needs:
   --json → Copy to AI tools
   --format markdown → Documentation  
   --format summary → Quick overview
   --format code → Code examples
    `);

    await this.pause();
  }

  async step9_status() {
    console.log(`
📊 STEP 9: Check Your Project Status

Want to see what context-rag knows about your project?
The status command shows you everything!
    `);

    await this.runCommand('context-rag', ['status']);

    console.log(`
💡 The status command shows:
✅ How many files are indexed
✅ How many chunks of information
✅ Whether everything is working
✅ Git branch information (if using git)
✅ Context detection (handoff-ai integration)

Use this anytime you want to check if everything is working properly!
    `);

    await this.pause();
  }

  async step10_efficiency() {
    console.log(`
💰 STEP 10: See Your Token Savings!

One of the best parts of context-rag is how much it saves you
in AI tokens. Let's measure the efficiency!
    `);

    // Check if the efficiency tool exists
    const toolPath = path.join('..', 'tools', 'context-efficiency.js');
    if (fs.existsSync(toolPath)) {
      console.log(`\n📊 Running efficiency analysis...`);
      await this.pause("Press Enter to see how much context-rag saves you...");
      
      await this.runCommand('node', [toolPath]);
      
      console.log(`
🎯 This shows you:
💰 How many tokens you'd use without context-rag (dumping entire files)
✨ How many tokens you actually use (smart filtering)
📈 Your savings percentage (usually 80-95%!)

These savings work with ANY AI service - OpenAI, Claude, Gemini, local models!
      `);
    } else {
      console.log(`
💡 Token efficiency tools are available in the full context-rag package.
They show you exactly how much context-rag saves you in tokens!

Typically, context-rag reduces context size by 80-95% while
maintaining the same quality of information.
      `);
    }

    await this.pause();
  }

  async conclusion() {
    console.log(`
🎉 CONGRATULATIONS! You're now a Context-RAG expert!

📚 What you learned:
✅ How to install and set up context-rag
✅ How to index your project files  
✅ How to search for relevant information
✅ How to get perfect context for AI conversations
✅ How to use different output formats
✅ How to check project status
✅ How to measure token savings

🚀 What's next:
1. Try context-rag on your real projects!
2. Use 'context-rag watch' for auto-updates
3. Explore plugins with 'context-rag plugins --list'
4. Check out the advanced features in the docs

💡 Pro tip: The more you use context-rag, the more time and money
you'll save on AI interactions!

🎯 Remember the key workflow:
1. context-rag ai "your question"
2. Copy output to ChatGPT/Claude
3. Get amazing, project-specific answers!

Happy coding! 🚀

📖 Want to learn more? Check out:
   docs/beginner-tutorial.md - Complete written guide
   docs/cheat-sheet.md - Quick reference
   docs/quick-start.md - Fast setup guide
    `);

    // Clean up
    process.chdir('..');
    const keepProject = await this.ask('\n🗂️  Keep the tutorial project? (y/n): ');
    
    if (keepProject.toLowerCase() !== 'y') {
      fs.rmSync(this.tutorialDir, { recursive: true, force: true });
      console.log('🧹 Tutorial project cleaned up!');
    } else {
      console.log(`📁 Tutorial project saved in: ${this.tutorialDir}/`);
    }

    this.rl.close();
  }
}

// Run the tutorial
if (require.main === module) {
  const tutorial = new InteractiveTutorial();
  tutorial.start().catch(error => {
    console.error('❌ Tutorial failed:', error.message);
    process.exit(1);
  });
}

module.exports = InteractiveTutorial;