const Scraper = require('./lib/Scraper');
const app = require('./lib/App');

// Get strategy from command line or default to 'force'
const exitStrategy = process.argv[3] || 'force';

// Define plugins configuration
const plugins = {
    'logger': {},
    'exit-fix': {
        closeAfterFind: true,
        exitStrategy: exitStrategy // Try different strategies
    }
};

// Define listeners configuration
const listeners = {
    ConsoleLog: {}
};

// Enable debug mode
app.setDebug(true);

// Create Scraper instance
const scraper = new Scraper(plugins, listeners, { debug: true });

// Get URL from command line or use a default
const url = process.argv[2] || 'https://www.google.com';

console.log(`Starting exit-fix test with URL: ${url} and strategy: ${exitStrategy}`);

// Patch Scraper's 30 second timeout
const originalScrape = Scraper.prototype.scrape;
Scraper.prototype.scrape = async function(url, metadata = {}) {
    app.info('Scraper', `Starting browser and navigating to ${url}`, {pageUrl: url});
    await app.runBrowserTask(async (browser) => {
        for (const [pluginName, pluginConfig] of Object.entries(this.plugins)) {
            browser.addPlugin(app.getPlugin(pluginName, pluginConfig));
        }

        await browser.open(url, metadata);

        app.info('Scraper', `Waiting for plugin to trigger exit...`, { pageUrl: url });
        
        // Reduced timeout from 30s to 5s
        await new Promise(resolve => setTimeout(resolve, 5000));

        app.info('Scraper', `Browser task completed`, { pageUrl: url });
    }, {
        headless: false, // Set to true for faster testing
        stealthOptions: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
    });

    app.info('Scraper', `Scraping finished`, { pageUrl: url });
};

// Standard exit handler
process.on('exit', (code) => {
    console.log(`Process exit with code: ${code}`);
});

// Run the scraping
scraper.scrape(url)
    .then(() => {
        console.log('Scraper promise resolved successfully');
        
        // Force exit after a timeout if nothing else worked
        setTimeout(() => {
            console.log('Final force exit - application failed to exit properly after 10 seconds');
            process.exit(0);
        }, 10000);
    })
    .catch(error => {
        console.error('Scraper failed:', error);
        process.exit(1);
    });