/**
 * CLIENTS MODULE - MAIN ENTRY POINT
 * Implements "GARAŻ Z 5 SAMOCHODAMI" philosophy
 * Complete isolation with standardized API
 */

const ClientService = require('./services/ClientService');
const ClientController = require('./controllers/ClientController');
const createClientRoutes = require('./routes/clientRoutes');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class ClientsModule {
    constructor(databaseConnection) {
        this.moduleName = 'CLIENTS';
        this.service = null;
        this.controller = null;
        this.routes = null;
        this.databaseConnection = databaseConnection;
    }

    // Initialize module
    async initialize() {
        try {
            console.log(`[${this.moduleName}] Initializing module...`);
            
            // Initialize service
            this.service = new ClientService(this.databaseConnection);
            
            // Initialize controller
            this.controller = new ClientController(this.service);
            
            // Initialize routes
            this.routes = createClientRoutes(this.controller);
            
            // Test module health
            const health = await this.service.healthCheck();
            if (health.status !== 'healthy') {
                throw new Error(`Module health check failed: ${health.error}`);
            }
            
            console.log(`[${this.moduleName}] Module initialized successfully`);
            return true;
        } catch (error) {
            console.error(`[${this.moduleName}] Initialization failed:`, error.message);
            throw error;
        }
    }

    // Get module routes for Express app
    getRoutes() {
        if (!this.routes) {
            throw new Error(`${this.moduleName} module not initialized`);
        }
        return this.routes;
    }

    // Get module service (for inter-module communication)
    getService() {
        if (!this.service) {
            throw new Error(`${this.moduleName} module not initialized`);
        }
        return this.service;
    }

    // Get module info
    getModuleInfo() {
        return {
            name: this.moduleName,
            version: '1.0.0',
            description: 'Client management module with full CRUD operations',
            status: this.service ? 'initialized' : 'not_initialized',
            endpoints: this.service ? this.service.getEndpoints() : [],
            dependencies: this.service ? this.service.getDependencies() : []
        };
    }

    // Health check
    async healthCheck() {
        if (!this.service) {
            return {
                module: this.moduleName,
                status: 'unhealthy',
                error: 'Module not initialized',
                timestamp: new Date().toISOString()
            };
        }
        
        return await this.service.healthCheck();
    }

    // Shutdown module
    async shutdown() {
        try {
            console.log(`[${this.moduleName}] Shutting down module...`);
            
            // Clean up resources if needed
            this.service = null;
            this.controller = null;
            this.routes = null;
            
            console.log(`[${this.moduleName}] Module shut down successfully`);
        } catch (error) {
            console.error(`[${this.moduleName}] Shutdown error:`, error.message);
            throw error;
        }
    }
}

module.exports = ClientsModule; 