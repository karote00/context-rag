const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_FILE = '.context-rag.config.json';

/**
 * Load and validate configuration file
 * @param {Object} options - Loading options
 * @param {boolean} options.silent - Suppress console output when true
 * @returns {Object|null} Configuration object or null if not found
 */
async function loadConfig(options = {}) {
  const { silent = false } = options;
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      if (!silent) {
        console.log(chalk.yellow('⚠️  No configuration found. Run "context-rag init" first.'));
      }
      return null;
    }

    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configContent);
    
    // Validate required fields
    const requiredFields = [
      'index.include',
      'embedder.type',
      'search.engine'
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (!getNestedValue(config, field)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      if (!silent) {
        console.error(chalk.red('❌ Configuration validation failed:'));
        missingFields.forEach(field => {
          console.error(chalk.red(`   Missing required field: ${field}`));
        });
        console.log(chalk.yellow('💡 Run "context-rag init" to regenerate configuration'));
      }
      return null;
    }

    // Validate cache directory exists
    const cacheDir = path.dirname(config.storage.path);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      if (!silent) {
        console.log(chalk.green(`Created cache directory: ${cacheDir}`));
      }
    }

    return config;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (!silent) {
        console.error(chalk.red('❌ Invalid JSON in configuration file:'));
        console.error(chalk.red(`   ${error.message}`));
        console.log(chalk.yellow('💡 Check your .context-rag.config.json file'));
      }
      return null;
    }
    throw error;
  }
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration object to save
 */
async function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search in
 * @param {string} path - Dot notation path (e.g., 'index.include')
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

module.exports = {
  loadConfig,
  saveConfig,
  getNestedValue,
  setNestedValue,
  CONFIG_FILE
};