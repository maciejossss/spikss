/**
 * Authentication Middleware for System Serwisowy Palniki & Kotły
 * Verifies JWT tokens and attaches user data to request
 */

const jwt = require('jsonwebtoken');
const AuthService = require('../auth/AuthService');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format. Use: Bearer <token>'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');

        // Attach user data to request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            permissions: decoded.permissions || {}
        };

        ModuleErrorHandler.logger.debug(`User authenticated: ${req.user.username} (${req.user.role})`);

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token has expired'
            });
        }

        ModuleErrorHandler.logger.error('Auth middleware error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
}

module.exports = authMiddleware; 