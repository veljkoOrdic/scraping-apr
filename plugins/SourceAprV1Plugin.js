const IPlugin = require('./IPlugin');
const Writer = require('../lib/Writer');

const app = require('../lib/App');

/**
 * Plugin for extracting finance data (like APR) from visible HTML content
 * @extends IPlugin
 */
class SourceAprV1Plugin extends IPlugin {
    constructor(options = {}) {
        super({
            blockAfterFind: true,    // Allow all requests
            stopAfterFind: true,      // Stop loading after finding data
            closeAfterFind: false,    // Don't auto-close browser
            ...options
        });

        this.options = {
            ...this.options
        };
    }

    /**
     * Process a Puppeteer page and extract finance data from visible HTML
     * @returns {Promise<void>}
     * @param response
     */
    async processResponse(response) {
        const url = response.url();

        try {
            const html = await response.text();

            const extractor = this.getExtractor('SourceAprV1');
            const results = extractor.process(html);

            if (results && results.length > 0) {
                this.handleResultFound(results, url);
            }
        } catch (error) {
            Writer.write(this.name, `Error processing page: ${error.message}`, url, Writer.RED);
        }

    }

}

module.exports = SourceAprV1Plugin;
