const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting ClickDealer finance data
 * @extends CarFinancePlugin
 */
class ClickDealerPlugin extends CarFinancePlugin {
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

        this.settingsData = null;
        this.quoteData = null;
        this.resultFound = false;

        // Collected results
        this.results = [];
    }

    /**
     * Set up page load handler
     * @param {Page} page - Puppeteer page
     */
    setPage(page) {
        super.setPage(page);
        page.on('load', () => {
            setTimeout(() => {
                if (!this.resultFound && this.settingsData && this.quoteData) {
                    this.resultFound = true;
                    this.handleResultFound(this.results, this.getPageUrl());
                }
            }, 10000);
        });
    }

    /**
     * Check if a response is from a finance endpoint specific to ClickDealer
     * @param {Object} response - Puppeteer response object
     * @returns {boolean}
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();

        if (method !== 'GET') return false;

        return (
            url.includes('/api/finance-calculator/settings') ||
            url.includes('/api/finance-calculator/quote')
        );
    }

    /**
     * Process a response to extract vehicle and finance data
     * @param {Object} response - Puppeteer response object
     * @returns {Promise<void>}
     */
    async processFinanceResponse(response) {
        const url = response.url();
        const parsedUrl = new URL(url);
        const params = Object.fromEntries(parsedUrl.searchParams.entries());
        const extractor = this.getExtractor('ClickDealerExtractor');

        try {
            const text = await response.text();
            const data = JSON.parse(text);

            // Settings endpoint contains vehicle data
            if (url.includes('/api/finance-calculator/settings')) {
                this.settingsData = data;

                if (data.status === 200 && data.data && data.data.vehicle) {
                    const vehicleData = extractor.processVehicle(data.data);
                    app.info(this.name, 'Extracted vehicle data', vehicleData);
                    this.results.push(vehicleData);
                }
            }

            // Quote endpoint contains finance data
            else if (url.includes('/api/finance-calculator/quote')) {
                this.quoteData = data;

                if (data.status === 200 && data.data) {
                    const financeResults = extractor.processFinance(params, data.data);
                    if (financeResults && Array.isArray(financeResults)) {
                        app.info(this.name, `Extracted ${financeResults.length} finance options`, financeResults);
                        financeResults.forEach(financeData => {
                            // Add provider info from meta data if available
                            if (data.meta && data.meta.provider) {
                                financeData.lender = data.meta.provider;
                            }
                            this.results.push(financeData);
                        });
                    }
                }
            }

            // Check if we have both settings and quote data to complete
            if (this.settingsData && this.quoteData && !this.resultFound) {
                this.handleResultFound(this.results, this.getPageUrl());
            }
        } catch (e) {
            app.error(this.name, `Error processing response: ${e.message}`, {url});
        }
    }
}

module.exports = ClickDealerPlugin;