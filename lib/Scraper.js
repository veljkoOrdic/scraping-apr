// lib/Scraper.js
const app = require('./App');
const fs = require("node:fs");

class Scraper {
    constructor(plugins, listeners = ['ConsoleLog'], options = {}) {
        this.plugins = plugins;
        this.storageInstances = [];
        app.setDebug(options.debug || false);

        Object.entries(listeners).forEach(([storageModule, config]) => {
            const StorageClass = require(`../listeners/${storageModule}`);
            this.storageInstances.push(new StorageClass(config));
        });
    }

    async scrape(url, metadata = {}) {
        const startTime = Date.now();

        try {
            app.info('Scraper', `Starting browser and navigating to ${url}`, {pageUrl: url});

            await app.runBrowserTask(async (browser) => {
                for (const [pluginName, pluginConfig] of Object.entries(this.plugins)) {
                    browser.addPlugin(app.getPlugin(pluginName, pluginConfig));
                }

                await browser.open(url, metadata);
                app.info('Scraper', `Waiting for finance calculator data...`, { pageUrl: url });

                // This line creates a delay of 30 seconds before proceeding
                await new Promise(resolve => setTimeout(resolve, 30000));
                await app.closeBrowser('Scraper', url, false); // closes page, not browser

                app.info('Scraper', `Browser task completed`, { pageUrl: url });
            }, {
                headless: false,
                stealthOptions: {
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                }
            });
        } finally {
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds
            app.info('Scraper', `Scraping finished in ${duration}`, { duration, pageUrl: url });

            // Give time for logs to be processed before any potential process exit
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

module.exports = Scraper;