module.exports = {
    blockDomains: [
        'google-analytics.com',
        'doubleclick.net',
        'facebook.net',
        'hotjar.com',
        'clarity.ms'
    ],
    blockTypes: [
        'image',
        'font',
        'media'
    ],
    blockPatterns: [
        '\\.(png|jpg|gif|webp)$',
        '\\/tracking\\/',
        '\\/analytics\\/',
        '\\/pixel\\/'
    ],
    excludePatterns: [
        '\\/required-asset\\/',
        '\\/api\\/'
    ],
    logBlocked: false
};