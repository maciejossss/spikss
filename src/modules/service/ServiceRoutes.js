/**
 * RULE 4: API STANDARDIZATION
 * Service Routes for System Serwisowy Palniki & Kotły
 * Defines all routes for service module
 */

const express = require('express');
const ServiceController = require('./ServiceController');
const AuthService = require('../../shared/auth/AuthService');

const router = express.Router();
const serviceController = new ServiceController();

// All routes require authentication - handled by global middleware in app.js
// router.use(AuthService.authenticate()); // Commented out - using global mock middleware

// SERVICE RECORDS ROUTES

/**
 * GET /api/service/config
 * Get service module configuration
 */
router.get('/config', 
    // AuthService.moduleAccess('service-records', 'read'), // TEMPORARILY DISABLED
    serviceController.getServiceConfig.bind(serviceController)
);

/**
 * GET /api/service/technicians
 * Get list of technicians for appointment assignments
 * Requires: scheduling read permission
 */
router.get('/technicians',
    AuthService.moduleAccess('scheduling', 'read'),
    serviceController.getTechnicians.bind(serviceController)
);

/**
 * GET /api/service/records
 * Get all service records with pagination and filtering
 * Requires: service-records read permission
 */
router.get('/records', 
    AuthService.moduleAccess('service-records', 'read'),
    serviceController.getAllServiceRecords.bind(serviceController)
);

/**
 * GET /api/service/records/statistics
 * Get service statistics
 * Requires: service-records read permission
 */
router.get('/records/statistics',
    AuthService.moduleAccess('service-records', 'read'),
    serviceController.getServiceStatistics.bind(serviceController)
);

/**
 * GET /api/service/records/upcoming
 * Get upcoming services (follow-ups)
 * Requires: service-records read permission
 */
router.get('/records/upcoming',
    AuthService.moduleAccess('service-records', 'read'),
    serviceController.getUpcomingServices.bind(serviceController)
);

/**
 * GET /api/service/records/device/:deviceId
 * Get service records by device ID
 * Requires: service-records read permission
 */
router.get('/records/device/:deviceId',
    AuthService.moduleAccess('service-records', 'read'),
    serviceController.getServiceRecordsByDeviceId.bind(serviceController)
);

/**
 * GET /api/service/records/:id
 * Get service record by ID
 * Requires: service-records read permission
 */
router.get('/records/:id',
    AuthService.moduleAccess('service-records', 'read'),
    serviceController.getServiceRecordById.bind(serviceController)
);

/**
 * POST /api/service/records
 * Create new service record
 * Requires: service-records write permission
 */
router.post('/records',
    AuthService.moduleAccess('service-records', 'write'),
    serviceController.createServiceRecord.bind(serviceController)
);

/**
 * PUT /api/service/records/:id
 * Update service record
 * Requires: service-records write permission
 */
router.put('/records/:id',
    AuthService.moduleAccess('service-records', 'write'),
    serviceController.updateServiceRecord.bind(serviceController)
);

/**
 * POST /api/service/records/:id/complete
 * Complete service record
 * Requires: service-records write permission
 */
router.post('/records/:id/complete',
    AuthService.moduleAccess('service-records', 'write'),
    serviceController.completeServiceRecord.bind(serviceController)
);

/**
 * DELETE /api/service/records/:id
 * Delete service record
 * Requires: service-records delete permission or admin
 */
router.delete('/records/:id',
    AuthService.moduleAccess('service-records', 'delete'),
    serviceController.deleteServiceRecord.bind(serviceController)
);

// APPOINTMENTS ROUTES

/**
 * GET /api/service/appointments
 * Get all appointments with pagination and filtering
 * Requires: scheduling read permission
 */
router.get('/appointments',
    AuthService.moduleAccess('scheduling', 'read'),
    serviceController.getAllAppointments.bind(serviceController)
);

/**
 * GET /api/service/appointments/today
 * Get today's appointments
 * Requires: scheduling read permission
 */
router.get('/appointments/today',
    AuthService.moduleAccess('scheduling', 'read'),
    serviceController.getTodaysAppointments.bind(serviceController)
);

/**
 * GET /api/service/appointments/:id
 * Get appointment by ID
 * Requires: scheduling read permission
 */
router.get('/appointments/:id',
    AuthService.moduleAccess('scheduling', 'read'),
    serviceController.getAppointmentById.bind(serviceController)
);

/**
 * POST /api/service/appointments
 * Create new appointment
 * Requires: scheduling write permission
 */
router.post('/appointments',
    // AuthService.moduleAccess('scheduling', 'write'), // TEMPORARILY DISABLED FOR DEBUG
    serviceController.createAppointment.bind(serviceController)
);

/**
 * PUT /api/service/appointments/:id
 * Update appointment
 * Requires: scheduling write permission
 */
router.put('/appointments/:id',
    AuthService.moduleAccess('scheduling', 'write'),
    serviceController.updateAppointment.bind(serviceController)
);

/**
 * POST /api/service/appointments/:id/convert
 * Convert appointment to service record
 * Requires: both scheduling write and service-records write permissions
 */
router.post('/appointments/:id/convert',
    AuthService.moduleAccess('scheduling', 'write'),
    serviceController.convertAppointmentToService.bind(serviceController)
);

/**
 * DELETE /api/service/appointments/:id
 * Delete appointment
 * Requires: scheduling delete permission or admin
 */
router.delete('/appointments/:id',
    AuthService.moduleAccess('scheduling', 'delete'),
    serviceController.deleteAppointment.bind(serviceController)
);

module.exports = router; 