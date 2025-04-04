const IPlugin = require('./IPlugin');
const Writer = require('../lib/Writer');

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
    if (response.url() === this.mainUrl && !this.initialResponseProcessed) {
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
            // Call the standardized result handler
            this.handleResultFound(`VRM found: ${extractResult.value}`, this.mainUrl);
          }

          this.initialResponseProcessed = true;
        }
      } catch (error) {
        console.error('Error processing response:', error);
      }
    }
  }
}

module.exports = VrmTestPlugin;