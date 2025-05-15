const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const eventEmitter = require('../lib/EventEmitter');

/**
 * File listeners that listens for events and writes them to files
 */
class FileStorage {
  constructor(options = {}) {
    this.options = {
      logDir: 'data',
      filenameFormat: 'data-{date}-{hash}.json',
      ...options
    };

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }

    // Register event listener for data events
    eventEmitter.on('save', this.saveData.bind(this));
  }

  /**
   * Handle an event by logging to file
   * @param {Event} event - The event object
   */
  saveData(event) {
    try {
      console.log(event);
      // Extract metadata
      const { url = event.metadata?.pageUrl , dealer_id = null, car_id = null } = event.metadata || {};

      // Build hash based on metadata
      let hash;
      if (dealer_id && car_id) {
        hash = `${dealer_id}-${car_id}`;
      } else if (dealer_id) {
        hash = `${dealer_id}-${crypto.createHash('md5').update(url).digest('hex')}`;
      } else {
        hash = crypto.createHash('md5').update(url).digest('hex');
      }

      const filename = this.options.filenameFormat
          .replace('{hash}', hash);

      const filePath = path.join(this.options.logDir, filename);

      // Prepare data for listeners
      const storageData = {
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        url,
        dealer_id,
        car_id,
        data: event.payload
      };

      // Check if file exists
      let fileData = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          fileData = JSON.parse(content);
          if (!Array.isArray(fileData)) {
            fileData = [fileData];
          }
        } catch (parseError) {
          console.error(`Error parsing existing file ${filePath}:`, parseError);
          // Start with empty array if file is corrupted
          fileData = [];
        }
      }

      // If the incoming data is not a "not_found" type,
      // remove any existing "not_found" entries for the same URL, dealer_id, and car_id.
      // This ensures we keep only the valid data when it becomes available.
      const isIncomingNotFound = isNotFoundOrRedirect(storageData.data);
      if (!isIncomingNotFound) {
        fileData = fileData.filter(entry => {
          const sameRecord = entry.url === url && entry.dealer_id === dealer_id && entry.car_id === car_id;
          return !(sameRecord && isNotFoundOrRedirect(entry.data));
        });
      }

      // Add new data and write to file
      fileData.push(storageData);
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
      console.log(`Saved data to ${filePath}`);

    } catch (error) {
      console.error('Error writing to file:', error);
    }
  }
}

/**
 * Helper to detect “not found”, “redirect”, "sold" or "unauthorized" in any shape of data
 */
function isNotFoundOrRedirect(data) {
  if (data == null) return false;
  // case 1: data is an object with a .type property
  if (typeof data === 'object' && 'type' in data) {
    return data.type === 'not_found';
  }
  // case 2: data is a string (redirect or vehicle with no price)
  if (typeof data === 'string') {
    return data.toLowerCase().includes('redirect') || data.toLowerCase().includes('sold') || data.toLowerCase().includes('unauthorized');
  }
  return false;
}

// Export a new instance
module.exports = FileStorage;