const Scraper = require('./lib/Scraper');
const config = require('config');
const merge = require('lodash/merge');
// Load configs directly
let baseBlockerConfig = {};
let scukConfig = {};

try {
    baseBlockerConfig = require('./config/request-blocker.js');
    console.log("Successfully loaded request-blocker config");
} catch (e) {
    console.error("Error loading request-blocker config:", e.message);
}

try {
    scukConfig = require('./config/scuk-calculator.js');
    console.log("Successfully loaded scuk-calculator config");
} catch (e) {
    console.log("No scuk-calculator config found (this is optional)");
}
// Merge configs, with SCUK overriding base settings
const mergedConfig = merge({}, baseBlockerConfig, scukConfig);
//console.log(mergedConfig);process.exit(0);
// Define plugins configuration
const plugins = {
    'logger': {},
    'scuk-calculator-v1': {closeAfterFind: true},
    'request-blocker': mergedConfig
};

// Define listeners configuration with options
const listeners = {
    ConsoleLog: {},
    FileStorage: {filenameFormat: '{hash}.json'}
};

// Create Scraper instance
const scraper = new Scraper(plugins, listeners, {debug: true});

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);