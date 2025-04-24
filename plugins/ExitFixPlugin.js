const IPlugin = require('./IPlugin');
const app = require('../lib/App');

/**
 * Plugin for testing different exit strategies
 * Exits after the first JavaScript resource is loaded
 */
class ExitFixPlugin extends IPlugin {
    constructor(options = {}) {
        super({
            blockAfterFind: false,
            stopAfterFind: true,
            closeAfterFind: true,
            exitStrategy: 'standard', // 'standard', 'force', 'disconnect', 'process'
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

            // Different exit strategies
            switch (this.options.exitStrategy) {
                case 'force':
                    // Force close the browser immediately
                    if (this.puppeteer && this.puppeteer.browser) {
                        const browser = this.puppeteer.browser;
                        app.info(this.name, 'Using force exit strategy', { pageUrl: this.getPageUrl() });

                        try {
                            const browserProcess = browser.process();
                            if (browserProcess) {
                                app.info(this.name, 'Killing browser process', { pageUrl: this.getPageUrl() });
                                browserProcess.kill('SIGKILL');
                            }

                            setTimeout(() => process.exit(0), 500);
                        } catch (error) {
                            app.error(this.name, `Error in force exit: ${error.message}`, { pageUrl: this.getPageUrl() });
                            process.exit(1);
                        }
                    }
                    break;

                case 'disconnect':
                    // Disconnect from browser first, then close
                    if (this.puppeteer && this.puppeteer.browser) {
                        app.info(this.name, 'Using disconnect exit strategy', { pageUrl: this.getPageUrl() });

                        try {
                            await this.puppeteer.browser.disconnect();
                            app.info(this.name, 'Browser disconnected', { pageUrl: this.getPageUrl() });
                            setTimeout(() => process.exit(0), 500);
                        } catch (error) {
                            app.error(this.name, `Error in disconnect exit: ${error.message}`, { pageUrl: this.getPageUrl() });
                            process.exit(1);
                        }
                    }
                    break;

                case 'process':
                    // Skip browser close and just exit the process
                    app.info(this.name, 'Using process exit strategy', { pageUrl: this.getPageUrl() });
                    setTimeout(() => process.exit(0), 500);
                    break;

                case 'standard':
                default:
                    // Use the standard handleResultFound method
                    app.info(this.name, 'Using standard exit strategy', { pageUrl: this.getPageUrl() });
                    this.handleResultFound({
                        url: url,
                        contentType: contentType,
                        timestamp: new Date().toISOString()
                    }, this.getPageUrl());
                    break;
            }
        }
    }
}

module.exports = ExitFixPlugin;