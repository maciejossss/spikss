/**
 * RULE 3: DATABASE ISOLATION
 * Database migration system for System Serwisowy Palniki & Kotły
 * Each module has its own isolated table structure
 */

require('dotenv').config();
const DatabaseService = require('./database');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class MigrationService {
    constructor() {
        this.migrations = [
            {
                version: '001',
                name: 'create_users_table',
                description: 'Create users table for authentication',
                sql: `
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'technician',
                        permissions JSONB DEFAULT '{}',
                        first_name VARCHAR(50),
                        last_name VARCHAR(50),
                        phone VARCHAR(20),
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_users_username ON users(username);
                    CREATE INDEX idx_users_email ON users(email);
                    CREATE INDEX idx_users_role ON users(role);
                `
            },
            {
                version: '002',
                name: 'create_clients_tables',
                description: 'Create clients module tables',
                sql: `
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
                        client_type VARCHAR(20) DEFAULT 'business', -- business, individual
                        priority_level VARCHAR(20) DEFAULT 'standard', -- low, standard, high, critical
                        payment_terms INTEGER DEFAULT 30, -- days
                        discount_percentage DECIMAL(5,2) DEFAULT 0,
                        is_active BOOLEAN DEFAULT true,
                        created_by UUID REFERENCES users(id),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_clients_company_name ON clients(company_name);
                    CREATE INDEX idx_clients_nip ON clients(nip);
                    CREATE INDEX idx_clients_contact_person ON clients(contact_person);
                    CREATE INDEX idx_clients_city ON clients(address_city);
                    CREATE INDEX idx_clients_type ON clients(client_type);
                    CREATE INDEX idx_clients_priority ON clients(priority_level);
                `
            },
            {
                version: '003',
                name: 'create_devices_tables',
                description: 'Create devices module tables',
                sql: `
                    CREATE TABLE IF NOT EXISTS devices (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                        device_type VARCHAR(50) NOT NULL, -- burner, boiler, controller, etc.
                        brand VARCHAR(100),
                        model VARCHAR(100),
                        serial_number VARCHAR(100) UNIQUE,
                        manufacture_year INTEGER,
                        power_rating DECIMAL(10,2), -- kW
                        fuel_type VARCHAR(50), -- gas, oil, biomass, etc.
                        installation_date DATE,
                        warranty_expiry_date DATE,
                        location_description TEXT,
                        technical_specifications JSONB DEFAULT '{}',
                        maintenance_interval_days INTEGER DEFAULT 365,
                        last_service_date DATE,
                        next_service_date DATE,
                        status VARCHAR(20) DEFAULT 'active', -- active, inactive, decommissioned
                        condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
                        notes TEXT,
                        created_by UUID REFERENCES users(id),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_devices_client_id ON devices(client_id);
                    CREATE INDEX idx_devices_type ON devices(device_type);
                    CREATE INDEX idx_devices_brand ON devices(brand);
                    CREATE INDEX idx_devices_serial ON devices(serial_number);
                    CREATE INDEX idx_devices_next_service ON devices(next_service_date);
                    CREATE INDEX idx_devices_status ON devices(status);
                `
            },
            {
                version: '004',
                name: 'create_service_records_tables',
                description: 'Create service records module tables',
                sql: `
                    CREATE TABLE IF NOT EXISTS service_records (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
                        technician_id UUID REFERENCES users(id),
                        service_type VARCHAR(50) NOT NULL, -- maintenance, repair, inspection, installation
                        service_date DATE NOT NULL,
                        start_time TIME,
                        end_time TIME,
                        description TEXT NOT NULL,
                        parts_used JSONB DEFAULT '[]',
                        labor_hours DECIMAL(4,2),
                        total_cost DECIMAL(10,2),
                        client_signature BOOLEAN DEFAULT false,
                        photos JSONB DEFAULT '[]', -- array of file paths
                        status VARCHAR(20) DEFAULT 'completed', -- scheduled, in_progress, completed, cancelled
                        warranty_work BOOLEAN DEFAULT false,
                        follow_up_required BOOLEAN DEFAULT false,
                        follow_up_date DATE,
                        condition_before INTEGER CHECK (condition_before >= 1 AND condition_before <= 5),
                        condition_after INTEGER CHECK (condition_after >= 1 AND condition_after <= 5),
                        recommendations TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_service_records_device_id ON service_records(device_id);
                    CREATE INDEX idx_service_records_technician_id ON service_records(technician_id);
                    CREATE INDEX idx_service_records_date ON service_records(service_date);
                    CREATE INDEX idx_service_records_type ON service_records(service_type);
                    CREATE INDEX idx_service_records_status ON service_records(status);
                `
            },
            {
                version: '005',
                name: 'create_scheduling_tables',
                description: 'Create scheduling module tables',
                sql: `
                    CREATE TABLE IF NOT EXISTS appointments (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        client_id UUID REFERENCES clients(id),
                        device_id UUID REFERENCES devices(id),
                        technician_id UUID REFERENCES users(id),
                        appointment_date DATE NOT NULL,
                        start_time TIME NOT NULL,
                        estimated_duration INTEGER DEFAULT 120, -- minutes
                        appointment_type VARCHAR(50) NOT NULL, -- maintenance, repair, inspection
                        priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
                        status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled
                        description TEXT,
                        internal_notes TEXT,
                        client_requirements TEXT,
                        estimated_cost DECIMAL(10,2),
                        created_by UUID REFERENCES users(id),
                        cancelled_reason TEXT,
                        cancelled_by UUID REFERENCES users(id),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_appointments_date ON appointments(appointment_date);
                    CREATE INDEX idx_appointments_technician ON appointments(technician_id);
                    CREATE INDEX idx_appointments_client ON appointments(client_id);
                    CREATE INDEX idx_appointments_device ON appointments(device_id);
                    CREATE INDEX idx_appointments_status ON appointments(status);
                `
            },
            {
                version: '006',
                name: 'create_inventory_tables',
                description: 'Create inventory module tables',
                sql: `
                    CREATE TABLE IF NOT EXISTS inventory_items (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        item_code VARCHAR(50) UNIQUE NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        category VARCHAR(100), -- parts, tools, consumables
                        subcategory VARCHAR(100),
                        brand VARCHAR(100),
                        model VARCHAR(100),
                        unit VARCHAR(20) DEFAULT 'szt', -- szt, kg, l, m, etc.
                        current_stock INTEGER DEFAULT 0,
                        min_stock_level INTEGER DEFAULT 0,
                        max_stock_level INTEGER,
                        unit_cost DECIMAL(10,2),
                        supplier_info JSONB DEFAULT '{}',
                        storage_location VARCHAR(100),
                        shelf_life_days INTEGER,
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS stock_movements (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        item_id UUID REFERENCES inventory_items(id),
                        movement_type VARCHAR(20) NOT NULL, -- in, out, adjustment
                        quantity INTEGER NOT NULL,
                        reference_type VARCHAR(50), -- service_record, purchase, adjustment
                        reference_id UUID,
                        unit_cost DECIMAL(10,2),
                        reason TEXT,
                        performed_by UUID REFERENCES users(id),
                        movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_inventory_code ON inventory_items(item_code);
                    CREATE INDEX idx_inventory_category ON inventory_items(category);
                    CREATE INDEX idx_inventory_stock ON inventory_items(current_stock);
                    CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
                    CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
                `
            },
            {
                version: '007',
                name: 'create_reports_tables',
                description: 'Create reports module tables',
                sql: `
                    CREATE TABLE IF NOT EXISTS report_templates (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        report_type VARCHAR(50) NOT NULL, -- service, financial, inventory, performance
                        template_config JSONB NOT NULL,
                        is_active BOOLEAN DEFAULT true,
                        created_by UUID REFERENCES users(id),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS generated_reports (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        template_id UUID REFERENCES report_templates(id),
                        name VARCHAR(200) NOT NULL,
                        parameters JSONB,
                        file_path VARCHAR(500),
                        file_size INTEGER,
                        status VARCHAR(20) DEFAULT 'generating', -- generating, ready, error
                        generated_by UUID REFERENCES users(id),
                        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP
                    );
                    
                    CREATE INDEX idx_report_templates_type ON report_templates(report_type);
                    CREATE INDEX idx_generated_reports_status ON generated_reports(status);
                    CREATE INDEX idx_generated_reports_date ON generated_reports(generated_at);
                `
            },
            {
                version: '008',
                name: 'create_migration_table',
                description: 'Create migrations tracking table',
                sql: `
                    CREATE TABLE IF NOT EXISTS migrations (
                        version VARCHAR(10) PRIMARY KEY,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `
            }
        ];
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        try {
            await DatabaseService.initialize();
            
            // Create migrations table first
            const migrationTable = this.migrations.find(m => m.name === 'create_migration_table');
            await DatabaseService.query(migrationTable.sql);
            
            // Get executed migrations
            const result = await DatabaseService.query('SELECT version FROM migrations');
            const executedVersions = result.rows.map(row => row.version);
            
            // Run pending migrations
            const pendingMigrations = this.migrations.filter(m => 
                m.name !== 'create_migration_table' && 
                !executedVersions.includes(m.version)
            );
            
            for (const migration of pendingMigrations) {
                await this.runSingleMigration(migration);
            }
            
            ModuleErrorHandler.logger.info(`Migrations completed. ${pendingMigrations.length} migrations executed.`);
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Migration failed:', error);
            throw error;
        }
    }

    /**
     * Run single migration
     * @param {Object} migration - Migration object
     */
    async runSingleMigration(migration) {
        try {
            await DatabaseService.transaction(async (client) => {
                // Execute migration SQL
                await client.query(migration.sql);
                
                // Record migration
                await client.query(
                    'INSERT INTO migrations (version, name, description) VALUES ($1, $2, $3)',
                    [migration.version, migration.name, migration.description]
                );
            });
            
            ModuleErrorHandler.logger.info(`Migration ${migration.version} (${migration.name}) executed successfully`);
            
        } catch (error) {
            ModuleErrorHandler.logger.error(`Migration ${migration.version} failed:`, error);
            throw error;
        }
    }

    /**
     * Check migration status
     */
    async getStatus() {
        try {
            const result = await DatabaseService.query(`
                SELECT version, name, description, executed_at 
                FROM migrations 
                ORDER BY version
            `);
            
            return {
                total: this.migrations.length - 1, // excluding migrations table itself
                executed: result.rows.length,
                pending: this.migrations.length - 1 - result.rows.length,
                migrations: result.rows
            };
            
        } catch (error) {
            return {
                total: this.migrations.length - 1,
                executed: 0,
                pending: this.migrations.length - 1,
                migrations: []
            };
        }
    }
}

// CLI execution
if (require.main === module) {
    const migrationService = new MigrationService();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'run':
            migrationService.runMigrations()
                .then(() => {
                    console.log('✅ Migrations completed successfully');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Migration failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'status':
            migrationService.getStatus()
                .then(status => {
                    console.log('📊 Migration Status:');
                    console.log(`Total: ${status.total}`);
                    console.log(`Executed: ${status.executed}`);
                    console.log(`Pending: ${status.pending}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Status check failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node migrate.js [run|status]');
            process.exit(1);
    }
}

module.exports = MigrationService; 
