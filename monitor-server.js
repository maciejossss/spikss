const { exec } = require('child_process');
const http = require('http');

class ServerMonitor {
    constructor() {
        this.checkInterval = 30000; // 30 seconds
        this.maxConnectionsThreshold = 25; // Max allowed connections
        this.healthCheckUrl = 'http://localhost:3001/health';
        this.isMonitoring = false;
        this.consecutiveFailures = 0;
        this.maxFailures = 3;
    }

    async checkServerHealth() {
        return new Promise((resolve) => {
            const req = http.get(this.healthCheckUrl, { timeout: 5000 }, (res) => {
                if (res.statusCode === 200) {
                    resolve({ healthy: true, status: res.statusCode });
                } else {
                    resolve({ healthy: false, status: res.statusCode, error: 'Bad status code' });
                }
            });

            req.on('error', (error) => {
                resolve({ healthy: false, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ healthy: false, error: 'Timeout' });
            });
        });
    }

    async checkConnections() {
        return new Promise((resolve) => {
            exec('netstat -ano | findstr :3001', (error, stdout) => {
                if (error) {
                    resolve({ connectionCount: 0, error: error.message });
                    return;
                }

                const lines = stdout.split('\n').filter(line => line.includes('ESTABLISHED'));
                const connectionCount = lines.length;
                
                resolve({ 
                    connectionCount, 
                    excessive: connectionCount > this.maxConnectionsThreshold,
                    details: lines.slice(0, 5) // First 5 connections for debugging
                });
            });
        });
    }

    async restartServer() {
        console.log('🔄 Server restart initiated by monitor...');
        
        return new Promise((resolve) => {
            exec('node restart-server.js', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Restart failed:', error);
                    resolve(false);
                } else {
                    console.log('✅ Server restarted successfully');
                    console.log(stdout);
                    resolve(true);
                }
            });
        });
    }

    async performHealthCheck() {
        const timestamp = new Date().toLocaleString();
        console.log(`\n🔍 Health check at ${timestamp}`);

        // Check server health
        const health = await this.checkServerHealth();
        console.log(`📊 Server health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        
        if (!health.healthy) {
            console.log(`   Error: ${health.error || 'Unknown'}`);
        }

        // Check connections
        const connections = await this.checkConnections();
        console.log(`🔗 Active connections: ${connections.connectionCount}`);
        
        if (connections.excessive) {
            console.log(`⚠️  WARNING: Too many connections (${connections.connectionCount} > ${this.maxConnectionsThreshold})`);
        }

        // Determine if restart is needed
        const needsRestart = !health.healthy || connections.excessive;

        if (needsRestart) {
            this.consecutiveFailures++;
            console.log(`❌ Issues detected (${this.consecutiveFailures}/${this.maxFailures})`);

            if (this.consecutiveFailures >= this.maxFailures) {
                console.log('🚨 Maximum failures reached - restarting server...');
                const restarted = await this.restartServer();
                
                if (restarted) {
                    this.consecutiveFailures = 0;
                    // Wait longer after restart
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        } else {
            if (this.consecutiveFailures > 0) {
                console.log('✅ Server recovered - resetting failure count');
            }
            this.consecutiveFailures = 0;
        }

        return { needsRestart, health, connections };
    }

    start() {
        if (this.isMonitoring) {
            console.log('⚠️  Monitor is already running');
            return;
        }

        this.isMonitoring = true;
        console.log('🎯 Starting Server Monitor...');
        console.log(`📋 Settings:`);
        console.log(`   - Check interval: ${this.checkInterval / 1000}s`);
        console.log(`   - Max connections: ${this.maxConnectionsThreshold}`);
        console.log(`   - Max failures: ${this.maxFailures}`);
        console.log(`   - Health check URL: ${this.healthCheckUrl}`);

        const runCheck = async () => {
            if (!this.isMonitoring) return;

            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('❌ Monitor error:', error);
            }

            // Schedule next check
            setTimeout(runCheck, this.checkInterval);
        };

        // Start monitoring
        runCheck();
    }

    stop() {
        this.isMonitoring = false;
        console.log('🛑 Server monitor stopped');
    }
}

// Create and start monitor
const monitor = new ServerMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping monitor...');
    monitor.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    monitor.stop();
    process.exit(0);
});

// Start monitoring
monitor.start(); 