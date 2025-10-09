const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import command handlers
const initCommand = require('./cli/init');
const indexCommand = require('./cli/index');
const queryCommand = require('./cli/query');
const watchCommand = require('./cli/watch');
const branchCommand = require('./cli/branch');

const program = new Command();

program
  .name('context-rag')
  .description('A lightweight CLI tool for semantic search (RAG) on project context')
  .version(packageJson.version);

// Initialize command
program
  .command('init')
  .description('Initialize context-rag configuration in current directory')
  .action(initCommand);

// Index command
program
  .command('index [path]')
  .description('Build semantic index for project files')
  .option('-f, --force', 'Force rebuild of existing index')
  .option('--skip-branch-check', 'Skip safety check for first-time indexing on feature branch')
  .action(indexCommand);

// Query command
program
  .command('query <query>')
  .description('Search project context using natural language')
  .option('-k, --top-k <number>', 'Number of results to return', '5')
  .option('--json', 'Output results in JSON format')
  .action(queryCommand);

// Watch command
program
  .command('watch')
  .description('Watch for file changes and auto-update index')
  .action(watchCommand);

// Branch command
program
  .command('branch')
  .description('Manage branch-specific caches')
  .option('-l, --list', 'List all cached branches')
  .option('-c, --clear <branch>', 'Clear cache for specific branch')
  .action(branchCommand);

// Status command
program
  .command('status')
  .description('Show index and context status')
  .option('--json', 'Output in JSON format')
  .action(require('./cli/status'));

// AI command for AI integration
program
  .command('ai <query>')
  .description('Get project context for AI agents (token-efficient JSON output)')
  .option('-k, --top-k <number>', 'Number of results to return', '5')
  .action(require('./cli/ai'));

// Plugins command
program
  .command('plugins')
  .description('Manage result transformer plugins')
  .option('-l, --list', 'List available transformers')
  .action(require('./cli/plugins'));

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}