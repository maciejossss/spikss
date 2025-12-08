const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkRailwaySchema() {
  try {
    console.log('🔍 Sprawdzanie struktury bazy danych Railway...');
    await client.connect();
    console.log('✅ Połączono z bazą danych Railway');

    // Sprawdź strukturę tabeli clients
    console.log('\n📋 Struktura tabeli clients:');
    const clientsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    console.log('Kolumny w tabeli clients:');
    clientsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Sprawdź strukturę tabeli devices
    console.log('\n📋 Struktura tabeli devices:');
    const devicesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position
    `);
    console.log('Kolumny w tabeli devices:');
    devicesStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Sprawdź strukturę tabeli users
    console.log('\n📋 Struktura tabeli users:');
    const usersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('Kolumny w tabeli users:');
    usersStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Sprawdź przykładowe dane z tabeli clients
    console.log('\n📋 Przykładowe dane z tabeli clients:');
    const clientsData = await client.query(`
      SELECT * FROM clients LIMIT 3
    `);
    console.log('Klienci:', clientsData.rows);

    // Sprawdź przykładowe dane z tabeli users
    console.log('\n📋 Przykładowe dane z tabeli users:');
    const usersData = await client.query(`
      SELECT * FROM users LIMIT 3
    `);
    console.log('Użytkownicy:', usersData.rows);

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania struktury:', error.message);
  } finally {
    await client.end();
    console.log('\n🔚 Rozłączono z bazą danych Railway');
  }
}

checkRailwaySchema(); 