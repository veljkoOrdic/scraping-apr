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

      const results = [];

      // Process each vehicle result
      for (const vehicle of jsonData.VehicleResults) {
        // Check if finance product results exist
        if (!vehicle.FinanceProductResults || !Array.isArray(vehicle.FinanceProductResults)) {
          continue;
        }

        // Extract vehicle data
        let vehicleData = null;

        // Process each finance product result
        for (const product of vehicle.FinanceProductResults) {
          if (!product || !product.Quote || !product.Product || !product.Vehicle) {
            continue;
          }

          // Create vehicle data if not already created
          if (!vehicleData) {
            vehicleData = {
              type: 'vehicle',
              manufacturer: product.Vehicle.Manufacturer,
              model: product.Vehicle.Model,
              variant: product.Vehicle.Variant,
              derivative: product.Vehicle.Derivative,
              registration_number: product.Vehicle.RegistrationNumber,
              registration_date: product.Vehicle.RegistrationDate,
              mileage: product.Vehicle.CurrentMileage,
              status: product.Vehicle.VehicleStatus
            };

            // Add vehicle data to results
            results.push(vehicleData);
          }

          // Extract finance data
          const productKey = product.Key;
          const productType = product.Product.Type;

          // Create finance data object
          const financeData = {
            type: `finance_${productKey.toLowerCase()}`,
            name: productKey,
            finance_type: productType,
            cash_price: product.Quote.CashPrice,
            total_price: product.Quote.TotalPrice,
            deposit: product.Quote.TotalDeposit,
            balance: product.Quote.Balance,
            apr: product.Quote.Apr,
            rate_of_interest: product.Quote.RateOfInterest,
            term: product.Quote.Term,
            regular_payment: product.Quote.RegularPayment,
            final_payment: product.Quote.FinalPayment,
            total_amount_payable: product.Quote.TotalAmountPayable,
            total_charge_for_credit: product.Quote.TotalChargeForCredit,
            amount_of_credit: product.Quote.AmountOfCredit,
            lender: product.Product.Lender
          };

          // Add product-specific data
          if (productType === 'PCP') {
            financeData.annual_mileage = product.Quote.AnnualMileage;
            financeData.contract_mileage = product.Quote.ContractMileage;
            financeData.excess_mileage_rate = product.Quote.ExcessMileageRate;
            financeData.residual = product.Quote.Residual;
            financeData.price_to_buy = product.Quote.FinalPayment;
          } else if (productType === 'Hire Purchase') {
            financeData.annual_mileage = product.Quote.AnnualMileage || 0;
            financeData.excess_mileage_rate = 0;
            financeData.residual = 0;
          }

          // Add finance data to results
          results.push(financeData);
        }
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.error('Error extracting finance data:', error);
      return null;
    }
  }
}

module.exports = CodeweaversV3Finance;