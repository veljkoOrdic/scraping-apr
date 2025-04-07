/**
 * Interface for plugins to be used with MyPuppeteer
 * This is a base class that all plugins should extend
 */
// plugins/IPlugin.js
const app = require('../lib/App');

class IPlugin {
  constructor(options = {}) {
    this.puppeteer = null;
    this.resultFound = false;
    this.pluginResult = null;
    this.metadata = {};

    this.options = {
      closeAfterFind: false,
      blockAfterFind: false,
      stopAfterFind: false,
      ...options
    };

    if (options.name) {
      this.name = options.name;
    } else {
      let className = this.constructor.name;
      if (className.endsWith('Plugin')) {
        className = className.slice(0, -6);
      }
      this.name = className
          .replace(/([A-Z])/g, '_$1')
          .replace(/^_/, '')
          .toLowerCase();
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
  setPageUrl(url) {
    this.addMetadata('pageUrl', url);
    return true; // Default implementation: run for all URLs
  }

  /**
   * Get the main URL of the page being visited
   * @returns {string} - The main URL
   */
  getPageUrl() {
    return this.metadata.pageUrl;
  }

  /**
   * Set metadata
   * @param {Object} metadata - The metadata object to set
   */
  setMetadata(metadata) {
    this.metadata = metadata;
  }

  /**
   * Add a metadata entry
   * @param {string} key - The key for the metadata entry
   * @param {*} value - The value for the metadata entry
   */
  addMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Clear all metadata
   */
  clearMetadata() {
    this.metadata = {};
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
      if (request.url() === this.getPageUrl()) {
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

    this.saveResult(result, this.metadata);

    if (this.options.closeAfterFind && this.puppeteer && this.puppeteer.page) {
      try {
        this.puppeteer.page.evaluate(() => window.stop());
      } catch (error) {}

      if (this.options.closeAfterFind && this.puppeteer) {
        setTimeout(() => {
          try {
            app.info(this.name, `Closing browser due to result found`, { url });

            process.exitCode = 0;

            this.puppeteer.close(true).catch(err => {
              app.error(this.name, `Error closing browser: ${err.message}`, { url });
              setTimeout(() => process.exit(0), 500);
            });
          } catch (error) {
            app.error(this.name, `Error initiating browser close: ${error.message}`, { url });
            setTimeout(() => process.exit(0), 500);
          }
        }, 100);
      }
    }
  }
  /**
   * Save or publish a result (replacement for Writer.write)
   * @param {*} data - The data to save/publish
   * @param {string} url - The URL associated with the data
   * @param {string} color - Optional color for console output
   */
  saveResult(data, metadata, color = null) {
    app.log(this.name, data, metadata);
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