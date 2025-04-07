const IPlugin = require('./IPlugin');

/**
 * Plugin for monitoring and extracting Codeweavers finance calculator data
 * @extends IPlugin
 */
class CodeweaversCalculatorPlugin extends IPlugin {
  constructor(options = {}) {
    super({
      blockAfterFind: true,   // Block requests by default
      stopAfterFind: true,    // Stop loading by default
      closeAfterFind: false,  // Don't auto-close browser by default
      ...options
    });

    this.options = {
      ...this.options
    };
  }

  /**
   * Process a response to look for finance calculation data
   * @param {puppeteer.HTTPResponse} response - The response to process
   * @returns {Promise<void>}
   */
  async processResponse(response) {
    const url = response.url();

    // Check if the URL matches the Codeweavers calculate endpoint pattern
    const isCodeweaversCalculate = /https:\/\/services\.codeweavers\.net\/public\/(v\d+\/)?JsonFinance\/Calculate/.test(url);

    if (isCodeweaversCalculate && response.request().method() === 'POST') {
      try {
        // Check content type
        const headers = response.headers();
        const contentType = headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          // Get response body
          const text = await response.text();

          // Parse the JSON
          let jsonData;
          try {
            jsonData = JSON.parse(text);
          } catch (error) {
            this.emit('error', `Failed to parse JSON: ${error.message}`, { url });
            return;
          }

          // Get extractor and process the JSON data
          const extractor = this.getExtractor('CodeweaversV3Finance');
          const results = extractor.process(jsonData);

          if (results && results.length > 0) {
            // Use the standardized result handler
            this.handleResultFound(results, this.mainUrl);
          }
        }
      } catch (error) {
        this.emit('error', `Error processing response: ${error.message}`, { url });
      }
    }
  }
}

module.exports = CodeweaversCalculatorPlugin;