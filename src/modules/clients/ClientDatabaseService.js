const DatabaseService = require('../../shared/database/database');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

/**
 * Client Database Service - Data access layer
 * Follows RULE 3: DATABASE ISOLATION from rules.txt
 * Only accesses tables belonging to clients module
 */
class ClientDatabaseService {
    
    constructor() {
        this.tableName = 'clients';
        // Only access tables belonging to this module
        this.allowedTables = ['clients'];
    }
    
    /**
     * Find all clients with filtering and pagination
     * @param {Object} filters - search, type, priority filters
     * @param {Object} pagination - page, limit
     * @returns {Object} { clients: [], total: number }
     */
    async findAll(filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            let whereClause = 'WHERE is_active = true';
            const params = [];
            let paramCount = 0;
            
            // Build dynamic WHERE clause based on filters
            if (filters.search && filters.search.trim()) {
                paramCount++;
                whereClause += ` AND (
                    LOWER(company_name) LIKE LOWER($${paramCount}) OR 
                    LOWER(contact_person) LIKE LOWER($${paramCount}) OR 
                    LOWER(email) LIKE LOWER($${paramCount}) OR 
                    LOWER(address_city) LIKE LOWER($${paramCount}) OR 
                    LOWER(address_street) LIKE LOWER($${paramCount}) OR 
                    phone LIKE $${paramCount}
                )`;
                params.push(`%${filters.search}%`);
            }
            
            if (filters.type) {
                paramCount++;
                whereClause += ` AND client_type = $${paramCount}`;
                params.push(filters.type);
            }
            
            if (filters.priority) {
                paramCount++;
                whereClause += ` AND priority_level = $${paramCount}`;
                params.push(filters.priority);
            }
            
            // Get total count
            const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
            const countResult = await DatabaseService.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);
            
            // Get paginated results
            const offset = (pagination.page - 1) * pagination.limit;
            paramCount++;
            const limitParam = paramCount;
            paramCount++;
            const offsetParam = paramCount;
            
            const dataQuery = `
                SELECT 
                    id, company_name, contact_person, nip, regon,
                    address_street, address_city, address_postal_code, address_country,
                    phone, email, website, notes, client_type, priority_level,
                    payment_terms, discount_percentage, is_active,
                    created_at, updated_at
                FROM ${this.tableName} 
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${limitParam} OFFSET $${offsetParam}
            `;
            
            const dataResult = await DatabaseService.query(dataQuery, [...params, pagination.limit, offset]);
            
            return {
                clients: dataResult.rows,
                total: total
            };
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Find client by ID
     * @param {string} id - Client UUID
     * @returns {Object|null} Client object or null
     */
    async findById(id) {
        try {
            const query = `
                SELECT 
                    id, company_name, contact_person, nip, regon,
                    address_street, address_city, address_postal_code, address_country,
                    phone, email, website, notes, client_type, priority_level,
                    payment_terms, discount_percentage, is_active,
                    created_at, updated_at
                FROM ${this.tableName} 
                WHERE id = $1 AND is_active = true
            `;
            
            const result = await DatabaseService.query(query, [id]);
            return result.rows[0] || null;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Find client by NIP
     * @param {string} nip - NIP number
     * @returns {Object|null} Client object or null
     */
    async findByNip(nip) {
        try {
            const query = `
                SELECT id, company_name, contact_person, nip
                FROM ${this.tableName} 
                WHERE nip = $1 AND is_active = true
            `;
            
            const result = await DatabaseService.query(query, [nip]);
            return result.rows[0] || null;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Find potential duplicate client based on contact person and address
     * @param {string} contactPerson - Contact person name
     * @param {string} addressStreet - Street address
     * @param {string} addressCity - City
     * @param {string} excludeId - ID to exclude from search (for updates)
     * @returns {Object|null} Client object or null
     */
    async findDuplicateClient(contactPerson, addressStreet, addressCity, excludeId = null) {
        try {
            let query = `
                SELECT id, company_name, contact_person, address_street, address_city, phone, email
                FROM ${this.tableName} 
                WHERE is_active = true 
                AND LOWER(TRIM(contact_person)) = LOWER(TRIM($1))
            `;
            
            const params = [contactPerson];
            let paramIndex = 2;
            
            // Add address matching if provided
            if (addressStreet && addressStreet.trim()) {
                query += ` AND LOWER(TRIM(address_street)) = LOWER(TRIM($${paramIndex}))`;
                params.push(addressStreet);
                paramIndex++;
            }
            
            if (addressCity && addressCity.trim()) {
                query += ` AND LOWER(TRIM(address_city)) = LOWER(TRIM($${paramIndex}))`;
                params.push(addressCity);
                paramIndex++;
            }
            
            // Exclude specific ID if provided (for updates)
            if (excludeId) {
                query += ` AND id != $${paramIndex}`;
                params.push(excludeId);
            }
            
            query += ` LIMIT 1`;
            
            const result = await DatabaseService.query(query, params);
            return result.rows[0] || null;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Find potential duplicates by contact person only
     * @param {string} contactPerson - Contact person name
     * @param {string} excludeId - ID to exclude from search (for updates)
     * @returns {Array} Array of potential duplicate clients
     */
    async findByContactPerson(contactPerson, excludeId = null) {
        try {
            let query = `
                SELECT id, company_name, contact_person, address_street, address_city, phone, email
                FROM ${this.tableName} 
                WHERE is_active = true 
                AND LOWER(TRIM(contact_person)) = LOWER(TRIM($1))
            `;
            
            const params = [contactPerson];
            
            // Exclude specific ID if provided (for updates)
            if (excludeId) {
                query += ` AND id != $2`;
                params.push(excludeId);
            }
            
            const result = await DatabaseService.query(query, params);
            return result.rows;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Create new client
     * @param {Object} clientData - Client data
     * @returns {Object} Created client
     */
    async create(clientData) {
        try {
            const query = `
                INSERT INTO ${this.tableName} (
                    company_name, contact_person, nip, regon, address_street,
                    address_city, address_postal_code, address_country, phone, email,
                    website, client_type, priority_level, payment_terms, discount_percentage,
                    notes, is_active, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                ) RETURNING 
                    id, company_name, contact_person, nip, regon,
                    address_street, address_city, address_postal_code, address_country,
                    phone, email, website, notes, client_type, priority_level,
                    payment_terms, discount_percentage, is_active,
                    created_at, updated_at
            `;
            
            const params = [
                clientData.company_name || null,
                clientData.contact_person,
                clientData.nip || null,
                clientData.regon || null,
                clientData.address_street || null,
                clientData.address_city || null,
                clientData.address_postal_code || null,
                clientData.address_country || 'Polska',
                clientData.phone || null,
                clientData.email || null,
                clientData.website || null,
                clientData.client_type || 'business',
                clientData.priority_level || 'standard',
                clientData.payment_terms || 30,
                clientData.discount_percentage || 0,
                clientData.notes || null,
                clientData.is_active !== undefined ? clientData.is_active : true,
                clientData.created_by
            ];
            
            const result = await DatabaseService.query(query, params);
            return result.rows[0];
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Update client
     * @param {string} id - Client ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated client
     */
    async update(id, updateData) {
        try {
            // Build dynamic update query
            const fields = Object.keys(updateData).filter(key => 
                key !== 'id' && key !== 'created_at' && key !== 'created_by'
            );
            
            if (fields.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const values = [id, ...fields.map(field => updateData[field])];
            
            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
                RETURNING 
                    id, company_name, contact_person, nip, regon,
                    address_street, address_city, address_postal_code, address_country,
                    phone, email, website, notes, client_type, priority_level,
                    payment_terms, discount_percentage, is_active,
                    created_at, updated_at
            `;
            
            const result = await DatabaseService.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Client not found or already deleted');
            }
            
            return result.rows[0];
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Delete client (hard delete - use with caution)
     * @param {string} id - Client ID
     * @returns {boolean} Success status
     */
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await DatabaseService.query(query, [id]);
            
            return result.rowCount > 0;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Get client statistics
     * @returns {Object} Statistics object
     */
    async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN client_type = 'business' THEN 1 END) as business,
                    COUNT(CASE WHEN client_type = 'individual' THEN 1 END) as individual,
                    COUNT(CASE WHEN priority_level = 'high' THEN 1 END) as high_priority,
                    COUNT(CASE WHEN priority_level = 'critical' THEN 1 END) as critical_priority,
                    AVG(payment_terms) as avg_payment_terms,
                    AVG(discount_percentage) as avg_discount
                FROM ${this.tableName}
                WHERE is_active = true
            `;
            
            const result = await DatabaseService.query(query);
            const stats = result.rows[0];
            
            return {
                total: parseInt(stats.total),
                business: parseInt(stats.business),
                individual: parseInt(stats.individual),
                high_priority: parseInt(stats.high_priority),
                critical_priority: parseInt(stats.critical_priority),
                avg_payment_terms: parseFloat(stats.avg_payment_terms) || 30,
                avg_discount: parseFloat(stats.avg_discount) || 0
            };
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
    
    /**
     * Search clients
     * @param {string} criteria - Search criteria
     * @returns {Array} Array of matching clients
     */
    async search(criteria) {
        try {
            const query = `
                SELECT 
                    id, company_name, contact_person, phone, email, 
                    address_city, client_type, priority_level
                FROM ${this.tableName}
                WHERE is_active = true 
                AND (
                    LOWER(company_name) LIKE LOWER($1) OR 
                    LOWER(contact_person) LIKE LOWER($1) OR 
                    LOWER(email) LIKE LOWER($1) OR 
                    LOWER(address_city) LIKE LOWER($1) OR 
                    LOWER(address_street) LIKE LOWER($1) OR 
                    phone LIKE $1
                )
                ORDER BY 
                    CASE WHEN LOWER(company_name) LIKE LOWER($1) THEN 1 ELSE 2 END,
                    company_name, contact_person
                LIMIT 50
            `;
            
            const searchPattern = `%${criteria}%`;
            const result = await DatabaseService.query(query, [searchPattern]);
            
            return result.rows;
            
        } catch (error) {
            throw new Error(`Database error in clients module: ${error.message}`);
        }
    }
}

module.exports = new ClientDatabaseService(); 