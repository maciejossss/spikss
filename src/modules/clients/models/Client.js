const { DatabaseService } = require('../../../shared/database/database');
const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');

/**
 * CLIENT MODEL
 * Implements business logic and validation for Client entity
 * Part of modular MVC architecture
 */

class Client {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.email = data.email || '';
        this.phone = data.phone || '';
        this.address = data.address || '';
        this.city = data.city || '';
        this.postal_code = data.postal_code || '';
        this.nip = data.nip || '';
        this.company_name = data.company_name || '';
        this.contact_person = data.contact_person || '';
        this.notes = data.notes || '';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    // Validation rules
    validate() {
        const errors = [];

        // Name validation
        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (this.name && this.name.length > 100) {
            errors.push('Name cannot exceed 100 characters');
        }

        // Email validation
        if (this.email && !this.isValidEmail(this.email)) {
            errors.push('Invalid email format');
        }

        // Phone validation
        if (this.phone && !this.isValidPhone(this.phone)) {
            errors.push('Invalid phone format');
        }

        // NIP validation (Polish tax number)
        if (this.nip && !this.isValidNIP(this.nip)) {
            errors.push('Invalid NIP format');
        }

        // Postal code validation
        if (this.postal_code && !this.isValidPostalCode(this.postal_code)) {
            errors.push('Invalid postal code format');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Email format validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone format validation (Polish format)
    isValidPhone(phone) {
        const phoneRegex = /^(\+48\s?)?(\d{3}\s?\d{3}\s?\d{3}|\d{2}\s?\d{3}\s?\d{2}\s?\d{2})$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // NIP validation (Polish tax number)
    isValidNIP(nip) {
        const nipRegex = /^\d{10}$/;
        if (!nipRegex.test(nip)) return false;

        // NIP checksum validation
        const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
        let sum = 0;
        
        for (let i = 0; i < 9; i++) {
            sum += parseInt(nip[i]) * weights[i];
        }
        
        const checksum = sum % 11;
        return checksum === parseInt(nip[9]);
    }

    // Polish postal code validation
    isValidPostalCode(postalCode) {
        const postalRegex = /^\d{2}-\d{3}$/;
        return postalRegex.test(postalCode);
    }

    // Sanitize input data
    sanitize() {
        this.name = this.sanitizeString(this.name);
        this.email = this.sanitizeEmail(this.email);
        this.phone = this.sanitizePhone(this.phone);
        this.address = this.sanitizeString(this.address);
        this.city = this.sanitizeString(this.city);
        this.postal_code = this.sanitizePostalCode(this.postal_code);
        this.nip = this.sanitizeNIP(this.nip);
        this.company_name = this.sanitizeString(this.company_name);
        this.contact_person = this.sanitizeString(this.contact_person);
        this.notes = this.sanitizeString(this.notes);
    }

    sanitizeString(str) {
        if (!str) return '';
        return str.trim().replace(/[<>]/g, '');
    }

    sanitizeEmail(email) {
        if (!email) return '';
        return email.trim().toLowerCase();
    }

    sanitizePhone(phone) {
        if (!phone) return '';
        return phone.replace(/[^\d\+\s\-]/g, '').trim();
    }

    sanitizePostalCode(postalCode) {
        if (!postalCode) return '';
        return postalCode.replace(/[^\d\-]/g, '');
    }

    sanitizeNIP(nip) {
        if (!nip) return '';
        return nip.replace(/[^\d]/g, '');
    }

    // Convert to database format
    toDatabase() {
        return {
            name: this.name,
            email: this.email,
            phone: this.phone,
            address: this.address,
            city: this.city,
            postal_code: this.postal_code,
            nip: this.nip,
            company_name: this.company_name,
            contact_person: this.contact_person,
            notes: this.notes
        };
    }

    // Convert to API response format
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            address: this.address,
            city: this.city,
            postal_code: this.postal_code,
            nip: this.nip,
            company_name: this.company_name,
            contact_person: this.contact_person,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Create from database row
    static fromDatabase(row) {
        return new Client(row);
    }

    // Create from API request
    static fromRequest(requestData) {
        const client = new Client(requestData);
        client.sanitize();
        return client;
    }

    // Get display name for UI
    getDisplayName() {
        if (this.company_name) {
            return this.contact_person ? 
                `${this.company_name} (${this.contact_person})` : 
                this.company_name;
        }
        return this.name;
    }

    // Get full address
    getFullAddress() {
        const parts = [this.address, this.postal_code, this.city].filter(part => part);
        return parts.join(', ');
    }

    // Check if client is a company
    isCompany() {
        return !!this.company_name;
    }

    // Get contact info summary
    getContactSummary() {
        const contacts = [];
        if (this.email) contacts.push(`Email: ${this.email}`);
        if (this.phone) contacts.push(`Tel: ${this.phone}`);
        return contacts.join(', ');
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
}

module.exports = Client; 