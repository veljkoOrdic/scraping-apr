const app = require('./lib/App');
const Writer = require('./lib/Writer');

/**
 * Example of using the VrmTestPlugin to detect VRM codes
 */
async function example() {
  // Get URL from command line argument or use a demo URL
  const url = process.argv[2] || 'https://example.com';

  Writer.write('Main', `Starting VRM test for: ${url}`, url, Writer.BLUE);

  // Run the browser task with proper error handling
  await app.runBrowserTask(async (browser) => {
    // Add the VRM test plugin
    browser.addPlugin(app.getPlugin('vrm-test', {
      // You can customize the regex pattern if needed
      regex: /vrm:"([\w\d]{6,7})"/i,
      blockAfterFind: true,
      stopAfterFind: true,
      closeAfterFind: true  // Auto-close browser when VRM is found
    }));

    // Add Codeweavers calculator plugin
    browser.addPlugin(app.getPlugin('codeweavers-calculator', {
      stopAfterFind: true,      // Stop loading page when finance data is found
      blockAfterFind: true,     // Block additional requests after finance data is found
      closeAfterFind: true     // Don't automatically close the browser
    }));

    // Add logger plugin (optional, for debugging)
    browser.addPlugin(app.getPlugin('logger', {
      logRequests: true,
      logResponses: true,
      logBase64Content: true,
      logDir: 'log'
    }));

    // Open the URL
    await browser.open(url);

    // Wait for a maximum of 10 seconds
    Writer.write('Main', `Waiting for up to 10 seconds...`, url);
    await new Promise(resolve => setTimeout(resolve, 10000));

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