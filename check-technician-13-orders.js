const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych desktop app
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔍 Sprawdzam zlecenia dla technika 13...');
console.log('📁 Baza danych:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    return;
  }
  console.log('✅ Połączono z bazą danych SQLite');
  
  // Sprawdź zlecenia dla technika 13
  db.all(`
    SELECT 
      o.id,
      o.order_number,
      o.title,
      o.status,
      o.assigned_user_id,
      o.assigned_to,
      c.first_name || ' ' || c.last_name as client_name,
      d.name as device_name
    FROM service_orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN devices d ON o.device_id = d.id
    WHERE o.assigned_user_id = 13 OR o.assigned_to = 13
    ORDER BY o.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Błąd zapytania:', err.message);
      return;
    }
    
    console.log(`\n📋 Zlecenia dla technika 13 (Radosław Cichorek):`);
    console.log(`   Znaleziono ${rows.length} zleceń\n`);
    
    if (rows.length === 0) {
      console.log('❌ Brak zleceń przypisanych do technika 13!');
      console.log('\n💡 Aby naprawić problem:');
      console.log('   1. Otwórz desktop app');
      console.log('   2. Przejdź do zleceń');
      console.log('   3. Przypisz kilka zleceń do "Radosław Cichorek"');
      console.log('   4. Sprawdź aplikację mobilną ponownie');
    } else {
      rows.forEach((order, index) => {
        console.log(`${index + 1}. Zlecenie ${order.order_number}: ${order.title}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Klient: ${order.client_name || 'Brak'}`);
        console.log(`   Urządzenie: ${order.device_name || 'Brak'}`);
        console.log(`   assigned_user_id: ${order.assigned_user_id}`);
        console.log(`   assigned_to: ${order.assigned_to}`);
        console.log('');
      });
    }
    
    // Sprawdź wszystkich techników
    db.all(`
      SELECT 
        u.id,
        u.full_name,
        COUNT(o.id) as orders_count
      FROM users u
      LEFT JOIN service_orders o ON u.id = o.assigned_user_id
      WHERE u.role = 'technician'
      GROUP BY u.id, u.full_name
      ORDER BY orders_count DESC
    `, [], (err, technicians) => {
      if (err) {
        console.error('❌ Błąd zapytania techników:', err.message);
        return;
      }
      
      console.log('👥 Wszyscy technicy i ich zlecenia:');
      technicians.forEach(tech => {
        console.log(`   ${tech.full_name} (ID: ${tech.id}): ${tech.orders_count} zleceń`);
      });
      
      db.close();
    });
  });
}); 