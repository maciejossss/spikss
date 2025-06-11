/**
 * Permissions Middleware for System Serwisowy Palniki & Kotły
 * Checks user permissions for specific modules and actions
 */

const ModuleErrorHandler = require('../error/ModuleErrorHandler');

/**
 * Permission middleware factory
 * @param {string} module - Module name (e.g., 'clients', 'devices', 'service-records', 'scheduling')
 * @param {string} action - Action type ('read', 'write', 'delete')
 * @returns {Function} Express middleware function
 */
function permissionMiddleware(module, action) {
    return function(req, res, next) {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin users have access to everything
            if (req.user.role === 'admin') {
                ModuleErrorHandler.logger.debug(`Admin access granted: ${req.user.username} -> ${module}:${action}`);
                return next();
            }

            // Check user permissions
            const userPermissions = req.user.permissions || {};
            const modulePermissions = userPermissions[module];

            if (!modulePermissions) {
                ModuleErrorHandler.logger.warn(`Access denied - no module permissions: ${req.user.username} -> ${module}:${action}`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied to ${module} module`
                });
            }

            // Check specific action permission
            if (!modulePermissions[action]) {
                ModuleErrorHandler.logger.warn(`Access denied - no action permission: ${req.user.username} -> ${module}:${action}`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied: cannot ${action} in ${module} module`
                });
            }

            ModuleErrorHandler.logger.debug(`Access granted: ${req.user.username} -> ${module}:${action}`);
            next();

        } catch (error) {
            ModuleErrorHandler.logger.error('Permission middleware error:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Permission check error'
            });
        }
    };
}

/**
 * Check if user has specific permission
 * @param {Object} user - User object from request
 * @param {string} module - Module name
 * @param {string} action - Action type
 * @returns {boolean} True if user has permission
 */
function hasPermission(user, module, action) {
    if (!user) return false;
    
    // Admin users have all permissions
    if (user.role === 'admin') return true;
    
    const userPermissions = user.permissions || {};
    const modulePermissions = userPermissions[module];
    
    return modulePermissions && modulePermissions[action];
}

/**
 * Role-based access middleware
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
function roleMiddleware(allowedRoles) {
    return function(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            
            if (!roles.includes(req.user.role)) {
                ModuleErrorHandler.logger.warn(`Role access denied: ${req.user.username} (${req.user.role}) -> required: ${roles.join(',')}`);
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient role privileges'
                });
            }

            ModuleErrorHandler.logger.debug(`Role access granted: ${req.user.username} (${req.user.role})`);
            next();

        } catch (error) {
            ModuleErrorHandler.logger.error('Role middleware error:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Role check error'
            });
        }
    };
}

/**
 * Owner access middleware - checks if user owns the resource
 * @param {string} userIdField - Field name in params/body that contains user ID
 * @returns {Function} Express middleware function
 */
function ownerMiddleware(userIdField = 'userId') {
    return function(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin users can access all resources
            if (req.user.role === 'admin') {
                return next();
            }

            const resourceUserId = req.params[userIdField] || req.body[userIdField];
            
            if (!resourceUserId) {
                return res.status(400).json({
                    success: false,
                    message: `Resource owner ID (${userIdField}) is required`
                });
            }

            if (req.user.id !== resourceUserId) {
                ModuleErrorHandler.logger.warn(`Owner access denied: ${req.user.username} -> resource owned by ${resourceUserId}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: you can only access your own resources'
                });
            }

            ModuleErrorHandler.logger.debug(`Owner access granted: ${req.user.username} -> own resource`);
            next();

        } catch (error) {
            ModuleErrorHandler.logger.error('Owner middleware error:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Owner check error'
            });
        }
    };
}

module.exports = permissionMiddleware;
module.exports.hasPermission = hasPermission;
module.exports.roleMiddleware = roleMiddleware;
module.exports.ownerMiddleware = ownerMiddleware; 