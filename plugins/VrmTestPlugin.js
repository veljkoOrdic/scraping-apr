const IPlugin = require('./IPlugin');
const app = require('../lib/App');

/**
 * Plugin for detecting VRM codes in page responses
 * @extends IPlugin
 */
class VrmTestPlugin extends IPlugin {
  constructor(options = {}) {
    super({
      blockAfterFind: true,   // Block requests by default
      stopAfterFind: true,    // Stop loading by default
      closeAfterFind: false,  // Don't auto-close browser by default
      ...options
    });

    this.options = {
      regex: /vrm:"([\w\d]{6,7})"/i,
      ...this.options
    };

    this.initialResponseProcessed = false;
  }

  /**
   * Process a response to look for VRM codes
   * @param {puppeteer.HTTPResponse} response - The response to process
   * @returns {Promise<void>}
   */
  async processResponse(response) {
    // Only process the initial page response if it hasn't been processed yet
    if (response.url() === this.getPageUrl() && !this.initialResponseProcessed) {
      try {
        // Get response content type
        const headers = response.headers();
        const contentType = headers['content-type'] || '';

        // Only process HTML or text responses
        if (contentType.includes('text/html') ||
            contentType.includes('text/plain') ||
            contentType.includes('application/json')) {

          // Get response body
          const text = await response.text();

          // Get extractor and process the text
          const extractor = this.getExtractor('VrmExtract', {
            regex: this.options.regex
          });

          const extractResult = extractor.process(text);

          if (extractResult) {
            app.info(this.name, `VRM found: ${extractResult.value}`, { url: this.getPageUrl() });

            // Call the standardized result handler
            this.handleResultFound(extractResult, this.getPageUrl());
          }

          this.initialResponseProcessed = true;
        }
      } catch (error) {
        app.error(this.name, `Error processing response: ${error.message}`, { url: response.url() });
      }
    }
  }
}

module.exports = VrmTestPlugin;