/**
 * Extracts finance information from Quoteware V3 API JSON responses
 */
class QuotewareV3Finance {
    constructor(options = {}) {
        this.options = {
            fundersPath: 'quoteware-funders.json',
            ...options
        };
        this.funderMap = {};

        // Auto-load funder mapping if path provided in options
        if (this.options.fundersPath) {
            this.loadFunderMapping(this.options.fundersPath);
        }
    }

    /**
     * Load funder mapping data from file
     * @param {string} filePath - Path to the funder mapping JSON file
     */
    loadFunderMapping(filePath) {
        try {
            const fs = require('fs');
            const path = require('path');

            // Resolve path relative to current file if not absolute
            const resolvedPath = path.isAbsolute(filePath) ?
                filePath : path.resolve(__dirname, filePath);

            const fundersData = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
            this.setFunderMapping(fundersData);
        } catch (error) {
            console.error('Error loading funder mapping:', error);
        }
    }

    /**
     * Set funder mapping data
     * @param {Object} fundersData - JSON object containing funder mapping
     */
    setFunderMapping(fundersData) {
        if (fundersData && fundersData.Funders) {
            fundersData.Funders.forEach(funder => {
                if (funder.Code && funder.Name) {
                    this.funderMap[funder.Code] = funder.Name;
                }
            });
        }
    }

    /**
     * Process JSON data to extract finance information
     * @param {Object|string} data - The JSON data or string to process
     * @returns {Array|null} - Array of finance items or null if not found
     */
    process(data) {
        try {
            let jsonData = typeof data === 'string' ? JSON.parse(data) : data;

            // Only process detailed format (scratch_167.json)
            if (!jsonData.QuoteResults || !jsonData.QuoteResults.length) {
                return null;
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

        if (!jsonData.QuoteResults || !jsonData.QuoteResults.length) {
            return null;
        }

        // Get the first QuoteResult
        const quoteResult = jsonData.QuoteResults[0];

        if (!quoteResult.Results || !quoteResult.Results.length) {
            return null;
        }

        // Get the first Result
        const result = quoteResult.Results[0];

        // Extract vehicle information
        if (result.Asset) {
            const vehicleData = {
                type: 'vehicle',
                registration_number: result.Asset.RegistrationMark || '',
                registration_date: result.Asset.RegistrationDate ? this.formatDate(result.Asset.RegistrationDate) : '',
                mileage: result.Asset.CurrentOdometerReading || 0,
                status: result.Asset.Condition || ''
            };
            results.push(vehicleData);
        }

        // Process ProductGroups
        if (result.ProductGroups && result.ProductGroups.length > 0) {
            for (const productGroup of result.ProductGroups) {
                if (!productGroup.ProductQuotes || !productGroup.ProductQuotes.length) {
                    continue;
                }

                // Find the first valid product quote (no errors and has figures)
                const productQuote = productGroup.ProductQuotes.find(quote =>
                    !quote.hasErrors && quote.Figures);

                if (!productQuote) {
                    continue;
                }

                // Create finance data based on facility type
                switch (productGroup.FacilityType) {
                    case 'HP':
                        results.push(this.createHpData(productQuote, result.Asset?.RequestedAnnualDistance || 0));
                        break;
                    case 'PCP':
                        results.push(this.createPcpData(productQuote, result.Asset?.RequestedAnnualDistance || 0));
                        break;
                    case 'LP':
                        results.push(this.createLpData(productQuote, result.Asset?.RequestedAnnualDistance || 0));
                        break;
                    case 'CS':
                        results.push(this.createCsData(productQuote, result.Asset?.RequestedAnnualDistance || 0));
                        break;
                }
            }
        }

        return results.length > 0 ? results : null;
    }

    /**
     * Get funder name from code
     * @param {string} funderCode - Funder code
     * @returns {string} - Funder name or original code if not found
     */
    getFunderName(funderCode) {
        return this.funderMap[funderCode] || funderCode;
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
            lender: this.getFunderName(productQuote.FunderCode) || '',
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
            lender: this.getFunderName(productQuote.FunderCode) || '',
            annual_mileage: annualDistanceQuoted,
            contract_mileage: this.calculateContractMileage(annualDistanceQuoted, productQuote.Figures.Term || 0),
            excess_mileage_rate: productQuote.Figures.Asset?.ChargePerOverDistanceUnit || 0,
            residual: productQuote.Figures.Balloon || 0,
            price_to_buy: productQuote.Figures.FinalPayment || 0
        };
    }

    /**
     * Create LP (Lease Purchase) finance data object
     * @param {Object} productQuote - The product quote data
     * @param {number} annualMileage - Annual mileage
     * @returns {Object} - LP finance data object
     */
    createLpData(productQuote, annualMileage) {
        return {
            type: 'finance_lp',
            name: 'LP',
            finance_type: 'Lease Purchase',
            cash_price: productQuote.Figures.TotalCashPrice || 0,
            total_price: productQuote.Figures.TotalCashPrice || 0,
            deposit: productQuote.Figures.TotalDeposit || 0,
            balance: productQuote.Figures.Advance || 0,
            apr: productQuote.Figures.APR || 0,
            rate_of_interest: productQuote.Figures.InterestRate || 0,
            term: productQuote.Figures.Term || 0,
            regular_payment: productQuote.Figures.RegularPayment || 0,
            final_payment: productQuote.Figures.FinalPayment || 0,
            balloon: productQuote.Figures.Balloon || 0,
            total_amount_payable: productQuote.Figures.TotalPayable || 0,
            total_charge_for_credit: productQuote.Figures.TotalCharges || 0,
            amount_of_credit: productQuote.Figures.Advance || 0,
            lender: this.getFunderName(productQuote.FunderCode) || '',
            annual_mileage: annualMileage,
            excess_mileage_rate: productQuote.Figures.Asset?.ChargePerOverDistanceUnit || 0,
            residual: productQuote.Figures.Balloon || 0,
            price_to_buy: productQuote.Figures.FinalPayment || 0
        };
    }

    /**
     * Create CS (Conditional Sale) finance data object
     * @param {Object} productQuote - The product quote data
     * @param {number} annualMileage - Annual mileage
     * @returns {Object} - CS finance data object
     */
    createCsData(productQuote, annualMileage) {
        return {
            type: 'finance_cs',
            name: 'CS',
            finance_type: 'Conditional Sale',
            cash_price: productQuote.Figures.TotalCashPrice || 0,
            total_price: productQuote.Figures.TotalCashPrice || 0,
            deposit: productQuote.Figures.TotalDeposit || 0,
            balance: productQuote.Figures.Advance || 0,
            apr: productQuote.Figures.APR || 0,
            rate_of_interest: productQuote.Figures.InterestRate || 0,
            term: productQuote.Figures.Term || 0,
            regular_payment: productQuote.Figures.RegularPayment || 0,
            final_payment: productQuote.Figures.FinalPayment || 0,
            balloon: productQuote.Figures.Balloon || 0,
            total_amount_payable: productQuote.Figures.TotalPayable || 0,
            total_charge_for_credit: productQuote.Figures.TotalCharges || 0,
            amount_of_credit: productQuote.Figures.Advance || 0,
            lender: this.getFunderName(productQuote.FunderCode) || '',
            annual_mileage: annualMileage,
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
        return Math.round(annualMileage * (term / 12));
    }
}

module.exports = QuotewareV3Finance;