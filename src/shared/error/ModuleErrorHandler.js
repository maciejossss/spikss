/**
 * RULE 2: ERROR ISOLATION
 * Central error handler for all modules
 * Ensures that errors in one module don't crash others
 */

const winston = require('winston');

class ModuleErrorHandler {
    static logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }),
            new winston.transports.File({ 
                filename: process.env.LOG_FILE || './logs/app.log' 
            })
        ]
    });

    /**
     * Handle module-specific errors with isolation
     * @param {Error} error - The error object
     * @param {string} moduleName - Name of the module where error occurred
     * @param {Object} context - Additional context information
     * @returns {Object} Standardized error response
     */
    static handleError(error, moduleName, context = {}) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();
        
        // Log error with full context
        this.logger.error(`ERROR in ${moduleName}:`, {
            errorId,
            moduleName,
            message: error.message,
            stack: error.stack,
            context,
            timestamp
        });

        // Return standardized error response
        return {
            success: false,
            module: moduleName,
            error: {
                id: errorId,
                message: this.sanitizeErrorMessage(error.message),
                timestamp,
                context: this.sanitizeContext(context)
            }
        };
    }

    /**
     * Handle async operations with error isolation
     * @param {Function} operation - Async operation to execute
     * @param {string} moduleName - Name of the module
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Result or error response
     */
    static async executeWithIsolation(operation, moduleName, context = {}) {
        try {
            const result = await operation();
            return {
                success: true,
                module: moduleName,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return this.handleError(error, moduleName, context);
        }
    }

    /**
     * Middleware for Express route error handling
     * @param {string} moduleName - Name of the module
     * @returns {Function} Express middleware function
     */
    static middleware(moduleName) {
        return (error, req, res, next) => {
            const context = {
                method: req.method,
                url: req.url,
                body: req.body,
                params: req.params,
                query: req.query,
                user: req.user?.id || 'anonymous'
            };

            const errorResponse = this.handleError(error, moduleName, context);
            
            // Don't expose internal errors in production
            if (process.env.NODE_ENV === 'production') {
                delete errorResponse.error.context;
            }

            res.status(this.getHttpStatusCode(error)).json(errorResponse);
        };
    }

    /**
     * Health check for module
     * @param {string} moduleName - Name of the module
     * @param {Function} healthCheck - Function to check module health
     * @returns {Object} Health status
     */
    static async checkModuleHealth(moduleName, healthCheck) {
        try {
            const start = Date.now();
            const result = await Promise.race([
                healthCheck(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Health check timeout')), 
                    process.env.MODULE_TIMEOUT || 5000)
                )
            ]);
            
            const responseTime = Date.now() - start;
            
            return {
                module: moduleName,
                status: 'healthy',
                responseTime,
                timestamp: new Date().toISOString(),
                details: result
            };
        } catch (error) {
            return {
                module: moduleName,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate unique error ID
     * @returns {string} Unique error identifier
     */
    static generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitize error message for client response
     * @param {string} message - Original error message
     * @returns {string} Sanitized message
     */
    static sanitizeErrorMessage(message) {
        // Handle undefined or null messages
        if (!message) return 'An error occurred';
        
        // Remove sensitive information from error messages
        const sensitivePatterns = [
            /password/gi,
            /token/gi,
            /secret/gi,
            /key/gi,
            /credential/gi
        ];

        let sanitized = message;
        sensitivePatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });

        return sanitized;
    }

    /**
     * Sanitize context data
     * @param {Object} context - Context object
     * @returns {Object} Sanitized context
     */
    static sanitizeContext(context) {
        const sanitized = { ...context };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Get appropriate HTTP status code for error
     * @param {Error} error - Error object
     * @returns {number} HTTP status code
     */
    static getHttpStatusCode(error) {
        if (error.status) return error.status;
        if (error.name === 'ValidationError') return 400;
        if (error.name === 'UnauthorizedError') return 401;
        if (error.name === 'ForbiddenError') return 403;
        if (error.name === 'NotFoundError') return 404;
        return 500;
    }
}

module.exports = ModuleErrorHandler; 