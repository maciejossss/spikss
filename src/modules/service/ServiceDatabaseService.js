/**
 * RULE 3: DATABASE ISOLATION
 * Service Database Service for System Serwisowy Palniki & Kotły
 * Handles all database operations for service module
 */

const DatabaseService = require('../../shared/database/database');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class ServiceDatabaseService {
    
    constructor() {
        this.tableName = 'service_records';
        // Only access tables belonging to this module
        this.allowedTables = ['service_records', 'appointments'];
    }

    /**
     * Create new service record
     * @param {Object} serviceData - Service record data
     * @returns {Object} Created service record
     */
    async createServiceRecord(serviceData) {
        try {
            // Prepare columns and values dynamically based on available data
            const columns = [
                'device_id', 'service_type', 'service_date',
                'start_time', 'end_time', 'description', 'parts_used',
                'labor_hours', 'total_cost', 'client_signature', 'photos',
                'status', 'warranty_work', 'follow_up_required', 'follow_up_date',
                'condition_before', 'condition_after', 'recommendations'
            ];
            
            const values = [
                serviceData.device_id,
                serviceData.service_type,
                serviceData.service_date,
                serviceData.start_time || null,
                serviceData.end_time || null,
                serviceData.description,
                JSON.stringify(serviceData.parts_used || []),
                serviceData.labor_hours || null,
                serviceData.total_cost || null,
                serviceData.client_signature || false,
                JSON.stringify(serviceData.photos || []),
                serviceData.status || 'completed',
                serviceData.warranty_work || false,
                serviceData.follow_up_required || false,
                serviceData.follow_up_date || null,
                serviceData.condition_before || null,
                serviceData.condition_after || null,
                serviceData.recommendations || null
            ];

            // Add technician_id only if it's not null
            if (serviceData.technician_id) {
                columns.splice(1, 0, 'technician_id'); // Insert after device_id
                values.splice(1, 0, serviceData.technician_id);
            }

            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            
            const query = `
                INSERT INTO service_records (
                    ${columns.join(', ')}
                ) VALUES (
                    ${placeholders}
                ) RETURNING *
            `;

            const result = await DatabaseService.query(query, values);
            
            console.log('🔍 DEBUG: Database insert completed');
            console.log('🔍 DEBUG: Result rows:', result.rows.length);
            
            // Parse JSON fields back to objects
            const serviceRecord = result.rows[0];
            
            console.log('🔍 DEBUG: Service record from DB:', {
                id: serviceRecord.id,
                parts_used_raw: serviceRecord.parts_used,
                parts_used_type: typeof serviceRecord.parts_used,
                photos_raw: serviceRecord.photos,
                photos_type: typeof serviceRecord.photos
            });
            
            try {
                serviceRecord.parts_used = serviceRecord.parts_used && 
                                           serviceRecord.parts_used !== 'null' && 
                                           typeof serviceRecord.parts_used === 'string' && 
                                           serviceRecord.parts_used.trim() !== '' 
                    ? JSON.parse(serviceRecord.parts_used) 
                    : [];
                console.log('🔍 DEBUG: parts_used parsed successfully');
            } catch (error) {
                console.error('🚨 JSON Parse Error in parts_used:', error.message);
                serviceRecord.parts_used = [];
            }
            
            try {
                serviceRecord.photos = serviceRecord.photos && 
                                       serviceRecord.photos !== 'null' && 
                                       typeof serviceRecord.photos === 'string' && 
                                       serviceRecord.photos.trim() !== ''
                    ? JSON.parse(serviceRecord.photos) 
                    : [];
                console.log('🔍 DEBUG: photos parsed successfully');
            } catch (error) {
                console.error('🚨 JSON Parse Error in photos:', error.message);
                serviceRecord.photos = [];
            }
            
            return serviceRecord;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'createServiceRecord' });
            throw error;
        }
    }

    /**
     * Get service records with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Object} Service records with pagination info
     */
    async getServiceRecords(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                device_id,
                technician_id,
                service_type,
                status,
                date_from,
                date_to,
                search,
                sortBy = 'service_date',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 0;

            // Apply filters
            if (device_id) {
                paramIndex++;
                whereClause += ` AND sr.device_id = $${paramIndex}`;
                queryParams.push(device_id);
            }

            if (technician_id) {
                paramIndex++;
                whereClause += ` AND sr.technician_id = $${paramIndex}`;
                queryParams.push(technician_id);
            }

            if (service_type) {
                paramIndex++;
                whereClause += ` AND sr.service_type = $${paramIndex}`;
                queryParams.push(service_type);
            }

            if (status) {
                console.log('🎯 Status parameter received:', { status, type: typeof status });
                paramIndex++;
                // Handle comma-separated status values
                const statusList = typeof status === 'string' ? status.split(',').map(s => s.trim()) : [status];
                console.log('🔍 Status list created:', statusList);
                const statusPlaceholders = statusList.map((_, index) => `$${paramIndex + index}`).join(', ');
                console.log('🔗 Status placeholders:', statusPlaceholders);
                whereClause += ` AND sr.status IN (${statusPlaceholders})`;
                queryParams.push(...statusList);
                console.log('📋 Query params after status:', queryParams);
                paramIndex += statusList.length - 1; // Adjust paramIndex for multiple parameters
                console.log('🔢 ParamIndex after adjustment:', paramIndex);
            }

            if (date_from) {
                paramIndex++;
                whereClause += ` AND sr.service_date >= $${paramIndex}`;
                queryParams.push(date_from);
            }

            if (date_to) {
                paramIndex++;
                whereClause += ` AND sr.service_date <= $${paramIndex}`;
                queryParams.push(date_to);
            }

            if (search) {
                paramIndex++;
                whereClause += ` AND (
                    sr.description ILIKE $${paramIndex} OR
                    c.company_name ILIKE $${paramIndex} OR
                    c.contact_person ILIKE $${paramIndex} OR
                    d.brand ILIKE $${paramIndex} OR
                    d.model ILIKE $${paramIndex} OR
                    u.first_name ILIKE $${paramIndex} OR
                    u.last_name ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${search}%`);
            }

            // Validate sort column
            const allowedSortColumns = [
                'service_date', 'service_type', 'status', 'total_cost', 
                'labor_hours', 'created_at', 'company_name', 'contact_person',
                'technician_name', 'device_info'
            ];
            
            const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'service_date';
            const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            const query = `
                SELECT 
                    sr.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    d.serial_number as device_serial,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name,
                    u.phone as technician_phone
                FROM service_records sr
                LEFT JOIN devices d ON sr.device_id = d.id
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON sr.technician_id = u.id
                ${whereClause}
                ORDER BY ${sortColumn === 'company_name' || sortColumn === 'contact_person' ? 'c.' + sortColumn : 
                          sortColumn === 'technician_name' ? 'u.first_name' : 
                          sortColumn === 'device_info' ? 'd.brand' : 'sr.' + sortColumn} ${order}
                LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
            `;

            queryParams.push(limit, offset);

            const countQuery = `
                SELECT COUNT(*) as total
                FROM service_records sr
                LEFT JOIN devices d ON sr.device_id = d.id
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON sr.technician_id = u.id
                ${whereClause}
            `;

            const [serviceRecordsResult, countResult] = await Promise.all([
                DatabaseService.query(query, queryParams),
                DatabaseService.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            // Parse JSON fields for each record
            const serviceRecords = serviceRecordsResult.rows.map(record => {
                try {
                    console.log('🔍 Parsing record:', {
                        id: record.id,
                        parts_used_raw: record.parts_used,
                        parts_used_type: typeof record.parts_used,
                        photos_raw: record.photos,
                        photos_type: typeof record.photos
                    });

                    return {
                        ...record,
                        parts_used: record.parts_used && 
                                   record.parts_used !== 'null' && 
                                   typeof record.parts_used === 'string' && 
                                   record.parts_used.trim() !== '' 
                            ? JSON.parse(record.parts_used) 
                            : [],
                        photos: record.photos && 
                               record.photos !== 'null' && 
                               typeof record.photos === 'string' && 
                               record.photos.trim() !== ''
                            ? JSON.parse(record.photos) 
                            : []
                    };
                } catch (error) {
                    console.error('🚨 JSON Parse Error:', {
                        record_id: record.id,
                        parts_used_value: record.parts_used,
                        photos_value: record.photos,
                        error: error.message
                    });
                    throw error;
                }
            });

            return {
                serviceRecords,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceRecords' });
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
            const query = `
                SELECT 
                    sr.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    c.address_street,
                    c.address_city,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    d.serial_number as device_serial,
                    d.location_description as device_location,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name,
                    u.phone as technician_phone
                FROM service_records sr
                LEFT JOIN devices d ON sr.device_id = d.id
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON sr.technician_id = u.id
                WHERE sr.id = $1
            `;

            const result = await DatabaseService.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }

            // Parse JSON fields
            const serviceRecord = result.rows[0];
            serviceRecord.parts_used = serviceRecord.parts_used && 
                                   serviceRecord.parts_used !== 'null' && 
                                   typeof serviceRecord.parts_used === 'string' && 
                                   serviceRecord.parts_used.trim() !== '' 
            ? JSON.parse(serviceRecord.parts_used) 
            : [];
            serviceRecord.photos = serviceRecord.photos && 
                               serviceRecord.photos !== 'null' && 
                               typeof serviceRecord.photos === 'string' && 
                               serviceRecord.photos.trim() !== ''
            ? JSON.parse(serviceRecord.photos) 
            : [];
            
            return serviceRecord;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceRecordById' });
            throw error;
        }
    }

    /**
     * Update service record
     * @param {string} id - Service record ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated service record
     */
    async updateServiceRecord(id, updateData) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 0;

            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    paramIndex++;
                    fields.push(`${key} = $${paramIndex}`);
                    
                    // Handle JSON fields
                    if (key === 'parts_used' || key === 'photos') {
                        values.push(JSON.stringify(updateData[key]));
                    } else {
                        values.push(updateData[key]);
                    }
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add updated_at timestamp
            paramIndex++;
            fields.push(`updated_at = $${paramIndex}`);
            values.push(new Date());

            const query = `
                UPDATE service_records 
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex + 1}
                RETURNING *
            `;
            
            values.push(id);

            const result = await DatabaseService.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Service record not found');
            }

            // Parse JSON fields
            const serviceRecord = result.rows[0];
            serviceRecord.parts_used = serviceRecord.parts_used && 
                                   serviceRecord.parts_used !== 'null' && 
                                   typeof serviceRecord.parts_used === 'string' && 
                                   serviceRecord.parts_used.trim() !== '' 
            ? JSON.parse(serviceRecord.parts_used) 
            : [];
            serviceRecord.photos = serviceRecord.photos && 
                               serviceRecord.photos !== 'null' && 
                               typeof serviceRecord.photos === 'string' && 
                               serviceRecord.photos.trim() !== ''
            ? JSON.parse(serviceRecord.photos) 
            : [];
            
            return serviceRecord;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'updateServiceRecord' });
            throw error;
        }
    }

    /**
     * Delete service record
     * @param {string} id - Service record ID
     * @returns {boolean} Success status
     */
    async deleteServiceRecord(id) {
        try {
            const query = 'DELETE FROM service_records WHERE id = $1';
            const result = await DatabaseService.query(query, [id]);
            
            return result.rowCount > 0;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'deleteServiceRecord' });
            throw error;
        }
    }

    /**
     * Get service records by device ID
     * @param {string} deviceId - Device ID
     * @returns {Array} Service records for the device
     */
    async getServiceRecordsByDeviceId(deviceId) {
        try {
            const query = `
                SELECT 
                    sr.*,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name,
                    u.phone as technician_phone
                FROM service_records sr
                LEFT JOIN users u ON sr.technician_id = u.id
                WHERE sr.device_id = $1
                ORDER BY sr.service_date DESC
            `;

            const result = await DatabaseService.query(query, [deviceId]);
            
            // Parse JSON fields for each record
            return result.rows.map(record => ({
                ...record,
                parts_used: record.parts_used && record.parts_used !== 'null' 
                    ? JSON.parse(record.parts_used) 
                    : [],
                photos: record.photos && record.photos !== 'null' 
                    ? JSON.parse(record.photos) 
                    : []
            }));

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
            const query = `
                SELECT 
                    COUNT(*) as total_services,
                    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                    COUNT(CASE WHEN status = 'pending_parts' THEN 1 END) as pending_parts_count,
                    COUNT(CASE WHEN status = 'follow_up_required' THEN 1 END) as follow_up_count,
                    ROUND(AVG(total_cost), 2) as avg_cost,
                    ROUND(AVG(labor_hours), 2) as avg_labor_hours,
                    COUNT(CASE WHEN warranty_work = true THEN 1 END) as warranty_count
                FROM service_records
                WHERE service_date >= CURRENT_DATE - INTERVAL '30 days'
            `;

            const result = await DatabaseService.query(query);
            return result.rows[0];

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getServiceStatistics' });
            throw error;
        }
    }

    /**
     * Get upcoming services
     * @param {number} daysAhead - Number of days to look ahead
     * @returns {Array} Upcoming service records
     */
    async getUpcomingServices(daysAhead = 30) {
        try {
            const query = `
                SELECT 
                    sr.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name
                FROM service_records sr
                LEFT JOIN devices d ON sr.device_id = d.id
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON sr.technician_id = u.id
                WHERE sr.status = 'scheduled' 
                AND sr.service_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'
                ORDER BY sr.service_date ASC, sr.start_time ASC
            `;

            const result = await DatabaseService.query(query);
            
            // Parse JSON fields for each record
            return result.rows.map(record => ({
                ...record,
                parts_used: record.parts_used && record.parts_used !== 'null' 
                    ? JSON.parse(record.parts_used) 
                    : [],
                photos: record.photos && record.photos !== 'null' 
                    ? JSON.parse(record.photos) 
                    : []
            }));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getUpcomingServices' });
            throw error;
        }
    }

    // APPOINTMENTS SECTION

    /**
     * Create new appointment
     * @param {Object} appointmentData - Appointment data
     * @returns {Object} Created appointment
     */
    async createAppointment(appointmentData) {
        try {
            console.log('🔍 DEBUG: createAppointment called with data:', JSON.stringify(appointmentData, null, 2));
            
            const query = `
                INSERT INTO appointments (
                    client_id, technician_id, appointment_date, start_time,
                    appointment_type, description, priority,
                    estimated_duration, status, device_id,
                    internal_notes, client_requirements, estimated_cost, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                ) RETURNING *
            `;

            const params = [
                appointmentData.client_id,
                appointmentData.technician_id,
                appointmentData.appointment_date,
                appointmentData.start_time,
                appointmentData.appointment_type,
                appointmentData.description,
                appointmentData.priority || 'normal',
                appointmentData.estimated_duration || 60,
                appointmentData.status || 'scheduled',
                appointmentData.device_id || null,
                appointmentData.internal_notes || null,
                appointmentData.client_requirements || null,
                appointmentData.estimated_cost || null,
                appointmentData.created_by || appointmentData.technician_id
            ];

            console.log('🔍 DEBUG: SQL Query:', query);
            console.log('🔍 DEBUG: Parameters array:', JSON.stringify(params, null, 2));
            console.log('🔍 DEBUG: Parameter types:', params.map((p, i) => `$${i+1}: ${typeof p} = ${p}`));

            const result = await DatabaseService.query(query, params);
            
            // Return the appointment directly - no photos field to parse
            const appointment = result.rows[0];
            
            console.log('🔍 DEBUG: Appointment created successfully:', appointment?.id);
            
            return appointment;

        } catch (error) {
            console.error('🚨 ERROR in createAppointment:', error.message);
            console.error('🚨 ERROR Stack:', error.stack);
            ModuleErrorHandler.handleError(error, 'service', { operation: 'createAppointment' });
            throw error;
        }
    }

    /**
     * Get appointments with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Object} Appointments with pagination info
     */
    async getAppointments(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                technician_id,
                client_id,
                device_id,
                appointment_type,
                status,
                priority,
                date_from,
                date_to,
                search,
                sortBy = 'appointment_date',
                sortOrder = 'ASC'
            } = options;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 0;

            // Apply filters
            if (technician_id) {
                paramIndex++;
                whereClause += ` AND a.technician_id = $${paramIndex}`;
                queryParams.push(technician_id);
            }

            if (client_id) {
                paramIndex++;
                whereClause += ` AND a.client_id = $${paramIndex}`;
                queryParams.push(client_id);
            }

            if (device_id) {
                paramIndex++;
                whereClause += ` AND a.device_id = $${paramIndex}`;
                queryParams.push(device_id);
            }

            if (appointment_type) {
                paramIndex++;
                whereClause += ` AND a.appointment_type = $${paramIndex}`;
                queryParams.push(appointment_type);
            }

            if (status) {
                console.log('🎯 Status parameter received:', { status, type: typeof status });
                paramIndex++;
                // Handle comma-separated status values
                const statusList = typeof status === 'string' ? status.split(',').map(s => s.trim()) : [status];
                console.log('🔍 Status list created:', statusList);
                const statusPlaceholders = statusList.map((_, index) => `$${paramIndex + index}`).join(', ');
                console.log('🔗 Status placeholders:', statusPlaceholders);
                whereClause += ` AND a.status IN (${statusPlaceholders})`;
                queryParams.push(...statusList);
                console.log('📋 Query params after status:', queryParams);
                paramIndex += statusList.length - 1; // Adjust paramIndex for multiple parameters
                console.log('🔢 ParamIndex after adjustment:', paramIndex);
            }

            if (priority) {
                paramIndex++;
                whereClause += ` AND a.priority = $${paramIndex}`;
                queryParams.push(priority);
            }

            if (date_from) {
                paramIndex++;
                whereClause += ` AND a.appointment_date >= $${paramIndex}`;
                queryParams.push(date_from);
            }

            if (date_to) {
                paramIndex++;
                whereClause += ` AND a.appointment_date <= $${paramIndex}`;
                queryParams.push(date_to);
            }

            if (search) {
                paramIndex++;
                whereClause += ` AND (
                    a.description ILIKE $${paramIndex} OR
                    c.company_name ILIKE $${paramIndex} OR
                    c.contact_person ILIKE $${paramIndex} OR
                    u.first_name ILIKE $${paramIndex} OR
                    u.last_name ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${search}%`);
            }

            // Validate sort column
            const allowedSortColumns = [
                'appointment_date', 'start_time', 'appointment_type', 'status', 
                'priority', 'estimated_duration', 'estimated_cost', 'created_at'
            ];
            
            const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'appointment_date';
            const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

            const query = `
                SELECT 
                    a.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    c.address_street,
                    c.address_city,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    d.serial_number as device_serial,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name,
                    u.phone as technician_phone
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN devices d ON a.device_id = d.id
                LEFT JOIN users u ON a.technician_id = u.id
                ${whereClause}
                ORDER BY a.${sortColumn} ${order}, a.start_time ASC
                LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
            `;

            queryParams.push(limit, offset);

            const countQuery = `
                SELECT COUNT(*) as total
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN devices d ON a.device_id = d.id
                LEFT JOIN users u ON a.technician_id = u.id
                ${whereClause}
            `;

            const [appointmentsResult, countResult] = await Promise.all([
                DatabaseService.query(query, queryParams),
                DatabaseService.query(countQuery, queryParams.slice(0, -2))
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                appointments: appointmentsResult.rows,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getAppointments' });
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
            const query = `
                SELECT 
                    a.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    c.address_street,
                    c.address_city,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    d.serial_number as device_serial,
                    d.location_description as device_location,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name,
                    u.phone as technician_phone,
                    u.email as technician_email
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN devices d ON a.device_id = d.id
                LEFT JOIN users u ON a.technician_id = u.id
                WHERE a.id = $1
            `;

            const result = await DatabaseService.query(query, [id]);
            return result.rows.length > 0 ? result.rows[0] : null;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getAppointmentById' });
            throw error;
        }
    }

    /**
     * Update appointment
     * @param {string} id - Appointment ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated appointment
     */
    async updateAppointment(id, updateData) {
        try {
            const updates = [];
            const values = [];
            let paramIndex = 0;

            // Build dynamic update query
            const updatableFields = [
                'appointment_date', 'start_time', 'estimated_duration',
                'appointment_type', 'priority', 'status', 'description',
                'internal_notes', 'client_requirements', 'estimated_cost',
                'cancelled_reason', 'cancelled_by'
            ];

            for (const field of updatableFields) {
                if (updateData.hasOwnProperty(field)) {
                    paramIndex++;
                    updates.push(`${field} = $${paramIndex}`);
                    values.push(updateData[field]);
                }
            }

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Add updated_at timestamp
            paramIndex++;
            updates.push(`updated_at = $${paramIndex}`);
            values.push(new Date());

            // Add ID parameter
            paramIndex++;
            values.push(id);

            const query = `
                UPDATE appointments 
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await DatabaseService.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Appointment not found');
            }

            return result.rows[0];

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'updateAppointment' });
            throw error;
        }
    }

    /**
     * Delete appointment
     * @param {string} id - Appointment ID
     * @returns {boolean} Success status
     */
    async deleteAppointment(id) {
        try {
            const query = 'DELETE FROM appointments WHERE id = $1 RETURNING id';
            const result = await DatabaseService.query(query, [id]);
            
            return result.rows.length > 0;

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
            console.log('🔍 Database getTodaysAppointments called with technicianId:', technicianId);
            
            let query = `
                SELECT 
                    a.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.address_street,
                    c.address_city,
                    d.brand as device_brand,
                    d.model as device_model,
                    d.device_type,
                    u.first_name as technician_first_name,
                    u.last_name as technician_last_name
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN devices d ON a.device_id = d.id
                LEFT JOIN users u ON a.technician_id = u.id
                WHERE a.appointment_date = CURRENT_DATE
            `;

            const params = [];
            if (technicianId) {
                query += ' AND a.technician_id = $1';
                params.push(technicianId);
            }

            query += ' ORDER BY a.start_time ASC';
            
            console.log('🔍 Executing query:', query);
            console.log('🔍 With params:', params);
            console.log('🔍 Current date (CURRENT_DATE):', new Date().toISOString().split('T')[0]);

            const result = await DatabaseService.query(query, params);
            console.log('🔍 Query result: got', result.rows.length, 'rows');
            
            if (result.rows.length > 0) {
                console.log('🔍 First appointment sample:', {
                    id: result.rows[0].id?.substring(0, 8),
                    date: result.rows[0].appointment_date,
                    time: result.rows[0].start_time,
                    description: result.rows[0].description
                });
            }
            
            return result.rows;

        } catch (error) {
            console.error('❌ Database error in getTodaysAppointments:', error.message);
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getTodaysAppointments' });
            throw error;
        }
    }

    /**
     * Get technicians list
     * @returns {Array} List of technicians with id, name, and role
     */
    async getTechnicians() {
        try {
            const query = `
                SELECT 
                    id,
                    username,
                    first_name,
                    last_name,
                    email,
                    phone,
                    role
                FROM users
                WHERE is_active = true 
                AND (role = 'technician' OR role = 'admin')
                ORDER BY first_name ASC, last_name ASC
            `;

            const result = await DatabaseService.query(query);
            
            return result.rows.map(user => ({
                id: user.id,
                username: user.username,
                name: `${user.first_name} ${user.last_name}`.trim(),
                display_name: `${user.first_name} ${user.last_name}`.trim(),
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'service', { operation: 'getTechnicians' });
            throw error;
        }
    }
}

module.exports = ServiceDatabaseService; 