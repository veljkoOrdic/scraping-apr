const IPlugin = require('./IPlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting car finance data from multiple providers
 * @extends IPlugin
 */
class CarFinancePlugin extends IPlugin {
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

        // Initialize tracking arrays
        this.candidates = [];
        this.clients = [];
        this.initialResponseProcessed = false;
    }

    /**
     * Set up navigation completion detection
     * @param {puppeteer.Page} page - Puppeteer page instance
     */
    setPage(page) {
       // super.setPage(page);

        // Listen for load event
        page.on('load', () => {
            // Give network requests a chance to finish
            setTimeout(() => {
                if (!this.resultFound ){
                    this.handleResultNotFound(this.candidates);
                }
            }, 10000); // Wait 10 seconds after load to check
        });
    }

    /**
     * Process a response to look for finance calculation data
     * @param {puppeteer.HTTPSResponse} response - The response to process
     * @returns {Promise<void>}
     */
    async processResponse(response) {
        if (this.isFinanceEndpoint(response)) {
            await this.processFinanceResponse(response);
        } else if (this.isCandidateEndpoint(response)) {
            // Store potential candidates
            const url = response.url();
            if (!this.candidates.includes(url)) {
                this.candidates.push(url);
                app.info(this.name, `Found potential candidate: ${url}`, { url: this.getPageUrl() });
            }
        } else if (response.url() === this.getPageUrl()) {
            if (!this.initialResponseProcessed) {
                try {
                    const text = await response.text();
                    const clientString = this.isClient(text);
                    if (clientString) {
                        this.clients.push(clientString);
                    }
                } catch (error) {
                    app.error(this.name, `Error processing main page: ${error.message}`, {url: response.url()});
                    if (error.message.includes('redirect')) {
                        this.handleResultFound(`Redirected !!! ${error.message}`, this.getPageUrl());
                    }
                }
                this.initialResponseProcessed = true;
            }
        }
    }

    async processFinanceResponse(response) {
        try {
            const results = await this.financeDetails(response);

            if (results && results.length > 0) {
                // Use the standardized result handler
                this.handleResultFound(results, this.getPageUrl());
            }
        } catch (error) {
            app.error(this.name, `Error processing response: ${error.message}`, { url: response.url() });
        }
    }
    /**
     * Extract finance details from a response
     * @param {puppeteer.HTTPResponse} response - The response to extract data from
     * @returns {Promise<Array>} - Array of finance details
     */
    async financeDetails(response) {
       return [];
    }

    /**
     * Check if a response is from a finance endpoint
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is from a finance endpoint
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();

        // Only process POST requests for most finance calculators
        if (method !== 'POST') {
            return false;
        }

        // Define patterns for finance endpoints
        const patterns = [];

        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Check if a response is a potential candidate (close match but not exact)
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is a potential candidate
     */
    isCandidateEndpoint(response) {
        const url = response.url();

        // Define patterns for potential candidates
        const patterns = [];

        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Check if the page content indicates a specific client
     * @param {string} content - The page content to check
     * @returns {string|null} - Client identifier or null if not found
     */
    isClient(content) {
        // This will be implemented by the user
        return null;
    }
}

module.exports = CarFinancePlugin;