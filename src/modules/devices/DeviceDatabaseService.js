/**
 * RULE 3: DATABASE ISOLATION
 * Device Database Service for System Serwisowy Palniki & Kotły
 * Handles all database operations for devices module
 */

const DatabaseService = require('../../shared/database/database');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class DeviceDatabaseService {
    
    /**
     * Create new device
     * @param {Object} deviceData - Device data
     * @returns {Object} Created device
     */
    async createDevice(deviceData) {
        try {
            const query = `
                INSERT INTO devices (
                    client_id, device_type, brand, model, serial_number, 
                    manufacture_year, power_rating, fuel_type, installation_date,
                    warranty_expiry_date, location_description, technical_specifications,
                    maintenance_interval_days, last_service_date, next_service_due,
                    status, condition_rating, notes, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
                ) RETURNING *
            `;

            const values = [
                deviceData.client_id,
                deviceData.device_type,
                deviceData.brand || null,
                deviceData.model || null,
                deviceData.serial_number || null,
                deviceData.manufacture_year || null,
                deviceData.power_rating || null,
                deviceData.fuel_type || null,
                deviceData.installation_date || null,
                deviceData.warranty_expiry_date || null,
                deviceData.location_description || null,
                JSON.stringify(deviceData.technical_specifications || {}),
                deviceData.maintenance_interval_days || 365,
                deviceData.last_service_date || null,
                deviceData.next_service_due || null,
                deviceData.status || 'active',
                deviceData.condition_rating || null,
                deviceData.notes || null,
                deviceData.created_by
            ];

            const result = await DatabaseService.query(query, values);
            return result.rows[0];

        } catch (error) {
            ModuleErrorHandler.handleError('createDevice', error);
            throw error;
        }
    }

    /**
     * Get all devices with pagination and filters
     * @param {Object} options - Query options
     * @returns {Object} Devices list with pagination info
     */
    async getDevices(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                client_id = null,
                client_search = '',
                device_type = null,
                brand = null,
                status = null,
                next_service_overdue = false,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;
            
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;

            // Search filter
            if (search) {
                // Split search terms for better name matching
                const searchTerms = search.trim().split(/\s+/);
                
                if (searchTerms.length === 1) {
                    // Single term - search in all fields
                    whereConditions.push(`(
                        LOWER(d.brand) LIKE LOWER($${paramIndex}) OR 
                        LOWER(d.model) LIKE LOWER($${paramIndex}) OR 
                        LOWER(d.serial_number) LIKE LOWER($${paramIndex}) OR
                        LOWER(d.location_description) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.company_name) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.contact_person) LIKE LOWER($${paramIndex})
                    )`);
                    queryParams.push(`%${search}%`);
                    paramIndex++;
                } else {
                    // Multiple terms - treat as first name + last name search
                    const nameSearchConditions = searchTerms.map(term => 
                        `LOWER(c.contact_person) LIKE LOWER($${paramIndex + searchTerms.indexOf(term)})`
                    ).join(' AND ');
                    
                    whereConditions.push(`(
                        LOWER(d.brand) LIKE LOWER($${paramIndex}) OR 
                        LOWER(d.model) LIKE LOWER($${paramIndex}) OR 
                        LOWER(d.serial_number) LIKE LOWER($${paramIndex}) OR
                        LOWER(d.location_description) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.company_name) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.contact_person) LIKE LOWER($${paramIndex}) OR
                        (${nameSearchConditions})
                    )`);
                    
                    queryParams.push(`%${search}%`);
                    paramIndex++;
                    
                    // Add individual name terms
                    searchTerms.forEach(term => {
                        queryParams.push(`%${term}%`);
                        paramIndex++;
                    });
                }
            }

            // Client search filter (dedicated client name search)
            if (client_search) {
                const clientSearchTerms = client_search.trim().split(/\s+/);
                
                if (clientSearchTerms.length === 1) {
                    // Single term - search in client fields only
                    whereConditions.push(`(
                        LOWER(c.company_name) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.contact_person) LIKE LOWER($${paramIndex})
                    )`);
                    queryParams.push(`%${client_search}%`);
                    paramIndex++;
                } else {
                    // Multiple terms - all must match contact_person (name parts)
                    const clientNameConditions = clientSearchTerms.map(term => 
                        `LOWER(c.contact_person) LIKE LOWER($${paramIndex + clientSearchTerms.indexOf(term)})`
                    ).join(' AND ');
                    
                    whereConditions.push(`(
                        LOWER(c.company_name) LIKE LOWER($${paramIndex}) OR
                        LOWER(c.contact_person) LIKE LOWER($${paramIndex}) OR
                        (${clientNameConditions})
                    )`);
                    
                    queryParams.push(`%${client_search}%`);
                    paramIndex++;
                    
                    // Add individual client name terms
                    clientSearchTerms.forEach(term => {
                        queryParams.push(`%${term}%`);
                        paramIndex++;
                    });
                }
            }

            // Client filter
            if (client_id) {
                whereConditions.push(`d.client_id = $${paramIndex}`);
                queryParams.push(client_id);
                paramIndex++;
            }

            // Device type filter
            if (device_type) {
                whereConditions.push(`d.device_type = $${paramIndex}`);
                queryParams.push(device_type);
                paramIndex++;
            }

            // Brand filter
            if (brand) {
                whereConditions.push(`LOWER(d.brand) = LOWER($${paramIndex})`);
                queryParams.push(brand);
                paramIndex++;
            }

            // Status filter
            if (status) {
                whereConditions.push(`d.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            // Next service overdue filter
            if (next_service_overdue) {
                whereConditions.push(`d.next_service_due < CURRENT_DATE`);
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Validate sort column
            const validSortColumns = [
                'created_at', 'brand', 'model', 'device_type', 'installation_date',
                'next_service_due', 'status', 'company_name', 'contact_person'
            ];
            
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const query = `
                SELECT 
                    d.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    u.first_name as created_by_name,
                    u.last_name as created_by_lastname,
                    CASE 
                        WHEN d.next_service_due < CURRENT_DATE THEN true 
                        ELSE false 
                    END as service_overdue
                FROM devices d
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON d.created_by = u.id
                ${whereClause}
                ORDER BY ${sortColumn === 'company_name' || sortColumn === 'contact_person' ? 'c.' + sortColumn : 'd.' + sortColumn} ${order}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const countQuery = `
                SELECT COUNT(*) as total
                FROM devices d
                LEFT JOIN clients c ON d.client_id = c.id
                ${whereClause}
            `;

            const [devicesResult, countResult] = await Promise.all([
                DatabaseService.query(query, queryParams),
                DatabaseService.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                devices: devicesResult.rows.map(device => ({
                    ...device,
                    technical_specifications: typeof device.technical_specifications === 'string' 
                        ? JSON.parse(device.technical_specifications) 
                        : device.technical_specifications
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            ModuleErrorHandler.handleError('getDevices', error);
            throw error;
        }
    }

    /**
     * Get device by ID
     * @param {string} deviceId - Device ID
     * @returns {Object|null} Device data
     */
    async getDeviceById(deviceId) {
        try {
            const query = `
                SELECT 
                    d.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    c.address_street,
                    c.address_city,
                    c.address_postal_code,
                    u.first_name as created_by_name,
                    u.last_name as created_by_lastname,
                    CASE 
                        WHEN d.next_service_due < CURRENT_DATE THEN true 
                        ELSE false 
                    END as service_overdue
                FROM devices d
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN users u ON d.created_by = u.id
                WHERE d.id = $1
            `;

            const result = await DatabaseService.query(query, [deviceId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const device = result.rows[0];
            return {
                ...device,
                technical_specifications: typeof device.technical_specifications === 'string' 
                    ? JSON.parse(device.technical_specifications) 
                    : device.technical_specifications
            };

        } catch (error) {
            ModuleErrorHandler.handleError('getDeviceById', error);
            throw error;
        }
    }

    /**
     * Update device
     * @param {string} deviceId - Device ID
     * @param {Object} updateData - Update data
     * @returns {Object|null} Updated device
     */
    async updateDevice(deviceId, updateData) {
        try {
            const allowedFields = [
                'client_id', 'device_type', 'brand', 'model', 'serial_number',
                'manufacture_year', 'power_rating', 'fuel_type', 'installation_date',
                'warranty_expiry_date', 'location_description', 'technical_specifications',
                'maintenance_interval_days', 'last_service_date', 'next_service_due',
                'status', 'condition_rating', 'notes'
            ];

            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key) && updateData[key] !== undefined) {
                    updateFields.push(`${key} = $${paramIndex}`);
                    
                    if (key === 'technical_specifications' && typeof updateData[key] === 'object') {
                        updateValues.push(JSON.stringify(updateData[key]));
                    } else {
                        updateValues.push(updateData[key]);
                    }
                    paramIndex++;
                }
            });

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(deviceId);

            const query = `
                UPDATE devices 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await DatabaseService.query(query, updateValues);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'updateDevice' });
            throw error;
        }
    }

    /**
     * Delete device
     * @param {string} deviceId - Device ID
     * @returns {boolean} Success status
     */
    async deleteDevice(deviceId) {
        try {
            const query = 'DELETE FROM devices WHERE id = $1 RETURNING id';
            const result = await DatabaseService.query(query, [deviceId]);
            
            return result.rows.length > 0;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'deleteDevice' });
            throw error;
        }
    }

    /**
     * Find device by serial number
     * @param {string} serialNumber - Serial number
     * @param {string} excludeId - ID to exclude (for updates)
     * @returns {Object|null} Device data
     */
    async findBySerialNumber(serialNumber, excludeId = null) {
        try {
            let query = `
                SELECT d.*, c.company_name, c.contact_person 
                FROM devices d 
                LEFT JOIN clients c ON d.client_id = c.id 
                WHERE LOWER(TRIM(d.serial_number)) = LOWER(TRIM($1))
            `;
            const params = [serialNumber];

            if (excludeId) {
                query += ' AND d.id != $2';
                params.push(excludeId);
            }

            const result = await DatabaseService.query(query, params);
            return result.rows.length > 0 ? result.rows[0] : null;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'findBySerialNumber' });
            throw error;
        }
    }

    /**
     * Get devices due for service
     * @param {number} daysAhead - Days ahead to check
     * @returns {Array} Devices due for service
     */
    async getDevicesDueForService(daysAhead = 30) {
        try {
            const query = `
                SELECT 
                    d.*,
                    c.company_name,
                    c.contact_person,
                    c.phone as client_phone,
                    c.email as client_email,
                    CURRENT_DATE - d.next_service_due as days_overdue
                FROM devices d
                LEFT JOIN clients c ON d.client_id = c.id
                WHERE d.status = 'active' 
                AND d.next_service_due <= CURRENT_DATE + INTERVAL '${daysAhead} days'
                ORDER BY d.next_service_due ASC
            `;

            const result = await DatabaseService.query(query);
            return result.rows;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDevicesDueForService' });
            throw error;
        }
    }

    /**
     * Get device statistics
     * @returns {Object} Device statistics
     */
    async getDeviceStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_devices,
                    COUNT(*) FILTER (WHERE status = 'active') as active_devices,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_devices,
                    COUNT(*) FILTER (WHERE status = 'decommissioned') as decommissioned_devices,
                    COUNT(*) FILTER (WHERE next_service_due < CURRENT_DATE) as overdue_services,
                    COUNT(*) FILTER (WHERE next_service_due BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as upcoming_services,
                    COUNT(DISTINCT device_type) as device_types_count,
                    COUNT(DISTINCT brand) as brands_count
                FROM devices
            `;

            const result = await DatabaseService.query(query);
            return result.rows[0];

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDeviceStatistics' });
            throw error;
        }
    }

    /**
     * Get devices by client ID
     * @param {string} clientId - Client ID
     * @returns {Array} Client devices
     */
    async getDevicesByClientId(clientId) {
        try {
            const query = `
                SELECT 
                    d.*,
                    CASE 
                        WHEN d.next_service_due < CURRENT_DATE THEN true 
                        ELSE false 
                    END as service_overdue
                FROM devices d
                WHERE d.client_id = $1
                ORDER BY d.created_at DESC
            `;

            const result = await DatabaseService.query(query, [clientId]);
            
            return result.rows.map(device => ({
                ...device,
                technical_specifications: typeof device.technical_specifications === 'string' 
                    ? JSON.parse(device.technical_specifications) 
                    : device.technical_specifications
            }));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDevicesByClientId' });
            throw error;
        }
    }
}

module.exports = DeviceDatabaseService; 
