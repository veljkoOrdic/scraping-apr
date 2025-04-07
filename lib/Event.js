/**
 * Base event class for the application
 */
class Event {
  /**
   * Create a new event
   * @param {string} type - The event type
   * @param {string} source - The source component name
   * @param {*} payload - The event data payload
   * @param {Object} metadata - Additional metadata (url, etc.)
   * @param {Object} context - Context information (color, priority, etc.)
   */
  constructor(type, source, payload, metadata = {}, context = {}) {
    this.type = type;
    this.source = source;
    this.payload = payload;
    this.metadata = metadata;
    this.context = context;
    this.timestamp = new Date();
  }
}

module.exports = Event;