const ClientService = require('./ClientService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

/**
 * Client Controller - Handles HTTP requests for clients module
 * Follows RULE 2: ERROR ISOLATION from rules.txt
 */
class ClientController {
    
    /**
     * Get all clients with pagination and search
     * GET /api/clients
     */
    async getAllClients(req, res) {
        try {
            const { page = 1, limit = 20, search, client_type, priority_level } = req.query;
            
            const filters = {
                search: search || '',
                type: client_type || '',
                priority: priority_level || ''
            };
            
            // Debug logging
            console.log('🔍 Filter parameters received:', { 
                search, 
                client_type, 
                priority_level, 
                raw_query: req.query 
            });
            console.log('🔧 Processed filters:', filters);
            
            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            
            const result = await ClientService.getAllClients(filters, pagination);
            
            res.json({
                success: true,
                data: result.clients,
                meta: {
                    total: result.total,
                    page: pagination.page,
                    totalPages: Math.ceil(result.total / pagination.limit)
                }
            });
            
        } catch (error) {
            // RULE 2: Isolate error - don't crash other modules
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * Get client by ID
     * GET /api/clients/:id
     */
    async getClientById(req, res) {
        try {
            const { id } = req.params;
            const client = await ClientService.getClientById(id);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Klient nie został znaleziony'
                });
            }
            
            res.json({
                success: true,
                data: client
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * Create new client
     * POST /api/clients
     */
    async createClient(req, res) {
        try {
            // Validate required fields
            const requiredFields = ['contact_person'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Brakujące wymagane pola',
                    errors: missingFields.map(field => `Pole ${field} jest wymagane`)
                });
            }
            
            // Add created_by from authenticated user
            const clientData = {
                ...req.body,
                created_by: req.user.id
            };
            
            const result = await ClientService.createClient(clientData);
            
            res.status(201).json({
                success: true,
                data: result,
                message: 'Klient został utworzony pomyślnie'
            });
            
        } catch (error) {
            // Check if it's a business logic error (like duplicate client)
            if (error.message && (
                error.message.includes('już istnieje') || 
                error.message.includes('duplicate') ||
                error.message.includes('NIP')
            )) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            // For other errors, use the error handler
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * Update client
     * PUT /api/clients/:id
     */
    async updateClient(req, res) {
        try {
            const { id } = req.params;
            
            // Check if client exists
            const existingClient = await ClientService.getClientById(id);
            if (!existingClient) {
                return res.status(404).json({
                    success: false,
                    message: 'Klient nie został znaleziony'
                });
            }
            
            const result = await ClientService.updateClient(id, req.body);
            
            res.json({
                success: true,
                data: result,
                message: 'Klient został zaktualizowany pomyślnie'
            });
            
        } catch (error) {
            // Check if it's a business logic error (like duplicate client)
            if (error.message && (
                error.message.includes('już istnieje') || 
                error.message.includes('duplicate') ||
                error.message.includes('NIP')
            )) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * Delete client
     * DELETE /api/clients/:id
     */
    async deleteClient(req, res) {
        try {
            const { id } = req.params;
            
            // Check if client exists
            const existingClient = await ClientService.getClientById(id);
            if (!existingClient) {
                return res.status(404).json({
                    success: false,
                    message: 'Klient nie został znaleziony'
                });
            }
            
            await ClientService.deleteClient(id);
            
            res.json({
                success: true,
                message: 'Klient został usunięty pomyślnie'
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
    
    /**
     * Get client statistics
     * GET /api/clients/stats
     */
    async getClientStats(req, res) {
        try {
            const stats = await ClientService.getClientStats();
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'clients');
            res.status(500).json(errorResponse);
        }
    }
}

module.exports = new ClientController(); 