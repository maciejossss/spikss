const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const DatabaseService = require('../../../shared/database/database');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';
        this.REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    }

    /**
     * Hash password using bcrypt
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Authenticate user and generate tokens
     */
    async authenticate(username, password) {
        try {
            // Find user
            const result = await DatabaseService.query(
                'SELECT * FROM users WHERE username = $1 AND is_active = true',
                [username]
            );

            const user = result.rows[0];
            if (!user) {
                throw new Error('User not found or inactive');
            }

            // Verify password
            const isValid = await this.comparePassword(password, user.password_hash);
            if (!isValid) {
                throw new Error('Invalid password');
            }

            // Generate tokens
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken({ id: user.id });

            // Remove sensitive data
            delete user.password_hash;

            return {
                success: true,
                data: {
                    token,
                    refreshToken,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        permissions: user.permissions
                    }
                }
            };
        } catch (error) {
            throw ModuleErrorHandler.handleError(error, 'AUTH_LOGIN');
        }
    }

    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                permissions: user.permissions
            },
            this.JWT_SECRET,
            { expiresIn: this.TOKEN_EXPIRY }
        );
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.JWT_SECRET, { 
            expiresIn: this.REFRESH_TOKEN_EXPIRY 
        });
    }

    /**
     * Verify token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            throw ModuleErrorHandler.handleError(error, 'AUTH_VERIFY');
        }
    }

    /**
     * Extract token from request headers
     */
    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * Change password
     */
    async changePassword(userId, oldPassword, newPassword) {
        try {
            // Find user
            const result = await DatabaseService.query(
                'SELECT * FROM users WHERE id = $1',
                [userId]
            );

            const user = result.rows[0];
            if (!user) {
                throw new Error('User not found');
            }

            // Verify old password
            const isValid = await this.comparePassword(oldPassword, user.password_hash);
            if (!isValid) {
                throw new Error('Invalid current password');
            }

            // Hash new password
            const newPasswordHash = await this.hashPassword(newPassword);

            // Update password
            await DatabaseService.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newPasswordHash, userId]
            );

            return { 
                success: true,
                message: 'Password updated successfully' 
            };
        } catch (error) {
            throw ModuleErrorHandler.handleError(error, 'AUTH_CHANGE_PASSWORD');
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            const result = await DatabaseService.query(
                'SELECT id, username, first_name, last_name, email, role, permissions, is_active, created_at, updated_at FROM users WHERE id = $1',
                [userId]
            );

            if (!result.rows[0]) {
                throw new Error('User not found');
            }

            return {
                success: true,
                data: result.rows[0]
            };
        } catch (error) {
            throw ModuleErrorHandler.handleError(error, 'AUTH_GET_USER');
        }
    }

    /**
     * Check module access
     */
    checkModuleAccess(user, moduleName, action = 'read') {
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Admin has full access
        if (user.role === 'admin') {
            return true;
        }

        // Check module permissions
        const permissions = user.permissions || {};
        const modulePermissions = permissions[moduleName] || [];

        return modulePermissions.includes(action) || modulePermissions.includes('all');
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            return {
                status: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new AuthService(); 