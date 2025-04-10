// lib/Scraper.js
const app = require('./App');
const fs = require("node:fs");

class Scraper {
    constructor(plugins, storage = ['ConsoleStorage'], options = {}) {
        this.plugins = plugins;
        this.storage = storage;
        app.setDebug(options.debug || false);

        this.storage.forEach(storageModule => {
            require(`../storage/${storageModule}`);
        });
    }

    async scrape(url, metadata = {}) {

        let filePath = 'data/' + metadata.dealer_id + '-' + metadata.car_id + '.json';
        if (fs.existsSync(filePath)) {
            console.log('This file exist: ' + filePath);
            return;
        }

        app.info('Scraper', `Starting browser and navigating to ${url}`, {pageUrl: url});
        await app.runBrowserTask(async (browser) => {
            for (const [pluginName, pluginConfig] of Object.entries(this.plugins)) {
                browser.addPlugin(app.getPlugin(pluginName, pluginConfig));
            }

            await browser.open(url, metadata);

            app.info('Scraper', `Waiting for finance calculator data...`, { pageUrl: url });
            await new Promise(resolve => setTimeout(resolve, 30000));

            app.info('Scraper', `Browser task completed`, { pageUrl: url });
        }, {
            headless: false,
            stealthOptions: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
        });

        app.info('Scraper', `Scraping finished`, { pageUrl: url });
    }
}

module.exports = Scraper;