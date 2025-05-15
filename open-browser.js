const app = require('./lib/App');

(async () => {
    await app.createBrowser();
    console.log('Browser launched and waiting...');
    await app.browser.open("about:blank");
    // Keep process alive
    setInterval(() => {}, 1 << 30);
})();