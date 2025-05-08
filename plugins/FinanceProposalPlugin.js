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
        this.extractor = this.getExtractor('FinanceProposalFinance');

        // Collected results
        this.results = [];
    }

    /**
     * Set up page load handler
     * @param {Page} page - Puppeteer page
     */
    setPage(page) {
        //super.setPage(page);
        page.on('load', () => {
            setTimeout(() => {
                if (!this.resultFound) {
                    if (this.results.length > 0) {
                        this.handleResultFound(this.results, this.getPageUrl());
                    }else{
                        this.handleResultNotFound(this.candidates);
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
        return method === 'GET' && url.includes('financeproposal.co.uk/widget2/handler.php');
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
    async processFinanceResponse(response) {
        const url = response.url();

        // Handle API responses
        const parsedUrl = new URL(url);
        const params = Object.fromEntries(parsedUrl.searchParams.entries());


        // Extract data from handler.php API responses
        try {
            // Extract vehicle data if not already done
            if (!this.vehicleExtracted && params.cap_code) {
                const vehicleData = this.extractor.processVehicle(params);
                this.results.push(vehicleData);
                this.vehicleExtracted = true;
            }

            const body = await response.text();
            const jsonString = body.replace(/^jQuery\d+_\d+\(|\);?$/g, '');
            const data = JSON.parse(jsonString);
            const productType = this.extractor.productType(params.type);

            // Process finance data if representative response
            if (params.rep) {
                const financeData = this.extractor.processFinance(params, data);
                this.results.push(financeData);

                // Track product type as processed
                this.processedProducts.add(productType);
            }
            // otherwise use response to manage expected types
            else {
                // If we receive an "unable to produce quote" message, remove from eligible products
                if (data.regular === undefined) {
                    this.eligibleProducts.delete(productType);
                    app.info(this.name, `${productType} product not available, removing from eligible products`);
                }
            }

            // Check if all eligible products have been processed
            const allDone = Array.from(this.eligibleProducts).every(p =>
                this.processedProducts.has(p)
            );

            if (allDone && this.eligibleProducts.size > 0) {
                console.error("HURRAY")
                this.handleResultFound(this.results, this.getPageUrl());
            }

        } catch (e) {
            app.error(this.name, `Error in finance data extraction: ${e.message}`, {url});
        }


    }
}

module.exports = FinanceProposalPlugin;