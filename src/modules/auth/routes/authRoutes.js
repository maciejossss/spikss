const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authMiddleware } = require('../../../shared/middleware/auth');

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.use(authMiddleware);
router.post('/logout', AuthController.logout);
router.post('/change-password', AuthController.changePassword);
router.get('/me', AuthController.getCurrentUser);

module.exports = router; 