const CarFinancePlugin = require('./CarFinancePlugin');
const app = require('../lib/App');

/**
 * Plugin for monitoring and extracting finance proposal data
 * @extends CarFinancePlugin
 */
class FinanceProposalPlugin extends CarFinancePlugin {
    constructor(options = {}) {
        super({
            blockAfterFind: true,
            stopAfterFind: true,
            closeAfterFind: false,
            ...options
        });

        this.options = {
            ...this.options
        };

    }

    /**
     * Check if a response is from a finance endpoint specific to Scuk
     * @param response
     * @returns {boolean}
     */
    isFinanceEndpoint(response) {
        const url = response.url();
        const method = response.request().method();
        return method === 'GET' && /financeproposal.co.uk\/widget2\//i.test(url);
    }

    /**
     * Check if a response is a potential pcp, ppb, cs endpoint candidate
     * @param response
     * @returns {boolean}
     */
    isCandidateEndpoint(response) {
        const url = response.url();
        return /financeproposal/i.test(url);
    }

    /**
     * Process a quote to extract relevant finance data
     * @param params
     * @param data
     * @returns {{type: string, name, finance_type, cash_price: *, total_price: *, deposit: *, balance: null, apr: *, rate_of_interest: *, term: *, period, regular_payment: *, final_payment: *, total_amount_payable: *, total_charge_for_credit: null, amount_of_credit: null, lender: string, annual_mileage: *, contract_mileage: null, excess_mileage_rate: (*|string), residual: null, price_to_buy: *}}
     */
    processFinance(params, data) {

        let type;
        if (params.type === '1'){
            type = 'HP';
        } else if (params.type === '2') {
            type = 'CS';
        }else {
            type = 'unknown'
        }

        return {
            type: `finance_${type.toLowerCase()}`,
            name: data.product_name,
            finance_type: type,
            cash_price: params.amount,
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
            amount_of_credit: null,
            lender: this.skin || 'unknown',
            annual_mileage: params.annual_mileage,
            contract_mileage: null,
            excess_mileage_rate: null,
            residual: null,
            price_to_buy: params.amount
        };
    }

    /**
     * Process a response to extract vehicle and finance data
     * @param response
     * @returns {Promise<void>}
     */
    async processResponse(response) {
        const url = response.url();

        // Handle init call to get vehicle and product eligibility info
        if (this.isFinanceEndpoint(response)) {
            const parsedUrl = new URL(url);
            const params = Object.fromEntries(parsedUrl.searchParams.entries());

            if (url.includes('/widget.js')) {
                try {
                    if (params) {
                        console.log('Payload vehicle params:', params);
                        this.results.push({
                            type: 'vehicle',
                            price: params.price,
                            registration_date: params.registration_date,
                            registration_number: params.vrm,
                            mileage: params.mileage
                        })
                    }
                } catch (e) {
                    app.error(this.name, `Error in payload processing: ${e.message}`, {url});
                }
            }

            if (params.rep) {
                try {
                    const body = await response.text();
                    const jsonString = body.replace(/^jQuery\d+_\d+\(|\);?$/g, '');
                    const data = JSON.parse(jsonString);

                    const financeData = this.processFinance(params, data);

                    console.log('Finance data:', financeData);
                    this.results.push({
                        ...financeData
                    });
                } catch (e) {
                    app.error(this.name, `Error in finance processing data: ${e.message}`, {url});
                }
            }
        }

    }

}

module.exports = FinanceProposalPlugin;
