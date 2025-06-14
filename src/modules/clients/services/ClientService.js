/**
 * CLIENT SERVICE
 * Implements business logic for Client module
 * Extends StandardAPI interface
 */

const StandardAPI = require('../../../shared/api/StandardAPI');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');
const Client = require('../models/Client');
const ClientDatabaseService = require('../database/ClientDatabaseService');

class ClientService extends StandardAPI {
    constructor(databaseConnection) {
        super('CLIENTS', new ClientDatabaseService(databaseConnection));
        this.clientDb = this.db;
    }

    // CRUD operations implementation
    async create(data) {
        return ModuleErrorHandler.safeExecute(async () => {
            // Create and validate client
            const client = Client.fromRequest(data);
            const validation = client.validate();
            
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Check for duplicate email
            if (client.email) {
                const existing = await this.clientDb.search({ email: client.email });
                if (existing.length > 0) {
                    throw new Error('Client with this email already exists');
                }
            }

            // Create in database
            const created = await this.clientDb.create(client.toDatabase());
            return Client.fromDatabase(created);
        }, this.moduleName);
    }

    async read(id) {
        return ModuleErrorHandler.safeExecute(async () => {
            if (!id) {
                throw new Error('Client ID is required');
            }

            const clientData = await this.clientDb.findById(id);
            if (!clientData) {
                throw new Error('Client not found');
            }

            return Client.fromDatabase(clientData);
        }, this.moduleName);
    }

    async update(id, data) {
        return ModuleErrorHandler.safeExecute(async () => {
            if (!id) {
                throw new Error('Client ID is required');
            }

            // Check if client exists
            const existing = await this.clientDb.findById(id);
            if (!existing) {
                throw new Error('Client not found');
            }

            // Create and validate updated client
            const client = Client.fromRequest({ ...existing, ...data });
            const validation = client.validate();
            
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Check for duplicate email (excluding current client)
            if (client.email && client.email !== existing.email) {
                const duplicates = await this.clientDb.search({ email: client.email });
                if (duplicates.length > 0) {
                    throw new Error('Client with this email already exists');
                }
            }

            // Update in database
            const updated = await this.clientDb.update(id, client.toDatabase());
            return Client.fromDatabase(updated);
        }, this.moduleName);
    }

    async delete(id) {
        return ModuleErrorHandler.safeExecute(async () => {
            if (!id) {
                throw new Error('Client ID is required');
            }

            // Check if client exists
            const existing = await this.clientDb.findById(id);
            if (!existing) {
                throw new Error('Client not found');
            }

            // TODO: Check for dependencies in other modules
            // This should be done through API calls to other modules
            // For now, we'll allow deletion

            const deleted = await this.clientDb.delete(id);
            if (!deleted) {
                throw new Error('Failed to delete client');
            }

            return { success: true, message: 'Client deleted successfully' };
        }, this.moduleName);
    }

    // Search operations implementation
    async search(criteria) {
        return ModuleErrorHandler.safeExecute(async () => {
            const results = await this.clientDb.search(criteria);
            return results.map(row => Client.fromDatabase(row));
        }, this.moduleName);
    }

    async list(pagination = { page: 1, limit: 10 }) {
        return ModuleErrorHandler.safeExecute(async () => {
            const clients = await this.clientDb.findAll(pagination);
            const total = await this.clientDb.count();
            
            return {
                clients: clients.map(row => Client.fromDatabase(row)),
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: total,
                    pages: Math.ceil(total / pagination.limit)
                }
            };
        }, this.moduleName);
    }

    // Business logic methods
    async getClientsByCity(city) {
        return ModuleErrorHandler.safeExecute(async () => {
            const results = await this.clientDb.search({ city });
            return results.map(row => Client.fromDatabase(row));
        }, this.moduleName);
    }

    async getCompaniesList() {
        return ModuleErrorHandler.safeExecute(async () => {
            const allClients = await this.clientDb.findAll({ page: 1, limit: 1000 });
            const companies = allClients
                .filter(client => client.company_name)
                .map(row => Client.fromDatabase(row));
            return companies;
        }, this.moduleName);
    }

    async getClientStats() {
        return ModuleErrorHandler.safeExecute(async () => {
            const total = await this.clientDb.count();
            const allClients = await this.clientDb.findAll({ page: 1, limit: 1000 });
            
            const companies = allClients.filter(client => client.company_name).length;
            const individuals = total - companies;
            
            const citiesCount = {};
            allClients.forEach(client => {
                if (client.city) {
                    citiesCount[client.city] = (citiesCount[client.city] || 0) + 1;
                }
            });

            return {
                total,
                companies,
                individuals,
                topCities: Object.entries(citiesCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([city, count]) => ({ city, count }))
            };
        }, this.moduleName);
    }

    // Health check implementation
    async healthCheck() {
        try {
            await this.clientDb.testConnection();
            const count = await this.clientDb.count();
            
            return {
                module: this.moduleName,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected',
                clientsCount: count
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

    // Module info override
    getEndpoints() {
        return [
            'POST /api/v1/clients',
            'GET /api/v1/clients/:id',
            'PUT /api/v1/clients/:id',
            'DELETE /api/v1/clients/:id',
            'GET /api/v1/clients',
            'POST /api/v1/clients/search',
            'GET /api/v1/clients/stats',
            'GET /api/v1/clients/companies',
            'GET /api/v1/clients/health'
        ];
    }

    getDependencies() {
        return ['database'];
    }
}

module.exports = ClientService; 