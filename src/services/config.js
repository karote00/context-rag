const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_FILE = '.context-rag.config.json';

/**
 * Load and validate configuration file
 * @returns {Object|null} Configuration object or null if not found
 */
async function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
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

    for (const field of requiredFields) {
      if (!getNestedValue(config, field)) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    return config;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
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