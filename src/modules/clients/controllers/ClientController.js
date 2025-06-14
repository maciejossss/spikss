/**
 * CLIENT CONTROLLER
 * Implements RULE 2: ERROR ISOLATION
 * All methods wrapped with ModuleErrorHandler
 */

const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class ClientController {
    constructor(clientService) {
        this.clientService = clientService;
        this.moduleName = 'CLIENTS';
    }

    // Create new client
    createClient = ModuleErrorHandler.wrapController(async (req, res) => {
        const result = await this.clientService.create(req.body);
        
        if (result.success === false) {
            return res.status(400).json(result);
        }
        
        res.status(201).json({
            success: true,
            data: result,
            message: 'Client created successfully'
        });
    }, this.moduleName);

    // Get client by ID
    getClient = ModuleErrorHandler.wrapController(async (req, res) => {
        const { id } = req.params;
        const result = await this.clientService.read(id);
        
        if (result.success === false) {
            return res.status(404).json(result);
        }
        
        res.json({
            success: true,
            data: result
        });
    }, this.moduleName);

    // Update client
    updateClient = ModuleErrorHandler.wrapController(async (req, res) => {
        const { id } = req.params;
        const result = await this.clientService.update(id, req.body);
        
        if (result.success === false) {
            return res.status(400).json(result);
        }
        
        res.json({
            success: true,
            data: result,
            message: 'Client updated successfully'
        });
    }, this.moduleName);

    // Delete client
    deleteClient = ModuleErrorHandler.wrapController(async (req, res) => {
        const { id } = req.params;
        const result = await this.clientService.delete(id);
        
        if (result.success === false) {
            return res.status(400).json(result);
        }
        
        res.json(result);
    }, this.moduleName);

    // List clients with pagination
    listClients = ModuleErrorHandler.wrapController(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await this.clientService.list({ page, limit });
        
        if (result.success === false) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            data: result.clients,
            pagination: result.pagination
        });
    }, this.moduleName);

    // Search clients
    searchClients = ModuleErrorHandler.wrapController(async (req, res) => {
        const criteria = req.body;
        const result = await this.clientService.search(criteria);
        
        if (result.success === false) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            data: result,
            count: result.length
        });
    }, this.moduleName);

    // Get clients by city
    getClientsByCity = ModuleErrorHandler.wrapController(async (req, res) => {
        const { city } = req.params;
        const result = await this.clientService.getClientsByCity(city);
        
        if (result.success === false) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            data: result,
            count: result.length
        });
    }, this.moduleName);

    // Get companies list
    getCompanies = ModuleErrorHandler.wrapController(async (req, res) => {
        const result = await this.clientService.getCompaniesList();
        
        if (result.success === false) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            data: result,
            count: result.length
        });
    }, this.moduleName);

    // Get client statistics
    getClientStats = ModuleErrorHandler.wrapController(async (req, res) => {
        const result = await this.clientService.getClientStats();
        
        if (result.success === false) {
            return res.status(500).json(result);
        }
        
        res.json({
            success: true,
            data: result
        });
    }, this.moduleName);

    // Health check endpoint
    healthCheck = ModuleErrorHandler.wrapController(async (req, res) => {
        const result = await this.clientService.healthCheck();
        
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    }, this.moduleName);

    // Module info endpoint
    getModuleInfo = ModuleErrorHandler.wrapController(async (req, res) => {
        const info = this.clientService.getModuleInfo();
        res.json({
            success: true,
            data: info
        });
    }, this.moduleName);
}

module.exports = ClientController; 