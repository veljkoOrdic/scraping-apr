module.exports = {
    // Inherit from request-blocker.js and override specific values
    blockDomains: [
        'example.com'
    ],
    blockPatterns: [
        // '\\/api\\/',
        // '\\/Dealer\\/',
        '\\/\\/plugins\.',
        '\\/\\/test\.',
    ],
};