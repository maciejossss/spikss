const DatabaseService = require('./database');
const bcrypt = require('bcryptjs');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

async function initializeDatabase() {
    try {
        // Initialize database connection
        await DatabaseService.initialize();

        // Create users table
        await DatabaseService.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
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

        // Check if admin user exists
        const adminResult = await DatabaseService.query(
            'SELECT * FROM users WHERE username = $1',
            ['admin']
        );

        if (adminResult.rows.length === 0) {
            // Create default admin user
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
            console.log('✅ Created default admin user');
        }

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = initializeDatabase; 