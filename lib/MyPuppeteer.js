const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const proxyChain = require('proxy-chain');

/**
 * Custom Puppeteer wrapper with plugin support
 */
class MyPuppeteer {
  constructor(options = {}) {
    this.options = {
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...options
    };
    this.plugins = [];
    this.browser = null;
    this.page = null;
    this.isOpen = false;
    this.proxyServer = null;
    this.pageUrl = null;

    // Initialize StealthPlugin with customizations
    this.initStealth(options.stealthOptions || {});

    // Add adblocker if requested
    if (options.useAdBlocker) {
      puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
    }
  }

  /**
   * Initialize the StealthPlugin with custom options
   * @param {Object} stealthOptions - Options for the StealthPlugin
   */
  initStealth(stealthOptions = {}) {
    // Stealth plugin is disabled completely if useStealthMode is false
    if (stealthOptions.useStealthMode === false) {
      return;
    }

    // Create new stealth plugin instance
    const stealth = StealthPlugin();

    // Disable specific evasions if requested
    if (stealthOptions.disabledEvasions && Array.isArray(stealthOptions.disabledEvasions)) {
      stealthOptions.disabledEvasions.forEach(evasion => {
        try {
          stealth.enabledEvasions.delete(evasion);
          console.log(`Disabled stealth evasion: ${evasion}`);
        } catch (error) {
          console.warn(`Could not disable evasion ${evasion}: ${error.message}`);
        }
      });
    }

    // Configure user agent if specified
    if (stealthOptions.userAgent) {
      // Override user agent using puppeteer's native options instead
      this.options.userAgent = stealthOptions.userAgent;
    }

    // Apply the configured stealth plugin
    puppeteer.use(stealth);

    console.log('Stealth mode initialized');
  }

  /**
   * Add a plugin to the browser
   * @param {Object} plugin - Plugin that implements the IPlugin interface
   * @returns {MyPuppeteer} - Returns this for chaining
   */
  addPlugin(plugin) {
    this.plugins.push(plugin);

    // If the plugin has a setPuppeteer method, call it
    if (typeof plugin.setPuppeteer === 'function') {
      plugin.setPuppeteer(this);
    }

    return this;
  }

  /**
   * Set up a proxy for the browser
   * @param {string} proxyUrl - Proxy URL (e.g., 'http://user:pass@proxy.example.com:8080')
   * @param {string} anonymizedProxyUrl - Pre-anonymized proxy URL (optional)
   * @returns {void}
   */
  setProxy(proxyUrl, anonymizedProxyUrl) {
    if (!proxyUrl && !anonymizedProxyUrl) return;

    // Store the proxy server URL if provided
    if (anonymizedProxyUrl) {
      this.proxyServer = anonymizedProxyUrl;
    }

    // Add proxy server to browser arguments
    this.options.args = this.options.args || [];

    // Remove any existing proxy settings
    this.options.args = this.options.args.filter(arg => !arg.startsWith('--proxy-server='));

    // Add the new proxy setting
    this.options.args.push(`--proxy-server=${anonymizedProxyUrl || proxyUrl}`);

    console.log(`Proxy configured: ${anonymizedProxyUrl || proxyUrl}`);
  }

  /**
   * Open browser and navigate to URL
   * @param {string} url - URL to navigate to
   * @param metadata
   * @returns {Promise<void>}
   */
  async open(url, metadata = {}) {
    try {
      // Store the main URL
      this.pageUrl = url;

      // Notify all plugins about the main URL and check if they should run
      const activePlugins = [];
      for (const plugin of this.plugins) {
        if ( typeof plugin.setMetadata === 'function') {
          plugin.setMetadata(metadata);
        }
        if (typeof plugin.setPageUrl === 'function') {
          const shouldRun = plugin.setPageUrl(url);
          if (shouldRun) {
            activePlugins.push(plugin);
          }
        } else {
          activePlugins.push(plugin);
        }
      }

      // Update the plugins list to only include active plugins
      this.plugins = activePlugins;

      // Launch browser if not already launched
      if (!this.browser) {
        this.browser = await puppeteer.launch(this.options);
      }

      // Create new page
      this.page = await this.browser.newPage();

      for (const plugin of this.plugins) {
        if ( typeof plugin.setPage === 'function') {
          plugin.setPage(this.page);
        }
      }


      // Apply manual configurations that can't be set through the stealth plugin

      // Set user agent if specified in options
      if (this.options.userAgent) {
        await this.page.setUserAgent(this.options.userAgent);
      }

      // Apply other custom settings from stealth options if available
      if (this.options.stealthOptions) {
        // Set languages if specified
        if (this.options.stealthOptions.languages && Array.isArray(this.options.stealthOptions.languages)) {
          await this.page.setExtraHTTPHeaders({
            'Accept-Language': this.options.stealthOptions.languages.join(',')
          });
        }

        // Apply WebGL vendor and renderer if specified
        if (this.options.stealthOptions.webglVendor || this.options.stealthOptions.webglRenderer) {
          await this.page.evaluateOnNewDocument((options) => {
            const getParameterProxied = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
              // UNMASKED_VENDOR_WEBGL
              if (parameter === 37445 && options.webglVendor) {
                return options.webglVendor;
              }
              // UNMASKED_RENDERER_WEBGL
              if (parameter === 37446 && options.webglRenderer) {
                return options.webglRenderer;
              }
              return getParameterProxied.call(this, parameter);
            };
          }, {
            webglVendor: this.options.stealthOptions.webglVendor,
            webglRenderer: this.options.stealthOptions.webglRenderer
          });
        }
      }

      // Set up request interception
      await this.page.setRequestInterception(true);

      // Handle requests with plugins
      this.page.on('request', async request => {
        let shouldBlock = false;
        let blockingPlugin = null;

        // Activate handlers and Check with each plugin if the request should be blocked
        for (const plugin of this.plugins) {
          if (plugin.processRequest) plugin.processRequest(request);

          if (plugin.shallBlock && plugin.shallBlock(request)) {
            shouldBlock = true;
            blockingPlugin = plugin.constructor.name;
            break;
          }
        }

        if (shouldBlock) {
          // Notify logger plugins about blocked request
          for (const plugin of this.plugins) {
            if (plugin.constructor.name !== blockingPlugin &&
                typeof plugin.shallBlock === 'function') {
              // Pass block reason to logger plugins
              plugin.shallBlock(request, blockingPlugin);
            }
          }
          await request.abort();
        } else {
          await request.continue();
        }
      });

      // Handle responses with plugins
      this.page.on('response', async response => {
        // Process response with all plugins
        for (const plugin of this.plugins) {
          if (plugin.processResponse) {
            await plugin.processResponse(response);
          }
        }
      });

      // Handle navigation completion
      this.page.on('load', async () => {
        let shouldFinish = true;

        // Check with each plugin if navigation should be considered complete
        for (const plugin of this.plugins) {
          if (plugin.shallFinishLoading && !plugin.shallFinishLoading()) {
            shouldFinish = false;
            break;
          }
        }

        if (shouldFinish) {
          this.isOpen = true;
        }
      });

      // Navigate to URL
      await this.page.goto(url, { waitUntil: 'networkidle2' });

      console.log(`Navigated to ${url}`);
    } catch (error) {
      console.error('Error opening page:', error);
      throw error;
    }
  }

  /**
   * Filter responses and call plugins with those that match
   * @param {Function} filter - Function that returns true for responses to process
   * @returns {Promise<void>}
   */
  async filterResponses(filter) {
    if (!this.page) {
      throw new Error('Browser not initialized. Call open() first.');
    }

    // Set up response handler for future responses
    this.page.on('response', async response => {
      if (filter(response)) {
        for (const plugin of this.plugins) {
          if (plugin.filterResponses) {
            await plugin.filterResponses(response);
          }
        }
      }
    });
  }

  /**
   * Close the browser
   * @param {boolean} force - Whether to force close without cleanup
   * @returns {Promise<void>}
   */
  async close(force = false) {
    if (this.browser) {
      try {
        // Cancel any pending navigations
        if (this.page) {
          try {
            // Stop any pending navigations
            await this.page.evaluate(() => window.stop()).catch(() => {});

            // Detach any handlers to prevent callbacks after close
            this.page.removeAllListeners();
          } catch (pageError) {
            // Ignore - we're closing anyway
          }
        }

        // Call cleanup on plugins that have it (if not forced)
        if (!force) {
          for (const plugin of this.plugins) {
            if (typeof plugin.cleanup === 'function') {
              try {
                await plugin.cleanup();
              } catch (error) {
                console.warn(`Error during plugin cleanup: ${error.message}`);
              }
            }
          }
        }

        // Force close the browser process if needed
        if (force) {
          console.log('Force closing browser...');
          const browserProcess = this.browser.process();
          if (browserProcess) {
            try {
              browserProcess.kill('SIGKILL');
              this.browser = null;
              this.page = null;
              this.isOpen = false;
              return;
            } catch (killError) {
              console.warn('Failed to kill browser process, falling back to normal close');
            }
          }
        }

        // Regular browser close
        await this.browser.close().catch(err => {
          console.warn(`Regular browser close failed: ${err.message}`);
          // Try force kill as a last resort
          const browserProcess = this.browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
          }
        });

        this.browser = null;
        this.page = null;
        this.isOpen = false;
      } catch (error) {
        console.error('Error closing browser:', error);

        // Try force kill as a last resort if regular close failed
        try {
          const browserProcess = this.browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
          }
          this.browser = null;
          this.page = null;
          this.isOpen = false;
        } catch (killError) {
          console.error('Failed to kill browser process:', killError);
        }
      }
    }
  }
}

module.exports = MyPuppeteer;