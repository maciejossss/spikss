const AuthService = require('../services/AuthService');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class AuthController {
    /**
     * Login handler
     */
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                throw new Error('Username and password are required');
            }

            const result = await AuthService.authenticate(username, password);
            res.json(result);
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_LOGIN');
            res.status(401).json(errorResponse);
        }
    }

    /**
     * Change password handler
     */
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!oldPassword || !newPassword) {
                throw new Error('Old password and new password are required');
            }

            const result = await AuthService.changePassword(userId, oldPassword, newPassword);
            res.json(result);
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_CHANGE_PASSWORD');
            res.status(400).json(errorResponse);
        }
    }

    /**
     * Get current user handler
     */
    async getCurrentUser(req, res) {
        try {
            const user = await AuthService.getUserById(req.user.id);
            if (!user) {
                throw new Error('User not found');
            }
            res.json(user);
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_GET_USER');
            res.status(400).json(errorResponse);
        }
    }

    /**
     * Logout handler
     */
    async logout(req, res) {
        try {
            // W przyszłości można dodać blacklistę tokenów
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_LOGOUT');
            res.status(400).json(errorResponse);
        }
    }
}

module.exports = new AuthController(); 