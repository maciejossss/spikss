const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych desktop app
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🚀 Synchronizuję techników z desktop app do Railway...');
console.log('📁 Baza danych:', dbPath);

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    return;
  }
  console.log('✅ Połączono z bazą danych SQLite');
  
  try {
    // Pobierz techników z desktop app
    db.all(`
      SELECT id, username, full_name, email, role, is_active
      FROM users 
      WHERE role IN ('technician', 'installer')
      ORDER BY id ASC
    `, [], async (err, technicians) => {
      if (err) {
        console.error('❌ Błąd pobierania techników:', err.message);
        return;
      }
      
      console.log(`\n📋 Znaleziono ${technicians.length} techników w desktop app:`);
      technicians.forEach((tech, index) => {
        console.log(`   ${index + 1}. ID: ${tech.id} | ${tech.full_name} | ${tech.username} | ${tech.email} | ${tech.role} | Aktywny: ${tech.is_active}`);
      });
      
      // Synchronizuj do Railway
      console.log('\n🔄 Synchronizuję techników do Railway...');
      try {
        const response = await fetch('https://web-production-fc58d.up.railway.app/api/sync/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(technicians)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Synchronizacja zakończona pomyślnie:', result);
        } else {
          const errorText = await response.text();
          console.error('❌ Błąd synchronizacji:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Błąd połączenia z Railway:', error.message);
      }
      
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    db.close();
  }
}); 