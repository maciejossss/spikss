const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam lokalną bazę danych...');
console.log(`📁 Ścieżka: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

// Funkcja do dodawania kolumny jeśli nie istnieje
function addColumnIfNotExists(table, column, definition) {
  return new Promise((resolve, reject) => {
    db.get(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) {
        console.error(`❌ Błąd sprawdzania tabeli ${table}:`, err);
        reject(err);
        return;
      }
      
      db.all(`PRAGMA table_info(${table})`, (err, columns) => {
        if (err) {
          console.error(`❌ Błąd pobierania kolumn ${table}:`, err);
          reject(err);
          return;
        }
        
        const columnExists = columns.some(col => col.name === column);
        
        if (!columnExists) {
          console.log(`🔧 Dodaję kolumnę ${column} do tabeli ${table}...`);
          db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
            if (err) {
              console.error(`❌ Błąd dodawania kolumny ${column}:`, err);
              reject(err);
            } else {
              console.log(`✅ Kolumna ${column} dodana do tabeli ${table}`);
              resolve();
            }
          });
        } else {
          console.log(`ℹ️ Kolumna ${column} już istnieje w tabeli ${table}`);
          resolve();
        }
      });
    });
  });
}

// Funkcja do tworzenia tabeli jeśli nie istnieje
function createTableIfNotExists(table, definition) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`, (err, row) => {
      if (err) {
        console.error(`❌ Błąd sprawdzania tabeli ${table}:`, err);
        reject(err);
        return;
      }
      
      if (!row) {
        console.log(`🔧 Tworzę tabelę ${table}...`);
        db.run(`CREATE TABLE ${table} (${definition})`, (err) => {
          if (err) {
            console.error(`❌ Błąd tworzenia tabeli ${table}:`, err);
            reject(err);
          } else {
            console.log(`✅ Tabela ${table} utworzona`);
            resolve();
          }
        });
      } else {
        console.log(`ℹ️ Tabela ${table} już istnieje`);
        resolve();
      }
    });
  });
}

async function fixDatabase() {
  try {
    console.log('🚀 Rozpoczynam naprawę bazy danych...');
    
    // Dodaj brakujące kolumny do tabeli devices
    await addColumnIfNotExists('devices', 'brand', 'TEXT');
    await addColumnIfNotExists('devices', 'warranty_status', 'TEXT');
    await addColumnIfNotExists('devices', 'full_name', 'TEXT');
    
    // Dodaj brakujące kolumny do tabeli service_orders
    await addColumnIfNotExists('service_orders', 'service_categories', 'TEXT');
    await addColumnIfNotExists('service_orders', 'completed_categories', 'TEXT');
    await addColumnIfNotExists('service_orders', 'work_photos', 'TEXT');
    await addColumnIfNotExists('service_orders', 'actual_start_date', 'DATETIME');
    await addColumnIfNotExists('service_orders', 'actual_end_date', 'DATETIME');
    await addColumnIfNotExists('service_orders', 'completion_notes', 'TEXT');
    await addColumnIfNotExists('service_orders', 'actual_hours', 'REAL');
    
    // Dodaj brakujące kolumny do tabeli clients
    await addColumnIfNotExists('clients', 'address_street', 'TEXT');
    await addColumnIfNotExists('clients', 'address_city', 'TEXT');
    await addColumnIfNotExists('clients', 'address_postal_code', 'TEXT');
    await addColumnIfNotExists('clients', 'address_country', 'TEXT');
    await addColumnIfNotExists('clients', 'regon', 'TEXT');
    await addColumnIfNotExists('clients', 'is_active', 'INTEGER DEFAULT 1');
    
    // Dodaj brakujące kolumny do tabeli users
    await addColumnIfNotExists('users', 'password_hash', 'TEXT');
    
    // Utwórz tabelę time_entries jeśli nie istnieje
    await createTableIfNotExists('time_entries', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      user_id INTEGER,
      start_time DATETIME,
      end_time DATETIME,
      duration_minutes INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES service_orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    `);
    
    // Utwórz tabelę device_files jeśli nie istnieje
    await createTableIfNotExists('device_files', `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    `);
    
    console.log('✅ Naprawa bazy danych zakończona pomyślnie!');
    
  } catch (error) {
    console.error('❌ Błąd podczas naprawy bazy danych:', error);
  } finally {
    db.close();
  }
}

fixDatabase(); 