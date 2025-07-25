const Scraper = require('./lib/Scraper');

// Define plugins configuration
const plugins = {
    'logger': {
        logRequests: true,
        logResponses: true,
        logBase64Content: false
    },
    'source-apr-v1': {
        stopAfterFind: true,
        blockAfterFind: true,
        closeAfterFind: true
    }
};

// Define listeners configuration
const listeners = ['ConsoleLog', 'FileStorage'];

// Create Scraper instance
const scraper = new Scraper(plugins, listeners);

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);