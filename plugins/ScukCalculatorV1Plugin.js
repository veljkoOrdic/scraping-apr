const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting Scuk finance calculator data
 * @extends CarFinancePlugin
 */
class ScukCalculatorV1Plugin extends CarFinancePlugin {
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
     * Check if a response is from a finance endpoint specific to Scuk
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is from a Scuk Calculator endpoint
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();

        // Check for the POST quotes endpoint (primary)
        if (method === 'POST' && /https:\/\/www\.scukcalculator\.co\.uk\/api\/v1\/quote\//i.test(url)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a response is a potential pcp, ppb, cs endpoint candidate
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is a potential Scuk candidate
     */
    isCandidateEndpoint(response) {
        const url = response.url();

        // NewVehicle specific candidate patterns
        const candidatePatterns = [
            /pcp/i,
            /ppb/i,
            /cs/i
        ];

        console.log(url);
        console.log("URL::::");
        return;

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

            if (method === 'POST' && /https:\/\/scukcalculator\.co\.uk\/api\/v1\/quote\//i.test(url)) {
                const extractor = this.getExtractor('ScukCalculatorV1');
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
                return 'scukcalculator';
            }
        }

        return null;
    }
}

module.exports = ScukCalculatorV1Plugin;