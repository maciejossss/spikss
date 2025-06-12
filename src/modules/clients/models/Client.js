const { DatabaseService } = require('../../../shared/database/database');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

class Client {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.phone = data.phone;
        this.address = data.address;
        this.nip = data.nip;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const db = DatabaseService.getInstance();
            const result = await db.query(
                'SELECT * FROM clients WHERE id = $1',
                [id]
            );
            return result.rows[0] ? new Client(result.rows[0]) : null;
        } catch (error) {
            ModuleErrorHandler.handleError(error, 'clients');
            throw error;
        }
    }

    static async findAll(filters = {}) {
        try {
            const db = DatabaseService.getInstance();
            let query = 'SELECT * FROM clients';
            const params = [];
            const conditions = [];

            if (filters.name) {
                params.push(`%${filters.name}%`);
                conditions.push(`name ILIKE $${params.length}`);
            }

            if (filters.email) {
                params.push(`%${filters.email}%`);
                conditions.push(`email ILIKE $${params.length}`);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result.rows.map(row => new Client(row));
        } catch (error) {
            ModuleErrorHandler.handleError(error, 'clients');
            throw error;
        }
    }

    async save() {
        try {
            const db = DatabaseService.getInstance();
            if (this.id) {
                // Update
                const result = await db.query(
                    `UPDATE clients 
                     SET name = $1, email = $2, phone = $3, address = $4, 
                         nip = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $7
                     RETURNING *`,
                    [this.name, this.email, this.phone, this.address, 
                     this.nip, this.notes, this.id]
                );
                Object.assign(this, result.rows[0]);
            } else {
                // Insert
                const result = await db.query(
                    `INSERT INTO clients 
                     (name, email, phone, address, nip, notes)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [this.name, this.email, this.phone, this.address, 
                     this.nip, this.notes]
                );
                Object.assign(this, result.rows[0]);
            }
            return this;
        } catch (error) {
            ModuleErrorHandler.handleError(error, 'clients');
            throw error;
        }
    }

    async delete() {
        try {
            const db = DatabaseService.getInstance();
            await db.query('DELETE FROM clients WHERE id = $1', [this.id]);
            return true;
        } catch (error) {
            ModuleErrorHandler.handleError(error, 'clients');
            throw error;
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            address: this.address,
            nip: this.nip,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Client; 