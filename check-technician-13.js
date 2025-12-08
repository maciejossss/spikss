const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych desktop app
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔍 Sprawdzam techników w bazie danych...');
console.log('📁 Baza danych:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    return;
  }
  console.log('✅ Połączono z bazą danych SQLite');
  
  // Sprawdź wszystkich techników
  db.all(`
    SELECT 
      id,
      username,
      full_name,
      email,
      role,
      is_active
    FROM users 
    WHERE role IN ('technician', 'installer')
    ORDER BY id ASC
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Błąd pobierania techników:', err.message);
      return;
    }
    
    console.log(`\n📋 Znaleziono ${rows.length} techników:`);
    rows.forEach((tech, index) => {
      console.log(`   ${index + 1}. ID: ${tech.id} | ${tech.full_name} | ${tech.username} | ${tech.email} | ${tech.role} | Aktywny: ${tech.is_active}`);
    });
    
    // Sprawdź czy technik 13 istnieje
    const tech13 = rows.find(t => t.id === 13);
    if (tech13) {
      console.log(`\n✅ Technik 13 (Radosław Cichorek) ZNALEZIONY!`);
      console.log(`   ID: ${tech13.id}`);
      console.log(`   Nazwa: ${tech13.full_name}`);
      console.log(`   Username: ${tech13.username}`);
      console.log(`   Email: ${tech13.email}`);
      console.log(`   Rola: ${tech13.role}`);
      console.log(`   Aktywny: ${tech13.is_active}`);
    } else {
      console.log(`\n❌ Technik 13 (Radosław Cichorek) NIE ZNALEZIONY!`);
      console.log(`   Dostępne ID: ${rows.map(t => t.id).join(', ')}`);
    }
    
    db.close();
  });
}); 