const Scraper = require('./lib/Scraper');
const app = require('./lib/App');

// Define plugins configuration
const plugins = {
    'logger': {},
    'exit-test': {
        closeAfterFind: true
    }
};

// Define listeners configuration
const listeners = {
    ConsoleLog: {}
};

// Enable debug mode to see more detailed logs
app.setDebug(true);

// Register additional custom exit handlers
const originalExit = app.exit;
app.exit = function(code = 0) {
    console.log(`App.exit(${code}) called - stack trace:`);
    console.trace();
    
    // Call the original exit function
    originalExit.call(app, code);
    
    // Set a timeout as a fallback
    setTimeout(() => {
        console.log('Fallback exit timer triggered - forcing exit');
        process.exit(code);
    }, 1000);
};

// Create Scraper instance
const scraper = new Scraper(plugins, listeners, { debug: true });

// Get URL from command line or use a default
const url = process.argv[2] || 'https://www.google.com';

console.log(`Starting debug exit test with URL: ${url}`);

// Show active handles that might prevent exit
process.on('beforeExit', () => {
    console.log('Process beforeExit event triggered');
    
    // List active handles
    try {
        const activeHandles = process._getActiveHandles();
        console.log(`Active handles: ${activeHandles.length}`);
        activeHandles.forEach((handle, i) => {
            console.log(`Handle ${i}: ${handle.constructor.name}`);
        });
    } catch (e) {
        console.log('Could not get active handles:', e.message);
    }
    
    // List active requests
    try {
        const activeRequests = process._getActiveRequests();
        console.log(`Active requests: ${activeRequests.length}`);
        activeRequests.forEach((req, i) => {
            console.log(`Request ${i}: ${req.constructor.name}`);
        });
    } catch (e) {
        console.log('Could not get active requests:', e.message);
    }
});

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
            console.log('Force exit timeout triggered - application did not exit properly');
            
            // Debug what's keeping the process alive
            try {
                const handles = process._getActiveHandles();
                console.log(`Active handles preventing exit: ${handles.length}`);
                handles.forEach((h, i) => console.log(`  - Handle ${i}: ${h.constructor.name}`));
            } catch (e) {}
            
            // Force exit
            process.exit(0);
        }, 10000);
    })
    .catch(error => {
        console.error('Scraper failed:', error);
        process.exit(1);
    });