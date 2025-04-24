/**
 * Error handling utility for the application
 * Centralizes error handling logic for browser operations
 */
// lib/AppErrorHandler.js

class AppErrorHandler {
    /**
     * Create a new AppErrorHandler
     * @param {Object} app - App instance for logging
     */
    constructor(app) {
        this.app = app;
        this.registerGlobalHandlers();
    }

    /**
     * Check if an error is related to browser disconnection or closing
     * @param {Error|string|any} error - Error object or message string
     * @returns {boolean} - True if it's a known browser disconnect error
     */
    isBrowserDisconnectError(error) {
        // Extract error message in a more readable way
        let errorMessage = '';

        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = String(error);
            }
        }

        return (
            errorMessage.includes('Navigating frame was detached') ||
            errorMessage.includes('Protocol error') ||
            errorMessage.includes('Target closed') ||
            errorMessage.includes('disconnected')
        );
    }

    /**
     * Check if an error can be safely ignored
     * @param {Error|string|any} error - Error object or message
     * @returns {boolean} - True if the error can be ignored
     */
    isIgnorableError(error) {
        // Check if it's a browser disconnect error
        if (this.isBrowserDisconnectError(error)) return true;

        // Add more categories of ignorable errors here in the future

        return false;
    }

    /**
     * Handle an ignorable error
     * @param {string} source - Source of the error
     * @param {Error|string|any} error - Error object or message
     * @param {string} context - Context in which the error occurred
     */
    handleIgnorableError(source, error, context = 'operation') {
        // Extract error message in a more readable way
        let errorMessage = '';

        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = String(error);
            }
        }

        const message = `This error is expected during browser ${context} - continuing shutdown`;
        console.log(message, errorMessage);
        this.app.info(source, message, { errorMessage });
    }

    /**
     * Standardized error logging
     * @param {string} source - Source of the error
     * @param {Error|string|any} error - Error object or message
     * @param {Object} metadata - Additional metadata
     */
    logError(source, error, metadata = {}) {
        // Extract error message in a more readable way
        let errorMessage = 'Unknown error';
        let errorData = {};

        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.message) {
                errorMessage = error.message;
                // Extract stack trace if available
                if (error.stack) {
                    errorData.stack = error.stack;
                }
            } else {
                errorMessage = String(error);
            }
        }

        console.error(`${source}: ${errorMessage}`);
        this.app.error(source, errorMessage, { ...metadata, ...errorData });
    }

    /**
     * Set up global error handlers
     */
    registerGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            if (this.isIgnorableError(error)) {
                this.handleIgnorableError('UncaughtException', error, 'closing');

                // Exit after a brief delay to allow any pending writes to complete
                setTimeout(() => {
                    this.app.exit(0);
                }, 500);
            } else {
                // For other unexpected errors, exit with error code
                this.logError('UncaughtException', error);
                this.app.exit(1);
            }
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (error, promise) => {
            this.logError('UnhandledRejection', error);

            // If it's a known browser error during closing, ignore it
            if (this.isIgnorableError(error)) {
                this.handleIgnorableError('UnhandledRejection', error, 'closing');
            }
            // We don't exit the process here, just log it
        });

        console.log('Global error handlers registered');
        this.app.info('AppErrorHandler', 'Global error handlers registered');
    }
}

module.exports = AppErrorHandler;