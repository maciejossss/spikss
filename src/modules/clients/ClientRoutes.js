const express = require('express');
const ClientController = require('./ClientController');
const AuthService = require('../../shared/auth/AuthService');

/**
 * Client Routes - API routing for clients module
 * Follows RULE 4: API STANDARDIZATION from rules.txt
 */
const router = express.Router();

// All routes require authentication - handled by global middleware in app.js
// router.use(AuthService.authenticate()); // Commented out - using global mock middleware

// GET /api/clients/stats - Get client statistics
router.get('/stats', 
    AuthService.moduleAccess('clients', 'read'),
    ClientController.getClientStats
);

// GET /api/clients - Get all clients with pagination and filters
router.get('/', 
    AuthService.moduleAccess('clients', 'read'),
    ClientController.getAllClients
);

// GET /api/clients/:id - Get client by ID
router.get('/:id', 
    AuthService.moduleAccess('clients', 'read'),
    ClientController.getClientById
);

// POST /api/clients - Create new client
router.post('/', 
    AuthService.moduleAccess('clients', 'write'),
    ClientController.createClient
);

// PUT /api/clients/:id - Update client
router.put('/:id', 
    AuthService.moduleAccess('clients', 'write'),
    ClientController.updateClient
);

// DELETE /api/clients/:id - Delete client (soft delete)
router.delete('/:id', 
    AuthService.moduleAccess('clients', 'delete'),
    ClientController.deleteClient
);

module.exports = router; 