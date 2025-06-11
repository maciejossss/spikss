require('dotenv').config();
const DatabaseService = require('./src/shared/database/database');
const AuthService = require('./src/shared/auth/AuthService');

async function createAdmin() {
    try {
        // Initialize database
        await DatabaseService.initialize();
        console.log('Database connected');

        // Create admin user data
        const adminData = {
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
        };

        // Hash password
        const passwordHash = await AuthService.hashPassword(adminData.password);

        // Insert admin user
        const query = `
            INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, permissions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, username, email, role;
        `;

        const result = await DatabaseService.query(query, [
            adminData.username,
            adminData.email,
            passwordHash,
            adminData.role,
            adminData.first_name,
            adminData.last_name,
            adminData.phone,
            JSON.stringify(adminData.permissions)
        ]);

        console.log('Admin user created successfully:', result.rows[0]);
        console.log('Login credentials:');
        console.log(`Username: ${adminData.username}`);
        console.log(`Password: ${adminData.password}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

// Run the script
createAdmin(); 