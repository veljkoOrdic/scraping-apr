/**
 * Application module providing global functionality and error handling
 */
// lib/App.js
const Event = require('./Event');
const eventEmitter = require('./EventEmitter');
const AppErrorHandler = require('./AppErrorHandler');

class App {
    constructor() {
        this.$debug = true;
        this.browser = null; // Store the current browser instance
        this._closingBrowser = false; // Flag to prevent multiple close calls
        this._startTime = Date.now(); // Track script start time
        this.errorHandler = new AppErrorHandler(this);
    }

    setDebug(debug) {
        this.$debug = debug;
    }

    setBrowser(browser) {
        this.browser = browser;
    }

    info(source, message, metadata = {}, options = {}) {
        if (this.$debug) {
            const event = new Event('info', source, message, metadata, options);
            eventEmitter.emit(event);
        }
    }

    error(source, message, metadata = {}, options = {}) {
        const event = new Event('error', source, message, metadata, options);
        eventEmitter.emit(event);
    }

    save(source, message, metadata = {}, options = {}) {
        const event = new Event('save', source, message, metadata, options);
        eventEmitter.emit(event);
    }

    /**
     * Close the browser and optionally exit the process
     * @param {string} source - Name of the plugin/component requesting close
     * @param {string} url - The URL where result was found
     * @param {boolean} exitAfter - Whether to exit the process after closing
     */
    closeBrowser(source, url, exitAfter = true) {
        // Prevent multiple close calls
        if (!this.browser || this._closingBrowser) {
            this.info(source, `Browser already being closed, ignoring duplicate request`, { url });
            return;
        }

        // Track start time if not already set
        if (!this._startTime) {
            this._startTime = Date.now();
        }

        // Set flag to prevent multiple close calls
        this._closingBrowser = true;

        this.info(source, `Closing browser`, { url });
        process.exitCode = 0;

        // Close browser
        this.browser.close(true).catch(error => {
            if (!this.errorHandler.isIgnorableError(error)) {
                this.errorHandler.logError(source, error, { url });
            }
        }).finally(() => {
            // Always null the browser reference
            this.browser = null;

            // Calculate and log duration synchronously before exit
            const duration = ((Date.now() - this._startTime) / 1000).toFixed(2);
            // Use console.log for guaranteed output before exit
           // console.log(`Total script duration: ${duration}s`);
            // Also log through regular channels
            this.info(source, `Total script duration: ${duration}s`, { duration, url });

            // Exit if requested
            if (exitAfter) {
                // Small delay to allow logs to process
                setTimeout(() => {
                    this.info(source, 'Forcing process exit', { url });
                    process.exit(0);
                }, 1000);
            }
        });
    }

    /**
     * Create a new browser instance
     * @param {Object} options - Browser options
     * @returns {Promise<Object>} - Browser instance
     */
    async createBrowser(options = {}) {
        try {
            const MyPuppeteer = require('./MyPuppeteer');
            const browser = new MyPuppeteer(options);
            this.setBrowser(browser);
            return browser;
        } catch (error) {
            this.errorHandler.logError('App', error, { context: 'creating browser' });
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
        const startTime = Date.now();
        const taskId = Math.random().toString(36).substring(2, 10); // Generate task ID

        try {
            // Create browser
            browser = await this.createBrowser(browserOptions);
            this.info('BrowserTask', `Task ${taskId} started`, { startTime });

            // Run the task
            await taskFn(browser);

        } catch (error) {
            // Filter out expected errors during browser closing
            if (this.errorHandler.isIgnorableError(error)) {
                this.errorHandler.handleIgnorableError('App', error, 'operation');
            } else {
                this.errorHandler.logError('BrowserTask', error);
            }
        } finally {
            // Always try to close the browser
            if (browser) {
                try {
                    await browser.close(true); // Force close
                } catch (closeError) {
                    this.errorHandler.handleIgnorableError('App', closeError, 'close');
                }
            }

            // Log task completion with duration
            const duration = ((Date.now() - startTime) / 1000).toFixed(2); // seconds with 2 decimal places
            this.info('BrowserTask', `Task ${taskId} completed`, { duration });

            // Small delay to ensure log is processed
            await new Promise(resolve => setTimeout(resolve, 100));
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
            this.errorHandler.logError('App', error, { context: `loading plugin ${name}` });
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
            this.errorHandler.logError('App', error, { context: `loading extractor ${name}` });
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