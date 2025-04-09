/**
 * Extracts finance information from Quoteware V3 API JSON responses
 */
class QuotewareV3Finance {
    /**
     * Create a new QuotewareV3Finance instance
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

            return this.extractData(jsonData);
        } catch (error) {
            console.error('Error extracting finance data:', error);
            return null;
        }
    }

    /**
     * Extract finance and vehicle data from the JSON
     * @param {Object} jsonData - The parsed JSON data
     * @returns {Array} - Array of extracted data items
     */
    extractData(jsonData) {
        const results = [];

        // Extract vehicle information - Try detailed format first
        let vehicleData = this.extractVehicleData(jsonData);
        if (vehicleData) {
            results.push(vehicleData);
        }

        // Extract finance data - try different formats
        if (jsonData.QuoteResults && jsonData.QuoteResults.length > 0) {
            // Format 1: Detailed with multiple quotes
            this.extractDetailedFinanceData(jsonData, results);
        } else if (jsonData.ProductQuote) {
            // Format 2: Single product quote
            this.extractSingleFinanceData(jsonData, results);
        }

        return results.length > 0 ? results : null;
    }

    /**
     * Extract vehicle data from JSON
     * @param {Object} jsonData - The parsed JSON data
     * @returns {Object|null} - Vehicle data object or null if not found
     */
    extractVehicleData(jsonData) {
        // Try to get vehicle info from AssetSpecification if available
        if (jsonData.AssetSpecification) {
            return {
                type: 'vehicle',
                manufacturer: jsonData.AssetSpecification.Manufacturer || '',
                model: jsonData.AssetSpecification.Model || '',
                variant: jsonData.AssetSpecification.Range || '',
                derivative: jsonData.AssetSpecification.Derivative || '',
                registration_number: jsonData.Asset?.RegistrationMark || '',
                registration_date: jsonData.Asset?.RegistrationDate ?
                    this.formatDate(jsonData.Asset.RegistrationDate) : '',
                mileage: jsonData.Asset?.CurrentOdometerReading || 0,
                status: jsonData.Asset?.Condition || ''
            };
        }

        // Try to get from QuoteResults
        if (jsonData.QuoteResults && jsonData.QuoteResults.length > 0) {
            const firstResult = jsonData.QuoteResults[0];

            if (firstResult.Results && firstResult.Results.length > 0) {
                const result = firstResult.Results[0];

                if (result.Asset) {
                    return {
                        type: 'vehicle',
                        manufacturer: '',  // Not available in this format
                        model: '',  // Not available in this format
                        variant: '',  // Not available in this format
                        derivative: '',  // Not available in this format
                        registration_number: result.Asset.RegistrationMark || '',
                        registration_date: result.Asset.RegistrationDate ?
                            this.formatDate(result.Asset.RegistrationDate) : '',
                        mileage: result.Asset.CurrentOdometerReading || 0,
                        status: result.Asset.Condition || ''
                    };
                }
            }
        }

        return null;
    }

    /**
     * Extract finance data from detailed format with multiple quotes
     * @param {Object} jsonData - The parsed JSON data
     * @param {Array} results - Array to append results to
     */
    extractDetailedFinanceData(jsonData, results) {
        for (const quoteResult of jsonData.QuoteResults) {
            if (quoteResult.Results && quoteResult.Results.length > 0) {
                for (const result of quoteResult.Results) {
                    // Process each ProductGroup
                    if (result.ProductGroups && result.ProductGroups.length > 0) {
                        for (const productGroup of result.ProductGroups) {
                            // Process each ProductQuote
                            if (productGroup.ProductQuotes && productGroup.ProductQuotes.length > 0) {
                                for (const productQuote of productGroup.ProductQuotes) {
                                    // Skip if there are errors or no figures
                                    if (productQuote.hasErrors || !productQuote.Figures) continue;

                                    if (productGroup.FacilityType === 'HP') {
                                        const hpData = this.createHpData(productQuote, result.Asset?.RequestedAnnualDistance || 0);

                                        // Only add if we don't already have HP data
                                        if (!results.some(item => item.type === 'finance_hp')) {
                                            results.push(hpData);
                                        }
                                    } else if (productGroup.FacilityType === 'PCP') {
                                        const pcpData = this.createPcpData(productQuote, result.Asset?.RequestedAnnualDistance || 0);

                                        // Only add if we don't already have PCP data
                                        if (!results.some(item => item.type === 'finance_pcp')) {
                                            results.push(pcpData);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Extract finance data from single product quote format
     * @param {Object} jsonData - The parsed JSON data
     * @param {Array} results - Array to append results to
     */
    extractSingleFinanceData(jsonData, results) {
        if (jsonData.ProductQuote && jsonData.ProductQuote.Figures) {
            const productQuote = jsonData.ProductQuote;

            if (productQuote.FacilityType === 'HP') {
                const hpData = this.createHpData(productQuote, jsonData.Asset?.RequestedAnnualDistance || 0);

                // Only add if we don't already have HP data
                if (!results.some(item => item.type === 'finance_hp')) {
                    results.push(hpData);
                }
            } else if (productQuote.FacilityType === 'PCP') {
                const pcpData = this.createPcpData(productQuote, jsonData.Asset?.RequestedAnnualDistance || 0);

                // Only add if we don't already have PCP data
                if (!results.some(item => item.type === 'finance_pcp')) {
                    results.push(pcpData);
                }
            }
        }
    }

    /**
     * Create HP finance data object
     * @param {Object} productQuote - The product quote data
     * @param {number} annualMileage - Annual mileage
     * @returns {Object} - HP finance data object
     */
    createHpData(productQuote, annualMileage) {
        return {
            type: 'finance_hp',
            name: 'HP',
            finance_type: 'Hire Purchase',
            cash_price: productQuote.Figures.TotalCashPrice || 0,
            total_price: productQuote.Figures.TotalCashPrice || 0,
            deposit: productQuote.Figures.TotalDeposit || 0,
            balance: productQuote.Figures.Advance || 0,
            apr: productQuote.Figures.APR || 0,
            rate_of_interest: productQuote.Figures.InterestRate || 0,
            term: productQuote.Figures.Term || 0,
            regular_payment: productQuote.Figures.RegularPayment || 0,
            final_payment: productQuote.Figures.FinalPayment || 0,
            total_amount_payable: productQuote.Figures.TotalPayable || 0,
            total_charge_for_credit: productQuote.Figures.TotalCharges || 0,
            amount_of_credit: productQuote.Figures.Advance || 0,
            lender: productQuote.FunderCode || '',
            annual_mileage: annualMileage,
            excess_mileage_rate: 0,
            residual: 0
        };
    }

    /**
     * Create PCP finance data object
     * @param {Object} productQuote - The product quote data
     * @param {number} annualMileage - Annual mileage
     * @returns {Object} - PCP finance data object
     */
    createPcpData(productQuote, annualMileage) {
        const annualDistanceQuoted = productQuote.Figures.Asset?.AnnualDistanceQuoted || annualMileage || 0;

        return {
            type: 'finance_pcp',
            name: 'PCP',
            finance_type: 'PCP',
            cash_price: productQuote.Figures.TotalCashPrice || 0,
            total_price: productQuote.Figures.TotalCashPrice || 0,
            deposit: productQuote.Figures.TotalDeposit || 0,
            balance: productQuote.Figures.Advance || 0,
            apr: productQuote.Figures.APR || 0,
            rate_of_interest: productQuote.Figures.InterestRate || 0,
            term: productQuote.Figures.Term || 0,
            regular_payment: productQuote.Figures.RegularPayment || 0,
            final_payment: productQuote.Figures.FinalPayment || 0,
            total_amount_payable: productQuote.Figures.TotalPayable || 0,
            total_charge_for_credit: productQuote.Figures.TotalCharges || 0,
            amount_of_credit: productQuote.Figures.Advance || 0,
            lender: productQuote.FunderCode || '',
            annual_mileage: annualDistanceQuoted,
            contract_mileage: this.calculateContractMileage(annualDistanceQuoted, productQuote.Figures.Term || 0),
            excess_mileage_rate: productQuote.Figures.Asset?.ChargePerOverDistanceUnit || 0,
            residual: productQuote.Figures.Balloon || 0,
            price_to_buy: productQuote.Figures.FinalPayment || 0
        };
    }

    /**
     * Format date from format "/Date(timestamp)/" to "DD/MM/YYYY"
     * @param {string} dateString - The date string to format
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        try {
            const timestamp = parseInt(dateString.match(/\d+/)[0]);
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-GB');
        } catch (error) {
            return '';
        }
    }

    /**
     * Calculate contract mileage based on annual mileage and term
     * @param {number} annualMileage - Annual mileage
     * @param {number} term - Term in months
     * @returns {number} - Contract mileage
     */
    calculateContractMileage(annualMileage, term) {
        // Convert term from months to years for calculation
        return Math.round(annualMileage * (term / 12));
    }
}

module.exports = QuotewareV3Finance;