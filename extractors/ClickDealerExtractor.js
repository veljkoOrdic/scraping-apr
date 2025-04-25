/**
 * Finance data extraction for ClickDealer platform
 */
class ClickDealerExtractor {
    constructor() {
        this.vehicleData = null;
    }

    /**
     * Process finance data from the API response
     * @param {Object} params - URL parameters from the request
     * @param {Object} data - Parsed JSON data from the response
     * @returns {Array|null} Array of structured finance data objects or null if no valid products
     */
    processFinance(params, data) {
        const results = [];

        // Process HP finance data if available
        if (data.HP && Object.keys(data.HP).length > 0) {
            results.push(this.processQuote(params, data.HP, 'HP'));
        }

        // Process PCP finance data if available
        if (data.PCP && Object.keys(data.PCP).length > 0) {
            results.push(this.processQuote(params, data.PCP, 'PCP'));
        }

        return results.length > 0 ? results : null;
    }

    /**
     * Process individual finance quote data
     * @param {Object} params - URL parameters from the request
     * @param {Object} productData - Individual product data (HP or PCP)
     * @param {String} productType - Type of finance product ('HP' or 'PCP')
     * @returns {Object} Structured finance data
     */
    processQuote(params, productData, productType) {
        // Calculate contract mileage based on term and annual mileage
        const annualMileage = productData.annual_mileage || parseInt(params.mileage) || 0;
        const term = productData.term || parseInt(params.term) || 0;
        const contractMileage = annualMileage ? (annualMileage * (term / 12)) : 0;

        // Create base finance data structure
        const financeData = {
            type: `finance_${productType.toLowerCase()}`,
            name: productData.product_name || productType,
            finance_type: productType,
            cash_price: productData.total_cash_price,
            total_price: productData.total_cash_price,
            deposit: productData.total_deposit,
            balance: productData.amount_of_credit,
            apr: productData.apr,
            rate_of_interest: productData.fixed_rate,
            term: productData.term,
            regular_payment: productData.regular_payment,
            final_payment: productData.final_payment,
            total_amount_payable: productData.total_amount_payable,
            total_charge_for_credit: productData.charges,
            amount_of_credit: productData.amount_of_credit,
            lender: productData.product_name || "",
            broker: "Evolution Funding Limited",
            annual_mileage: annualMileage,
            contract_mileage: contractMileage,
            excess_mileage_rate: 0,
            residual: 0,
            price_to_buy: productData.final_payment || 0
        };

        // Add product-specific data
        if (productType === 'PCP') {
            financeData.excess_mileage_rate = productData.excess_mileage_charge || 0;
            financeData.residual = productData.final_payment || 0;
        }

        return financeData;
    }

    /**
     * Process vehicle data from settings response
     * @param {Object} data - Vehicle data from settings response
     * @returns {Object} Structured vehicle data
     */
    processVehicle(data) {
        // If we already have complete vehicle data, return it
        if (this.vehicleData && this.vehicleData.manufacturer) {
            return this.vehicleData;
        }

        const vehicle = data.vehicle;

        // Build vehicle data object
        const vehicleData = {
            type: 'vehicle',
            vehicle_id: vehicle.id,
            manufacturer: vehicle.manufacturer,
            model: vehicle.range,
            variant: vehicle.edition,
            derivative: vehicle.edition,
            registration_number: vehicle.registration,
            registration_date: new Date(parseInt(vehicle.registered) * 1000).toISOString().split('T')[0],
            mileage: vehicle.mileage.replace(/,/g, ''),
            status: vehicle.status === 'in_stock' ? 'Used' : 'New',
            price: vehicle.price.replace(/,/g, ''),
            engine_size: vehicle.engine_size,
            fuel_type: vehicle.fuel_type,
            is_electric: vehicle.is_electric,
            url: vehicle.link_back_url
        };

        // Store for future reference
        this.vehicleData = vehicleData;

        return vehicleData;
    }
}

module.exports = ClickDealerExtractor;