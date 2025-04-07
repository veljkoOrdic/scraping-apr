/**
 * Central event emitter for the application
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register a listener for a specific event type
   * @param {string} eventType - The type of event to listen for
   * @param {Function} listener - The callback function
   */
  on(eventType, listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(listener);
  }

  /**
   * Emit an event to all registered listeners
   * @param {Object} event - The event object with at least a type property
   */
  emit(event) {
    if (!event || !event.type) {
      throw new Error('Events must have a type property');
    }

    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });
  }

  /**
   * Remove a specific listener from an event type
   * @param {string} eventType - The type of event
   * @param {Function} listener - The callback function to remove
   */
  off(eventType, listener) {
    if (!this.listeners.has(eventType)) return;
    
    const listeners = this.listeners.get(eventType);
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Remove all listeners for a specific event type
   * @param {string} eventType - The type of event
   */
  removeAllListeners(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

// Create and export a singleton instance
const eventEmitter = new EventEmitter();
module.exports = eventEmitter;