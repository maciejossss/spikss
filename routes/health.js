const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const start = Date.now();
    
    // Test database connection
    await db.testConnection();
    const dbResponseTime = Date.now() - start;
    
    // Get database stats
    const poolStatus = db.getPoolStatus();
    
    // System info
    const systemInfo = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`,
        pool: poolStatus
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(systemInfo);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
      message: error.message,
      database: {
        status: 'disconnected'
      }
    });
  }
});

// Deep health check with database queries
router.get('/deep', async (req, res) => {
  try {
    const checks = {};
    
    // Database connectivity
    checks.database = {
      start: Date.now()
    };
    
    try {
      await db.testConnection();
      checks.database.status = 'OK';
      checks.database.responseTime = Date.now() - checks.database.start;
    } catch (error) {
      checks.database.status = 'ERROR';
      checks.database.error = error.message;
    }
    
    // Table existence checks
    checks.tables = {};
    
    const tables = ['service_orders', 'technicians', 'clients'];
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
        checks.tables[table] = {
          status: 'OK',
          count: result.rows[0].count
        };
      } catch (error) {
        checks.tables[table] = {
          status: 'ERROR',
          error: error.message
        };
      }
    }
    
    // Overall status
    const allChecksOK = checks.database.status === 'OK' && 
                       Object.values(checks.tables).every(t => t.status === 'OK');
    
    res.status(allChecksOK ? 200 : 503).json({
      status: allChecksOK ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      checks
    });
    
  } catch (error) {
    console.error('❌ Deep health check failed:', error);
    
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Deep health check failed',
      message: error.message
    });
  }
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 