/**
 * Database seeding for System Serwisowy Palniki & Kotły
 * Creates initial data for testing and development
 */

require('dotenv').config();
const DatabaseService = require('./database');
const AuthService = require('../auth/AuthService');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class SeedService {
    constructor() {
        this.seedData = {
            users: [
                {
                    username: 'admin',
                    email: 'admin@systemserwisowy.pl',
                    password: 'Admin123!',
                    role: 'admin',
                    first_name: 'Administrator',
                    last_name: 'Systemu',
                    phone: '+48123456789',
                    permissions: {
                        clients: ['all'],
                        devices: ['all'],
                        'service-records': ['all'],
                        scheduling: ['all'],
                        inventory: ['all'],
                        reports: ['all']
                    }
                },
                {
                    username: 'technik1',
                    email: 'jan.kowalski@systemserwisowy.pl',
                    password: 'Technik123!',
                    role: 'technician',
                    first_name: 'Jan',
                    last_name: 'Kowalski',
                    phone: '+48123456790',
                    permissions: {
                        clients: ['read'],
                        devices: ['read', 'write'],
                        'service-records': ['all'],
                        scheduling: ['read', 'write'],
                        inventory: ['read']
                    }
                },
                {
                    username: 'kierownik',
                    email: 'anna.nowak@systemserwisowy.pl',
                    password: 'Kierownik123!',
                    role: 'manager',
                    first_name: 'Anna',
                    last_name: 'Nowak',
                    phone: '+48123456791',
                    permissions: {
                        clients: ['all'],
                        devices: ['all'],
                        'service-records': ['all'],
                        scheduling: ['all'],
                        inventory: ['all'],
                        reports: ['read', 'write']
                    }
                }
            ],

            clients: [
                {
                    company_name: 'TERMO-BUD Sp. z o.o.',
                    contact_person: 'Marek Zawadzki',
                    nip: '1234567890',
                    regon: '123456789',
                    address_street: 'ul. Przemysłowa 15',
                    address_city: 'Warszawa',
                    address_postal_code: '02-232',
                    phone: '+48223334455',
                    email: 'biuro@termobud.pl',
                    website: 'www.termobud.pl',
                    client_type: 'business',
                    priority_level: 'high',
                    payment_terms: 14,
                    notes: 'Klient priorytetowy - duże instalacje przemysłowe'
                },
                {
                    company_name: 'Hotel Skalski',
                    contact_person: 'Piotr Skalski',
                    nip: '9876543210',
                    address_street: 'ul. Hotelowa 25',
                    address_city: 'Kraków',
                    address_postal_code: '31-222',
                    phone: '+48123987654',
                    email: 'p.skalski@hotelskalski.pl',
                    client_type: 'business',
                    priority_level: 'standard',
                    payment_terms: 30,
                    notes: 'Hotel - 3 kotły gazowe, serwis co 6 miesięcy'
                },
                {
                    contact_person: 'Maria Kowalczyk',
                    address_street: 'ul. Słoneczna 10',
                    address_city: 'Gdańsk',
                    address_postal_code: '80-001',
                    phone: '+48501234567',
                    email: 'm.kowalczyk@gmail.com',
                    client_type: 'individual',
                    priority_level: 'standard',
                    payment_terms: 30,
                    notes: 'Dom jednorodzinny - kocioł gazowy 24kW'
                }
            ],

            inventoryItems: [
                {
                    item_code: 'PALNIK-001',
                    name: 'Palnik gazowy Weishaupt WG10',
                    description: 'Palnik gazowy jednopłomieniowy moc 60-120 kW',
                    category: 'palniki',
                    subcategory: 'gazowe',
                    brand: 'Weishaupt',
                    model: 'WG10',
                    unit: 'szt',
                    current_stock: 3,
                    min_stock_level: 1,
                    max_stock_level: 5,
                    unit_cost: 3500.00,
                    storage_location: 'Magazyn A1',
                    supplier_info: {
                        name: 'Weishaupt Polska',
                        contact: 'biuro@weishaupt.pl'
                    }
                },
                {
                    item_code: 'FILTR-001',
                    name: 'Filtr paliwa',
                    description: 'Filtr paliwa do palników olejowych',
                    category: 'części',
                    subcategory: 'filtry',
                    brand: 'Universal',
                    unit: 'szt',
                    current_stock: 25,
                    min_stock_level: 10,
                    max_stock_level: 50,
                    unit_cost: 45.50,
                    storage_location: 'Magazyn B2'
                },
                {
                    item_code: 'USZCZ-001',
                    name: 'Uszczelka komory spalania',
                    description: 'Uszczelka do kotłów Viessmann',
                    category: 'części',
                    subcategory: 'uszczelki',
                    brand: 'Viessmann',
                    unit: 'szt',
                    current_stock: 15,
                    min_stock_level: 5,
                    max_stock_level: 30,
                    unit_cost: 125.00,
                    storage_location: 'Magazyn B1'
                }
            ]
        };
    }

    /**
     * Run all seeds
     */
    async runSeeds() {
        try {
            await DatabaseService.initialize();
            
            ModuleErrorHandler.logger.info('Starting database seeding...');
            
            // Clear existing data (in reverse order due to foreign keys)
            await this.clearData();
            
            // Seed data in correct order
            const userIds = await this.seedUsers();
            const clientIds = await this.seedClients(userIds);
            await this.seedInventoryItems();
            await this.seedDevices(clientIds, userIds);
            
            ModuleErrorHandler.logger.info('Database seeding completed successfully');
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Seeding failed:', error);
            throw error;
        }
    }

    /**
     * Clear existing data
     */
    async clearData() {
        const tables = [
            'stock_movements',
            'service_records', 
            'appointments',
            'devices',
            'inventory_items',
            'clients',
            'users'
        ];

        for (const table of tables) {
            try {
                await DatabaseService.query(`DELETE FROM ${table}`);
                ModuleErrorHandler.logger.info(`Cleared table: ${table}`);
            } catch (error) {
                // Table might not exist yet
                ModuleErrorHandler.logger.warn(`Could not clear table ${table}:`, error.message);
            }
        }
    }

    /**
     * Seed users
     */
    async seedUsers() {
        const userIds = [];
        
        for (const userData of this.seedData.users) {
            try {
                // Hash password
                const passwordHash = await AuthService.hashPassword(userData.password);
                
                const result = await DatabaseService.query(`
                    INSERT INTO users (
                        username, email, password_hash, role, first_name, 
                        last_name, phone, permissions, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                `, [
                    userData.username,
                    userData.email,
                    passwordHash,
                    userData.role,
                    userData.first_name,
                    userData.last_name,
                    userData.phone,
                    JSON.stringify(userData.permissions),
                    true
                ]);
                
                userIds.push(result.rows[0].id);
                ModuleErrorHandler.logger.info(`Created user: ${userData.username}`);
                
            } catch (error) {
                ModuleErrorHandler.logger.error(`Failed to create user ${userData.username}:`, error);
            }
        }
        
        return userIds;
    }

    /**
     * Seed clients
     */
    async seedClients(userIds) {
        const clientIds = [];
        const adminId = userIds[0]; // First user is admin
        
        for (const clientData of this.seedData.clients) {
            try {
                const result = await DatabaseService.query(`
                    INSERT INTO clients (
                        company_name, contact_person, nip, regon, address_street,
                        address_city, address_postal_code, address_country, phone, email,
                        website, client_type, priority_level, payment_terms, notes,
                        is_active, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    RETURNING id
                `, [
                    clientData.company_name,
                    clientData.contact_person,
                    clientData.nip,
                    clientData.regon,
                    clientData.address_street,
                    clientData.address_city,
                    clientData.address_postal_code,
                    clientData.address_country || 'Polska',
                    clientData.phone,
                    clientData.email,
                    clientData.website,
                    clientData.client_type,
                    clientData.priority_level,
                    clientData.payment_terms,
                    clientData.notes,
                    true,
                    adminId
                ]);
                
                clientIds.push(result.rows[0].id);
                ModuleErrorHandler.logger.info(`Created client: ${clientData.contact_person}`);
                
            } catch (error) {
                ModuleErrorHandler.logger.error(`Failed to create client ${clientData.contact_person}:`, error);
            }
        }
        
        return clientIds;
    }

    /**
     * Seed inventory items
     */
    async seedInventoryItems() {
        for (const itemData of this.seedData.inventoryItems) {
            try {
                await DatabaseService.query(`
                    INSERT INTO inventory_items (
                        item_code, name, description, category, subcategory,
                        brand, model, unit, current_stock, min_stock_level,
                        max_stock_level, unit_cost, supplier_info, storage_location,
                        is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                    itemData.item_code,
                    itemData.name,
                    itemData.description,
                    itemData.category,
                    itemData.subcategory,
                    itemData.brand,
                    itemData.model,
                    itemData.unit,
                    itemData.current_stock,
                    itemData.min_stock_level,
                    itemData.max_stock_level,
                    itemData.unit_cost,
                    JSON.stringify(itemData.supplier_info || {}),
                    itemData.storage_location,
                    true
                ]);
                
                ModuleErrorHandler.logger.info(`Created inventory item: ${itemData.name}`);
                
            } catch (error) {
                ModuleErrorHandler.logger.error(`Failed to create inventory item ${itemData.name}:`, error);
            }
        }
    }

    /**
     * Seed devices
     */
    async seedDevices(clientIds, userIds) {
        const devices = [
            {
                client_index: 0, // TERMO-BUD
                device_type: 'boiler',
                brand: 'Viessmann',
                model: 'Vitoplex 200',
                serial_number: 'VIT200-2023-001',
                manufacture_year: 2023,
                power_rating: 300.0,
                fuel_type: 'gas',
                installation_date: '2023-01-15',
                warranty_expiry_date: '2025-01-15',
                location_description: 'Kotłownia główna - hala produkcyjna',
                maintenance_interval_days: 180,
                condition_rating: 5,
                status: 'active'
            },
            {
                client_index: 1, // Hotel Skalski
                device_type: 'boiler',
                brand: 'Buderus',
                model: 'Logano G234',
                serial_number: 'BUD234-2022-003',
                manufacture_year: 2022,
                power_rating: 150.0,
                fuel_type: 'gas',
                installation_date: '2022-08-20',
                warranty_expiry_date: '2024-08-20',
                location_description: 'Kotłownia hotelowa - piwnica',
                maintenance_interval_days: 365,
                condition_rating: 4,
                status: 'active'
            },
            {
                client_index: 2, // Maria Kowalczyk
                device_type: 'boiler',
                brand: 'Junkers',
                model: 'Cerapur Comfort',
                serial_number: 'JUN24-2023-078',
                manufacture_year: 2023,
                power_rating: 24.0,
                fuel_type: 'gas',
                installation_date: '2023-03-10',
                warranty_expiry_date: '2025-03-10',
                location_description: 'Kotłownia - piwnica domu',
                maintenance_interval_days: 365,
                condition_rating: 5,
                status: 'active'
            }
        ];

        const adminId = userIds[0];

        for (const deviceData of devices) {
            try {
                const clientId = clientIds[deviceData.client_index];
                
                const nextServiceDate = new Date();
                nextServiceDate.setDate(nextServiceDate.getDate() + deviceData.maintenance_interval_days);

                await DatabaseService.query(`
                    INSERT INTO devices (
                        client_id, device_type, brand, model, serial_number,
                        manufacture_year, power_rating, fuel_type, installation_date,
                        warranty_expiry_date, location_description, maintenance_interval_days,
                        next_service_due, status, condition_rating, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                `, [
                    clientId,
                    deviceData.device_type,
                    deviceData.brand,
                    deviceData.model,
                    deviceData.serial_number,
                    deviceData.manufacture_year,
                    deviceData.power_rating,
                    deviceData.fuel_type,
                    deviceData.installation_date,
                    deviceData.warranty_expiry_date,
                    deviceData.location_description,
                    deviceData.maintenance_interval_days,
                    nextServiceDate.toISOString().split('T')[0],
                    deviceData.status,
                    deviceData.condition_rating,
                    adminId
                ]);
                
                ModuleErrorHandler.logger.info(`Created device: ${deviceData.brand} ${deviceData.model}`);
                
            } catch (error) {
                ModuleErrorHandler.logger.error(`Failed to create device ${deviceData.brand} ${deviceData.model}:`, error);
            }
        }
    }

    /**
     * Get seed summary
     */
    async getSeedSummary() {
        try {
            const tables = ['users', 'clients', 'devices', 'inventory_items'];
            const summary = {};
            
            for (const table of tables) {
                try {
                    const result = await DatabaseService.query(`SELECT COUNT(*) as count FROM ${table}`);
                    summary[table] = parseInt(result.rows[0].count);
                } catch (error) {
                    summary[table] = 0;
                }
            }
            
            return summary;
        } catch (error) {
            return {};
        }
    }
}

// CLI execution
if (require.main === module) {
    const seedService = new SeedService();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'run':
            seedService.runSeeds()
                .then(() => {
                    console.log('✅ Database seeding completed successfully');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Seeding failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'summary':
            seedService.getSeedSummary()
                .then(summary => {
                    console.log('📊 Seed Data Summary:');
                    Object.entries(summary).forEach(([table, count]) => {
                        console.log(`${table}: ${count} records`);
                    });
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Summary failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node seed.js [run|summary]');
            console.log('');
            console.log('Default accounts after seeding:');
            console.log('- admin / Admin123!');
            console.log('- technik1 / Technik123!');
            console.log('- kierownik / Kierownik123!');
            process.exit(1);
    }
}

module.exports = SeedService; 