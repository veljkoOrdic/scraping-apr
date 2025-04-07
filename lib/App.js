/**
 * Application module providing global functionality and error handling
 */
// lib/App.js
const Event = require('./Event');
const eventEmitter = require('./EventEmitter');

class App {
  constructor() {
    this.$debug = true;
    this.errorHandlersRegistered = false;
    this.registerErrorHandlers();
  }

  setDebug(debug) {
    this.$debug = debug;
  }

  info(source, message, metadata = {}, options = {}) {
    if (this.$debug) {
      const event = new Event('info', source, message, metadata, options);
      eventEmitter.emit( event);
    }
  }

  error(source, message, metadata = {}, options = {}) {
    const event = new Event( source, message, metadata, options);
    eventEmitter.emit( event);
  }

  log(source, message, metadata = {}, options = {}) {
    const event = new Event('log', source, message, metadata, options);

    eventEmitter.emit( event);
  }


  /**
   * Register global error handlers
   */
  registerErrorHandlers() {
    if (this.errorHandlersRegistered) {
      return;
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION:');
      console.error(err);

      // If error is about a detached frame or disconnected target, it's likely
      // from the browser being closed during navigation - we can safely ignore it
      if (
          err.message.includes('Navigating frame was detached') ||
          err.message.includes('Protocol error') ||
          err.message.includes('Target closed') ||
          err.message.includes('disconnected')
      ) {
        console.log('This error is expected during browser closing - continuing shutdown');

        // Exit after a brief delay to allow any pending writes to complete
        setTimeout(() => {
          process.exit(0);
        }, 500);
      } else {
        // For other unexpected errors, exit with error code
        process.exit(1);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('UNHANDLED PROMISE REJECTION:');
      console.error(reason);

      // If it's a known browser error during closing, ignore it
      if (
          reason instanceof Error && (
              reason.message.includes('Navigating frame was detached') ||
              reason.message.includes('Protocol error') ||
              reason.message.includes('Target closed') ||
              reason.message.includes('disconnected')
          )
      ) {
        console.log('This rejection is expected during browser closing - continuing shutdown');
      }
      // We don't exit the process here, just log it
    });

    this.errorHandlersRegistered = true;
    console.log('Global error handlers registered');
  }

  /**
   * Create a new browser instance
   * @param {Object} options - Browser options
   * @returns {Promise<Object>} - Browser instance
   */
  async createBrowser(options = {}) {
    try {
      const MyPuppeteer = require('./MyPuppeteer');
      return new MyPuppeteer(options);
    } catch (error) {
      console.error("Error creating browser:", error);
      throw error;
    }
}

  /**
   * Run a browser task with proper error handling
   * @param {Function} taskFn - Async function that takes a browser instance
   * @param {Object} browserOptions - Options for the browser
   */
  async runBrowserTask(taskFn, browserOptions = {}) {
    let browser = null;

    try {
      // Create browser
      browser = await this.createBrowser(browserOptions);

      // Run the task
      await taskFn(browser);

    } catch (error) {
      // Filter out expected errors during browser closing
      if (
          error.message.includes('Navigating frame was detached') ||
          error.message.includes('Protocol error') ||
          error.message.includes('Target closed') ||
          error.message.includes('disconnected')
      ) {
        console.log('Ignoring expected error during browser operation:', error.message);
      } else {
        console.error('Error during browser task:', error);
      }
    } finally {
      // Always try to close the browser
      if (browser) {
        try {
          await browser.close(true); // Force close
        } catch (closeError) {
          console.log('Error during browser close (ignored):', closeError.message);
        }
      }
    }
  }

  /**
   * Get a plugin instance
   * @param {string} name - Plugin name
   * @param {Object} options - Plugin options
   * @returns {Object} - Plugin instance
   */
  getPlugin(name, options = {}) {
    try {
      // Remove .js extension if present
      const pluginName = name.replace(/\.js$/i, '');

      // Handle different naming conventions
      let formattedName;

      if (pluginName.includes('-')) {
        // Convert kebab-case to CamelCase
        formattedName = pluginName
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('') + 'Plugin';
      } else {
        // Convert simple name to CamelCase
        formattedName = pluginName.charAt(0).toUpperCase() +
            pluginName.slice(1).toLowerCase() + 'Plugin';
      }

      console.log(`Loading plugin: ${formattedName}`);

      // Load the plugin module
      const PluginClass = require(`../plugins/${formattedName}`);

      // Create and return an instance
      return new PluginClass(options);
    } catch (error) {
      console.error(`Error loading plugin ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get an extractor instance
   * @param {string} name - Extractor name
   * @param {Object} options - Extractor options
   * @returns {Object} - Extractor instance
   */
  getExtractor(name, options = {}) {
    try {
      // Remove .js extension if present
      const extractorName = name.replace(/\.js$/i, '');

      // Load the extractor module
      const ExtractorClass = require(`../extractors/${extractorName}`);

      // Create and return an instance
      return new ExtractorClass(options);
    } catch (error) {
      console.error(`Error loading extractor ${name}:`, error);
      throw error;
    }
  }

  /**
   * Exit the application gracefully
   * @param {number} code - Exit code (default: 0)
   */
  exit(code = 0) {
    process.exitCode = code;

    // Exit after a brief delay to allow pending operations to complete
    setTimeout(() => {
      process.exit(code);
    }, 500);
  }
}

// Create and export a singleton instance
const app = new App();
module.exports = app;