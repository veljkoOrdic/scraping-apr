const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting finance proposal data
 * @extends CarFinancePlugin
 */
class FinanceProposalPlugin extends CarFinancePlugin {
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

        // Track product types for completion
        this.eligibleProducts = new Set(['HP', 'PCP']);
        this.processedProducts = new Set();
        this.resultFound = false;
        this.vehicleExtracted = false;
    }

    /**
     * Set up page load handler
     * @param {Page} page - Puppeteer page
     */
    setPage(page) {
        super.setPage(page);
        page.on('load', () => {
            setTimeout(() => {
                if (!this.resultFound) {
                    const eligible = Array.from(this.eligibleProducts);
                    const processed = Array.from(this.processedProducts);
                    const done = eligible.every(p => processed.includes(p));
                    app.info(this.name, 'Finalizing after load', {
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
     * Check if a response is from a finance endpoint specific to FinanceProposal
     * @param response
     * @returns {boolean}
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();
        return method === 'GET' && /financeproposal.co.uk\/widget2\//i.test(url);
    }

    /**
     * Check if a response is a potential form submission endpoint
     * @param response
     * @returns {boolean}
     */
    isFormEndpoint(response) {
        const url = response.url();
        return /financeproposal.co.uk\/form\/link.php/i.test(url);
    }

    /**
     * Check if a response is a potential pcp, ppb, cs endpoint candidate
     * @param response
     * @returns {boolean}
     */
    isCandidateEndpoint(response) {
        const url = response.url();
        return /financeproposal/i.test(url);
    }

    /**
     * Process a response to extract vehicle and finance data
     * @param response
     * @returns {Promise<void>}
     */
    async processResponse(response) {
        const url = response.url();
        const extractor = this.extractor;

        // Handle API responses
        if (this.isFinanceEndpoint(response)) {
            const parsedUrl = new URL(url);
            const params = Object.fromEntries(parsedUrl.searchParams.entries());

            // Extract vehicle data from widget.js initialization
            if (url.includes('/widget.js') && !this.vehicleExtracted) {
                try {
                    if (params.vrm || params.cap_code) {
                        const vehicleData = extractor.processVehicle(params);
                        console.log('Vehicle data from widget.js:', vehicleData);
                        this.results.push(vehicleData);
                        this.vehicleExtracted = true;
                    }
                } catch (e) {
                    app.error(this.name, `Error in vehicle data extraction: ${e.message}`, {url});
                }
            }

            // Extract data from handler.php API responses
            if (url.includes('/handler.php')) {
                try {
                    const body = await response.text();
                    const jsonString = body.replace(/^jQuery\d+_\d+\(|\);?$/g, '');
                    const data = JSON.parse(jsonString);

                    // Extract vehicle data if not already done
                    if (!this.vehicleExtracted && params.cap_code) {
                        const vehicleData = extractor.processVehicle(params);
                        console.log('Vehicle data from handler.php:', vehicleData);
                        this.results.push(vehicleData);
                        this.vehicleExtracted = true;
                    }

                    // Process finance data
                    const financeData = extractor.processFinance(params, data);
                    console.log('Finance data:', financeData);
                    this.results.push(financeData);

                    // Track product type as processed
                    const productType = params.type === '1' ? 'HP' : 'PCP';
                    this.processedProducts.add(productType);

                    // If we receive a "unable to produce quote" message, remove from eligible products
                    if (data.error || !data.regular || data.regular === undefined) {
                        this.eligibleProducts.delete(productType);
                        app.info(this.name, `${productType} product not available, removing from eligible products`);
                    }

                    // Check if all eligible products have been processed
                    const allDone = Array.from(this.eligibleProducts).every(p =>
                        this.processedProducts.has(p)
                    );

                    if (allDone && this.eligibleProducts.size > 0) {
                        this.resultFound = true;
                        this.handleResultFound(this.results, this.getPageUrl());
                    }
                } catch (e) {
                    app.error(this.name, `Error in finance data extraction: ${e.message}`, {url});
                }
            }
        }

        // Handle form submissions
        if (this.isFormEndpoint(response)) {
            try {
                const parsedUrl = new URL(url);
                const params = Object.fromEntries(parsedUrl.searchParams.entries());

                // Extract vehicle data if not already done
                if (!this.vehicleExtracted && (params.vrm || params.cap)) {
                    const vehicleData = extractor.processVehicle(params);
                    console.log('Vehicle data from form submission:', vehicleData);
                    this.results.push(vehicleData);
                    this.vehicleExtracted = true;
                }

                // We can't extract finance data directly from form URL without the API response
                // But we could log the URL for debugging
                console.log('Form submission URL detected:', url);
            } catch (e) {
                app.error(this.name, `Error processing form submission: ${e.message}`, {url});
            }
        }
    }
}

module.exports = FinanceProposalPlugin;