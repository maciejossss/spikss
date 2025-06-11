/**
 * RULE 4: API COMMUNICATION
 * Device Routes for System Serwisowy Palniki & Kotły
 * RESTful API routes for devices module
 */

const express = require('express');
const DeviceController = require('./DeviceController');

const router = express.Router();
const deviceController = new DeviceController();

// Device configuration endpoint (must be before parameterized routes)
router.get('/config', (req, res) => deviceController.getDeviceConfig(req, res));

// Models endpoint for specific brand and device type
router.get('/models', (req, res) => deviceController.getModels(req, res));

// Device statistics endpoint
router.get('/statistics', (req, res) => deviceController.getDeviceStatistics(req, res));

// Devices due for service endpoint
router.get('/service/due', (req, res) => deviceController.getDevicesDueForService(req, res));

// Advanced search endpoint
router.post('/search', (req, res) => deviceController.searchDevices(req, res));

// Batch operations
router.patch('/batch/status', (req, res) => deviceController.batchUpdateStatus(req, res));

// Devices by client ID
router.get('/client/:clientId', (req, res) => deviceController.getDevicesByClientId(req, res));

// Main CRUD operations
router.post('/', (req, res) => deviceController.createDevice(req, res));
router.get('/', (req, res) => deviceController.getDevices(req, res));
router.get('/:id', (req, res) => deviceController.getDeviceById(req, res));
router.put('/:id', (req, res) => deviceController.updateDevice(req, res));
router.delete('/:id', (req, res) => deviceController.deleteDevice(req, res));

module.exports = router; 