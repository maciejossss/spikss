const jwt = require('jsonwebtoken');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class JWTManager {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';
        this.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
        this.logger = ModuleErrorHandler.logger;
    }

    static getInstance() {
        if (!JWTManager.instance) {
            JWTManager.instance = new JWTManager();
        }
        return JWTManager.instance;
    }

    generateAccessToken(payload) {
        try {
            return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
        } catch (error) {
            this.logger.error('Error generating access token:', error);
            throw new Error('Access token generation failed');
        }
    }

    generateRefreshToken(payload) {
        try {
            return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRY });
        } catch (error) {
            this.logger.error('Error generating refresh token:', error);
            throw new Error('Refresh token generation failed');
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            }
            this.logger.error('Error verifying token:', error);
            throw new Error('Invalid token');
        }
    }

    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            this.logger.error('Error decoding token:', error);
            throw new Error('Token decode failed');
        }
    }

    refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken);
            delete decoded.exp;
            delete decoded.iat;
            return this.generateAccessToken(decoded);
        } catch (error) {
            this.logger.error('Error refreshing access token:', error);
            throw new Error('Token refresh failed');
        }
    }
}

module.exports = JWTManager; 