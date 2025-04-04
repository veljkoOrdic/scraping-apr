/**
 * Interface for plugins to be used with MyPuppeteer
 * This is a base class that all plugins should extend
 */
class IPlugin {
  constructor(options = {}) {
    // Plugin initialization
    this.puppeteer = null;
    this.mainUrl = null;
    this.resultFound = false;
    this.pluginResult = null;

    // Standard behavior options
    this.options = {
      closeAfterFind: false,    // Close browser after finding result
      blockAfterFind: false,    // Block requests after finding result
      stopAfterFind: false,     // Stop page loading after finding result
      ...options
    };

    // Auto-generate name from class name if not provided
    if (options.name) {
      this.name = options.name;
    } else {
      // Get class name without the "Plugin" suffix and convert to snake_case
      let className = this.constructor.name;
      if (className.endsWith('Plugin')) {
        className = className.slice(0, -6); // Remove "Plugin" suffix
      }

      // Convert from CamelCase to snake_case
      this.name = className
          .replace(/([A-Z])/g, '_$1')     // Add underscore before each capital letter
          .replace(/^_/, '')              // Remove leading underscore if present
          .toLowerCase();                 // Convert to lowercase
    }
  }

  /**
   * Set the MyPuppeteer instance for this plugin
   * @param {Object} puppeteer - MyPuppeteer instance
   */
  setPuppeteer(puppeteer) {
    this.puppeteer = puppeteer;
  }

  /**
   * Set the main URL of the page being visited
   * @param {string} url - The main URL being navigated to
   * @returns {boolean} - True if the plugin should run for this URL, false otherwise
   */
  setMainUrl(url) {
    this.mainUrl = url;
    return true; // Default implementation: run for all URLs
  }

  /**
   * Determine if a request should be blocked
   * @param {puppeteer.HTTPRequest} request - The request to evaluate
   * @returns {boolean} - True if the request should be blocked, false otherwise
   */
  shallBlock(request) {
    // Default implementation: block based on resultFound and blockAfterFind
    if (this.resultFound && this.options.blockAfterFind) {
      // Don't block the initial request
      if (request.url() === this.mainUrl) {
        return false;
      }

      // Block all other requests
      return true;
    }

    // Default: don't block any requests
    return false;
  }

  /**
   * Determine if page loading should be considered finished
   * @returns {boolean} - True if loading should be considered complete
   */
  shallFinishLoading() {
    // Default implementation: finish based on resultFound and stopAfterFind
    return this.resultFound && this.options.stopAfterFind;
  }

  /**
   * Process a response from the page
   * @param {puppeteer.HTTPResponse} response - The response to process
   * @returns {Promise<void>}
   */
  async processResponse(response) {
    // Default implementation: do nothing
  }

  /**
   * Process responses that match a specific filter
   * @param {puppeteer.HTTPResponse} response - The filtered response to process
   * @returns {Promise<void>}
   */
  async filterResponses(response) {
    // Default implementation: same as processResponse
    await this.processResponse(response);
  }

  /**
   * Clean up resources when the browser is closed
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Default implementation: do nothing
  }

  /**
   * Handle a successful result find
   * @param {any} result - The result data
   * @param {string} url - The URL where result was found
   */
  handleResultFound(result, url) {
    this.resultFound = true;
    this.pluginResult = result;

    // Log the result
    const Writer = require('../lib/Writer');
    Writer.write(this.name, result, url, Writer.RED);

    // Stop loading and abort pending requests first if configured to close
    if (this.options.closeAfterFind && this.puppeteer && this.puppeteer.page) {
      try {
        // Stop any pending navigations
        this.puppeteer.page.evaluate(() => window.stop());
      } catch (error) {
        // Ignore errors in stopping page - we're closing anyway
      }
    }

    // Close the browser if configured to do so
    if (this.options.closeAfterFind && this.puppeteer) {
      // Use setTimeout to avoid blocking the current execution
      setTimeout(() => {
        try {
          Writer.write(this.name, `Closing browser due to result found`, url, Writer.YELLOW);

          // Signal process to exit gracefully after closing browser
          process.exitCode = 0;

          // Force close the browser to ensure it actually terminates
          this.puppeteer.close(true).catch(err => {
            Writer.write(this.name, `Error closing browser: ${err.message}`, url, Writer.RED);
            // Force exit after a brief delay if browser close failed
            setTimeout(() => process.exit(0), 500);
          });
        } catch (error) {
          Writer.write(this.name, `Error initiating browser close: ${error.message}`, url, Writer.RED);
          // Force exit after a brief delay if browser close failed
          setTimeout(() => process.exit(0), 500);
        }
      }, 100);
    }
  }

  /**
   * Get an extractor instance
   * @param {string} name - Name of the extractor (without .js extension)
   * @param {Object} options - Options to pass to the extractor
   * @returns {Object} - Extractor instance
   */
  getExtractor(name, options = {}) {
    try {
      // Remove .js extension if present
      const extractorName = name.replace(/\.js$/, '');

      // Load the extractor module
      const ExtractorClass = require(`../extractors/${extractorName}`);

      // Create and return an instance
      return new ExtractorClass(options);
    } catch (error) {
      console.error(`Error loading extractor ${name}:`, error);
      throw error;
    }
  }
}

module.exports = IPlugin;