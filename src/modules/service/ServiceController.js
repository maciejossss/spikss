/**
 * RULE 2: ERROR ISOLATION
 * Service Controller for System Serwisowy Palniki & Kotły
 * Handles HTTP requests for service module
 */

const ServiceService = require('./ServiceService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class ServiceController {
    constructor() {
        this.serviceService = new ServiceService();
    }

    // SERVICE RECORDS ENDPOINTS

    /**
     * Get all service records with pagination and search
     * GET /api/service/records
     */
    async getAllServiceRecords(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                search, 
                device_id,
                technician_id,
                service_type, 
                status,
                date_from,
                date_to,
                sortBy = 'service_date',
                sortOrder = 'DESC'
            } = req.query;
            
            const filters = {
                search: search || '',
                device_id: device_id || null,
                technician_id: technician_id || null,
                service_type: service_type || null,
                status: status || null,
                date_from: date_from || null,
                date_to: date_to || null,
                sortBy,
                sortOrder
            };
            
            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            
            const result = await this.serviceService.getAllServiceRecords(filters, pagination);
            
            res.json({
                success: true,
                data: result.serviceRecords,
                meta: result.pagination
            });
            
        } catch (error) {
            // RULE 2: Isolate error - don't crash other modules
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get service record by ID
     * GET /api/service/records/:id
     */
    async getServiceRecordById(req, res) {
        try {
            const { id } = req.params;
            const serviceRecord = await this.serviceService.getServiceRecordById(id);
            
            if (!serviceRecord) {
                return res.status(404).json({
                    success: false,
                    error: 'Service record not found'
                });
            }
            
            res.json({
                success: true,
                data: serviceRecord
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Create new service record
     * POST /api/service/records
     */
    async createServiceRecord(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const serviceRecord = await this.serviceService.createServiceRecord(req.body, userId);
            
            res.status(201).json({
                success: true,
                data: serviceRecord,
                message: 'Service record created successfully'
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('required') || 
                                  error.message.includes('invalid') ||
                                  error.message.includes('cannot') ||
                                  error.message.includes('must');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Update service record
     * PUT /api/service/records/:id
     */
    async updateServiceRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const serviceRecord = await this.serviceService.updateServiceRecord(id, req.body, userId);
            
            res.json({
                success: true,
                data: serviceRecord,
                message: 'Service record updated successfully'
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('required') || 
                                  error.message.includes('invalid') ||
                                  error.message.includes('cannot') ||
                                  error.message.includes('transition');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Delete service record
     * DELETE /api/service/records/:id
     */
    async deleteServiceRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const success = await this.serviceService.deleteServiceRecord(id, userId);
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Service record deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Service record not found'
                });
            }
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('Cannot delete');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Get service records by device ID
     * GET /api/service/records/device/:deviceId
     */
    async getServiceRecordsByDeviceId(req, res) {
        try {
            const { deviceId } = req.params;
            const serviceRecords = await this.serviceService.getServiceRecordsByDeviceId(deviceId);
            
            res.json({
                success: true,
                data: serviceRecords,
                count: serviceRecords.length
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get service statistics
     * GET /api/service/records/statistics
     */
    async getServiceStatistics(req, res) {
        try {
            const statistics = await this.serviceService.getServiceStatistics();
            
            res.json({
                success: true,
                data: statistics
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get upcoming services (follow-ups)
     * GET /api/service/records/upcoming
     */
    async getUpcomingServices(req, res) {
        try {
            const daysAhead = parseInt(req.query.days_ahead) || 30;
            const services = await this.serviceService.getUpcomingServices(daysAhead);
            
            res.json({
                success: true,
                data: services,
                parameters: {
                    days_ahead: daysAhead
                },
                count: services.length
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('must be');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    // APPOINTMENTS ENDPOINTS

    /**
     * Get all appointments with pagination and search
     * GET /api/service/appointments
     */
    async getAllAppointments(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                search, 
                technician_id,
                client_id,
                device_id,
                appointment_type, 
                status,
                priority,
                date_from,
                date_to,
                sortBy = 'appointment_date',
                sortOrder = 'ASC'
            } = req.query;
            
            const filters = {
                search: search || '',
                technician_id: technician_id || null,
                client_id: client_id || null,
                device_id: device_id || null,
                appointment_type: appointment_type || null,
                status: status || null,
                priority: priority || null,
                date_from: date_from || null,
                date_to: date_to || null,
                sortBy,
                sortOrder
            };
            
            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit)
            };
            
            const result = await this.serviceService.getAllAppointments(filters, pagination);
            
            res.json({
                success: true,
                data: result.appointments,
                meta: result.pagination
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get appointment by ID
     * GET /api/service/appointments/:id
     */
    async getAppointmentById(req, res) {
        try {
            const { id } = req.params;
            const appointment = await this.serviceService.getAppointmentById(id);
            
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    error: 'Appointment not found'
                });
            }
            
            res.json({
                success: true,
                data: appointment
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Create new appointment
     * POST /api/service/appointments
     */
    async createAppointment(req, res) {
        try {
            console.log('=== CREATE APPOINTMENT DEBUG ===');
            console.log('req.user:', JSON.stringify(req.user, null, 2));
            console.log('req.body:', JSON.stringify(req.body, null, 2));
            
            const userId = req.user?.id;
            console.log('userId extracted:', userId, 'type:', typeof userId);
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const appointment = await this.serviceService.createAppointment(req.body, userId);
            
            res.status(201).json({
                success: true,
                data: appointment,
                message: 'Appointment created successfully'
            });
            
        } catch (error) {
            console.log('=== APPOINTMENT ERROR ===');
            console.log('Error:', error.message);
            console.log('Error stack:', error.stack);
            
            const isBusinessError = error.message.includes('required') || 
                                  error.message.includes('invalid') ||
                                  error.message.includes('cannot') ||
                                  error.message.includes('must');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Update appointment
     * PUT /api/service/appointments/:id
     */
    async updateAppointment(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const appointment = await this.serviceService.updateAppointment(id, req.body, userId);
            
            res.json({
                success: true,
                data: appointment,
                message: 'Appointment updated successfully'
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('required') || 
                                  error.message.includes('invalid') ||
                                  error.message.includes('transition') ||
                                  error.message.includes('reason is required');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Delete appointment
     * DELETE /api/service/appointments/:id
     */
    async deleteAppointment(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const success = await this.serviceService.deleteAppointment(id, userId);
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Appointment deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Appointment not found'
                });
            }
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('Cannot delete');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Get today's appointments
     * GET /api/service/appointments/today
     */
    async getTodaysAppointments(req, res) {
        try {
            console.log('🔍 getTodaysAppointments called');
            
            const technicianId = req.query.technician_id || req.user?.id;
            console.log('🔍 Technician ID filter:', technicianId);
            
            console.log('🔍 Calling serviceService.getTodaysAppointments...');
            const appointments = await this.serviceService.getTodaysAppointments(technicianId);
            console.log('🔍 Got appointments from service:', appointments.length);
            
            // Disable caching for today's appointments to ensure fresh data
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'ETag': false
            });
            
            const response = {
                success: true,
                data: appointments,
                count: appointments.length,
                parameters: {
                    technician_id: technicianId
                }
            };
            
            console.log('🔍 Sending response with', appointments.length, 'appointments');
            res.json(response);
            
        } catch (error) {
            console.error('❌ Error in getTodaysAppointments:', error);
            res.status(500).json({
                success: false,
                message: 'Błąd podczas pobierania dzisiejszych terminów: ' + error.message
            });
        }
    }

    // UTILITY ENDPOINTS

    /**
     * Get service configuration data
     * GET /api/service/config
     */
    async getServiceConfig(req, res) {
        try {
            const config = this.serviceService.getServiceConfig();
            
            res.json({
                success: true,
                data: config
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Convert appointment to service record
     * POST /api/service/appointments/:id/convert
     */
    async convertAppointmentToService(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            // Get appointment details
            const appointment = await this.serviceService.getAppointmentById(id);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    error: 'Appointment not found'
                });
            }

            // Create service record from appointment
            const serviceData = {
                device_id: appointment.device_id,
                technician_id: appointment.technician_id,
                service_type: appointment.appointment_type,
                service_date: appointment.appointment_date,
                start_time: appointment.start_time,
                description: appointment.description || `${appointment.appointment_type} - converted from appointment`,
                status: 'in_progress',
                ...req.body // Allow overriding with additional data
            };

            const serviceRecord = await this.serviceService.createServiceRecord(serviceData, userId);

            // Update appointment status to in_progress
            await this.serviceService.updateAppointment(id, { status: 'in_progress' }, userId);
            
            res.status(201).json({
                success: true,
                data: serviceRecord,
                message: 'Appointment converted to service record successfully'
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('required') || 
                                  error.message.includes('invalid');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Complete service record from appointment
     * POST /api/service/records/:id/complete
     */
    async completeServiceRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            // Update service record with completion data
            const updateData = {
                ...req.body,
                status: 'completed',
                end_time: req.body.end_time || new Date().toTimeString().slice(0, 5),
                client_signature: req.body.client_signature || false
            };

            const serviceRecord = await this.serviceService.updateServiceRecord(id, updateData, userId);
            
            res.json({
                success: true,
                data: serviceRecord,
                message: 'Service record completed successfully'
            });
            
        } catch (error) {
            const isBusinessError = error.message.includes('not found') ||
                                  error.message.includes('transition') ||
                                  error.message.includes('required');
            const statusCode = isBusinessError ? 400 : 500;
            
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(statusCode).json(errorResponse);
        }
    }

    /**
     * Get dashboard data for service module
     * GET /api/service/dashboard
     */
    async getServiceDashboard(req, res) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            
            // Get basic statistics
            const [
                statistics,
                upcomingServices,
                todaysAppointments
            ] = await Promise.all([
                this.serviceService.getServiceStatistics(),
                this.serviceService.getUpcomingServices(7), // Next 7 days
                this.serviceService.getTodaysAppointments(userRole === 'technician' ? userId : null)
            ]);
            
            const dashboardData = {
                statistics,
                upcoming_services: {
                    data: upcomingServices.slice(0, 5), // Top 5 urgent
                    total: upcomingServices.length
                },
                todays_appointments: {
                    data: todaysAppointments,
                    total: todaysAppointments.length
                }
            };
            
            res.json({
                success: true,
                data: dashboardData
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get technicians list for appointment assignments
     * GET /api/service/technicians
     */
    async getTechnicians(req, res) {
        try {
            const technicians = await this.serviceService.getTechnicians();
            
            res.json({
                success: true,
                data: technicians
            });
            
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, 'service');
            res.status(500).json(errorResponse);
        }
    }
}

module.exports = ServiceController; 