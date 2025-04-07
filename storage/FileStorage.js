const fs = require('fs');
const path = require('path');
const eventEmitter = require('../lib/EventEmitter');

/**
 * File storage that listens for events and writes them to files
 */
class FileStorage {
  constructor(options = {}) {
    this.options = {
      logDir: 'log',
      filenameFormat: 'data-{date}-{type}.json',
      ...options
    };
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
    
    // Register event listener for data events
    eventEmitter.on('data', this.handleEvent.bind(this));
  }

  /**
   * Handle an event by logging to file
   * @param {Event} event - The event object
   */
  handleEvent(event) {
    try {
      // Extract data type from payload if available
      const dataType = event.payload?.type || 'general';
      
      // Build filename based on date and data type
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const filename = this.options.filenameFormat
        .replace('{date}', dateStr)
        .replace('{type}', dataType);
      
      const filePath = path.join(this.options.logDir, filename);
      
      // Prepare data for storage
      const storageData = {
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        url: event.metadata?.url,
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
      
      // Add new data and write to file
      fileData.push(storageData);
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
      console.log(`Saved data to ${filePath}`);
      
    } catch (error) {
      console.error('Error writing to file:', error);
    }
  }
}

// Export a new instance
module.exports = new FileStorage();