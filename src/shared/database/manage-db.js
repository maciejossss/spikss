require('dotenv').config();
const DatabaseService = require('./database');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');
const migrateClientsTable = require('./migrate-clients');

async function resetDatabase() {
    try {
        await DatabaseService.initialize();
        
        // Drop all tables
        await DatabaseService.query(`
            DROP TABLE IF EXISTS service_records CASCADE;
            DROP TABLE IF EXISTS devices CASCADE;
            DROP TABLE IF EXISTS clients CASCADE;
            DROP TABLE IF EXISTS clients_backup CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);
        
        console.log('All tables dropped successfully');
        return true;
    } catch (error) {
        console.error('Failed to reset database:', error);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        await DatabaseService.initialize();
        
        // Create users table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                email VARCHAR(255),
                role VARCHAR(20) NOT NULL,
                permissions JSONB NOT NULL DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create clients table with new schema
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS clients (
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
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
            CREATE INDEX IF NOT EXISTS idx_clients_nip ON clients(nip);
            CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
            CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(address_city);
            CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
            CREATE INDEX IF NOT EXISTS idx_clients_priority ON clients(priority_level);
        `);

        // Create devices table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS devices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES clients(id),
                type VARCHAR(50) NOT NULL,
                model VARCHAR(100),
                serial_number VARCHAR(100),
                installation_date DATE,
                last_service_date DATE,
                next_service_date DATE,
                status VARCHAR(20),
                notes TEXT,
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client_id);
            CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
            CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
        `);

        // Create service_records table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS service_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_id UUID REFERENCES devices(id),
                service_date DATE NOT NULL,
                service_type VARCHAR(50),
                description TEXT,
                parts_replaced TEXT[],
                technician_id UUID REFERENCES users(id),
                status VARCHAR(20),
                next_service_date DATE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_service_device ON service_records(device_id);
            CREATE INDEX IF NOT EXISTS idx_service_date ON service_records(service_date);
            CREATE INDEX IF NOT EXISTS idx_service_technician ON service_records(technician_id);
        `);

        // Create default admin user if not exists
        const adminExists = await DatabaseService.query(
            'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)',
            ['admin']
        );

        if (!adminExists.rows[0].exists) {
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash('Admin123!', 12);
            
            await DatabaseService.query(`
                INSERT INTO users (
                    username,
                    password_hash,
                    first_name,
                    last_name,
                    email,
                    role,
                    permissions
                ) VALUES (
                    'admin',
                    $1,
                    'Administrator',
                    'System',
                    'admin@system.local',
                    'admin',
                    $2
                )
            `, [
                passwordHash,
                JSON.stringify({
                    'service-records': ['read', 'write', 'delete'],
                    'scheduling': ['read', 'write', 'delete'],
                    'clients': ['read', 'write', 'delete'],
                    'devices': ['read', 'write', 'delete'],
                    'system': ['read', 'write', 'delete']
                })
            ]);
            
            console.log('Created default admin user');
        }

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

async function checkDatabaseConnection() {
    try {
        await DatabaseService.initialize();
        const result = await DatabaseService.query('SELECT NOW() as time');
        console.log('Database connection successful:', result.rows[0].time);
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2];
    
    const commands = {
        'reset': resetDatabase,
        'init': initializeDatabase,
        'check': checkDatabaseConnection,
        'migrate': migrateClientsTable
    };

    if (!command || !commands[command]) {
        console.log('Available commands:');
        console.log('- reset: Drop all tables');
        console.log('- init: Initialize database schema');
        console.log('- check: Test database connection');
        console.log('- migrate: Migrate clients table to new schema');
        process.exit(1);
    }

    commands[command]()
        .then(() => {
            console.log(`Command '${command}' completed successfully`);
            process.exit(0);
        })
        .catch(error => {
            console.error(`Command '${command}' failed:`, error);
            process.exit(1);
        })
        .finally(() => {
            DatabaseService.close();
        });
}

module.exports = {
    resetDatabase,
    initializeDatabase,
    checkDatabaseConnection,
    migrateClientsTable
}; 