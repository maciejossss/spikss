const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🔄 Restarting System Serwisowy...');

// Function to kill processes on specific ports
function killProcessOnPort(port) {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (stdout) {
                const lines = stdout.split('\n');
                const pids = new Set();
                
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
                        pids.add(parts[4]);
                    }
                });
                
                pids.forEach(pid => {
                    if (pid && pid !== '0') {
                        try {
                            exec(`taskkill /F /PID ${pid}`, () => {});
                            console.log(`✅ Killed process ${pid} on port ${port}`);
                        } catch (e) {
                            console.log(`⚠️ Could not kill process ${pid}`);
                        }
                    }
                });
            }
            resolve();
        });
    });
}

async function restartServer() {
    try {
        console.log('🛑 Stopping existing processes...');
        
        // Kill processes on both ports
        await killProcessOnPort(3001); // Backend
        await killProcessOnPort(8082); // Frontend
        
        // Wait a moment for processes to fully close
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🧹 Clearing Node.js cache...');
        
        // Clear module cache
        Object.keys(require.cache).forEach(function(key) {
            delete require.cache[key];
        });
        
        console.log('💾 Forcing garbage collection...');
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        console.log('🚀 Starting backend server...');
        
        // Start backend
        const backend = spawn('node', ['src/app.js'], {
            stdio: 'inherit',
            env: { 
                ...process.env,
                NODE_ENV: 'development',
                PORT: '3001'
            }
        });
        
        backend.on('error', (error) => {
            console.error('❌ Backend startup error:', error);
        });
        
        console.log('✅ Server restart completed!');
        console.log('📊 Check health: http://localhost:3001/health');
        
    } catch (error) {
        console.error('❌ Restart failed:', error);
        process.exit(1);
    }
}

// Run restart
restartServer(); 