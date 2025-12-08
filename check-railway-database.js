require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection (Railway)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkRailwayDatabase() {
  try {
    console.log('🔍 Sprawdzam strukturę bazy danych na Railway...');
    
    // Test connection
    await pgPool.query('SELECT NOW()');
    console.log('✅ Połączenie z Railway PostgreSQL OK');
    
    // Check devices table structure
    const devicesColumns = await pgPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Struktura tabeli devices:');
    devicesColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if brand column exists
    const hasBrand = devicesColumns.rows.some(col => col.column_name === 'brand');
    console.log(`\n🔍 Kolumna 'brand' istnieje: ${hasBrand ? '✅ TAK' : '❌ NIE'}`);
    
    // Check service_orders table structure
    const ordersColumns = await pgPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'service_orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Struktura tabeli service_orders:');
    ordersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if tables have data
    const devicesCount = await pgPool.query('SELECT COUNT(*) FROM devices');
    const ordersCount = await pgPool.query('SELECT COUNT(*) FROM service_orders');
    const usersCount = await pgPool.query('SELECT COUNT(*) FROM users');
    
    console.log('\n📊 Liczba rekordów:');
    console.log(`  - devices: ${devicesCount.rows[0].count}`);
    console.log(`  - service_orders: ${ordersCount.rows[0].count}`);
    console.log(`  - users: ${usersCount.rows[0].count}`);
    
    // Test query that was failing
    console.log('\n🧪 Testuję zapytanie, które wcześniej nie działało...');
    try {
      const testQuery = await pgPool.query(`
        SELECT o.*, 
               c.first_name, c.last_name, c.company_name,
               d.name as device_name, d.brand as device_brand
        FROM service_orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN devices d ON o.device_id = d.id
        WHERE o.assigned_user_id = $1
        ORDER BY o.created_at DESC
      `, [13]); // Test for user ID 13
      
      console.log(`✅ Zapytanie działa! Znaleziono ${testQuery.rows.length} zleceń`);
      if (testQuery.rows.length > 0) {
        console.log('📋 Przykładowe zlecenie:', testQuery.rows[0]);
      }
    } catch (error) {
      console.error('❌ Błąd zapytania:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Błąd sprawdzania bazy danych:', error);
  } finally {
    await pgPool.end();
  }
}

checkRailwayDatabase(); 