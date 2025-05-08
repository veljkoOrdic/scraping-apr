// plugins/RequestBlockerPlugin.js
const app = require('../lib/App');
const IPlugin = require("./IPlugin");

/**
 * Plugin to block specific requests
 * Can block by domain, pattern, or resource type
 */
class RequestBlockerPlugin extends IPlugin {
    constructor(options = {}) {
        super();
        this.name = 'request-blocker';
        this.options = {
            blockDomains: [],       // Array of domain strings to block
            blockPatterns: [],      // Array of regex patterns to block
            blockTypes: [],         // Array of resource types to block (image, stylesheet, font, etc.)
            excludePatterns: [],    // Array of regex patterns to exempt from blocking
            enabled: true,          // Enable/disable the plugin
            logBlocked: false,       // Whether to log blocked requests
            ...options
        };

        // Compile regexes
        this.blockPatternRegexes = this.options.blockPatterns.map(pattern => {
            if (pattern instanceof RegExp) return pattern;
            try {
                return new RegExp(pattern, 'i');
            } catch (e) {
                app.info(this.name, `Invalid regex pattern: ${pattern}`, { error: e.message });
                return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
        });

        this.excludePatternRegexes = this.options.excludePatterns.map(pattern => {
            if (pattern instanceof RegExp) return pattern;
            try {
                return new RegExp(pattern, 'i');
            } catch (e) {
                app.info(this.name, `Invalid regex pattern: ${pattern}`, { error: e.message });
                return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
        });

        // Statistics
        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            blocksByDomain: {},
            blocksByType: {}
        };
    }

    /**
     * Process a request to determine if it should be blocked
     * @param {Request} request - Puppeteer request object
     * @returns {boolean} - Whether the request should be blocked
     */
    processRequest(request) {
        if (!this.options.enabled) return;

        this.stats.totalRequests++;
    }

    /**
     * Determine if a request should be blocked
     * @param {Request} request - Puppeteer request object
     * @returns {boolean} - True if should be blocked
     */
    shallBlock(request) {
        if (!this.options.enabled) return false;

        const url = request.url();
        const resourceType = request.resourceType();

        // Check exclusion patterns first
        for (const regex of this.excludePatternRegexes) {
            if (regex.test(url)) {
                return false;
            }
        }

        // 1. Check resource type
        if (this.options.blockTypes.includes(resourceType)) {
            this._logBlocked(url, `resource type: ${resourceType}`);
            this._incrementStat('blocksByType', resourceType);
            return true;
        }

        // 2. Check domains
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        for (const blockDomain of this.options.blockDomains) {
            if (domain === blockDomain || domain.endsWith(`.${blockDomain}`)) {
                this._logBlocked(url, `domain: ${domain}`);
                this._incrementStat('blocksByDomain', domain);
                return true;
            }
        }

        // 3. Check URL patterns
        for (const regex of this.blockPatternRegexes) {
            if (regex.test(url)) {
                this._logBlocked(url, `pattern: ${regex}`);
                this._incrementStat('blocksByPattern', regex.toString());
                return true;
            }
        }

        return false;
    }

    /**
     * Log blocked requests if enabled
     * @private
     */
    _logBlocked(url, reason) {
        this.stats.blockedRequests++;

        if (this.options.logBlocked) {
            app.info(this.name, `Blocked request: ${url}`, { reason });
        }
    }

    /**
     * Increment a stat counter
     * @private
     */
    _incrementStat(category, key) {
        if (!this.stats[category]) {
            this.stats[category] = {};
        }

        if (!this.stats[category][key]) {
            this.stats[category][key] = 0;
        }

        this.stats[category][key]++;
    }

    /**
     * Get blocking statistics
     * @returns {Object} - Statistics about blocked requests
     */
    getStats() {
        return {
            ...this.stats,
            blockRate: this.stats.totalRequests > 0
                ? (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

module.exports = RequestBlockerPlugin;