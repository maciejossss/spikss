require('dotenv').config();
const DatabaseService = require('./database');

async function checkSchema() {
    try {
        await DatabaseService.initialize();
        
        // Check if devices table exists
        const tableResult = await DatabaseService.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'devices'
            );
        `);
        
        console.log('Does devices table exist?', tableResult.rows[0].exists);

        if (tableResult.rows[0].exists) {
            // Get columns in devices table
            const result = await DatabaseService.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'devices'
                ORDER BY ordinal_position;
            `);

            console.log('\nColumns in devices table:');
            console.table(result.rows);
        }

    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        await DatabaseService.close();
    }
}

checkSchema(); 