/**
 * Extracts APR and related finance information from visible HTML content
 */
class SourceAprV1 {
    /**
     * Create a new SourceAprV1 instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            ...options
        };
    }

    /**
     * Process HTML string to extract finance information
     * @param {string} html - The raw HTML string
     * @returns {Array|null} - Array of extracted finance items or null
     */
    process(html) {

        if (typeof html !== 'string') {
            return null;
        }

        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        const aprPattern = /Representative\s+(?:APR\s+)?(\d+\.?\d*)%|Representative\s+(\d+\.?\d*)%\s+APR/i;
        const interestRatePattern = /(?:Rate\s*of\s*interest|interest\s*rate)(?:\s*is|\s*of|\s*)?\s*(\d+\.?\d*)%/i;
        const totalPayablePattern = /(?:total\s*amount\s*payable|total\s*payable)(?:\s*of|\s*is)?\s*(?:£|&pound;)?\s*(\d+(?:,\d+)*\.?\d{0,2})/i;

        const aprMatch = text.match(aprPattern);
        const aprValue = aprMatch ? (aprMatch[1] || aprMatch[2]).trim() : null;

        const interestRateMatch = text.match(interestRatePattern);
        const totalPayableMatch = text.match(totalPayablePattern);

        if (aprMatch) {
            const apr = aprValue;
            const interestRate = interestRateMatch?.[1].trim();
            const totalPayable = totalPayableMatch?.[1].trim();

            return [{
                apr,
                interestRate,
                totalPayable
            }];
        }

        return null;
    }
}

module.exports = SourceAprV1;
