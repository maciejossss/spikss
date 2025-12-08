const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkRailwayTables() {
  try {
    console.log('🔍 Sprawdzanie wszystkich tabel w Railway database...');
    await client.connect();
    console.log('✅ Połączono z bazą danych Railway');

    // Sprawdź wszystkie tabele
    console.log('\n📋 Wszystkie tabele w bazie danych:');
    const tablesQuery = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    tablesQuery.rows.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });

    // Sprawdź liczbę rekordów w każdej tabeli
    console.log('\n📊 Liczba rekordów w tabelach:');
    for (const table of tablesQuery.rows) {
      try {
        const countQuery = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        console.log(`  - ${table.table_name}: ${countQuery.rows[0].count} rekordów`);
      } catch (error) {
        console.log(`  - ${table.table_name}: Błąd dostępu - ${error.message}`);
      }
    }

    // Sprawdź czy istnieją tabele związane z zleceniami
    console.log('\n🔍 Sprawdzanie tabel związanych z zleceniami:');
    const serviceTables = tablesQuery.rows.filter(t => 
      t.table_name.toLowerCase().includes('service') || 
      t.table_name.toLowerCase().includes('order') ||
      t.table_name.toLowerCase().includes('record')
    );
    
    if (serviceTables.length > 0) {
      console.log('Znalezione tabele związane z serwisem:');
      serviceTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('Nie znaleziono tabel związanych z serwisem');
    }

    // Sprawdź strukturę tabeli service_records jeśli istnieje
    const serviceRecordsExists = tablesQuery.rows.some(t => t.table_name === 'service_records');
    if (serviceRecordsExists) {
      console.log('\n📋 Struktura tabeli service_records:');
      const serviceRecordsStructure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'service_records' 
        ORDER BY ordinal_position
      `);
      serviceRecordsStructure.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Sprawdź przykładowe dane
      const serviceRecordsData = await client.query(`
        SELECT * FROM service_records LIMIT 3
      `);
      console.log('\n📋 Przykładowe dane z service_records:', serviceRecordsData.rows);
    }

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania tabel:', error.message);
  } finally {
    await client.end();
    console.log('\n🔚 Rozłączono z bazą danych Railway');
  }
}

checkRailwayTables(); 