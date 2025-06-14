/**
 * STANDARD API INTERFACE
 * Every module must expose this standardized API
 * Implements RULE 4: API STANDARDIZATION from rules.txt
 */

class StandardAPI {
    constructor(moduleName, databaseService) {
        this.moduleName = moduleName;
        this.db = databaseService;
    }

    // CRUD operations - MANDATORY for all modules
    async create(data) {
        throw new Error(`${this.moduleName}: create() method must be implemented`);
    }

    async read(id) {
        throw new Error(`${this.moduleName}: read() method must be implemented`);
    }

    async update(id, data) {
        throw new Error(`${this.moduleName}: update() method must be implemented`);
    }

    async delete(id) {
        throw new Error(`${this.moduleName}: delete() method must be implemented`);
    }

    // Search operations - MANDATORY for all modules
    async search(criteria) {
        throw new Error(`${this.moduleName}: search() method must be implemented`);
    }

    async list(pagination = { page: 1, limit: 10 }) {
        throw new Error(`${this.moduleName}: list() method must be implemented`);
    }

    // Health check - MANDATORY for all modules
    async healthCheck() {
        try {
            // Basic database connectivity test
            await this.db.testConnection();
            return {
                module: this.moduleName,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected'
            };
        } catch (error) {
            return {
                module: this.moduleName,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error.message
            };
        }
    }

    // Module info - MANDATORY for all modules
    getModuleInfo() {
        return {
            name: this.moduleName,
            version: '1.0.0',
            description: `${this.moduleName} module following modular MVC pattern`,
            endpoints: this.getEndpoints(),
            dependencies: this.getDependencies()
        };
    }

    // Override in each module
    getEndpoints() {
        return [
            'POST /' + this.moduleName.toLowerCase(),
            'GET /' + this.moduleName.toLowerCase() + '/:id',
            'PUT /' + this.moduleName.toLowerCase() + '/:id',
            'DELETE /' + this.moduleName.toLowerCase() + '/:id',
            'GET /' + this.moduleName.toLowerCase(),
            'POST /' + this.moduleName.toLowerCase() + '/search'
        ];
    }

    // Override in each module
    getDependencies() {
        return ['database', 'auth'];
    }
}

module.exports = StandardAPI; 