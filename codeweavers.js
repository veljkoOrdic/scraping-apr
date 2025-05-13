const Scraper = require('./lib/Scraper');
const merge = require("lodash/merge");

let baseBlockerConfig = {};
let codeweaversConfig = {};

try {
    baseBlockerConfig = require('./config/request-blocker.js');
    console.log("Successfully loaded request-blocker config");
} catch (e) {
    console.error("Error loading request-blocker config:", e.message);
}

try {
    codeweaversConfig = require('./config/codeweavers.js');
    console.log("Successfully loaded codeweavers config");
} catch (e) {
    console.log("No codeweavers config found (this is optional)");
}
const mergedConfig = merge({}, baseBlockerConfig, codeweaversConfig);

// Define plugins configuration
const plugins = {
    'logger': {},
    'codeweavers-calculator': {closeAfterFind: true},
    'request-blocker': mergedConfig
};

// Define listeners configuration
const listeners = {
    ConsoleLog: {},
    FileStorage: {logDir: 'data/cw-again', filenameFormat: '{hash}.json'}
};

// Create Scraper instance
const scraper = new Scraper(plugins, listeners);

// Run the scraping
const url = process.argv[2];
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);