/**
 * RULE 1: CENTRAL AUTHORIZATION
 * Central authentication and authorization service for all modules
 * JWT-based authentication with role-based access control
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, this.bcryptRounds);
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} Match result
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     * @param {Object} payload - Token payload (user data)
     * @returns {string} JWT token
     */
    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: this.jwtExpiresIn 
        });
    }

    /**
     * Generate refresh token
     * @param {Object} payload - Token payload
     * @returns {string} Refresh token
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: this.refreshExpiresIn 
        });
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    verifyToken(token) {
        return jwt.verify(token, this.jwtSecret);
    }

    /**
     * Extract token from request headers
     * @param {Object} req - Express request object
     * @returns {string|null} Token or null
     */
    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * Authentication middleware
     * @returns {Function} Express middleware
     */
    authenticate() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token not provided'
                    });
                }

                const decoded = this.verifyToken(token);
                req.user = decoded;
                next();
            } catch (error) {
                const errorResponse = ModuleErrorHandler.handleError(
                    error, 
                    'AUTH_SERVICE', 
                    { url: req.url, method: req.method }
                );
                
                res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
        };
    }

    /**
     * Authorization middleware - check user roles
     * @param {Array<string>} allowedRoles - Allowed roles for the endpoint
     * @returns {Function} Express middleware
     */
    authorize(allowedRoles = []) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                }

                // Admin has access to everything
                if (req.user.role === 'admin') {
                    return next();
                }

                // Check if user role is in allowed roles
                if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }

                next();
            } catch (error) {
                const errorResponse = ModuleErrorHandler.handleError(
                    error, 
                    'AUTH_SERVICE', 
                    { userId: req.user?.id, requiredRoles: allowedRoles }
                );
                
                res.status(403).json({
                    success: false,
                    message: 'Authorization failed'
                });
            }
        };
    }

    /**
     * Module access control - check if user can access specific module
     * @param {string} moduleName - Name of the module
     * @param {string} action - Action being performed (read, write, delete)
     * @returns {Function} Express middleware
     */
    moduleAccess(moduleName, action = 'read') {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                }

                // Admin has full access
                if (req.user.role === 'admin') {
                    return next();
                }

                // Check module permissions
                const permissions = req.user.permissions || {};
                const modulePermissions = permissions[moduleName] || [];

                if (!modulePermissions.includes(action) && !modulePermissions.includes('all')) {
                    return res.status(403).json({
                        success: false,
                        message: `No ${action} access to ${moduleName} module`
                    });
                }

                next();
            } catch (error) {
                const errorResponse = ModuleErrorHandler.handleError(
                    error, 
                    'AUTH_SERVICE', 
                    { 
                        userId: req.user?.id, 
                        module: moduleName, 
                        action 
                    }
                );
                
                res.status(403).json({
                    success: false,
                    message: 'Module access check failed'
                });
            }
        };
    }

    /**
     * Health check for auth service
     * @returns {Object} Health status
     */
    healthCheck() {
        return {
            service: 'AuthService',
            status: 'healthy',
            config: {
                jwtExpiresIn: this.jwtExpiresIn,
                refreshExpiresIn: this.refreshExpiresIn,
                bcryptRounds: this.bcryptRounds
            }
        };
    }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService; 