const { Pool } = require('pg');

// Konfiguracja połączenia z Railway
const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/serwis',
  ssl: { rejectUnauthorized: false }
});

async function fixRailwayDatabase() {
  try {
    console.log('🔧 Naprawiam bazę danych Railway...');
    
    const client = await pool.connect();
    console.log('✅ Połączono z bazą danych Railway');
    
    // 1. Sprawdź strukturę tabeli devices
    console.log('\n📋 Sprawdzam strukturę tabeli devices...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position
    `);
    
    console.log('Kolumny w tabeli devices:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 2. Dodaj brakujące kolumny
    const missingColumns = [];
    
    if (!columnsResult.rows.find(col => col.column_name === 'brand')) {
      missingColumns.push('brand VARCHAR(255)');
    }
    
    if (!columnsResult.rows.find(col => col.column_name === 'full_name')) {
      missingColumns.push('full_name VARCHAR(255)');
    }
    
    if (!columnsResult.rows.find(col => col.column_name === 'warranty_status')) {
      missingColumns.push('warranty_status VARCHAR(50)');
    }
    
    if (missingColumns.length > 0) {
      console.log('\n🔧 Dodaję brakujące kolumny...');
      for (const columnDef of missingColumns) {
        const columnName = columnDef.split(' ')[0];
        try {
          await client.query(`ALTER TABLE devices ADD COLUMN ${columnDef}`);
          console.log(`✅ Dodano kolumnę ${columnName}`);
        } catch (error) {
          console.log(`ℹ️ Kolumna ${columnName} już istnieje lub błąd: ${error.message}`);
        }
      }
    } else {
      console.log('\n✅ Wszystkie kolumny już istnieją');
    }
    
    // 3. Sprawdź czy są dane testowe
    console.log('\n📊 Sprawdzam dane testowe...');
    
    const techniciansCount = await client.query('SELECT COUNT(*) FROM users WHERE role = \'technician\'');
    console.log(`Technicy: ${techniciansCount.rows[0].count}`);
    
    const clientsCount = await client.query('SELECT COUNT(*) FROM clients');
    console.log(`Klienci: ${clientsCount.rows[0].count}`);
    
    const devicesCount = await client.query('SELECT COUNT(*) FROM devices');
    console.log(`Urządzenia: ${devicesCount.rows[0].count}`);
    
    const ordersCount = await client.query('SELECT COUNT(*) FROM service_orders');
    console.log(`Zlecenia: ${ordersCount.rows[0].count}`);
    
    // 4. Jeśli brak danych, dodaj je
    if (parseInt(techniciansCount.rows[0].count) === 0) {
      console.log('\n➕ Dodaję techników testowych...');
      await client.query(`
        INSERT INTO users (username, full_name, email, password_hash, role, is_active) VALUES
        ('jan.technik', 'Jan Technik', 'jan@serwis.pl', 'hash', 'technician', true),
        ('radek.cichorek', 'Radosław Cichorek', 'radek@serwis.pl', 'hash', 'technician', true),
        ('slawek.jur', 'Sławomir Jur', 'slawek@serwis.pl', 'hash', 'technician', true)
      `);
      console.log('✅ Dodano techników testowych');
    }
    
    if (parseInt(clientsCount.rows[0].count) === 0) {
      console.log('\n➕ Dodaję klientów testowych...');
      await client.query(`
        INSERT INTO clients (first_name, last_name, company_name, email, phone, address, type) VALUES
        ('Jan', 'Kowalski', 'Kowalski Sp. z o.o.', 'jan@example.com', '+48 123 456 789', 'ul. Główna 15, Warszawa', 'business'),
        ('Maria', 'Nowak', 'ABC Firma', 'maria@abc.com', '+48 987 654 321', 'ul. Przemysłowa 45, Warszawa', 'business'),
        ('Piotr', 'Wiśniewski', NULL, 'piotr.wisniewski@gmail.com', '+48 555 123 456', 'ul. Słoneczna 12, Warszawa', 'individual')
      `);
      console.log('✅ Dodano klientów testowych');
    }
    
    if (parseInt(devicesCount.rows[0].count) === 0) {
      console.log('\n➕ Dodaję urządzenia testowe...');
      await client.query(`
        INSERT INTO devices (name, model, brand, serial_number, client_id) VALUES
        ('Kocioł gazowy', 'EcoTEC plus', 'Vaillant', 'VA123456', 1),
        ('Pompa ciepła', 'Vitocal 200-S', 'Viessmann', 'VI789012', 2),
        ('Klimatyzacja', 'ASX25KVE', 'Mitsubishi', 'MI345678', 3)
      `);
      console.log('✅ Dodano urządzenia testowe');
    }
    
    if (parseInt(ordersCount.rows[0].count) === 0) {
      console.log('\n➕ Dodaję zlecenia testowe...');
      await client.query(`
        INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, status, priority, description, scheduled_date) VALUES
        ('ZLE-2025-001', 1, 1, 1, 'new', 'high', 'Przegląd okresowy kotła gazowego', '2025-08-05'),
        ('ZLE-2025-002', 2, 2, 2, 'in_progress', 'medium', 'Serwis pompy ciepła', '2025-08-06'),
        ('ZLE-2025-003', 3, 3, 3, 'new', 'low', 'Konserwacja klimatyzacji', '2025-08-07')
      `);
      console.log('✅ Dodano zlecenia testowe');
    }
    
    // 5. Test query
    console.log('\n🧪 Testuję query...');
    const testQuery = `
      SELECT 
        o.*,
        CASE 
          WHEN c.company_name IS NOT NULL AND c.company_name != '' 
          THEN c.company_name 
          ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
        END as client_name,
        c.phone as client_phone,
        d.name as device_name,
        d.brand as device_brand,
        u.full_name as technician_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      WHERE o.assigned_user_id = 1
    `;
    
    const testResult = await client.query(testQuery);
    console.log(`✅ Query działa! Znaleziono ${testResult.rows.length} zleceń dla technika 1`);
    
    if (testResult.rows.length > 0) {
      console.log('Przykładowe zlecenie:', JSON.stringify(testResult.rows[0], null, 2));
    }
    
    client.release();
    console.log('\n🎉 Naprawa bazy danych zakończona pomyślnie!');
    
  } catch (error) {
    console.error('❌ Błąd podczas naprawy bazy danych:', error);
  } finally {
    await pool.end();
  }
}

// Uruchom naprawę
fixRailwayDatabase(); 