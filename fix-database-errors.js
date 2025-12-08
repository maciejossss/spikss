const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam błędy bazy danych...');
console.log(`📁 Baza danych: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Napraw tabelę time_entries
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='time_entries'", (err, row) => {
    if (!row) {
      console.log('📋 Tworzę tabelę time_entries...');
      db.run(`
        CREATE TABLE time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER,
          user_id INTEGER,
          start_time DATETIME,
          end_time DATETIME,
          hours REAL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log('✅ Tabela time_entries już istnieje');
    }
  });

  // 2. Napraw kolumnę brand w urządzeniach
  db.get("PRAGMA table_info(devices)", (err, rows) => {
    if (err) {
      console.error('❌ Błąd sprawdzania tabeli devices:', err);
      return;
    }
    
    db.all("PRAGMA table_info(devices)", (err, columns) => {
      if (err) {
        console.error('❌ Błąd sprawdzania kolumn:', err);
        return;
      }
      
      const hasBrand = columns.some(col => col.name === 'brand');
      if (!hasBrand) {
        console.log('📋 Dodaję kolumnę brand do tabeli devices...');
        db.run('ALTER TABLE devices ADD COLUMN brand TEXT');
      } else {
        console.log('✅ Kolumna brand już istnieje');
      }
    });
  });

  // 3. Napraw dane klientów
  console.log('🔧 Naprawiam dane klientów...');
  
  // Klient 1 - Jan Kowalski
  db.run(`
    UPDATE clients 
    SET address_street = 'ul. Główna 15',
        address_city = 'Warszawa',
        address_postal_code = '00-001',
        address_country = 'Polska',
        nip = '1234567890',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);

  // Klient 2 - Maria Nowak  
  db.run(`
    UPDATE clients 
    SET address_street = 'ul. Przemysłowa 45',
        address_city = 'Warszawa', 
        address_postal_code = '02-600',
        address_country = 'Polska',
        nip = '9876543210',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 2
  `);

  // Klient 3 - Piotr Wiśniewski
  db.run(`
    UPDATE clients 
    SET address_street = 'ul. Słoneczna 12',
        address_city = 'Warszawa',
        address_postal_code = '03-200', 
        address_country = 'Polska',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 3
  `);

  console.log('✅ Dane klientów naprawione!');
});

db.close((err) => {
  if (err) {
    console.error('❌ Błąd zamykania bazy:', err);
  } else {
    console.log('🎉 Wszystkie błędy naprawione!');
  }
}); 