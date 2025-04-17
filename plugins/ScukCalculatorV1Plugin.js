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

        // Track quote IDs we've seen (not used in new logic)
        // this.processedQuoteIds = new Set();

        // New tracking for multiple responses
        this.results = [];
        this.eligibleProducts = new Set();
        this.processedProducts = new Set();
        this.skin = null;
        this.initProcessed = false; // Track init response only once
    }

    /**
     * Check if a response is from a finance endpoint specific to Scuk
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is from a Scuk Calculator endpoint
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();
        return method === 'POST' && /\/api\/v1\/quote\//i.test(url);
    }

    /**
     * Check if a response is a potential pcp, ppb, cs endpoint candidate
     * @param {puppeteer.HTTPResponse} response - The response to check
     * @returns {boolean} - True if the response is a potential Scuk candidate
     */
    isCandidateEndpoint(response) {
        const url = response.url();
        return /scukcalculator/i.test(url);
    }

    /**
     * Process a response to extract vehicle and finance data
     * @param {puppeteer.HTTPResponse} response - The response to extract data from
     * @returns {Promise<void>}
     */
    async processResponse(response) {
        const url = response.url();

        // Handle init call to get vehicle and product eligibility info
        if (url.includes('/api/v1/init')) {
            if (this.initProcessed) return;
            this.initProcessed = true;
            try {
                const req = response.request();
                const reqPostData = req.postData();
                if (reqPostData) {
                    const parsed = JSON.parse(reqPostData);
                    console.log('Init request payload:', parsed);
                    if (parsed.vrm) {
                        this.results.push({ type: 'vehicle', data: { vrm: parsed.vrm } });
                    }
                }

                const body = await response.text();
                console.log('Init response body:', body);
                const json = JSON.parse(body);
                const data = json.data;
                this.skin = data.skin;

                for (const [key, val] of Object.entries(data.products)) {
                    if (val.eligible) this.eligibleProducts.add(key.toLowerCase());
                }
                console.log('Eligible products:', Array.from(this.eligibleProducts));
            } catch (e) {
                app.error(this.name, `Error in init processing: ${e.message}`, { url });
            }
            return;
        }

        // Handle finance quotes
        if (this.isFinanceEndpoint(response)) {
            const match = response.url().match(/\/quote\/(\w+)/);
            const productType = match ? match[1].toLowerCase() : null;
            if (!productType || this.processedProducts.has(productType)) return;

            try {
                const body = await response.text();
                console.log(`Finance response (${productType}):`, body);
                const json = JSON.parse(body);
                const quote = json.data?.quote;
                if (quote) {
                    this.results.push({
                        type: productType,
                        costprice: quote.costprice,
                        lender: this.skin || 'unknown'
                    });
                    this.processedProducts.add(productType);

                    // Early exit if all expected products are processed
                    const allDone = Array.from(this.eligibleProducts).every(p => this.processedProducts.has(p));
                    if (allDone) {
                        this.handleResultFound(this.results, this.getPageUrl());
                    }
                }
            } catch (e) {
                app.error(this.name, `Error in quote processing: ${e.message}`, { url });
            }
        }
    }

    /**
     * Set up navigation completion detection
     * @param {puppeteer.Page} page - Puppeteer page instance
     */
    setPage(page) {
        page.on('load', () => {
            // Give network requests a chance to finish
            setTimeout(() => {
                if (!this.resultFound) {
                    const eligible = Array.from(this.eligibleProducts);
                    const processed = Array.from(this.processedProducts);
                    const done = eligible.every(p => processed.includes(p));
                    if (done || eligible.length > 0) {
                        this.handleResultFound(this.results, this.getPageUrl());
                    }
                }
            }, 10000); // Wait 10 seconds after load to check
        });
    }

    /**
     * Check if the page content indicates a ScukCalculator client
     * @param {string} content - The page content to check
     * @returns {string|null} - Client identifier or null if not found
     */
    isClient(content) {
        if (content.includes('ScukCalculator')) return 'scukcalculator';
        return null;
    }
}

module.exports = ScukCalculatorV1Plugin;
