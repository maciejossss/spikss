const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DatabaseService } = require('../database/database');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class AuthService {
    constructor() {
        this.db = DatabaseService.getInstance();
        this.logger = ModuleErrorHandler.logger;
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.TOKEN_EXPIRY = '24h';
    }

    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    static authenticate() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({
                        success: false,
                        message: 'No authorization header'
                    });
                }

                const token = authHeader.split(' ')[1];
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'No token provided'
                    });
                }

                const instance = AuthService.getInstance();
                const decoded = instance.verifyToken(token);
                req.user = decoded;
                next();
            } catch (error) {
                ModuleErrorHandler.logger.error('Authentication failed:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        };
    }

    static moduleAccess(module, permission) {
        return (req, res, next) => {
            try {
                // W trybie development, pomijamy sprawdzanie uprawnień
                if (process.env.NODE_ENV === 'development') {
                    return next();
                }

                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                }

                // Sprawdź czy użytkownik ma wymagane uprawnienia
                const userPermissions = req.user.permissions || {};
                if (!userPermissions[module] || !userPermissions[module].includes(permission)) {
                    return res.status(403).json({
                        success: false,
                        message: `Insufficient permissions for ${module}:${permission}`
                    });
                }

                next();
            } catch (error) {
                ModuleErrorHandler.logger.error('Module access check failed:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error during permission check'
                });
            }
        };
    }

    static healthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString()
        };
    }

    async validateUser(username, password) {
        try {
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await this.db.query(query, [username]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return null;
            }

            delete user.password;
            return user;
        } catch (error) {
            this.logger.error('Error validating user:', error);
            throw new Error('Authentication failed');
        }
    }

    generateToken(user) {
        try {
            const payload = {
                id: user.id,
                username: user.username,
                role: user.role,
                permissions: user.permissions
            };

            return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
        } catch (error) {
            this.logger.error('Error generating token:', error);
            throw new Error('Token generation failed');
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            this.logger.error('Error verifying token:', error);
            throw new Error('Invalid token');
        }
    }

    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async createUser(userData) {
        try {
            const hashedPassword = await this.hashPassword(userData.password);
            const query = `
                INSERT INTO users (username, password, email, role, permissions)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, username, email, role, permissions
            `;
            
            const result = await this.db.query(query, [
                userData.username,
                hashedPassword,
                userData.email,
                userData.role || 'user',
                userData.permissions || []
            ]);

            return result.rows[0];
        } catch (error) {
            this.logger.error('Error creating user:', error);
            throw new Error('User creation failed');
        }
    }
}

module.exports = AuthService; 