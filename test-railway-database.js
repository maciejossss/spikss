const { Client } = require('pg');

// Railway PostgreSQL connection
const client = new Client({
  host: 'containers-us-west-207.railway.app',
  port: 5432,
  database: 'railway',
  user: 'postgres',
  password: 'your_password_here' // You'll need to get this from Railway dashboard
});

async function testRailwayDatabase() {
  try {
    console.log('🔍 Łączenie z bazą danych Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Połączono z bazą danych Railway');

    // 1. Sprawdź strukturę tabeli devices
    console.log('\n📋 Sprawdzanie struktury tabeli devices...');
    const devicesStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position
    `);
    console.log('Kolumny w tabeli devices:', devicesStructure.rows);

    // 2. Sprawdź dane w tabeli devices
    console.log('\n📋 Sprawdzanie danych w tabeli devices...');
    const devicesData = await client.query(`
      SELECT id, name, brand, model, serial_number, warranty_status, client_id
      FROM devices 
      ORDER BY id
    `);
    console.log('Dane w tabeli devices:', devicesData.rows);

    // 3. Sprawdź dane w tabeli clients
    console.log('\n📋 Sprawdzanie danych w tabeli clients...');
    const clientsData = await client.query(`
      SELECT id, name, phone, email, address
      FROM clients 
      ORDER BY id
    `);
    console.log('Dane w tabeli clients:', clientsData.rows);

    // 4. Sprawdź dane w tabeli service_orders
    console.log('\n📋 Sprawdzanie danych w tabeli service_orders...');
    const ordersData = await client.query(`
      SELECT id, order_number, assigned_user_id, status, client_id, device_id, 
             description, priority, created_at, updated_at
      FROM service_orders 
      ORDER BY id
    `);
    console.log('Dane w tabeli service_orders:', ordersData.rows);

    // 5. Sprawdź pełne dane zleceń z JOIN
    console.log('\n📋 Sprawdzanie pełnych danych zleceń...');
    const fullOrdersData = await client.query(`
      SELECT 
        so.id,
        so.order_number,
        so.assigned_user_id,
        so.status,
        so.description,
        so.priority,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        c.address as client_address,
        d.name as device_name,
        d.brand as device_brand,
        d.model as device_model,
        d.serial_number as device_serial,
        d.warranty_status as device_warranty,
        u.name as technician_name
      FROM service_orders so
      LEFT JOIN clients c ON so.client_id = c.id
      LEFT JOIN devices d ON so.device_id = d.id
      LEFT JOIN users u ON so.assigned_user_id = u.id
      ORDER BY so.id
    `);
    console.log('Pełne dane zleceń:', fullOrdersData.rows);

    // 6. Sprawdź techników
    console.log('\n📋 Sprawdzanie techników...');
    const techniciansData = await client.query(`
      SELECT id, name, username
      FROM users 
      WHERE role = 'technician' OR role = 'admin'
      ORDER BY id
    `);
    console.log('Technicy:', techniciansData.rows);

    // 7. Sprawdź zlecenia dla konkretnych techników (ID 9 i 13)
    console.log('\n📋 Sprawdzanie zleceń dla technika ID 9 (Sławek)...');
    const ordersForTechnician9 = await client.query(`
      SELECT 
        so.id,
        so.order_number,
        so.status,
        c.name as client_name,
        c.address as client_address,
        d.name as device_name,
        d.brand as device_brand
      FROM service_orders so
      LEFT JOIN clients c ON so.client_id = c.id
      LEFT JOIN devices d ON so.device_id = d.id
      WHERE so.assigned_user_id = 9
      ORDER BY so.id
    `);
    console.log('Zlecenia dla technika ID 9:', ordersForTechnician9.rows);

    console.log('\n📋 Sprawdzanie zleceń dla technika ID 13 (Radek)...');
    const ordersForTechnician13 = await client.query(`
      SELECT 
        so.id,
        so.order_number,
        so.status,
        c.name as client_name,
        c.address as client_address,
        d.name as device_name,
        d.brand as device_brand
      FROM service_orders so
      LEFT JOIN clients c ON so.client_id = c.id
      LEFT JOIN devices d ON so.device_id = d.id
      WHERE so.assigned_user_id = 13
      ORDER BY so.id
    `);
    console.log('Zlecenia dla technika ID 13:', ordersForTechnician13.rows);

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania bazy danych:', error);
  } finally {
    await client.end();
    console.log('\n🔚 Rozłączono z bazą danych');
  }
}

// Uruchom test
testRailwayDatabase(); 