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

        this.options = { ...this.options };

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
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();
        return method === 'POST' && /\/api\/v1\/quote\//i.test(url);
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
                console.log('[SCUK] Skipping preflight request:', request.url());
                return;
            }

            try {
                const postData = request.postData();
                console.log('[SCUK] Captured init request data:', postData, { url });
                this.initRequestBody = postData;
            } catch (e) {
                console.error(this.name, `Could not capture init postData: ${e.message}`, { url });
                app.error(this.name, `Could not capture init postData: ${e.message}`, { url });
            }
        }
    }

    /**
     * Process response for init and finance quote endpoints
     */
    async processResponse(response) {
        const url = response.url();

        // Process /init response
        if (this.isInitUrl(url)) {
            if (response.request().method() === 'OPTIONS') {
                console.log('[SCUK] Skipping preflight response:', response.url());
                return;
            }

            if (this.initProcessed) return;
            this.initProcessed = true;

            try {
                const body = await response.text();
                console.log('[SCUK] Init response body:', body);

                const json = JSON.parse(body);
                const data = json.data;

                const extractor = this.getExtractor('ScukCalculatorV1Finance');
                const { vehicle, lender, eligibleProducts } = extractor.init(this.initRequestBody, data);

                if (vehicle) {
                    console.log('[SCUK] Extracted vehicle:', vehicle);
                    this.results.push(vehicle);
                }

                this.skin = lender;
                for (const product of eligibleProducts) {
                    console.log('[SCUK] Eligible product:', product);
                    this.eligibleProducts.add(product);
                }
            } catch (e) {
                console.error(this.name, `Error in init processing: ${e.message}`, { url });
                app.error(this.name, `Error in init processing: ${e.message}`, { url });
            }

            return;
        }

        // Process /quote/{type} finance responses
        if (this.isFinanceEndpoint(response)) {
            const match = url.match(/\/quote\/(\w+)/);
            const productType = match ? match[1].toLowerCase() : null;
            if (!productType || this.processedProducts.has(productType)) return;

            try {
                const body = await response.text();
                console.log(`[SCUK] Quote response (${productType}):`);

                const json = JSON.parse(body);
                const extractor = this.getExtractor('ScukCalculatorV1Finance', { lender: this.skin });
                const extracted = extractor.process(json);

                if (extracted) {
                    console.log(`[SCUK] Extracted finance (${productType}):`, extracted);
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
                console.error(this.name, `Error in quote processing: ${e.message}`, { url });
                app.error(this.name, `Error in quote processing: ${e.message}`, { url });
            }
        }
    }

    /**
     * Wait 10s after load and finalize if all expected products are seen
     */
    setPage(page) {
        page.on('load', () => {
            setTimeout(() => {
                if (!this.resultFound) {
                    const eligible = Array.from(this.eligibleProducts);
                    const processed = Array.from(this.processedProducts);
                    const done = eligible.every(p => processed.includes(p));

                    console.log('[SCUK] Finalizing after load', {
                        eligible,
                        processed,
                        done
                    });

                    if (done || eligible.length > 0) {
                        this.handleResultFound(this.results, this.getPageUrl());
                    }
                }
            }, 10000);
        });
    }

    /**
     * Identify client presence on page
     */
    isClient(content) {
        return content.includes('ScukCalculator') ? 'scukcalculator' : null;
    }
}

module.exports = ScukCalculatorV1Plugin;
