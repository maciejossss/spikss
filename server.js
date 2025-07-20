require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database/connection');

// Import routes
const healthRoutes = require('./routes/health');
const techniciansRoutes = require('./routes/technicians');
const ordersRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  }
});
app.use('/api/', limiter);

// CORS configuration for global access
app.use(cors({
  origin: '*', // Pozwól na wszystkie origins dla globalnego dostępu
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'Origin', 'Accept']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for mobile debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const origin = req.get('Origin') || 'Direct';
  
  console.log(`📱 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   └─ IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`   └─ User-Agent: ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}`);
  console.log(`   └─ Origin: ${origin}`);
  
  next();
});

// ===== STATIC FILES =====

// Serve mobile app static files
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));

// ===== ROUTES =====

// API routes (before catch-all)
app.use('/api', healthRoutes);
app.use('/api', techniciansRoutes);
app.use('/api/desktop', ordersRoutes);

// Health check for API testing
app.get('/api', (req, res) => {
  res.json({
    message: '🚀 Serwis Mobile API - Railway Deployment Ready!',
    timestamp: new Date().toISOString(),
    status: 'operational',
    version: '1.0.0',
    deployment: 'railway',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/technicians - Get technicians list', 
      'GET /api/desktop/orders/:userId - Get orders for technician',
      'PUT /api/desktop/orders/:orderId/status - Update order status'
    ]
  });
});

// Mobile App SPA - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: ['/api/health', '/api/technicians', '/api/desktop/orders/:userId']
    });
  }
  
  // Serve mobile app
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await db.testConnection();
    console.log('✅ Database connected successfully');
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ========================================');
      console.log(`🌍 Serwis Mobile API running on port ${PORT}`);
      console.log(`📱 Railway URL: https://web-production-310c4.up.railway.app`);
      console.log(`🏥 Health check: https://web-production-310c4.up.railway.app/api/health`);
      console.log(`👨‍🔧 Technicians: https://web-production-310c4.up.railway.app/api/technicians`);
      console.log(`📱 Mobile App: https://web-production-310c4.up.railway.app/`);
      console.log('🚀 ========================================');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

// Start the server
startServer(); 