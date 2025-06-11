/**
 * SYSTEM SERWISOWY PALNIKI & KOTŁY
 * Main application entry point
 * 
 * RULES IMPLEMENTED:
 * RULE 1: Central authorization for all modules
 * RULE 2: Error isolation with central error handler
 * RULE 3: Database isolation with connection pooling
 * RULE 4: Module health monitoring
 * RULE 5: RESTful API communication between modules
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Core services
const DatabaseService = require('./shared/database/database');
const ModuleErrorHandler = require('./shared/error/ModuleErrorHandler');
const AuthService = require('./shared/auth/AuthService');

class Application {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.modules = new Map();
        this.healthCheckInterval = null;
        this.logger = ModuleErrorHandler.logger;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            // Setup security and middleware
            this.setupSecurity();
            this.setupMiddleware();
            
            // Initialize database
            await this.initializeDatabase();
            
            // Setup routing
            this.setupRoutes();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Setup health monitoring
            this.setupHealthMonitoring();
            
            ModuleErrorHandler.logger.info('Application initialized successfully');
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Application initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup security middleware
     */
    setupSecurity() {
        // Helmet for security headers
        this.app.use(helmet({
            contentSecurityPolicy: this.isProduction ? undefined : false
        }));

        // CORS configuration
        this.app.use(cors({
            origin: this.isProduction 
                ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://*.railway.app']
                : ['http://localhost:8082', 'http://localhost:8083', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (this.isProduction ? 15 * 60 * 1000 : 60 * 1000), // 1 minute for dev, 15 for prod
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (this.isProduction ? 500 : 10000), // 10000 for dev, 500 for prod  
            message: {
                success: false,
                message: 'Too many requests, please try again later'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                // Skip rate limiting for health checks in development
                if (!this.isProduction && req.url.includes('/health')) {
                    return true;
                }
                return false;
            }
        });

        // Only apply rate limiting to API routes
        this.app.use('/api/', limiter);
    }

    /**
     * Setup general middleware
     */
    setupMiddleware() {
        // Disable ETag globally to prevent 304 responses
        this.app.set('etag', false);
        
        // Global no-cache middleware for API endpoints
        this.app.use('/api', (req, res, next) => {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            });
            // Remove etag header completely
            res.removeHeader('ETag');
            next();
        });
        
        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '50mb' 
        }));

        // Static files
        this.app.use('/static', express.static(path.join(__dirname, '../public')));
        
        // Request logging with proper logger reference
        this.app.use((req, res, next) => {
            // Detailed request logging for debugging
            if (req.url.startsWith('/api/')) {
                console.log('=== INCOMING REQUEST ===');
                console.log('Method:', req.method);
                console.log('URL:', req.url);
                console.log('Headers:', req.headers);
            }
            
            const userId = req.user?.id || 'anonymous';
            this.logger.info(`${req.method} ${req.url}`, {
                ip: req.ip,
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                userId: userId
            });
            next();
        });

        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        await DatabaseService.initialize();
        ModuleErrorHandler.logger.info('Database connection established');
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        const apiPrefix = process.env.API_PREFIX || '/api/v1';

        // Health check endpoint (no auth required)
        this.app.get('/health', this.healthCheckHandler.bind(this));
        
        // Authentication endpoints (no auth required for login)
        this.setupAuthRoutes(apiPrefix);

        // Module routes (auth required)
        this.setupModuleRoutes(apiPrefix);

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                path: req.originalUrl
            });
        });
    }

    /**
     * Setup authentication routes
     */
    setupAuthRoutes(apiPrefix) {
        const authRouter = express.Router();

        // Development auto-login endpoint (only in development)
        if (process.env.NODE_ENV !== 'production') {
            authRouter.post('/dev-login', async (req, res) => {
                try {
                    // Mock user data for development
                    const mockUser = {
                        id: 1,
                        username: 'dev_user',
                        first_name: 'Development',
                        last_name: 'User',
                        email: 'dev@example.com',
                        role: 'admin',
                        permissions: {
                            'service-records': ['read', 'write', 'delete'],
                            'scheduling': ['read', 'write', 'delete'],
                            'clients': ['read', 'write'],
                            'devices': ['read', 'write'],
                            'system': ['read', 'write', 'delete']
                        },
                        created_at: new Date().toISOString(),
                        is_active: true
                    };

                    // Generate tokens
                    const tokenPayload = {
                        id: mockUser.id,
                        username: mockUser.username,
                        role: mockUser.role,
                        permissions: mockUser.permissions
                    };

                    const token = AuthService.generateToken(tokenPayload);
                    const refreshToken = AuthService.generateRefreshToken({ id: mockUser.id });

                    res.json({
                        success: true,
                        data: {
                            user: mockUser,
                            token,
                            refreshToken
                        },
                        message: 'Development auto-login successful'
                    });

                } catch (error) {
                    const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_DEV_LOGIN');
                    res.status(500).json(errorResponse);
                }
            });
        }

        // Login endpoint
        authRouter.post('/login', async (req, res) => {
            try {
                const { username, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username and password are required'
                    });
                }

                // Query user from database
                const userResult = await DatabaseService.query(
                    'SELECT * FROM users WHERE username = $1 AND is_active = true',
                    [username]
                );

                if (userResult.rows.length === 0) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                const user = userResult.rows[0];

                // Verify password
                const isValidPassword = await AuthService.comparePassword(password, user.password_hash);

                if (!isValidPassword) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                // Generate tokens
                const tokenPayload = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions
                };

                const token = AuthService.generateToken(tokenPayload);
                const refreshToken = AuthService.generateRefreshToken({ id: user.id });

                // Remove sensitive data
                delete user.password_hash;

                res.json({
                    success: true,
                    data: {
                        user,
                        token,
                        refreshToken
                    }
                });

            } catch (error) {
                const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_LOGIN');
                res.status(500).json(errorResponse);
            }
        });

        // Token refresh endpoint
        authRouter.post('/refresh', async (req, res) => {
            try {
                const { refreshToken } = req.body;

                if (!refreshToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'Refresh token is required'
                    });
                }

                const decoded = AuthService.verifyToken(refreshToken);
                
                // Get current user data
                const userResult = await DatabaseService.query(
                    'SELECT * FROM users WHERE id = $1 AND is_active = true',
                    [decoded.id]
                );

                if (userResult.rows.length === 0) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                const user = userResult.rows[0];
                const tokenPayload = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions
                };

                const newToken = AuthService.generateToken(tokenPayload);

                res.json({
                    success: true,
                    data: { token: newToken }
                });

            } catch (error) {
                const errorResponse = ModuleErrorHandler.handleError(error, 'AUTH_REFRESH');
                res.status(401).json(errorResponse);
            }
        });

        this.app.use(`${apiPrefix}/auth`, authRouter);
    }

    /**
     * Setup module routes with authentication
     */
    setupModuleRoutes(apiPrefix) {
        // Public endpoints (no auth required)
        const DeviceRoutes = require('./modules/devices/deviceRoutes');
        this.app.get(`${apiPrefix}/devices/config`, (req, res, next) => {
            const DeviceController = require('./modules/devices/DeviceController');
            const deviceController = new DeviceController();
            deviceController.getDeviceConfig(req, res);
        });

        this.app.get(`${apiPrefix}/devices/models`, (req, res, next) => {
            const DeviceController = require('./modules/devices/DeviceController');
            const deviceController = new DeviceController();
            deviceController.getModels(req, res);
        });

        // Development mock auth middleware
        const mockAuth = (req, res, next) => {
            console.log('=== MOCK AUTH EXECUTED ===');
            console.log('NODE_ENV:', process.env.NODE_ENV);
            console.log('Request URL:', req.url);
            
            // Mock user for development
            req.user = {
                id: 'b0084f44-9957-4e66-aa2a-9d8cd8841374', // Real admin UUID from database
                username: 'admin',
                role: 'admin',
                permissions: {
                    'service-records': ['read', 'write', 'delete'],
                    'scheduling': ['read', 'write', 'delete'],
                    'clients': ['read', 'write'],
                    'devices': ['read', 'write'],
                    'system': ['read', 'write', 'delete']
                }
            };
            console.log('Mock user set:', req.user.id);
            next();
        };

        // All other module routes require authentication
        const isProduction = process.env.NODE_ENV === 'production';
        console.log('=== AUTH MIDDLEWARE SETUP ===');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('isProduction:', isProduction);
        
        const authMiddleware = isProduction ? AuthService.authenticate() : mockAuth;
        console.log('Selected authMiddleware:', isProduction ? 'AuthService.authenticate()' : 'mockAuth');
        
        // Apply auth middleware to all API routes EXCEPT /auth/* endpoints
        this.app.use(new RegExp(`^${apiPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?!auth).*`), authMiddleware);

        // CLIENTS MODULE - REAL IMPLEMENTATION
        const ClientRoutes = require('./modules/clients/ClientRoutes');
        this.app.use(`${apiPrefix}/clients`, ClientRoutes);

        // DEVICES MODULE - REAL IMPLEMENTATION
        this.app.use(`${apiPrefix}/devices`, DeviceRoutes);

        // SERVICE MODULE - REAL IMPLEMENTATION
        const ServiceRoutes = require('./modules/service/ServiceRoutes');
        
        // Add debug middleware specifically for appointments
        this.app.use(`${apiPrefix}/service/appointments`, (req, res, next) => {
            console.log('=== GLOBAL DEBUG FOR APPOINTMENTS ===');
            console.log('Method:', req.method);
            console.log('URL:', req.url);
            console.log('Body:', JSON.stringify(req.body, null, 2));
            console.log('User:', JSON.stringify(req.user, null, 2));
            next();
        });
        
        this.app.use(`${apiPrefix}/service`, ServiceRoutes);

        // SYSTEM MODULE - Server management
        const SystemRoutes = require('./modules/system/SystemRoutes');
        this.app.use(`${apiPrefix}/system`, SystemRoutes);

        // Module placeholder routes (will be replaced by actual modules)
        const modules = ['inventory', 'reports'];

        modules.forEach(moduleName => {
            const moduleRouter = express.Router();
            
            // Basic CRUD endpoints for each module
            moduleRouter.get('/', AuthService.moduleAccess(moduleName, 'read'), (req, res) => {
                res.json({
                    success: true,
                    module: moduleName,
                    message: `${moduleName} module - GET endpoint`,
                    data: []
                });
            });

            moduleRouter.post('/', AuthService.moduleAccess(moduleName, 'write'), (req, res) => {
                res.json({
                    success: true,
                    module: moduleName,
                    message: `${moduleName} module - POST endpoint`,
                    data: req.body
                });
            });

            moduleRouter.get('/:id', AuthService.moduleAccess(moduleName, 'read'), (req, res) => {
                res.json({
                    success: true,
                    module: moduleName,
                    message: `${moduleName} module - GET by ID endpoint`,
                    data: { id: req.params.id }
                });
            });

            moduleRouter.put('/:id', AuthService.moduleAccess(moduleName, 'write'), (req, res) => {
                res.json({
                    success: true,
                    module: moduleName,
                    message: `${moduleName} module - PUT endpoint`,
                    data: { id: req.params.id, ...req.body }
                });
            });

            moduleRouter.delete('/:id', AuthService.moduleAccess(moduleName, 'delete'), (req, res) => {
                res.json({
                    success: true,
                    module: moduleName,
                    message: `${moduleName} module - DELETE endpoint`,
                    data: { id: req.params.id }
                });
            });

            this.app.use(`${apiPrefix}/${moduleName}`, moduleRouter);
        });
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            const errorResponse = ModuleErrorHandler.handleError(
                error, 
                'GLOBAL_ERROR_HANDLER',
                {
                    method: req.method,
                    url: req.url,
                    user: req.user?.id || 'anonymous'
                }
            );

            res.status(ModuleErrorHandler.getHttpStatusCode(error)).json(errorResponse);
        });
    }

    /**
     * Setup health monitoring
     */
    setupHealthMonitoring() {
        const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000;
        
        this.healthCheckInterval = setInterval(async () => {
            try {
                const dbHealth = await DatabaseService.healthCheck();
                const authHealth = AuthService.healthCheck();
                
                ModuleErrorHandler.logger.debug('Health check completed', {
                    database: dbHealth.status,
                    auth: authHealth.status
                });
                
            } catch (error) {
                ModuleErrorHandler.logger.error('Health check failed:', error);
            }
        }, interval);
    }

    /**
     * Health check endpoint handler
     */
    async healthCheckHandler(req, res) {
        try {
            const dbHealth = await DatabaseService.healthCheck();
            const authHealth = AuthService.healthCheck();
            
            const overallStatus = dbHealth.status === 'healthy' && authHealth.status === 'healthy' 
                ? 'healthy' : 'unhealthy';

            res.status(overallStatus === 'healthy' ? 200 : 503).json({
                success: true,
                status: overallStatus,
                timestamp: new Date().toISOString(),
                services: {
                    database: dbHealth,
                    auth: authHealth
                },
                environment: process.env.NODE_ENV,
                version: '1.0.0'
            });

        } catch (error) {
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                error: error.message
            });
        }
    }

    /**
     * Start the server
     */
    async start() {
        try {
            await this.initialize();
            
            this.server = this.app.listen(this.port, () => {
                ModuleErrorHandler.logger.info(`🚀 System Serwisowy started on port ${this.port}`);
                ModuleErrorHandler.logger.info(`📊 Health check: http://localhost:${this.port}/health`);
                ModuleErrorHandler.logger.info(`🔑 API Base: http://localhost:${this.port}${process.env.API_PREFIX || '/api/v1'}`);
            });

            // Set server timeouts to prevent hanging connections
            this.server.keepAliveTimeout = 30000; // 30 seconds (zmniejszone z 65s)
            this.server.headersTimeout = 35000; // 35 seconds (zmniejszone z 66s)
            this.server.timeout = 60000; // 1 minute (zmniejszone z 2 minut)
            
            // Set maximum connections - bardziej restrykcyjnie
            this.server.maxConnections = 25; // Zmniejszone z 50
            
            // Monitor connection count and auto-cleanup
            this.connectionMonitor = setInterval(() => {
                if (this.server) {
                    const connections = this.server.connections || 0;
                    ModuleErrorHandler.logger.info(`Active connections: ${connections}`);
                    
                    if (connections > 20) {
                        ModuleErrorHandler.logger.warn(`High connection count: ${connections} - triggering cleanup`);
                        // Force close idle connections
                        this.server.closeIdleConnections?.();
                    }
                    
                    if (connections > 30) {
                        ModuleErrorHandler.logger.error(`Critical connection count: ${connections} - forcing aggressive cleanup`);
                        // More aggressive cleanup if available
                        this.server.closeAllConnections?.();
                    }
                }
            }, 15000); // Check every 15 seconds

            // Add connection event listeners
            this.server.on('connection', (socket) => {
                const connectionId = Math.random().toString(36).substr(2, 9);
                socket.connectionId = connectionId;
                
                ModuleErrorHandler.logger.debug(`New connection: ${connectionId}`);
                
                // Set socket timeout
                socket.setTimeout(45000, () => {
                    ModuleErrorHandler.logger.warn(`Socket timeout for connection: ${connectionId}`);
                    socket.destroy();
                });
                
                // Handle socket errors
                socket.on('error', (err) => {
                    ModuleErrorHandler.logger.warn(`Socket error for connection ${connectionId}:`, err.message);
                    socket.destroy();
                });
                
                // Log when connection closes
                socket.on('close', () => {
                    ModuleErrorHandler.logger.debug(`Connection closed: ${connectionId}`);
                });
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        ModuleErrorHandler.logger.info('Shutting down gracefully...');
        
        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Clear connection monitor
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
        }

        // Close database connections
        await DatabaseService.close();

        // Close server
        if (this.server) {
            this.server.close(() => {
                ModuleErrorHandler.logger.info('Server closed');
                process.exit(0);
            });
        }
    }
}

// Create application instance
const app = new Application();

// Handle graceful shutdown
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

// Start application if this file is run directly
if (require.main === module) {
    app.start().catch(error => {
        ModuleErrorHandler.logger.error('Application startup failed:', error);
        process.exit(1);
    });
}

module.exports = app; 