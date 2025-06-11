/**
 * RULE 4: API STANDARDIZATION
 * Service Service for System Serwisowy Palniki & Kotły
 * Handles business logic for service module
 * FIXED: handleBusinessError issue - cache refresh
 */

const ServiceDatabaseService = require('./ServiceDatabaseService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class ServiceService {
    
    constructor() {
        this.serviceDatabase = new ServiceDatabaseService();
        
        // Service types
        this.serviceTypes = [
            'maintenance', 'repair', 'inspection', 'installation', 
            'warranty', 'emergency', 'upgrade', 'cleaning'
        ];

        // Service statuses
        this.serviceStatuses = [
            'scheduled', 'in_progress', 'completed', 'cancelled', 
            'pending_parts', 'follow_up_required'
        ];

        // Appointment types
        this.appointmentTypes = [
            'maintenance', 'repair', 'inspection', 'consultation',
            'installation', 'warranty_claim', 'emergency'
        ];

        // Priority levels
        this.priorityLevels = ['low', 'normal', 'high', 'urgent'];

        // Appointment statuses
        this.appointmentStatuses = [
            'scheduled', 'confirmed', 'in_progress', 'completed', 
            'cancelled', 'no_show', 'rescheduled'
        ];
    }

    // SERVICE RECORDS METHODS

    /**
     * Create new service record with validation
     * @param {Object} serviceData - Service record data
     * @param {string} userId - User ID creating the record
     * @returns {Object} Created service record
     */
    async createServiceRecord(serviceData, userId) {
        try {
            console.log('🔍 DEBUG: Starting createServiceRecord');
            
            // Validate input data
            await this.validateServiceRecordData(serviceData);
            console.log('🔍 DEBUG: validateServiceRecordData completed');

            // Validate business rules
            await this.validateServiceBusinessRules(serviceData);
            console.log('🔍 DEBUG: validateServiceBusinessRules completed');

            // Calculate total cost
            serviceData.total_cost = this.calculateTotalCost(
                serviceData.parts_used, 
                serviceData.labor_hours
            );

            console.log('🔍 DEBUG: About to call serviceDatabase.createServiceRecord');
            const serviceRecord = await this.serviceDatabase.createServiceRecord(serviceData);
            console.log('🔍 DEBUG: serviceDatabase.createServiceRecord completed');
            
            ModuleErrorHandler.logger.info(`Service record created: ${serviceRecord.id}`);
            
            return this.enrichServiceRecordData(serviceRecord);

        } catch (error) {
            console.log('❌ Service error in createServiceRecord:', error.message);
            console.log('🔍 DEBUG: Error stack:', error.stack);
            ModuleErrorHandler.handleError(error, 'service', { operation: 'createServiceRecord' });
            throw error;
        }
    }

    /**
     * Get all service records with filtering and pagination
     * @param {Object} filters - Filter options
     * @param {Object} pagination - Pagination options
     * @returns {Object} Service records with pagination info
     */
    async getAllServiceRecords(filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            // Validate pagination
            if (pagination.page < 1 || pagination.limit < 1 || pagination.limit > 100) {
                throw new Error('Invalid pagination parameters');
            }

            // Validate date filters
            if (filters.date_from && filters.date_to) {
                const fromDate = new Date(filters.date_from);
                const toDate = new Date(filters.date_to);
                if (fromDate > toDate) {
                    throw new Error('Date from cannot be later than date to');
                }
            }

            const options = {
                ...filters,
                ...pagination
            };

            const result = await this.serviceDatabase.getServiceRecords(options);
            
            // Enrich data
            result.serviceRecords = result.serviceRecords.map(record => 
                this.enrichServiceRecordData(record)
            );

            ModuleErrorHandler.logger.info(`Retrieved ${result.serviceRecords.length} service records`);
            
            return result;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getAllServiceRecords' });
            throw error;
        }
    }

    /**
     * Get service record by ID
     * @param {string} id - Service record ID
     * @returns {Object|null} Service record or null
     */
    async getServiceRecordById(id) {
        try {
            if (!id) {
                throw new Error('Service record ID is required');
            }

            const serviceRecord = await this.serviceDatabase.getServiceRecordById(id);
            
            if (!serviceRecord) {
                return null;
            }

            return this.enrichServiceRecordData(serviceRecord);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceRecordById' });
            throw error;
        }
    }

    /**
     * Update service record
     * @param {string} id - Service record ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID making the update
     * @returns {Object} Updated service record
     */
    async updateServiceRecord(id, updateData, userId) {
        try {
            if (!id) {
                throw new Error('Service record ID is required');
            }

            // Validate update data
            await this.validateServiceRecordUpdateData(updateData);

            // Check if record exists
            const existingRecord = await this.serviceDatabase.getServiceRecordById(id);
            if (!existingRecord) {
                throw new Error('Service record not found');
            }

            // Business validation for status changes
            if (updateData.status && updateData.status !== existingRecord.status) {
                this.validateStatusTransition(existingRecord.status, updateData.status);
            }

            // Recalculate total cost if parts or labor hours changed
            if (updateData.parts_used || updateData.labor_hours) {
                const parts = updateData.parts_used || existingRecord.parts_used;
                const hours = updateData.labor_hours || existingRecord.labor_hours;
                updateData.total_cost = this.calculateTotalCost(parts, hours);
            }

            const serviceRecord = await this.serviceDatabase.updateServiceRecord(id, updateData);
            
            ModuleErrorHandler.logger.info(`Service record updated: ${id}`);
            
            return this.enrichServiceRecordData(serviceRecord);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'updateServiceRecord' });
            throw error;
        }
    }

    /**
     * Delete service record
     * @param {string} id - Service record ID
     * @param {string} userId - User ID making the deletion
     * @returns {boolean} Success status
     */
    async deleteServiceRecord(id, userId) {
        try {
            if (!id) {
                throw new Error('Service record ID is required');
            }

            // Check if record exists
            const existingRecord = await this.serviceDatabase.getServiceRecordById(id);
            if (!existingRecord) {
                throw new Error('Service record not found');
            }

            // Business rule: Can't delete completed service records older than 30 days
            if (existingRecord.status === 'completed') {
                const serviceDate = new Date(existingRecord.service_date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                if (serviceDate < thirtyDaysAgo) {
                    throw new Error('Cannot delete completed service records older than 30 days');
                }
            }

            const success = await this.serviceDatabase.deleteServiceRecord(id);
            
            if (success) {
                ModuleErrorHandler.logger.info(`Service record deleted: ${id} by user ${userId}`);
            }
            
            return success;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'deleteServiceRecord' });
            throw error;
        }
    }

    /**
     * Get service records by device ID
     * @param {string} deviceId - Device ID
     * @returns {Array} Service records for device
     */
    async getServiceRecordsByDeviceId(deviceId) {
        try {
            if (!deviceId) {
                throw new Error('Device ID is required');
            }

            const serviceRecords = await this.serviceDatabase.getServiceRecordsByDeviceId(deviceId);
            
            return serviceRecords.map(record => this.enrichServiceRecordData(record));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceRecordsByDeviceId' });
            throw error;
        }
    }

    /**
     * Get service statistics
     * @returns {Object} Service statistics
     */
    async getServiceStatistics() {
        try {
            const stats = await this.serviceDatabase.getServiceStatistics();
            
            // Add calculated fields
            stats.completion_rate = stats.total_services > 0 
                ? (stats.completed_services / stats.total_services * 100).toFixed(1)
                : 0;
            
            stats.warranty_percentage = stats.total_services > 0 
                ? (stats.warranty_services / stats.total_services * 100).toFixed(1)
                : 0;

            return stats;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceStatistics' });
            throw error;
        }
    }

    /**
     * Get upcoming services (follow-ups)
     * @param {number} daysAhead - Days ahead to check
     * @returns {Array} Upcoming follow-up services
     */
    async getUpcomingServices(daysAhead = 30) {
        try {
            if (daysAhead < 0 || daysAhead > 365) {
                throw new Error('Days ahead must be between 0 and 365');
            }

            const services = await this.serviceDatabase.getUpcomingServices(daysAhead);
            
            return services.map(service => this.enrichServiceRecordData(service));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getUpcomingServices' });
            throw error;
        }
    }

    // APPOINTMENTS METHODS

    /**
     * Create new appointment with validation
     * @param {Object} appointmentData - Appointment data
     * @param {string} userId - User ID creating the appointment
     * @returns {Object} Created appointment
     */
    async createAppointment(appointmentData, userId) {
        try {
            // Validate required fields
            await this.validateAppointmentData(appointmentData);

            // Validate business rules
            await this.validateAppointmentBusinessRules(appointmentData);

            // Set created_by
            appointmentData.created_by = userId;

            const appointment = await this.serviceDatabase.createAppointment(appointmentData);
            
            ModuleErrorHandler.logger.info(
                `Appointment created: ${appointment.id} - ${appointment.appointment_type} on ${appointment.appointment_date}`
            );
            
            return this.enrichAppointmentData(appointment);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'createAppointment' });
            throw error;
        }
    }

    /**
     * Get all appointments with filtering and pagination
     * @param {Object} filters - Filter options
     * @param {Object} pagination - Pagination options
     * @returns {Object} Appointments with pagination info
     */
    async getAllAppointments(filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            // Validate pagination
            if (pagination.page < 1 || pagination.limit < 1 || pagination.limit > 100) {
                throw new Error('Invalid pagination parameters');
            }

            const options = {
                ...filters,
                ...pagination
            };

            const result = await this.serviceDatabase.getAppointments(options);
            
            // Enrich data
            result.appointments = result.appointments.map(appointment => 
                this.enrichAppointmentData(appointment)
            );

            ModuleErrorHandler.logger.info(`Retrieved ${result.appointments.length} appointments`);
            
            return result;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getAllAppointments' });
            throw error;
        }
    }

    /**
     * Get appointment by ID
     * @param {string} id - Appointment ID
     * @returns {Object|null} Appointment or null
     */
    async getAppointmentById(id) {
        try {
            if (!id) {
                throw new Error('Appointment ID is required');
            }

            const appointment = await this.serviceDatabase.getAppointmentById(id);
            
            if (!appointment) {
                return null;
            }

            return this.enrichAppointmentData(appointment);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getAppointmentById' });
            throw error;
        }
    }

    /**
     * Update appointment
     * @param {string} id - Appointment ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID making the update
     * @returns {Object} Updated appointment
     */
    async updateAppointment(id, updateData, userId) {
        try {
            if (!id) {
                throw new Error('Appointment ID is required');
            }

            // Validate update data
            await this.validateAppointmentUpdateData(updateData);

            // Check if appointment exists
            const existingAppointment = await this.serviceDatabase.getAppointmentById(id);
            if (!existingAppointment) {
                throw new Error('Appointment not found');
            }

            // Business validation for status changes
            if (updateData.status && updateData.status !== existingAppointment.status) {
                this.validateAppointmentStatusTransition(existingAppointment.status, updateData.status);
            }

            // Handle cancellation
            if (updateData.status === 'cancelled' && !updateData.cancelled_reason) {
                throw new Error('Cancellation reason is required when cancelling appointment');
            }
            if (updateData.status === 'cancelled') {
                updateData.cancelled_by = userId;
            }

            const appointment = await this.serviceDatabase.updateAppointment(id, updateData);
            
            ModuleErrorHandler.logger.info(`Appointment updated: ${id}`);
            
            return this.enrichAppointmentData(appointment);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'updateAppointment' });
            throw error;
        }
    }

    /**
     * Delete appointment
     * @param {string} id - Appointment ID
     * @param {string} userId - User ID making the deletion
     * @returns {boolean} Success status
     */
    async deleteAppointment(id, userId) {
        try {
            if (!id) {
                throw new Error('Appointment ID is required');
            }

            // Check if appointment exists
            const existingAppointment = await this.serviceDatabase.getAppointmentById(id);
            if (!existingAppointment) {
                throw new Error('Appointment not found');
            }

            // Business rule: Can't delete appointments that are in progress or completed
            if (['in_progress', 'completed'].includes(existingAppointment.status)) {
                throw new Error('Cannot delete appointments that are in progress or completed');
            }

            const success = await this.serviceDatabase.deleteAppointment(id);
            
            if (success) {
                ModuleErrorHandler.logger.info(`Appointment deleted: ${id} by user ${userId}`);
            }
            
            return success;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'deleteAppointment' });
            throw error;
        }
    }

    /**
     * Get today's appointments
     * @param {string} technicianId - Optional technician filter
     * @returns {Array} Today's appointments
     */
    async getTodaysAppointments(technicianId = null) {
        try {
            console.log('🔍 ServiceService.getTodaysAppointments called with technicianId:', technicianId);
            
            console.log('🔍 Calling database getTodaysAppointments...');
            const appointments = await this.serviceDatabase.getTodaysAppointments(technicianId);
            console.log('🔍 Database returned', appointments.length, 'appointments');
            
            console.log('🔍 Enriching appointment data...');
            const enrichedAppointments = appointments.map(appointment => this.enrichAppointmentData(appointment));
            console.log('🔍 Enriched', enrichedAppointments.length, 'appointments');
            
            return enrichedAppointments;

        } catch (error) {
            console.error('❌ Error in ServiceService.getTodaysAppointments:', error.message);
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getTodaysAppointments' });
            throw error;
        }
    }

    // UTILITY METHODS

    /**
     * Get service configuration data
     * @returns {Object} Service configuration
     */
    getServiceConfig() {
        return {
            service_types: this.serviceTypes.map(type => ({
                value: type,
                label: this.translateServiceType(type)
            })),
            service_statuses: this.serviceStatuses.map(status => ({
                value: status,
                label: this.translateServiceStatus(status)
            })),
            appointment_types: this.appointmentTypes.map(type => ({
                value: type,
                label: this.translateAppointmentType(type)
            })),
            appointment_statuses: this.appointmentStatuses.map(status => ({
                value: status,
                label: this.translateAppointmentStatus(status)
            })),
            priority_levels: this.priorityLevels.map(level => ({
                value: level,
                label: this.translatePriorityLevel(level)
            }))
        };
    }

    // PRIVATE VALIDATION METHODS

    /**
     * Validate service record data
     * @private
     */
    async validateServiceRecordData(serviceData) {
        const required = ['device_id', 'service_type', 'service_date', 'description'];
        
        for (const field of required) {
            if (!serviceData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (!this.serviceTypes.includes(serviceData.service_type)) {
            throw new Error('Invalid service type');
        }

        if (serviceData.status && !this.serviceStatuses.includes(serviceData.status)) {
            throw new Error('Invalid service status');
        }

        if (serviceData.condition_before && (serviceData.condition_before < 1 || serviceData.condition_before > 5)) {
            throw new Error('Condition before must be between 1 and 5');
        }

        if (serviceData.condition_after && (serviceData.condition_after < 1 || serviceData.condition_after > 5)) {
            throw new Error('Condition after must be between 1 and 5');
        }

        if (serviceData.labor_hours && serviceData.labor_hours < 0) {
            throw new Error('Labor hours cannot be negative');
        }

        if (serviceData.total_cost && serviceData.total_cost < 0) {
            throw new Error('Total cost cannot be negative');
        }
    }

    /**
     * Validate service business rules
     * @private
     */
    async validateServiceBusinessRules(serviceData) {
        // Check if service date is not too far in the future
        const serviceDate = new Date(serviceData.service_date);
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
        
        if (serviceDate > maxFutureDate) {
            throw new Error('Service date cannot be more than 1 year in the future');
        }

        // Validate time logic
        if (serviceData.start_time && serviceData.end_time) {
            const startTime = serviceData.start_time;
            const endTime = serviceData.end_time;
            
            if (startTime >= endTime) {
                throw new Error('End time must be after start time');
            }
        }

        // Validate follow-up logic
        if (serviceData.follow_up_required && !serviceData.follow_up_date) {
            throw new Error('Follow-up date is required when follow-up is marked as required');
        }

        if (serviceData.follow_up_date) {
            const followUpDate = new Date(serviceData.follow_up_date);
            if (followUpDate <= serviceDate) {
                throw new Error('Follow-up date must be after service date');
            }
        }
    }

    /**
     * Validate service record update data
     * @private
     */
    async validateServiceRecordUpdateData(updateData) {
        if (updateData.service_type && !this.serviceTypes.includes(updateData.service_type)) {
            throw new Error('Invalid service type');
        }

        if (updateData.status && !this.serviceStatuses.includes(updateData.status)) {
            throw new Error('Invalid service status');
        }

        if (updateData.condition_before && (updateData.condition_before < 1 || updateData.condition_before > 5)) {
            throw new Error('Condition before must be between 1 and 5');
        }

        if (updateData.condition_after && (updateData.condition_after < 1 || updateData.condition_after > 5)) {
            throw new Error('Condition after must be between 1 and 5');
        }

        if (updateData.labor_hours && updateData.labor_hours < 0) {
            throw new Error('Labor hours cannot be negative');
        }

        if (updateData.total_cost && updateData.total_cost < 0) {
            throw new Error('Total cost cannot be negative');
        }
    }

    /**
     * Validate appointment data
     * @private
     */
    async validateAppointmentData(appointmentData) {
        const required = ['client_id', 'technician_id', 'appointment_date', 'start_time', 'appointment_type'];
        
        for (const field of required) {
            if (!appointmentData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (!this.appointmentTypes.includes(appointmentData.appointment_type)) {
            throw new Error('Invalid appointment type');
        }

        if (appointmentData.priority && !this.priorityLevels.includes(appointmentData.priority)) {
            throw new Error('Invalid priority level');
        }

        if (appointmentData.status && !this.appointmentStatuses.includes(appointmentData.status)) {
            throw new Error('Invalid appointment status');
        }

        if (appointmentData.estimated_duration && appointmentData.estimated_duration < 15) {
            throw new Error('Estimated duration must be at least 15 minutes');
        }
    }

    /**
     * Validate appointment business rules
     * @private
     */
    async validateAppointmentBusinessRules(appointmentData) {
        // Check if appointment date is not in the past
        const appointmentDate = new Date(appointmentData.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate < today) {
            throw new Error('Appointment date cannot be in the past');
        }

        // Check business hours (8:00 - 18:00)
        const startTime = appointmentData.start_time;
        const hour = parseInt(startTime.split(':')[0]);
        
        if (hour < 8 || hour >= 18) {
            throw new Error('Appointments must be scheduled between 8:00 and 18:00');
        }
    }

    /**
     * Validate appointment update data
     * @private
     */
    async validateAppointmentUpdateData(updateData) {
        if (updateData.appointment_type && !this.appointmentTypes.includes(updateData.appointment_type)) {
            throw new Error('Invalid appointment type');
        }

        if (updateData.priority && !this.priorityLevels.includes(updateData.priority)) {
            throw new Error('Invalid priority level');
        }

        if (updateData.status && !this.appointmentStatuses.includes(updateData.status)) {
            throw new Error('Invalid appointment status');
        }

        if (updateData.estimated_duration && updateData.estimated_duration < 15) {
            throw new Error('Estimated duration must be at least 15 minutes');
        }
    }

    /**
     * Validate status transition
     * @private
     */
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'scheduled': ['in_progress', 'cancelled', 'completed'],
            'in_progress': ['completed', 'pending_parts', 'follow_up_required'],
            'completed': ['follow_up_required'],
            'cancelled': [], // Cannot transition from cancelled
            'pending_parts': ['in_progress', 'completed'],
            'follow_up_required': ['scheduled', 'completed']
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }

    /**
     * Validate appointment status transition
     * @private
     */
    validateAppointmentStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'scheduled': ['confirmed', 'cancelled', 'in_progress', 'no_show', 'rescheduled'],
            'confirmed': ['in_progress', 'cancelled', 'no_show', 'rescheduled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [], // Cannot transition from completed
            'cancelled': ['rescheduled'], // Can reschedule cancelled appointments
            'no_show': ['rescheduled'],
            'rescheduled': ['scheduled', 'confirmed']
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`Invalid appointment status transition from ${currentStatus} to ${newStatus}`);
        }
    }

    // ENRICHMENT METHODS

    /**
     * Enrich service record data with calculated fields
     * @private
     */
    enrichServiceRecordData(record) {
        // Calculate days overdue for follow-up
        let daysOverdue = 0;
        if (record.follow_up_required && record.follow_up_date) {
            const followUpDate = new Date(record.follow_up_date);
            const today = new Date();
            const timeDiff = today - followUpDate;
            daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        }

        return {
            ...record,
            // Structured nested objects for frontend
            device: record.device_brand || record.device_model || record.device_type || record.device_serial ? {
                brand: record.device_brand,
                model: record.device_model,
                device_type: record.device_type,
                serial_number: record.device_serial
            } : null,
            client: record.company_name || record.contact_person ? {
                company_name: record.company_name,
                contact_person: record.contact_person,
                phone: record.client_phone,
                email: record.client_email
            } : null,
            technician: record.technician_first_name || record.technician_last_name ? {
                first_name: record.technician_first_name,
                last_name: record.technician_last_name,
                phone: record.technician_phone
            } : null,
            // Calculated fields
            duration_minutes: this.calculateServiceDuration(record.start_time, record.end_time),
            cost_per_hour: this.calculateCostPerHour(record.total_cost, record.labor_hours),
            urgency: record.follow_up_required ? this.calculateFollowUpUrgency(daysOverdue) : null,
            client_name: record.company_name || record.contact_person,
            technician_name: `${record.technician_first_name || ''} ${record.technician_last_name || ''}`.trim(),
            device_info: `${record.device_brand || ''} ${record.device_model || ''}`.trim()
        };
    }

    /**
     * Enrich appointment data with calculated fields
     * @private
     */
    enrichAppointmentData(appointment) {
        return {
            ...appointment,
            // Structured nested objects for frontend
            client: appointment.company_name || appointment.contact_person ? {
                company_name: appointment.company_name,
                contact_person: appointment.contact_person,
                phone: appointment.client_phone,
                email: appointment.client_email
            } : null,
            device: appointment.device_brand || appointment.device_model ? {
                brand: appointment.device_brand,
                model: appointment.device_model,
                device_type: appointment.device_type,
                serial_number: appointment.device_serial
            } : null,
            technician: appointment.technician_first_name || appointment.technician_last_name ? {
                first_name: appointment.technician_first_name,
                last_name: appointment.technician_last_name,
                phone: appointment.technician_phone
            } : null,
            // Calculated fields
            client_name: appointment.company_name || appointment.contact_person,
            technician_name: `${appointment.technician_first_name || ''} ${appointment.technician_last_name || ''}`.trim(),
            device_info: appointment.device_brand && appointment.device_model 
                ? `${appointment.device_brand} ${appointment.device_model}`
                : null,
            is_today: this.isToday(appointment.appointment_date),
            is_overdue: this.isOverdue(appointment.appointment_date, appointment.start_time),
            estimated_end_time: this.calculateEndTime(appointment.start_time, appointment.estimated_duration)
        };
    }

    // CALCULATION METHODS

    /**
     * Calculate total cost from parts and labor
     * @private
     */
    calculateTotalCost(parts = [], laborHours = 0) {
        const partsCost = parts.reduce((total, part) => {
            return total + (parseFloat(part.cost || 0) * parseInt(part.quantity || 1));
        }, 0);

        const laborCost = laborHours * 80; // 80 PLN per hour default rate
        
        return partsCost + laborCost;
    }

    /**
     * Calculate service duration in minutes
     * @private
     */
    calculateServiceDuration(startTime, endTime) {
        if (!startTime || !endTime) return null;
        
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        return Math.round((end - start) / (1000 * 60));
    }

    /**
     * Calculate cost per hour
     * @private
     */
    calculateCostPerHour(totalCost, laborHours) {
        if (!totalCost || !laborHours || laborHours === 0) return null;
        
        return Math.round(totalCost / laborHours * 100) / 100;
    }

    /**
     * Calculate follow-up urgency
     * @private
     */
    calculateFollowUpUrgency(daysOverdue) {
        if (daysOverdue > 14) return 'critical';
        if (daysOverdue > 7) return 'high';
        if (daysOverdue > 0) return 'medium';
        return 'low';
    }

    /**
     * Calculate appointment end time
     * @private
     */
    calculateEndTime(startTime, durationMinutes) {
        if (!startTime || !durationMinutes) return null;
        
        const start = new Date(`2000-01-01T${startTime}`);
        start.setMinutes(start.getMinutes() + durationMinutes);
        
        return start.toTimeString().slice(0, 5);
    }

    /**
     * Check if date is today
     * @private
     */
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        
        return today.toDateString() === checkDate.toDateString();
    }

    /**
     * Check if appointment is overdue
     * @private
     */
    isOverdue(date, time) {
        const now = new Date();
        const appointmentDateTime = new Date(`${date}T${time}`);
        
        return appointmentDateTime < now;
    }

    // TRANSLATION METHODS

    /**
     * Translate service type to Polish
     * @private
     */
    translateServiceType(type) {
        const translations = {
            'maintenance': 'Konserwacja',
            'repair': 'Naprawa',
            'inspection': 'Przegląd',
            'installation': 'Instalacja',
            'warranty': 'Gwarancja',
            'emergency': 'Awaria',
            'upgrade': 'Modernizacja',
            'cleaning': 'Czyszczenie'
        };
        return translations[type] || type;
    }

    /**
     * Translate service status to Polish
     * @private
     */
    translateServiceStatus(status) {
        const translations = {
            'scheduled': 'Zaplanowane',
            'in_progress': 'W trakcie',
            'completed': 'Zakończone',
            'cancelled': 'Anulowane',
            'pending_parts': 'Oczekuje na części',
            'follow_up_required': 'Wymaga kontroli'
        };
        return translations[status] || status;
    }

    /**
     * Translate appointment type to Polish
     * @private
     */
    translateAppointmentType(type) {
        const translations = {
            'maintenance': 'Konserwacja',
            'repair': 'Naprawa',
            'inspection': 'Przegląd',
            'consultation': 'Konsultacja',
            'installation': 'Instalacja',
            'warranty_claim': 'Reklamacja gwarancyjna',
            'emergency': 'Awaria'
        };
        return translations[type] || type;
    }

    /**
     * Translate appointment status to Polish
     * @private
     */
    translateAppointmentStatus(status) {
        const translations = {
            'scheduled': 'Zaplanowane',
            'confirmed': 'Potwierdzone',
            'in_progress': 'W trakcie',
            'completed': 'Zakończone',
            'cancelled': 'Anulowane',
            'no_show': 'Nieobecność',
            'rescheduled': 'Przełożone'
        };
        return translations[status] || status;
    }

    /**
     * Translate priority level to Polish
     * @private
     */
    translatePriorityLevel(level) {
        const translations = {
            'low': 'Niski',
            'normal': 'Normalny',
            'high': 'Wysoki',
            'urgent': 'Pilny'
        };
        return translations[level] || level;
    }

    /**
     * Get technicians list for appointment assignments
     * @returns {Array} List of technicians
     */
    async getTechnicians() {
        try {
            const technicians = await this.serviceDatabase.getTechnicians();
            
            ModuleErrorHandler.logger.info(`Retrieved ${technicians.length} technicians`);
            
            return technicians;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getTechnicians' });
            throw error;
        }
    }
}

module.exports = ServiceService; 