const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for SCUK finance scraping
 * Handles init & quote responses, uses ScukCalculatorV1Finance extractor
 */
class ScukCalculatorV1Plugin extends CarFinancePlugin {
    constructor(options = {}) {
        super({
            blockAfterFind: true,
            stopAfterFind: true,
            closeAfterFind: false,
            ...options
        });

        this.options = {...this.options};

        // Collected results
        this.results = [];

        // Track eligible + processed product types
        this.eligibleProducts = new Set();
        this.processedProducts = new Set();

        // Extracted skin (lender)
        this.skin = null;

        // Track if init already handled
        this.initProcessed = false;

        // Raw POST body from init request
        this.initRequestBody = null;
    }

    /**
     * Match init URL
     */
    isInitUrl(url) {
        return url.includes('/api/v1/init');
    }

    /**
     * Match finance quote POST
     */
    isFinanceEndpoint(url) {
        return /\/api\/v1\/quote\//i.test(url);
    }

    /**
     * Match candidate endpoint (for fallback logging, etc)
     */
    isCandidateEndpoint(response) {
        return /scukcalculator/i.test(response.url());
    }

    /**
     * Capture init POST data early, during request stage
     */
    processRequest(request) {
        const url = request.url();
        if (this.isInitUrl(url) && !this.initRequestBody) {
            if (request.method() === 'OPTIONS') {
                app.info(this.name, `Skipping preflight request:${request.url()}`);
                return;
            }

            try {
                const postData = request.postData();
                app.info(this.name, 'Captured init request data:', postData, {url});
                this.initRequestBody = postData;
            } catch (e) {
                app.error(this.name, `Could not capture init postData: ${e.message}`, {url});
            }
        }
    }

    /**
     * Process response for init and finance quote endpoints
     */
    async processResponse(response) {
        const url = response.url();
        const method = response.request().method();
        const status = response.status();

        if (status === 301 && (url === this.getPageUrl())) {
            this.handleResultFound(`Status is 301, redirected to: ${response.headers().location}`);
        } else if (status > 399) {
            this.handleResultFound(`Status is ${status}, Unauthorized`);
        }

        if (method === 'POST') {
            if (this.isFinanceEndpoint(url)) {
                try {
                    const body = await response.text();
                    const productTypeMatch = url.match(/\/quote\/(\w+)/i);
                    const productType = productTypeMatch ? productTypeMatch[1].toUpperCase() : 'unknown';
                    const extractor = this.getExtractor('ScukCalculatorV1Finance', {lender: this.skin});
                    const extracted = extractor.process(body);

                    if (extracted) {
                        app.info(this.name, `Extracted finance data (${productType}) after waiting`);
                        this.results.push(extracted);
                        this.processedProducts.add(productType);

                        const allDone = Array.from(this.eligibleProducts).every(p =>
                            this.processedProducts.has(p)
                        );

                        if (allDone) {
                            this.handleResultFound(this.results, this.getPageUrl());
                        }
                    }
                } catch (e) {
                    app.error(this.name, `Error processing POST response after OPTIONS: ${e.message}`, {url});
                }
            }

            // Process /init response
            if (this.isInitUrl(url)) {
                if (this.initProcessed) return;
                this.initProcessed = true;

                try {
                    const body = await response.text();
                    app.info(this.name, 'Got Init response body');

                    const json = JSON.parse(body);
                    const data = json.data;

                    if (json.message === 'Vehicle price is required') {
                        this.handleResultFound('No price, maybe SOLD!', this.getPageUrl());
                    }

                    const extractor = this.getExtractor('ScukCalculatorV1Finance');
                    const {vehicle, lender, eligibleProducts} = extractor.init(this.initRequestBody, data);

                    if (vehicle) {
                        app.info(this.name, 'Extracted vehicle:', vehicle);
                        this.results.push(vehicle);
                    }

                    this.skin = lender;
                    for (const product of eligibleProducts) {
                        app.info(this.name, `Eligible product:${product}`);
                        this.eligibleProducts.add(product);
                    }
                    if (this.eligibleProducts.size === 0) {
                        this.handleResultFound(this.results, this.getPageUrl());
                    }

                } catch (e) {
                    app.error(this.name, `Error in init processing: ${e.message}`, {url});
                }
            }
        }

    }

    /**
     * Identify client presence on page
     */
    isClient(content) {
        return content.includes('ScukCalculator') ? 'scukcalculator' : null;
    }
}

module.exports = ScukCalculatorV1Plugin;
