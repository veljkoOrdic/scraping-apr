/**
 * Helper class for formatted console output
 */
class Writer {
  // Color constants
  static RED = '\x1b[31m';
  static GREEN = '\x1b[32m';
  static YELLOW = '\x1b[33m';
  static BLUE = '\x1b[34m';
  static MAGENTA = '\x1b[35m';
  static CYAN = '\x1b[36m';
  static RESET = '\x1b[0m';

  /**
   * Write a formatted message to the console
   * @param {string} sender - The name of the component sending the message
   * @param {string|object} message - The message to display (can be string or object)
   * @param {string} url - The URL associated with the message
   * @param {string} color - Color code (use Writer color constants) or null for default
   */
  static write(sender, message, url, color = null) {
    // Get current timestamp in yyyy-mm-dd hh:mm:ss format
    const now = new Date();
    const timestamp = now.toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');

    // Convert non-string messages to JSON
    let formattedMessage = message;
    if (typeof message !== 'string') {
      try {
        formattedMessage = JSON.stringify(message, null, 2);
      } catch (error) {
        formattedMessage = `[Object: Could not stringify] ${error.message}`;
      }
    }

    // Format the output
    const output = `${timestamp} (${sender}) ${formattedMessage} [${url}]`;

    // Apply color if specified
    if (color) {
      console.log(`${color}${output}${Writer.RESET}`);
    } else {
      console.log(output);
    }
  }
}

module.exports = Writer;