const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam tabelę time_entries...');
console.log(`📁 Baza danych: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Sprawdź czy tabela time_entries istnieje
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='time_entries'", (err, row) => {
    if (err) {
      console.error('❌ Błąd sprawdzania tabeli:', err);
      return;
    }
    
    if (!row) {
      console.log('📋 Tworzę tabelę time_entries...');
      
      // Utwórz tabelę time_entries
      db.run(`
        CREATE TABLE time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER,
          user_id INTEGER,
          start_time DATETIME,
          end_time DATETIME,
          duration_hours REAL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Błąd tworzenia tabeli time_entries:', err);
        } else {
          console.log('✅ Tabela time_entries utworzona pomyślnie!');
        }
        
        // Sprawdź czy tabela została utworzona
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='time_entries'", (err, row) => {
          if (row) {
            console.log('✅ Tabela time_entries istnieje!');
          } else {
            console.log('❌ Tabela time_entries nadal nie istnieje!');
          }
          db.close();
        });
      });
    } else {
      console.log('✅ Tabela time_entries już istnieje!');
      db.close();
    }
  });
}); 