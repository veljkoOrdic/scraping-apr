/**
 * Example of using the VrmTestPlugin to detect VRM codes
 */
const Scraper = require('./lib/Scraper');

// Define plugins configuration
const plugins = {
  'logger': {
    logRequests: true,
    logResponses: true,
    logBase64Content: false,
    logDir: 'log'
  },
  'vrm-test': {
    regex: /vrm:"([\w\d]{6,7})"/i,
    stopAfterFind: true,
    blockAfterFind: true,
    closeAfterFind: true
  }
};

// Define storage configuration
const storage = ['ConsoleStorage', 'FileStorage'];

// Create Scraper instance
const scraper = new Scraper(plugins, storage);

// Run the scraping
const url = process.argv[2] || 'https://example.com';
const metadata = {};
if (process.argv[3]) metadata.dealer_id = process.argv[3];
if (process.argv[4]) metadata.car_id = process.argv[4];
scraper.scrape(url, metadata);