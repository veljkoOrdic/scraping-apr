const Scraper = require('./lib/Scraper');

// Define plugins configuration - only load our ExitTestPlugin
const plugins = {
    'logger': {}, // Keep logger for debugging
    'exit-test': {
        closeAfterFind: true // Make sure this is set to true
    }
};

// Define storage configuration
const storage = {
    ConsoleStorage: { },
    FileStorage: { filenameFormat: '{hash}.json'}
};

// Create Scraper instance with debug enabled
const scraper = new Scraper(plugins, storage, { debug: true });

// Get URL from command line or use a default
const url = process.argv[2] || 'https://www.google.com';

console.log(`Starting ExitTest with URL: ${url}`);

// Add exit event listeners to help debug the exit process
process.on('exit', (code) => {
    console.log(`Process exit with code: ${code}`);
});

// Add extra handlers for signals that might be sent to the process
process.on('SIGINT', () => {
    console.log('Received SIGINT signal');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal');
    process.exit(0);
});

// Track the timer so we can clear it if needed
let exitTimer = null;

// Run the scraping
scraper.scrape(url)
    .then(() => {
        console.log('Scraper finished successfully');
        
        // Force exit as last resort if nothing else worked
        exitTimer = setTimeout(() => {
            console.log('Force exit after timeout - seems like the browser close or process.exit is not working');
            process.exit(0);
        }, 5000);
    })
    .catch(error => {
        console.error('Scraper failed:', error);
        process.exit(1);
    });