const { Pool } = require('pg');

// Konfiguracja połączenia z Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/serwis',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testRailwayOrders() {
  try {
    console.log('🔍 Testowanie Railway Orders API...');
    
    // 1. Sprawdź połączenie z bazą
    const client = await pool.connect();
    console.log('✅ Połączono z bazą danych Railway');
    
    // 2. Sprawdź czy istnieją tabele
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'clients', 'devices', 'service_orders')
      ORDER BY table_name
    `);
    
    console.log('📋 Dostępne tabele:', tablesResult.rows.map(r => r.table_name));
    
    // 3. Sprawdź czy są technicy
    const techniciansResult = await client.query('SELECT id, full_name FROM users WHERE role = \'technician\'');
    console.log('👥 Technicy w bazie:', techniciansResult.rows);
    
    // 4. Sprawdź czy są klienci
    const clientsResult = await client.query('SELECT id, first_name, last_name, company_name FROM clients LIMIT 5');
    console.log('👤 Klienci w bazie:', clientsResult.rows);
    
    // 5. Sprawdź czy są urządzenia
    const devicesResult = await client.query('SELECT id, name, model, brand FROM devices LIMIT 5');
    console.log('🔧 Urządzenia w bazie:', devicesResult.rows);
    
    // 6. Sprawdź czy są zlecenia
    const ordersResult = await client.query('SELECT id, order_number, status, assigned_user_id FROM service_orders LIMIT 10');
    console.log('📋 Zlecenia w bazie:', ordersResult.rows);
    
    // 7. Jeśli brak danych testowych, dodaj je
    if (techniciansResult.rows.length === 0) {
      console.log('➕ Dodaję techników testowych...');
      await client.query(`
        INSERT INTO users (username, full_name, email, password_hash, role, is_active) VALUES
        ('jan.technik', 'Jan Technik', 'jan@serwis.pl', 'hash', 'technician', true),
        ('radek.cichorek', 'Radosław Cichorek', 'radek@serwis.pl', 'hash', 'technician', true),
        ('slawek.jur', 'Sławomir Jur', 'slawek@serwis.pl', 'hash', 'technician', true)
      `);
      console.log('✅ Dodano techników testowych');
    }
    
    if (clientsResult.rows.length === 0) {
      console.log('➕ Dodaję klientów testowych...');
      await client.query(`
        INSERT INTO clients (first_name, last_name, company_name, email, phone, address, type) VALUES
        ('Jan', 'Kowalski', 'Kowalski Sp. z o.o.', 'jan@example.com', '+48 123 456 789', 'ul. Główna 15, Warszawa', 'business'),
        ('Maria', 'Nowak', 'ABC Firma', 'maria@abc.com', '+48 987 654 321', 'ul. Przemysłowa 45, Warszawa', 'business'),
        ('Piotr', 'Wiśniewski', NULL, 'piotr.wisniewski@gmail.com', '+48 555 123 456', 'ul. Słoneczna 12, Warszawa', 'individual')
      `);
      console.log('✅ Dodano klientów testowych');
    }
    
    if (devicesResult.rows.length === 0) {
      console.log('➕ Dodaję urządzenia testowe...');
      await client.query(`
        INSERT INTO devices (name, full_name, model, brand, serial_number, client_id) VALUES
        ('Kocioł gazowy', 'Kocioł gazowy Vaillant EcoTEC plus', 'EcoTEC plus', 'Vaillant', 'VA123456', 1),
        ('Pompa ciepła', 'Pompa ciepła powietrze-woda', 'Vitocal 200-S', 'Viessmann', 'VI789012', 2),
        ('Klimatyzacja', 'Klimatyzacja split', 'ASX25KVE', 'Mitsubishi', 'MI345678', 3)
      `);
      console.log('✅ Dodano urządzenia testowe');
    }
    
    if (ordersResult.rows.length === 0) {
      console.log('➕ Dodaję zlecenia testowe...');
      await client.query(`
        INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, status, priority, description, scheduled_date) VALUES
        ('ZLE-2025-001', 1, 1, 1, 'new', 'high', 'Przegląd okresowy kotła gazowego', '2025-08-05'),
        ('ZLE-2025-002', 2, 2, 2, 'in_progress', 'medium', 'Serwis pompy ciepła', '2025-08-06'),
        ('ZLE-2025-003', 3, 3, 3, 'new', 'low', 'Konserwacja klimatyzacji', '2025-08-07')
      `);
      console.log('✅ Dodano zlecenia testowe');
    }
    
    // 8. Sprawdź zlecenia dla konkretnego technika
    const testTechnicianId = 1;
    const technicianOrdersResult = await client.query(`
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
      WHERE o.assigned_user_id = $1
    `, [testTechnicianId]);
    
    console.log(`📋 Zlecenia dla technika ${testTechnicianId}:`, technicianOrdersResult.rows);
    
    client.release();
    console.log('✅ Test zakończony pomyślnie!');
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error);
  } finally {
    await pool.end();
  }
}

// Uruchom test
testRailwayOrders(); 