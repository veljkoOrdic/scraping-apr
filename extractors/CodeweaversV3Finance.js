/**
 * Extracts finance information from Codeweavers V3 API JSON responses
 */
class CodeweaversV3Finance {
  /**
   * Create a new CodeweaversV3Finance instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      ...options
    };
  }

  /**
   * Process JSON data to extract finance information
   * @param {Object|string} data - The JSON data or string to process
   * @returns {Array|null} - Array of finance items or null if not found
   */
  process(data) {
    try {
      // Parse JSON if it's a string
      let jsonData = data;
      if (typeof data === 'string') {
        jsonData = JSON.parse(data);
      }
      
      // Check if we have vehicle results with finance product results
      if (!jsonData || !jsonData.VehicleResults || !Array.isArray(jsonData.VehicleResults)) {
        return null;
      }
      
      const items = [];
      
      // Process each vehicle result
      for (const vehicle of jsonData.VehicleResults) {
        // Check if finance product results exist
        if (!vehicle.FinanceProductResults || !Array.isArray(vehicle.FinanceProductResults)) {
          continue;
        }
        
        // Process each finance product result
        for (const result of vehicle.FinanceProductResults) {
          if (result && result.Quote) {
            const item = {
              name: result.Key,
              apr: result.Quote.Apr,
              price: result.Quote.TotalPrice,
              deposit: result.Quote.CashDeposit,
              credit: result.Quote.AmountOfCredit,
            };
            
            items.push(item);
          }
        }
      }
      
      return items.length > 0 ? items : null;
    } catch (error) {
      console.error('Error extracting finance data:', error);
      return null;
    }
  }
}

module.exports = CodeweaversV3Finance;
