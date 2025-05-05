/**
 * Finance data extraction for FinanceProposal platform
 */
class FinanceProposalFinance {
    constructor() {
        this.vehicleData = null;
    }

    /**
     * Process finance data from the API response
     * @param {Object} params - URL parameters from the request
     * @param {Object} data - Parsed JSON data from the response
     * @returns {Object} Structured finance data
     */
    processFinance(params, data) {
        // Determine product type based on the 'type' parameter
        let productType;
        if (params.type === '1') {
            productType = 'HP';
        } else if (params.type === '2') {
            productType = 'PCP';
        } else {
            productType = 'unknown';
        }

        // Calculate contract mileage if annual mileage is available
        const annualMileage = params.annual_mileage || params.milepa || 0;
        const contractMileage = annualMileage ? (parseInt(annualMileage) * (parseInt(data.term) / 12)) : 0;

        // Create base finance data structure
        const financeData = {
            type: `finance_${productType.toLowerCase()}`,
            name: data.product_name || productType,
            finance_type: productType,
            cash_price: params.amount || params.cprice,
            total_price: data.total,
            deposit: params.dep,
            balance: data.balance,
            apr: data.apr,
            rate_of_interest: data.flat,
            term: data.term,
            regular_payment: data.regular,
            final_payment: data.final,
            total_amount_payable: data.total,
            total_charge_for_credit: data.charges,
            amount_of_credit: data.balance,
            lender: data.product_name || "",
            broker: "Evolution Funding Limited",
            annual_mileage: annualMileage,
            contract_mileage: contractMileage,
            excess_mileage_rate: 0,
            residual: 0,
            price_to_buy: data.final
        };

        // Add product-specific data
        if (productType === 'PCP') {
            financeData.excess_mileage_rate = data.excess_mileage || 0;
            financeData.residual = data.rv || 0;
        }

        // Mark as representative example if applicable
        if (params.rep === 'true') {
            financeData.is_representative = true;
            financeData.type = `finance_representative_${productType.toLowerCase()}`;
            financeData.name = `Representative ${productType}`;
            if (data.apr_nofees) {
                financeData.apr_no_fees = data.apr_nofees;
            }
        }

        return financeData;
    }

    /**
     * Process vehicle data from widget or API response
     * @param {Object} params - URL parameters or data object
     * @returns {Object} Structured vehicle data
     */
    processVehicle(params) {
        // If we already have complete vehicle data, return it
        if (this.vehicleData && this.vehicleData.manufacturer) {
            return this.vehicleData;
        }

        // Extract vehicle data from cap_code if available
        const capCode = params.cap_code || params.cap || '';
        let manufacturer = '';
        let model = '';

        if (capCode && capCode.length >= 2) {
            const CapCodeDecoder = require('./CapCodeDecoder');
            const decoder = new CapCodeDecoder();
            const decodedData = decoder.decode(capCode);

            manufacturer = decodedData.manufacturer;
            model = decodedData.model;
        }

        // Build vehicle data object
        const vehicleData = {
            type: 'vehicle',
            manufacturer: manufacturer,
            model: model,
            variant: '',
            derivative: params.car_deriv || '',
            registration_number: params.vrm,
            registration_date: params.registration_date,
            mileage: params.mileage,
            status: params.vehicle_type === '1' ? 'Used' : 'New',
            price: params.price
        };

        // Store for future reference
        this.vehicleData = vehicleData;

        return vehicleData;
    }
}

module.exports = FinanceProposalFinance;