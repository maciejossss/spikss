const { authService } = require('../../../shared/auth/AuthService');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class AuthController {
    /**
     * Login handler
     */
    async login(req, res) {
        try {
            const { username, password } = req.body;
            
            ModuleErrorHandler.logger.debug(`Login attempt for user: ${username}`);

            if (!username || !password) {
                ModuleErrorHandler.logger.warn('Login attempt without username or password');
                throw new Error('Username and password are required');
            }

            const user = await authService.validateUser(username, password);
            if (!user) {
                ModuleErrorHandler.logger.warn(`Failed login attempt for user: ${username}`);
                throw new Error('Invalid username or password');
            }

            const token = authService.tokenService.generateToken(user);
            ModuleErrorHandler.logger.info(`Successful login for user: ${username}`);
            
            res.json({ success: true, token, user });
        } catch (error) {
            ModuleErrorHandler.logger.error('Login error:', error);
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

            ModuleErrorHandler.logger.debug(`Password change attempt for user ID: ${userId}`);

            if (!oldPassword || !newPassword) {
                ModuleErrorHandler.logger.warn('Password change attempt without old or new password');
                throw new Error('Old password and new password are required');
            }

            const result = await authService.changePassword(userId, oldPassword, newPassword);
            ModuleErrorHandler.logger.info(`Password changed successfully for user ID: ${userId}`);
            
            res.json(result);
        } catch (error) {
            ModuleErrorHandler.logger.error('Password change error:', error);
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_CHANGE_PASSWORD');
            res.status(400).json(errorResponse);
        }
    }

    /**
     * Get current user handler
     */
    async getCurrentUser(req, res) {
        try {
            const userId = req.user.id;
            ModuleErrorHandler.logger.debug(`Getting user data for ID: ${userId}`);

            const user = await authService.userService.getUserById(userId);
            if (!user) {
                ModuleErrorHandler.logger.warn(`User not found for ID: ${userId}`);
                throw new Error('User not found');
            }

            res.json(user);
        } catch (error) {
            ModuleErrorHandler.logger.error('Get user error:', error);
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_GET_USER');
            res.status(400).json(errorResponse);
        }
    }

    /**
     * Logout handler
     */
    async logout(req, res) {
        try {
            const userId = req.user?.id;
            ModuleErrorHandler.logger.info(`Logout for user ID: ${userId}`);
            // W przyszłości można dodać blacklistę tokenów
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            ModuleErrorHandler.logger.error('Logout error:', error);
            const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_LOGOUT');
            res.status(400).json(errorResponse);
        }
    }
}

module.exports = new AuthController(); 