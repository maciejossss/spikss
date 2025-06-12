const DatabaseService = require('./database');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

async function migrateClientsTable() {
    try {
        await DatabaseService.initialize();
        
        // Check if old schema exists
        const oldSchemaQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'clients' 
                AND column_name = 'name'
            );
        `;
        const oldSchemaResult = await DatabaseService.query(oldSchemaQuery);
        const hasOldSchema = oldSchemaResult.rows[0].exists;

        if (hasOldSchema) {
            console.log('Migrating clients table to new schema...');
            
            // Create temporary table with new schema
            await DatabaseService.query(`
                CREATE TABLE clients_new (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_name VARCHAR(200),
                    contact_person VARCHAR(100) NOT NULL,
                    nip VARCHAR(15) UNIQUE,
                    regon VARCHAR(20),
                    address_street VARCHAR(200),
                    address_city VARCHAR(100),
                    address_postal_code VARCHAR(10),
                    address_country VARCHAR(50) DEFAULT 'Polska',
                    phone VARCHAR(20),
                    email VARCHAR(100),
                    website VARCHAR(200),
                    notes TEXT,
                    client_type VARCHAR(20) DEFAULT 'business',
                    priority_level VARCHAR(20) DEFAULT 'standard',
                    payment_terms INTEGER DEFAULT 30,
                    discount_percentage DECIMAL(5,2) DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_by UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Copy data from old table
            await DatabaseService.query(`
                INSERT INTO clients_new (
                    contact_person, 
                    address_street,
                    phone,
                    email,
                    notes,
                    created_at,
                    updated_at
                )
                SELECT 
                    name as contact_person,
                    address as address_street,
                    phone,
                    email,
                    notes,
                    created_at,
                    updated_at
                FROM clients
            `);

            // Backup old table
            await DatabaseService.query('ALTER TABLE clients RENAME TO clients_backup');
            
            // Rename new table
            await DatabaseService.query('ALTER TABLE clients_new RENAME TO clients');
            
            // Create indexes
            await DatabaseService.query(`
                CREATE INDEX idx_clients_company_name ON clients(company_name);
                CREATE INDEX idx_clients_nip ON clients(nip);
                CREATE INDEX idx_clients_contact_person ON clients(contact_person);
                CREATE INDEX idx_clients_city ON clients(address_city);
                CREATE INDEX idx_clients_type ON clients(client_type);
                CREATE INDEX idx_clients_priority ON clients(priority_level);
            `);

            console.log('Migration completed successfully!');
        } else {
            console.log('Clients table already has new schema.');
        }

    } catch (error) {
        ModuleErrorHandler.logger.error('Migration failed:', error);
        throw error;
    } finally {
        await DatabaseService.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateClientsTable()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrateClientsTable; 