/**
 * Get system monitoring data
 * @returns {Object} System monitoring statistics
 */
async getMonitoringData() {
    try {
        const dbStats = await this.systemDatabase.getDatabaseStats();
        const systemStats = await this.systemDatabase.getSystemStats();
        
        return {
            totalConnections: parseInt(dbStats.active_connections) || 0,
            throughput: parseFloat(systemStats.throughput) || 0,
            latency: parseInt(systemStats.avg_latency) || 0,
            errorRate: parseFloat(systemStats.error_rate) || 0
        };
        
    } catch (error) {
        ModuleErrorHandler.handleError(error, 'system', { operation: 'getMonitoringData' });
        throw error;
    }
} 