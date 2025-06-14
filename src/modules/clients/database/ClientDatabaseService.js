/**
 * CLIENT MODULE DATABASE SERVICE
 * Implements RULE 3: DATABASE ISOLATION
 * Only accesses tables belonging to clients module
 */

const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class ClientDatabaseService {
    constructor(databaseConnection) {
        this.db = databaseConnection;
        this.tableName = 'clients';
        this.moduleName = 'CLIENTS';
    }

    async testConnection() {
        return new Promise((resolve, reject) => {
            try {
                this.db.get('SELECT 1 as test', (err, row) => {
                    if (err) {
                        reject(new Error(`Database connection test failed in ${this.moduleName}: ${err.message}`));
                    } else {
                        resolve(row.test === 1);
                    }
                });
            } catch (error) {
                reject(new Error(`Database connection test failed in ${this.moduleName}: ${error.message}`));
            }
        });
    }

    async findAll(pagination = { page: 1, limit: 10 }) {
        return new Promise((resolve, reject) => {
            try {
                const offset = (pagination.page - 1) * pagination.limit;
                const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
                
                this.db.all(query, [pagination.limit, offset], (err, rows) => {
                    if (err) {
                        reject(new Error(`Database error in ${this.moduleName} findAll: ${err.message}`));
                    } else {
                        resolve(rows);
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} findAll: ${error.message}`));
            }
        });
    }

    async findById(id) {
        return new Promise((resolve, reject) => {
            try {
                const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
                
                this.db.get(query, [id], (err, row) => {
                    if (err) {
                        reject(new Error(`Database error in ${this.moduleName} findById: ${err.message}`));
                    } else {
                        resolve(row);
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} findById: ${error.message}`));
            }
        });
    }

    async create(clientData) {
        return new Promise((resolve, reject) => {
            try {
                const {
                    name,
                    email,
                    phone,
                    address,
                    city,
                    postal_code,
                    nip,
                    company_name,
                    contact_person,
                    notes
                } = clientData;

                const query = `
                    INSERT INTO ${this.tableName} 
                    (name, email, phone, address, city, postal_code, nip, company_name, contact_person, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `;

                const db = this.db;
                db.run(query, [
                    name, email, phone, address, city, postal_code, nip, company_name, contact_person, notes
                ], function(err) {
                    if (err) {
                        reject(new Error(`Database error in CLIENTS create: ${err.message}`));
                    } else {
                        // Get the created record
                        const selectQuery = `SELECT * FROM clients WHERE id = ?`;
                        db.get(selectQuery, [this.lastID], (err, row) => {
                            if (err) {
                                reject(new Error(`Database error in CLIENTS create (select): ${err.message}`));
                            } else {
                                resolve(row);
                            }
                        });
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} create: ${error.message}`));
            }
        });
    }

    async update(id, clientData) {
        return new Promise((resolve, reject) => {
            try {
                const {
                    name,
                    email,
                    phone,
                    address,
                    city,
                    postal_code,
                    nip,
                    company_name,
                    contact_person,
                    notes
                } = clientData;

                const query = `
                    UPDATE ${this.tableName} 
                    SET name = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?, 
                        nip = ?, company_name = ?, contact_person = ?, notes = ?, updated_at = datetime('now')
                    WHERE id = ?
                `;

                const db = this.db;
                db.run(query, [
                    name, email, phone, address, city, postal_code, nip, company_name, contact_person, notes, id
                ], function(err) {
                    if (err) {
                        reject(new Error(`Database error in CLIENTS update: ${err.message}`));
                    } else if (this.changes === 0) {
                        reject(new Error('Client not found'));
                    } else {
                        // Get the updated record
                        const selectQuery = `SELECT * FROM clients WHERE id = ?`;
                        db.get(selectQuery, [id], (err, row) => {
                            if (err) {
                                reject(new Error(`Database error in CLIENTS update (select): ${err.message}`));
                            } else {
                                resolve(row);
                            }
                        });
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} update: ${error.message}`));
            }
        });
    }

    async delete(id) {
        return new Promise((resolve, reject) => {
            try {
                const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
                
                this.db.run(query, [id], function(err) {
                    if (err) {
                        reject(new Error(`Database error in CLIENTS delete: ${err.message}`));
                    } else {
                        resolve(this.changes > 0);
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} delete: ${error.message}`));
            }
        });
    }

    async search(criteria) {
        return new Promise((resolve, reject) => {
            try {
                let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
                const params = [];

                if (criteria.name) {
                    query += ` AND name LIKE ?`;
                    params.push(`%${criteria.name}%`);
                }

                if (criteria.email) {
                    query += ` AND email LIKE ?`;
                    params.push(`%${criteria.email}%`);
                }

                if (criteria.phone) {
                    query += ` AND phone LIKE ?`;
                    params.push(`%${criteria.phone}%`);
                }

                if (criteria.city) {
                    query += ` AND city LIKE ?`;
                    params.push(`%${criteria.city}%`);
                }

                query += ` ORDER BY created_at DESC`;

                this.db.all(query, params, (err, rows) => {
                    if (err) {
                        reject(new Error(`Database error in ${this.moduleName} search: ${err.message}`));
                    } else {
                        resolve(rows);
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} search: ${error.message}`));
            }
        });
    }

    async count() {
        return new Promise((resolve, reject) => {
            try {
                const query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
                
                this.db.get(query, (err, row) => {
                    if (err) {
                        reject(new Error(`Database error in ${this.moduleName} count: ${err.message}`));
                    } else {
                        resolve(row.total);
                    }
                });
            } catch (error) {
                reject(new Error(`Database error in ${this.moduleName} count: ${error.message}`));
            }
        });
    }
}

module.exports = ClientDatabaseService; 