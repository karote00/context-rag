/**
 * Utility for suppressing console output during function execution
 */

/**
 * Execute a function with console output suppressed
 * @param {Function} fn - Function to execute
 * @param {boolean} silent - Whether to suppress output
 * @returns {*} Result of function execution
 */
function withSilentMode(fn, silent = false) {
  if (!silent) {
    return fn();
  }
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Suppress console output
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  
  try {
    return fn();
  } finally {
    // Restore original console methods
    Object.assign(console, originalConsole);
  }
}

/**
 * Execute an async function with console output suppressed
 * @param {Function} fn - Async function to execute
 * @param {boolean} silent - Whether to suppress output
 * @returns {Promise<*>} Result of function execution
 */
async function withSilentModeAsync(fn, silent = false) {
  if (!silent) {
    return await fn();
  }
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Suppress console output
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  
  try {
    return await fn();
  } finally {
    // Restore original console methods
    Object.assign(console, originalConsole);
  }
}

module.exports = {
  withSilentMode,
  withSilentModeAsync
};