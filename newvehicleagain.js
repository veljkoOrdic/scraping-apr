const Scraper = require('./lib/Scraper');
const merge = require("lodash/merge");

let baseBlockerConfig = {};

try {
    baseBlockerConfig = require('./config/request-blocker.js');
    console.log("Successfully loaded request-blocker config");
} catch (e) {
    console.error("Error loading request-blocker config:", e.message);
}

// Define plugins configuration
const plugins = {
    'logger': {},
    'new-vehicle-finance': {closeAfterFind: true},
    'request-blocker': baseBlockerConfig
};

// Define listeners configuration with options
const listeners = {
    ConsoleLog: {},
    FileStorage: {logDir: 'data/nw-again', filenameFormat: '{hash}.json'}
};

// Create Scraper instance
const scraper = new Scraper(plugins, listeners);

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);