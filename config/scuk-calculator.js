module.exports = {
    // Inherit from request-blocker.js and override specific values
    blockDomains: [
        'google-analytics.com',
        'doubleclick.net',
        'facebook.net',
        'hotjar.com',
        'clarity.ms',
        'scuk-specific-tracker.com' // Additional domain specific to SCUK
    ],
    excludePatterns: [
        '\\/required-asset\\/',
        '\\/api\\/v1\\/' // More specific API pattern for SCUK
    ]
};