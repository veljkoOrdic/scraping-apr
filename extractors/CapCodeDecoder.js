/**
 * Utility class to decode CAP HPI codes into manufacturer and model information
 */
class CapCodeDecoder {
    constructor() {
        this.manufacturers = require('./cap_codes.json');
    }

    /**
     * Decode a CAP code to extract manufacturer and model
     * @param {string} capCode - The CAP code to decode
     * @returns {Object} Object containing manufacturer and model information
     */
    decode(capCode) {
        if (!capCode || typeof capCode !== 'string' || capCode.length < 2) {
            return { manufacturer: '', model: '' };
        }

        // Normalize the CAP code
        capCode = capCode.trim().toUpperCase();

        // Extract the make code (first 2 characters)
        const makeCode = capCode.substring(0, 2);

        // Look up the manufacturer
        const manufacturerData = this.manufacturers[makeCode] || null;

        if (!manufacturerData) {
            return { manufacturer: '', model: '' };
        }

        // Get the manufacturer name
        const manufacturer = manufacturerData.manufacturer;

        // Extract model code (next 2 characters)
        let model = '';
        if (capCode.length >= 4) {
            const modelCode = capCode.substring(2, 4);

            if (manufacturerData.models && manufacturerData.models[modelCode]) {
                model = manufacturerData.models[modelCode];
            }
        }

        return { manufacturer, model };
    }
}

module.exports = CapCodeDecoder;