const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const DatabaseService = require('./database');

async function initializeDatabase() {
    try {
        console.log('Inicjalizacja bazy danych...');

        // Inicjalizacja połączenia z bazą danych
        await DatabaseService.initialize();

        // Wczytaj i wykonaj migracje
        const schemaSQL = await fs.readFile(
            path.join(__dirname, 'migrations', '001_initial_schema.sql'),
            'utf8'
        );
        
        await DatabaseService.query(schemaSQL);
        console.log('Schema created successfully');

        // Wczytaj seed z adminem
        let adminSeedSQL = await fs.readFile(
            path.join(__dirname, 'seeds', '001_admin_user.sql'),
            'utf8'
        );

        console.log('DEBUG: Seed SQL:');
        console.log(adminSeedSQL);

        // Wykonaj seed
        await DatabaseService.query(adminSeedSQL);
        console.log('Admin user created successfully');

        console.log('Database initialized successfully!');
        console.log('You can now log in with:');
        console.log('Username: admin');
        console.log('Password: Admin123!');

    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Wykonaj inicjalizację jeśli skrypt jest uruchamiany bezpośrednio
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase }; 