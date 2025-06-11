require('dotenv').config();
const initializeDatabase = require('./src/shared/database/init');

console.log('🚀 Initializing database...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Database connection details:', {
    host: process.env.DB_HOST || 'default',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'system_serwisowy',
    user: process.env.DB_USER || 'postgres'
});

initializeDatabase()
    .then(() => {
        console.log('✅ Database initialization completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Database initialization failed:', error);
        // W środowisku produkcyjnym nie powinniśmy kończyć procesu przy błędzie inicjalizacji
        if (process.env.NODE_ENV === 'production') {
            console.log('Continuing despite database initialization error in production');
            process.exit(0);
        } else {
            process.exit(1);
        }
    }); 