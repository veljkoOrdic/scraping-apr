/**
 * Extracts VRM codes from HTML/text content
 */
class VrmExtract {
  /**
   * Create a new VrmExtract instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      regex: /vrm:"([\w\d]{6,7})"/i,
      ...options
    };
  }

  /**
   * Process content to extract VRM codes
   * @param {string} content - The content to process
   * @returns {Object|null} - Extracted VRM information or null if not found
   */
  process(content) {
    if (!content) {
      return null;
    }

    try {
      // Search for VRM using regex
      const match = this.options.regex.exec(content);
      
      if (match && match[1]) {
        return {
          type: 'vrm',
          value: match[1],
          rawMatch: match[0]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting VRM:', error);
      return null;
    }
  }
}

module.exports = VrmExtract;
