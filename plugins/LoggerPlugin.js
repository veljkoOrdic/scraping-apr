const IPlugin = require('./IPlugin');
const fs = require('fs');
const path = require('path');

/**
 * Plugin that logs requests and responses to files
 * @extends IPlugin
 */
class LoggerPlugin extends IPlugin {
  constructor(options = {}) {
    super(options);
    this.options = {
      logRequests: true,
      logResponses: true,
      logRequestHeaders: false,
      logResponseHeaders: false,
      logBase64Content: true,
      logDir: 'data',
      ...this.options
    };

    // Ensure log directory exists
    this.ensureLogDirExists();

    // Create or open log file for this session
    this.logFilePath = this.getLogFilePath();
    this.initLogFile();
  }

  /**
   * Ensure log directory exists, create if it doesn't
   */
  ensureLogDirExists() {
    if (!fs.existsSync(this.options.logDir)) {
      try {
        fs.mkdirSync(this.options.logDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
      }
    }
  }

  /**
   * Get log file path based on current date
   * @returns {string} - Log file path
   */
  getLogFilePath() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.options.logDir, `${dateStr}.log`);
  }

  /**
   * Initialize log file with session info
   */
  initLogFile() {
    try {
      const now = new Date().toISOString();
      const sessionStart = `\n---------- New Session Started at ${now} ----------\n\n`;
      fs.appendFileSync(this.logFilePath, sessionStart);
    } catch (error) {
      console.error(`Failed to initialize log file: ${error.message}`);
    }
  }

  /**
   * Log a message to the log file
   * @param {string} message - Message to log
   */
  log(message) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.logFilePath, logMessage);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Process a request and log it
   * @param {puppeteer.HTTPRequest} request - The request to log
   * @param {string} blockReason - If request was blocked, the reason/plugin name
   * @returns {boolean} - Always returns false (doesn't block requests)
   */
  shallBlock(request, blockReason = null) {
    if (this.options.logRequests) {
      if (blockReason) {
        this.log(`BLOCKED: ${request.url()} (reason: ${blockReason})`);
      } else {
        this.log(`Request: ${request.method()} ${request.url()}`);
      }

      if (this.options.logRequestHeaders) {
        this.log(`Headers: ${JSON.stringify(request.headers(), null, 2)}`);
      }
    }

    // Never block requests, just log them
    return false;
  }

  /**
   * Process a response and log it
   * @param {puppeteer.HTTPResponse} response - The response to log
   * @returns {Promise<void>}
   */
  async processResponse(response) {
    if (this.options.logResponses) {
      this.log(`Response: ${response.status()} ${response.url()}`);

      if (this.options.logResponseHeaders) {
        this.log(`Response Headers: ${JSON.stringify(response.headers(), null, 2)}`);
      }

      if (this.options.logBase64Content) {
        try {
          const contentType = response.headers()['content-type'] || '';

          // Only log image/png;base64 content
          if (contentType.includes('image/png')) {
            // Get buffer and convert to base64
            const buffer = await response.buffer();
            const base64Data = buffer.toString('base64');

            // Log the first 100 characters of base64 data
            const truncatedBase64 = base64Data.substring(0, 100) + '...';
            this.log(`PNG Base64 Content (truncated): ${truncatedBase64}`);
          }
        } catch (error) {
          this.log(`Could not get response content: ${error.message}`);
        }
      }
    }
  }
}

module.exports = LoggerPlugin;