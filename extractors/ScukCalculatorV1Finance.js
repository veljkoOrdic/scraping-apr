/**
 * Extracts finance info from ScukCalculator V1 API JSON
 */
class ScukCalculatorV1Finance {
    constructor(options = {}) {
        this.options = { ...options };
    }

    /**
     * Process the init request and response data
     * @param {string|object} postData - request payload
     * @param {object} data - response.data object
     * @returns {object} - { vehicle, lender, eligibleProducts }
     */
    init(postData, data) {
        let parsedPost;
        if (typeof postData === 'string') {
            try {
                parsedPost = JSON.parse(postData);
            } catch (e) {
                parsedPost = {};
            }
        } else {
            parsedPost = postData;
        }

        const vehicle = {
            type: 'vehicle',
            manufacturer: parsedPost.vehicle_make || null,
            model: parsedPost.vehicle_model || null,
            derivative: parsedPost.vehicle_derivative || null,
            variant: null, // not in payload
            registration_number: parsedPost.vrm || null,
            registration_date: parsedPost.date_first_registered || null,
            mileage: parsedPost.mileage || null,
            status: parsedPost.category || null,
            url: parsedPost.url || null
        };


        const lender = data.skin || 'unknown';

        const eligibleProducts = [];
        for (const [key, val] of Object.entries(data.products || {})) {
            if (val.eligible) eligibleProducts.push(key.toLowerCase());
        }

        return { vehicle, lender, eligibleProducts };
    }

    /**
     * Process quote object and return finance data
     * @param {object|string} input - JSON or string
     * @returns {Array<object>}
     */
    process(input) {
        const json = typeof input === 'string' ? JSON.parse(input) : input;
        const quote = json?.data?.quote;
        if (!quote) return [];

        const productType = quote.producttype?.toLowerCase() || 'unknown';
        const deposit = parseFloat(quote.cashdeposit || 0);
        const total = parseFloat(quote.totalamount || 0);
        const cashPrice = parseFloat(quote.ontheroadcashprice || 0);

        const financeData = {
            type: `finance_${productType}`,
            name: productType.toUpperCase(),
            finance_type: productType.toUpperCase(),
            cash_price: cashPrice,
            total_price: parseFloat(quote.costprice || 0),
            deposit: deposit,
            balance: null,
            apr: quote.apr || null,
            rate_of_interest: quote.paf || null,
            term: quote.period || quote.duration_of_agreement || null,
            regular_payment: quote.regular_monthly_payment || null,
            final_payment: quote.final_payment || quote.regular_monthly_payment || null,
            total_amount_payable: total,
            total_charge_for_credit: quote.interest || null,
            amount_of_credit: (cashPrice - deposit).toFixed(2),
            lender: this.options.lender || 'unknown',

            annual_mileage: quote.annualmileage || null,
            contract_mileage: quote.annualmileage || null,
            excess_mileage_rate: quote.excess_mileage_charge || null,
            residual: quote.final_payment || null,
            price_to_buy: quote.final_payment || null
        };

        return financeData;
    }
}

module.exports = ScukCalculatorV1Finance;
