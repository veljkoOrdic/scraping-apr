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
   * Handle when results are found
   * @param {Array|Object} result - The results that were found
   * @param {string} url - The URL where results were found
   */
  handleResultFound(result, url) {
    // Prevent multiple calls
    if (this.resultFound) {
      app.info(this.name, 'Results already handled, ignoring duplicate call', { url });
      return;
    }

    this.resultFound = true;

    if (!result || (Array.isArray(result) && result.length === 0)) {
      app.info(this.name, 'No results found, continuing', { url });
      return;
    }

    // Save results to file
    this.saveResult(result, this.metadata);

    // Only continue with browser closing if configured
    if (this.options.closeAfterFind) {
      app.info(this.name, 'Closing browser', { url });
      app.closeBrowser(this.name, url);
    }
  }

  /**
   * Save or publish a result (replacement for Writer.write)
   * @param {*} data - The data to save/publish
   * @param {object} metadata - The URL associated with the data
   */
  saveResult(data, metadata) {
    app.save(this.name, data, metadata);
  }

  /**
   * Handle no result found scenarios
   * @param {any[]} candidates - Potential candidates that were close matches
   */
  handleResultNotFound(candidates) {
    this.saveResultNotFound(candidates, this.metadata);
  }

  /**
   * Save or publish a "not found" result with candidates
   * @param {any[]} candidates - The candidates data to save/publish
   * @param {object} metadata - The URL associated with the data
   */
  saveResultNotFound(candidates, metadata) {
    let message = {type:'unknown'}
    if(Array.isArray(candidates) && candidates.length > 0){
      message={ type: 'candidates' , urls:candidates}
    }else{
      message={ type: 'not_found'}
    }
    app.save(this.name, message, metadata/*,'No match found, but found potential candidates', { url, candidates }*/);
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