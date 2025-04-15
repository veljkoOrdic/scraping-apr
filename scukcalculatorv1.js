const Scraper = require('./lib/Scraper');

// Define plugins configuration
const plugins = {
    'logger': {},
    'scuk-calculator-v1': { closeAfterFind: true }
};

// Define storage configuration with options
const storage = {
    ConsoleStorage: { },
    FileStorage: { logDir:'data/sc', filenameFormat: '{hash}.json'}
};

// Create Scraper instance
const scraper = new Scraper(plugins, storage);

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);