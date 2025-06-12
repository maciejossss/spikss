const { exec, spawn } = require('child_process');
const path = require('path');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');
const DatabaseService = require('../../shared/database/database');

class SystemController {

    /**
     * Get system status
     */
    async getSystemStatus(req, res) {
        try {
            // Get database status
            const dbHealth = await DatabaseService.healthCheck();
            
            // Get connection count
            const connectionCount = await this.getConnectionCount();
            
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            
            // Get uptime
            const uptime = process.uptime();
            
            const status = {
                server: {
                    status: 'running',
                    uptime: this.formatUptime(uptime),
                    port: process.env.PORT || 3001,
                    environment: process.env.NODE_ENV || 'development'
                },
                database: {
                    status: dbHealth.status,
                    connected: DatabaseService.isConnected
                },
                connections: {
                    active: connectionCount,
                    max: 50
                },
                memory: {
                    used: this.formatBytes(memoryUsage.heapUsed),
                    total: this.formatBytes(memoryUsage.heapTotal),
                    external: this.formatBytes(memoryUsage.external),
                    rss: this.formatBytes(memoryUsage.rss)
                },
                lastCheck: new Date().toISOString()
            };

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'SYSTEM_STATUS');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Clear server memory cache (without affecting database)
     */
    async clearMemoryCache(req, res) {
        try {
            ModuleErrorHandler.logger.info('Memory cache clear initiated by user', {
                userId: req.user?.id,
                username: req.user?.username
            });

            // Clear Node.js module cache (selective clearing)
            const beforeCount = Object.keys(require.cache).length;
            
            // Don't clear core modules and database connections
            const protectedModules = [
                'pg', 'express', 'winston', 'bcrypt', 'jsonwebtoken'
            ];

            Object.keys(require.cache).forEach(key => {
                const shouldProtect = protectedModules.some(module => 
                    key.includes(module) || 
                    key.includes('node_modules')
                );
                
                if (!shouldProtect && !key.includes('database') && !key.includes('Database')) {
                    delete require.cache[key];
                }
            });

            const afterCount = Object.keys(require.cache).length;
            const clearedCount = beforeCount - afterCount;

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                ModuleErrorHandler.logger.info('Garbage collection executed');
            }

            const memoryAfter = process.memoryUsage();

            res.json({
                success: true,
                message: 'Pamięć serwera została wyczyszczona',
                data: {
                    modulesClearedCount: clearedCount,
                    modulesRemaining: afterCount,
                    memoryUsage: {
                        heapUsed: this.formatBytes(memoryAfter.heapUsed),
                        heapTotal: this.formatBytes(memoryAfter.heapTotal),
                        external: this.formatBytes(memoryAfter.external)
                    },
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'CLEAR_MEMORY');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Restart server (graceful restart)
     */
    async restartServer(req, res) {
        try {
            ModuleErrorHandler.logger.info('Server restart initiated by user', {
                userId: req.user?.id,
                username: req.user?.username
            });

            // Send response first
            res.json({
                success: true,
                message: 'Serwer zostanie zrestartowany w ciągu 3 sekund',
                data: {
                    restartTime: new Date().toISOString(),
                    estimatedDowntime: '10-15 sekund'
                }
            });

            // Schedule restart after response is sent
            setTimeout(async () => {
                try {
                    // Graceful shutdown of current process
                    await this.gracefulRestart();
                } catch (error) {
                    ModuleErrorHandler.logger.error('Restart failed:', error);
                }
            }, 3000);

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'RESTART_SERVER');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Force cleanup connections (when too many connections)
     */
    async cleanupConnections(req, res) {
        try {
            const connectionsBefore = await this.getConnectionCount();
            
            ModuleErrorHandler.logger.info('Connection cleanup initiated', {
                connectionsBefore,
                userId: req.user?.id
            });

            // This is a placeholder - in a real scenario you might want to:
            // 1. Close idle connections
            // 2. Reset database connection pool
            // 3. Clear any hanging HTTP connections

            // Reset database connection pool
            await DatabaseService.close();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await DatabaseService.initialize();

            const connectionsAfter = await this.getConnectionCount();

            res.json({
                success: true,
                message: 'Połączenia zostały wyczyszczone',
                data: {
                    connectionsBefore,
                    connectionsAfter,
                    cleaned: Math.max(0, connectionsBefore - connectionsAfter),
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'CLEANUP_CONNECTIONS');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get system logs (last 50 entries)
     */
    async getSystemLogs(req, res) {
        try {
            const { limit = 50 } = req.query;

            // In a real implementation, you might read from log files
            // For now, we'll return a placeholder response
            res.json({
                success: true,
                data: {
                    logs: [
                        {
                            timestamp: new Date().toISOString(),
                            level: 'info',
                            message: 'System monitoring active',
                            module: 'SYSTEM'
                        }
                    ],
                    totalLogs: 1,
                    limit: parseInt(limit)
                }
            });

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'GET_LOGS');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get system monitoring data
     * GET /api/system/monitoring
     */
    async getSystemMonitoring(req, res) {
        try {
            const monitoringData = await this.systemService.getMonitoringData();
            
            res.json({
                success: true,
                data: monitoringData
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'system');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Check database schema and connection
     */
    async checkDatabase(req, res) {
        try {
            // Test connection
            const connectionStatus = await DatabaseService.healthCheck();
            
            // Check schema
            const schemaQuery = `
                SELECT 
                    table_name,
                    column_name,
                    data_type,
                    character_maximum_length
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'clients'
                ORDER BY ordinal_position;
            `;
            
            const schemaResult = await DatabaseService.query(schemaQuery);
            
            // Check if any clients exist
            const clientsQuery = 'SELECT COUNT(*) as count FROM clients';
            const clientsResult = await DatabaseService.query(clientsQuery);
            
            res.json({
                success: true,
                connection: connectionStatus,
                schema: schemaResult.rows,
                clientsCount: parseInt(clientsResult.rows[0].count),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'CHECK_DATABASE');
            res.status(500).json(errorResponse);
        }
    }

    // Helper methods

    async getConnectionCount() {
        return new Promise((resolve) => {
            exec('netstat -ano | findstr :3001', (error, stdout) => {
                if (error) {
                    resolve(0);
                    return;
                }
                const lines = stdout.split('\n').filter(line => line.includes('ESTABLISHED'));
                resolve(lines.length);
            });
        });
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    async gracefulRestart() {
        try {
            // Create restart script that will restart the server
            const restartScript = path.join(process.cwd(), 'restart-server.js');
            
            // Spawn the restart script in a detached process
            const child = spawn('node', [restartScript], {
                detached: true,
                stdio: 'ignore'
            });
            
            child.unref();
            
            // Exit current process after a short delay
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Graceful restart failed:', error);
            throw error;
        }
    }
}

module.exports = SystemController; 