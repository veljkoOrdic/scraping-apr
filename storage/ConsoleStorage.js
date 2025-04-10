/**
 * Console output storage that listens for events
 */
// storage/ConsoleStorage.js
const eventEmitter = require('../lib/EventEmitter');

class ConsoleStorage {
  constructor() {
    this.COLORS = {
      RED: '\x1b[31m',
      GREEN: '\x1b[32m',
      YELLOW: '\x1b[33m',
      BLUE: '\x1b[34m',
      MAGENTA: '\x1b[35m',
      CYAN: '\x1b[36m',
      RESET: '\x1b[0m'
    };

    eventEmitter.on('info', this.handleInfo.bind(this));
    eventEmitter.on('error', this.handleError.bind(this));
  }

  handleInfo(event) {
    const timestamp = event.timestamp.toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');
    const url = event.metadata?.url || 'N/A';
    let formattedPayload = event.payload;
    if (typeof event.payload !== 'string') {
      try {
        formattedPayload = JSON.stringify(event.payload, null, 2);
      } catch (error) {
        formattedPayload = `[Object: Could not stringify] ${error.message}`;
      }
    }
    const output = `${timestamp} (${event.source}) ${formattedPayload} [${url}]`;
    const color = event.context?.color;
    if (color) {
      console.log(`${color}${output}${this.COLORS.RESET}`);
    } else {
      console.log(output);
    }
  }

  handleError(event) {
    const timestamp = event.timestamp.toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');
    const url = event.metadata?.url || 'N/A';
    let formattedPayload = event.payload;
    if (typeof event.payload !== 'string') {
      try {
        formattedPayload = JSON.stringify(event.payload, null, 2);
      } catch (error) {
        formattedPayload = `[Object: Could not stringify] ${error.message}`;
      }
    }
    const output = `${timestamp} (${event.source}) ${formattedPayload} [${url}]`;
    console.error(`${this.COLORS.RED}${output}${this.COLORS.RESET}`);
  }
}

module.exports = ConsoleStorage;