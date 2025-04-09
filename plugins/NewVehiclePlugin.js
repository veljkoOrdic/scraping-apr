const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting NewVehicle finance calculator data
 * @extends CarFinancePlugin
 */
class NewVehiclePlugin extends CarFinancePlugin {
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

        // Track quote IDs we've seen
        this.processedQuoteIds = new Set();
    }

    /**
     * Check if a response is from a finance endpoint specific to NewVehicle
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is from a NewVehicle finance endpoint
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();

        // Check for the POST quotes endpoint (primary)
        if (method === 'POST' && /https:\/\/newvehicle\.com\/quoteware\/quotes\//i.test(url)) {
            return true;
        }

        // Check for the GET individual quote endpoint (secondary)
        if (method === 'GET' && /https:\/\/newvehicle\.com\/quoteware\/v2\/quotes\/[a-f0-9-]+$/i.test(url)) {
            // Extract quote ID to avoid processing duplicates
            const match = url.match(/\/quotes\/([a-f0-9-]+)$/);
            if (match && match[1]) {
                const quoteId = match[1];

                // Skip if we've already processed this quote
                if (this.processedQuoteIds.has(quoteId)) {
                    return false;
                }

                // Mark as processed
                this.processedQuoteIds.add(quoteId);
                return true;
            }

            return true;
        }

        return false;
    }

    /**
     * Check if a response is a potential NewVehicle endpoint candidate
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is a potential NewVehicle candidate
     */
    isCandidateEndpoint(response) {
        const url = response.url();

        // NewVehicle specific candidate patterns
        const candidatePatterns = [
            /newvehicle\.com/i,
            /quoteware/i,
            /\/quotes\//i
        ];

        return candidatePatterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract finance details from a NewVehicle response
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

        // Use appropriate extractor based on the endpoint
        try {
            const url = response.url();
            const method = response.request().method();

            if (method === 'POST' && /https:\/\/newvehicle\.com\/quoteware\/quotes\//i.test(url)) {
                // Use Quoteware extractor for the detailed quotes endpoint
                const extractor = this.getExtractor('QuotewareV3Finance');
                return extractor.process(jsonData);
            } else if (method === 'GET' && /https:\/\/newvehicle\.com\/quoteware\/v2\/quotes\/[a-f0-9-]+$/i.test(url)) {
                // Use Quoteware extractor for the single quote endpoint
                const extractor = this.getExtractor('QuotewareV3Finance');
                return extractor.process(jsonData);
            }

            return [];
        } catch (error) {
            app.error(this.name, `Error in NewVehicle extractor: ${error.message}`, { url: response.url() });
            return [];
        }
    }

    /**
     * Check if the page content indicates a NewVehicle client
     * @param {string} content - The page content to check
     * @returns {string|null} - Client identifier or null if not found
     */
    isClient(content) {
        // Check for NewVehicle identifiers in the page content
        const identifiers = [
            'quoteware',
            'newvehicle',
            'quotewareV3'
        ];

        for (const identifier of identifiers) {
            if (content.includes(identifier)) {
                return 'newvehicle';
            }
        }

        return null;
    }
}

module.exports = NewVehiclePlugin;