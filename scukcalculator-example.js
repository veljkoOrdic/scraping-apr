const Scraper = require('./lib/Scraper');

// Define plugins configuration
const plugins = {
    'logger': {},
    'scuk-calculator-v1': { closeAfterFind: true }
};

// Define listeners configuration with options
const listeners = {
    ConsoleLog: { },
    FileStorage: { filenameFormat: '{hash}.json'}
};

// Create Scraper instance
const scraper = new Scraper(plugins, listeners, {debug:true});

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);