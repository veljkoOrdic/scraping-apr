const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting Codeweavers finance calculator data
 * @extends CarFinancePlugin
 */
class CodeweaversCalculatorPlugin extends CarFinancePlugin {
  constructor(options = {}) {
    super({
      blockAfterFind: true,
      stopAfterFind: true,
      closeAfterFind: false,
      ...options
    });

    this.options = {
      ...this.options
    };
  }

  /**
   * Check if a response is from a finance endpoint specific to Codeweavers
   * @param {puppeteer.HTTPResponse} response - The response to check
   * @returns {boolean} - True if the response is from a Codeweavers finance endpoint
   */
  isFinanceEndpoint(response) {
    const url = response.url();
    const method = response.request().method();

    // Codeweavers typically uses POST for finance calculations
    if (method !== 'POST') {
      return false;
    }

    // Only check the main Codeweavers calculate endpoint
    return /https:\/\/services\.codeweavers\.net\/public\/(v\d+\/)?JsonFinance\/Calculate/i.test(url);
  }

  /**
   * Check if a response is a potential Codeweavers endpoint candidate
   * @param {puppeteer.HTTPResponse} response - The response to check
   * @returns {boolean} - True if the response is a potential Codeweavers candidate
   */
  isCandidateEndpoint(response) {
    const url = response.url();

    // Codeweavers specific candidate patterns
    const candidatePatterns = [
      /codeweavers\.net/i,
      /codeweavers\.co\.uk/i,
      /services\.codeweavers/i,
      /api\.codeweavers/i
    ];

    return candidatePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract finance details from a Codeweavers response
   * @param {puppeteer.HTTPResponse} response - The response to extract data from
   * @returns {Promise<Array>} - Array of finance details
   */
  async financeDetails(response) {
    // Check content type
    const headers = response.headers();
    const contentType = headers['content-type'] || '';

    if (!contentType.includes('application/json')) {
      return [];
    }

    // Get response body
    const text = await response.text();

    // Parse the JSON
    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch (error) {
      app.error(this.name, `Failed to parse JSON: ${error.message}`, { url: response.url() });
      return [];
    }

    // Use Codeweavers extractor
    try {
      const extractor = this.getExtractor('CodeweaversV3Finance');
      return extractor.process(jsonData);
    } catch (error) {
      app.error(this.name, `Error in CodeweaversV3Finance extractor: ${error.message}`, { url: response.url() });
      return [];
    }
  }

  /**
   * Check if the page content indicates a Codeweavers client
   * @param {string} content - The page content to check
   * @returns {string|null} - Client identifier or null if not found
   */
  isClient(content) {
    // Only check for "codeweavers" string in the content
    if (content.includes('codeweavers') || content.includes('codeweavers.main') || content.includes('loadCodeWeaversPlugin')) {
      return 'codeweavers';
    }
    return null;
  }
}

module.exports = CodeweaversCalculatorPlugin;