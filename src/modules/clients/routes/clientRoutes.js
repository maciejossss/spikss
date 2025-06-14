/**
 * CLIENT ROUTES
 * Express routes for Clients module
 * Implements modular routing with error isolation
 */

const express = require('express');
const router = express.Router();

function createClientRoutes(clientController) {
    // CRUD endpoints
    router.post('/', clientController.createClient);
    router.get('/:id', clientController.getClient);
    router.put('/:id', clientController.updateClient);
    router.delete('/:id', clientController.deleteClient);
    
    // List and search endpoints
    router.get('/', clientController.listClients);
    router.post('/search', clientController.searchClients);
    
    // Business logic endpoints
    router.get('/city/:city', clientController.getClientsByCity);
    router.get('/companies/list', clientController.getCompanies);
    router.get('/stats/overview', clientController.getClientStats);
    
    // Module management endpoints
    router.get('/health/check', clientController.healthCheck);
    router.get('/info/module', clientController.getModuleInfo);

    return router;
}

module.exports = createClientRoutes; 