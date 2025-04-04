const app = require('./lib/App');
const Writer = require('./lib/Writer');

/**
 * Example using the CodeweaversCalculatorPlugin
 */
async function example() {
  // Get URL from command line argument or use default
  const url = process.argv[2] || 'https://example.com';

  Writer.write('Main', `Starting browser and navigating to ${url}`, url, Writer.BLUE);

  // Run the browser task with proper error handling
  await app.runBrowserTask(async (browser) => {
    // Add logger plugin
    browser.addPlugin(app.getPlugin('logger', {
      logRequests: true,
      logResponses: true,
      logBase64Content: false,
      logDir: 'log'
    }));

    // Add Codeweavers calculator plugin
    browser.addPlugin(app.getPlugin('codeweavers-calculator', {
      stopAfterFind: true,      // Stop loading page when finance data is found
      blockAfterFind: true,     // Block additional requests after finance data is found
      closeAfterFind: true     // Don't automatically close the browser
    }));

    // Open URL
    await browser.open(url);

    // Wait for content to load and be processed
    Writer.write('Main', `Waiting for finance calculator data...`, url);
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait longer for finance data

    Writer.write('Main', `Browser task completed`, url, Writer.GREEN);
  }, {
    headless: false,
    stealthOptions: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });

  Writer.write('Main', `Example finished`, url, Writer.GREEN);
}

// Run the example
example();