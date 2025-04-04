const IPlugin = require('./IPlugin');
const proxyChain = require('proxy-chain');

/**
 * Plugin for managing proxy connections
 * @extends IPlugin
 */
class ProxyPlugin extends IPlugin {
  /**
   * Create a new ProxyPlugin
   * @param {Object} options - Configuration options
   * @param {string|Array<string>} options.proxies - Single proxy URL or array of proxy URLs to use
   * @param {boolean} options.rotateOnStatus - HTTP status codes that trigger proxy rotation
   * @param {number} options.rotateInterval - Time in milliseconds between proxy rotations (0 to disable)
   */
  constructor(options = {}) {
    super();
    this.options = {
      proxies: [],
      rotateOnStatus: [403, 429, 503],  // Status codes that might indicate IP blocking
      rotateInterval: 0,  // 0 means no automatic rotation
      ...options
    };

    // Normalize proxies to array
    if (typeof this.options.proxies === 'string') {
      this.options.proxies = [this.options.proxies];
    }

    this.currentProxyIndex = 0;
    this.lastRotation = Date.now();
    this.puppeteer = null;
    this.anonymizedProxies = {};  // Cache of anonymized proxy URLs
  }

  /**
   * Set the MyPuppeteer instance and configure initial proxy
   * @param {Object} puppeteer - MyPuppeteer instance
   */
  async setPuppeteer(puppeteer) {
    this.puppeteer = puppeteer;

    // Set up initial proxy if available
    try {
      const currentProxy = this.getCurrentProxy();
      if (currentProxy) {
        // Anonymize the proxy URL if it has credentials
        const anonymizedUrl = await this.anonymizeProxy(currentProxy);

        // Configure the proxy in puppeteer
        this.puppeteer.setProxy(currentProxy, anonymizedUrl);
      }
    } catch (error) {
      console.error('Error setting up initial proxy:', error);
      // Don't throw - we'll continue without a proxy
    }
  }

  /**
   * Anonymize a proxy URL with credentials
   * @param {string} proxyUrl - Original proxy URL
   * @returns {Promise<string>} - Anonymized proxy URL or original URL if already anonymized
   */
  async anonymizeProxy(proxyUrl) {
    // Return cached version if we've already anonymized this proxy
    if (this.anonymizedProxies[proxyUrl]) {
      return this.anonymizedProxies[proxyUrl];
    }

    try {
      // Use proxy-chain to anonymize the URL (handles authentication)
      const anonymizedUrl = await proxyChain.anonymizeProxy(proxyUrl);
      this.anonymizedProxies[proxyUrl] = anonymizedUrl;
      return anonymizedUrl;
    } catch (error) {
      console.warn(`Could not anonymize proxy URL: ${error.message}`);
      // Return the original URL if anonymization fails
      return proxyUrl;
    }
  }

  /**
   * Get the current proxy URL
   * @returns {string|null} - Current proxy URL or null if none available
   */
  getCurrentProxy() {
    if (!this.options.proxies.length) return null;
    return this.options.proxies[this.currentProxyIndex];
  }

  /**
   * Rotate to the next proxy in the list
   * @returns {Promise<string|null>} - New proxy URL or null if none available
   */
  async rotateProxy() {
    if (!this.options.proxies.length) return null;

    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.options.proxies.length;
    this.lastRotation = Date.now();
    const newProxy = this.getCurrentProxy();

    console.log(`Rotated to proxy: ${newProxy}`);

    // Apply the new proxy if puppeteer is available
    if (this.puppeteer && newProxy) {
      try {
        const anonymizedUrl = await this.anonymizeProxy(newProxy);
        this.puppeteer.setProxy(newProxy, anonymizedUrl);
      } catch (error) {
        console.error('Error applying rotated proxy:', error);
      }
    }

    return newProxy;
  }

  /**
   * Clean up any anonymized proxies on browser close
   */
  async cleanup() {
    // Close all anonymized proxies
    for (const proxyUrl in this.anonymizedProxies) {
      try {
        await proxyChain.closeAnonymizedProxy(this.anonymizedProxies[proxyUrl]);
      } catch (error) {
        console.warn(`Error closing anonymized proxy: ${error.message}`);
      }
    }

    this.anonymizedProxies = {};
  }

  /**
   * Process a response and check if proxy rotation is needed
   * @param {puppeteer.HTTPResponse} response - The response to process
   */
  async processResponse(response) {
    // Check if we should rotate proxy based on response status
    const status = response.status();

    if (this.options.rotateOnStatus.includes(status)) {
      console.log(`Received status ${status}, considering proxy rotation`);

      if (this.puppeteer && this.options.proxies.length > 1) {
        await this.rotateProxy();
      }
    }

    // Check if we should rotate based on time interval
    if (this.options.rotateInterval > 0) {
      const now = Date.now();
      if (now - this.lastRotation > this.options.rotateInterval) {
        await this.rotateProxy();
      }
    }
  }
}

module.exports = ProxyPlugin;