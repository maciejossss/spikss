// Client statistics
router.get('/clients/statistics', authMiddleware, clientController.getClientStatistics.bind(clientController));

// System monitoring
router.get('/system/monitoring', authMiddleware, systemController.getSystemMonitoring.bind(systemController)); 