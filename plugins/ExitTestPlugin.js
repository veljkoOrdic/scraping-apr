const IPlugin = require('./IPlugin');
const app = require('../lib/App');

/**
 * Plugin for testing exit functionality
 * Exits after the first JavaScript resource is loaded
 * @extends IPlugin
 */
class ExitTestPlugin extends IPlugin {
    constructor(options = {}) {
        super({
            blockAfterFind: false,
            stopAfterFind: true,
            closeAfterFind: true, // We want to close the browser after finding our target
            ...options
        });

        this.jsResourceFound = false;
    }

    /**
     * Process a response to look for JavaScript resources
     * @param {puppeteer.HTTPResponse} response - The response to process
     * @returns {Promise<void>}
     */
    async processResponse(response) {
        if (this.resultFound) {
            return; // Already found what we need
        }

        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        // Check if this is a JavaScript resource
        if (contentType.includes('javascript') || url.endsWith('.js')) {
            this.jsResourceFound = true;

            app.info(this.name, `Found JavaScript resource: ${url}`, { pageUrl: this.getPageUrl() });

            // Pass the result to the handler which will trigger the exit
            this.handleResultFound({
                url: url,
                contentType: contentType,
                timestamp: new Date().toISOString()
            }, this.getPageUrl());

            // Add debug logging
            app.info(this.name, 'JavaScript resource found, exit process should start soon...', { pageUrl: this.getPageUrl() });
        }
    }
}

module.exports = ExitTestPlugin;