const JWTManager = require('./JWTManager');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class AuthMiddleware {
    constructor() {
        this.jwtManager = JWTManager.getInstance();
        this.logger = ModuleErrorHandler.logger;
    }

    authenticate() {
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

                const decoded = this.jwtManager.verifyToken(token);
                req.user = decoded;
                next();
            } catch (error) {
                this.logger.error('Authentication middleware error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        };
    }

    authorize(roles = []) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                }

                if (roles.length && !roles.includes(req.user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }

                next();
            } catch (error) {
                this.logger.error('Authorization middleware error:', error);
                return res.status(403).json({
                    success: false,
                    message: 'Authorization failed'
                });
            }
        };
    }

    refreshToken() {
        return async (req, res, next) => {
            try {
                const refreshToken = req.body.refreshToken;
                if (!refreshToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'Refresh token is required'
                    });
                }

                const newAccessToken = this.jwtManager.refreshAccessToken(refreshToken);
                req.newAccessToken = newAccessToken;
                next();
            } catch (error) {
                this.logger.error('Token refresh middleware error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }
        };
    }
}

module.exports = new AuthMiddleware(); 