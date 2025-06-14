/**
 * INVOICES MODULE ROUTES
 * RESTful API endpoints for invoices management
 * Following RULE 5: RESTful API communication between modules
 */

const express = require('express');
const router = express.Router();
const InvoicesController = require('../controllers/InvoicesController');

// Create controller instance
const invoicesController = new InvoicesController();

// Search and special endpoints (must be before /:id)
router.get('/search', (req, res) => invoicesController.search(req, res));
router.get('/stats/summary', (req, res) => invoicesController.getSummary(req, res));
router.get('/client/:clientId', (req, res) => invoicesController.getByClient(req, res));

// CRUD Operations
router.get('/', (req, res) => invoicesController.getAll(req, res));
router.get('/:id', (req, res) => invoicesController.getById(req, res));
router.post('/', (req, res) => invoicesController.create(req, res));
router.put('/:id', (req, res) => invoicesController.update(req, res));
router.delete('/:id', (req, res) => invoicesController.delete(req, res));

// Additional endpoints with :id
router.post('/:id/send', (req, res) => invoicesController.sendInvoice(req, res));
router.post('/:id/payment', (req, res) => invoicesController.recordPayment(req, res));
router.get('/:id/pdf', (req, res) => invoicesController.generatePDF(req, res));

module.exports = router; 