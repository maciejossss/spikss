const { Client } = require('pg');

// Railway PostgreSQL connection using the connection string from env-config.txt
const client = new Client({
  connectionString: 'postgresql://postgres:RejcVVXxoptptXgEpADDwuKBDm@gokfwbeShuttle.proxy.rlwy.net:15342/railway'
});

async function testRailwayConnection() {
  try {
    console.log('🔍 Łączenie z bazą danych Railway PostgreSQL...');
    console.log('📡 Próba połączenia z:', 'postgresql://postgres:***@gokfwbeShuttle.proxy.rlwy.net:15342/railway');
    
    await client.connect();
    console.log('✅ Połączono z bazą danych Railway');

    // Sprawdź dostępne tabele
    console.log('\n📋 Sprawdzanie dostępnych tabel...');
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Dostępne tabele:', tablesQuery.rows.map(row => row.table_name));

    // Sprawdź liczbę rekordów w głównych tabelach
    console.log('\n📊 Liczba rekordów w tabelach:');
    
    const tables = ['clients', 'devices', 'service_orders', 'users'];
    for (const table of tables) {
      try {
        const countQuery = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  - ${table}: ${countQuery.rows[0].count} rekordów`);
      } catch (error) {
        console.log(`  - ${table}: Tabela nie istnieje lub błąd dostępu`);
      }
    }

    // Sprawdź przykładowe dane z tabeli clients
    console.log('\n📋 Przykładowe dane z tabeli clients:');
    const clientsData = await client.query(`
      SELECT id, name, phone, email 
      FROM clients 
      LIMIT 5
    `);
    console.log('Klienci:', clientsData.rows);

  } catch (error) {
    console.error('❌ Błąd podczas łączenia z bazą danych Railway:');
    console.error('  Typ błędu:', error.code);
    console.error('  Wiadomość:', error.message);
    console.error('  Szczegóły:', error.detail);
    console.error('  Pełny błąd:', error);
  } finally {
    try {
      await client.end();
      console.log('\n🔚 Rozłączono z bazą danych Railway');
    } catch (endError) {
      console.log('\n🔚 Błąd podczas rozłączania:', endError.message);
    }
  }
}

// Uruchom test
testRailwayConnection(); 