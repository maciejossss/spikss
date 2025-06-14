/**
 * PARTS MODULE ROUTES
 * RESTful API endpoints for parts management
 * Following RULE 5: RESTful API communication between modules
 */

const express = require('express');
const router = express.Router();
const PartsController = require('../controllers/PartsController');

// Create controller instance
const partsController = new PartsController();

// Search and special endpoints (must be before /:id)
router.get('/search', (req, res) => partsController.search(req, res));
router.get('/stock/low', (req, res) => partsController.getLowStock(req, res));
router.get('/categories', (req, res) => partsController.getCategories(req, res));

// CRUD Operations
router.get('/', (req, res) => partsController.getAll(req, res));
router.get('/:id', (req, res) => partsController.getById(req, res));
router.post('/', (req, res) => partsController.create(req, res));
router.put('/:id', (req, res) => partsController.update(req, res));
router.delete('/:id', (req, res) => partsController.delete(req, res));

// Additional endpoints with :id
router.post('/:id/restock', (req, res) => partsController.restock(req, res));

module.exports = router; 