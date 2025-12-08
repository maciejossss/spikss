const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ścieżka do bazy danych (znana z logów)
const dbPath = 'C:\\Users\\macie\\AppData\\Roaming\\serwis-desktop\\serwis.db';

async function fixDatabase() {
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    console.log('🔧 Naprawianie bazy danych...');
    console.log('📁 Ścieżka bazy:', dbPath);
    
    // 1. Sprawdź czy tabela time_entries istnieje
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='time_entries'", (err, row) => {
      if (err) {
        console.error('❌ Błąd sprawdzania tabeli time_entries:', err);
        db.close();
        reject(err);
        return;
      }
      
      if (!row) {
        console.log('📋 Tabela time_entries nie istnieje - tworzę...');
        db.run(`
          CREATE TABLE time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            technician_id INTEGER,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            hours_worked REAL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES service_orders (id),
            FOREIGN KEY (technician_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            console.error('❌ Błąd tworzenia tabeli time_entries:', err);
          } else {
            console.log('✅ Tabela time_entries utworzona');
          }
          db.close();
          resolve();
        });
      } else {
        console.log('📋 Tabela time_entries istnieje - sprawdzam kolumny...');
        
        // Sprawdź kolumny w tabeli time_entries
        db.all("PRAGMA table_info(time_entries)", (err, columns) => {
          if (err) {
            console.error('❌ Błąd sprawdzania kolumn time_entries:', err);
            db.close();
            reject(err);
            return;
          }
          
          console.log('📋 Kolumny w tabeli time_entries:', columns.map(c => c.name));
          
          const hasDateColumn = columns.some(col => col.name === 'date');
          
          if (!hasDateColumn) {
            console.log('📋 Dodaję kolumnę date do tabeli time_entries...');
            db.run("ALTER TABLE time_entries ADD COLUMN date TEXT", (err) => {
              if (err) {
                console.error('❌ Błąd dodawania kolumny date:', err);
              } else {
                console.log('✅ Kolumna date dodana do tabeli time_entries');
              }
              db.close();
              resolve();
            });
          } else {
            console.log('✅ Kolumna date już istnieje w tabeli time_entries');
            db.close();
            resolve();
          }
        });
      }
    });
  });
}

// Uruchom naprawę
fixDatabase()
  .then(() => {
    console.log('✅ Naprawa bazy danych zakończona');
  })
  .catch((error) => {
    console.error('❌ Błąd podczas naprawy:', error);
  }); 