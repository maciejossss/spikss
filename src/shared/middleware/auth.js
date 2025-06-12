/**
 * Authentication Middleware for System Serwisowy Palniki & Kotły
 * Verifies JWT tokens and attaches user data to request
 */

const jwt = require('jsonwebtoken');
const AuthService = require('../../modules/auth/services/AuthService');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

/**
 * Authentication middleware
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No token provided');
        }

        // Verify token
        const token = authHeader.split(' ')[1];
        const decoded = AuthService.verifyToken(token);

        // Add user to request
        req.user = decoded;
        next();
    } catch (error) {
        const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_MIDDLEWARE');
        res.status(401).json(errorResponse);
    }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            if (!roles.includes(req.user.role)) {
                throw new Error('Insufficient permissions');
            }

            next();
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_ROLE_CHECK');
            res.status(403).json(errorResponse);
        }
    };
};

/**
 * Permission-based authorization middleware
 */
const requirePermission = (resource, action) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const userPermissions = req.user.permissions[resource] || [];
            if (!userPermissions.includes(action)) {
                throw new Error(`Insufficient permissions for ${resource}:${action}`);
            }

            next();
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_PERMISSION_CHECK');
            res.status(403).json(errorResponse);
        }
    };
};

module.exports = {
    authMiddleware,
    requireRole,
    requirePermission
}; 