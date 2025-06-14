const express = require('express');
const SystemController = require('./SystemController');

const router = express.Router();
const systemController = new SystemController();

// Get system status
router.get('/status', systemController.getSystemStatus.bind(systemController));

// Clear memory cache (safe operation)
router.post('/clear-memory', systemController.clearMemoryCache.bind(systemController));

// Restart server (admin only)
router.post('/restart', systemController.restartServer.bind(systemController));

// Cleanup connections
router.post('/cleanup-connections', systemController.cleanupConnections.bind(systemController));

// Get system logs
router.get('/logs', systemController.getSystemLogs.bind(systemController));

module.exports = router; 