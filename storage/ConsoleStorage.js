const eventEmitter = require('../lib/EventEmitter');

/**
 * Console output storage that listens for events
 */
class ConsoleStorage {
  constructor() {
    // Color constants (same as Writer)
    this.COLORS = {
      RED: '\x1b[31m',
      GREEN: '\x1b[32m',
      YELLOW: '\x1b[33m',
      BLUE: '\x1b[34m',
      MAGENTA: '\x1b[35m',
      CYAN: '\x1b[36m',
      RESET: '\x1b[0m'
    };
    
    // Register event listener for data events
    eventEmitter.on('data', this.handleEvent.bind(this));
  }

  /**
   * Handle an event by logging to console
   * @param {Event} event - The event object
   */
  handleEvent(event) {
    // Get current timestamp in yyyy-mm-dd hh:mm:ss format
    const timestamp = event.timestamp.toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '');
    
    // Get URL from metadata if available
    const url = event.metadata?.url || 'N/A';
    
    // Convert non-string messages to JSON (just like Writer)
    let formattedPayload = event.payload;
    if (typeof event.payload !== 'string') {
      try {
        formattedPayload = JSON.stringify(event.payload, null, 2);
      } catch (error) {
        formattedPayload = `[Object: Could not stringify] ${error.message}`;
      }
    }
    
    // Format the output (same as Writer)
    const output = `${timestamp} (${event.source}) ${formattedPayload} [${url}]`;
    
    // Apply color if specified in context
    const color = event.context?.color;
    if (color) {
      console.log(`${color}${output}${this.COLORS.RESET}`);
    } else {
      console.log(output);
    }
  }
}

// Export a new instance
module.exports = new ConsoleStorage();