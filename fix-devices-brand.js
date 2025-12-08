const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam tabelę devices - dodaję kolumnę brand...');
console.log('📁 Baza danych:', dbPath);

const db = new sqlite3.Database(dbPath);

// Funkcja do naprawy tabeli devices
function fixDevicesTable() {
  return new Promise((resolve, reject) => {
    console.log('📋 Sprawdzam strukturę tabeli devices...');
    
    // Sprawdź czy kolumna brand istnieje
    db.get("PRAGMA table_info(devices)", (err, rows) => {
      if (err) {
        console.error('❌ Błąd sprawdzania struktury tabeli:', err);
        reject(err);
        return;
      }
      
      db.all("PRAGMA table_info(devices)", (err, columns) => {
        if (err) {
          console.error('❌ Błąd pobierania kolumn:', err);
          reject(err);
          return;
        }
        
        console.log(`📊 Tabela devices ma ${columns.length} kolumn:`);
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Sprawdź czy kolumna brand istnieje
        const hasBrand = columns.some(col => col.name === 'brand');
        
        if (hasBrand) {
          console.log('✅ Kolumna brand już istnieje');
          resolve();
          return;
        }
        
        console.log('🔧 Dodaję kolumnę brand...');
        
        // Dodaj kolumnę brand
        db.run('ALTER TABLE devices ADD COLUMN brand TEXT', function(err) {
          if (err) {
            console.error('❌ Błąd dodawania kolumny brand:', err);
            reject(err);
            return;
          }
          
          console.log('✅ Kolumna brand została dodana');
          
          // Zaktualizuj istniejące urządzenia z przykładowymi markami
          console.log('🔧 Aktualizuję istniejące urządzenia...');
          
          const updates = [
            { id: 1, brand: 'Samsung' },
            { id: 2, brand: 'LG' },
            { id: 3, brand: 'Bosch' },
            { id: 4, brand: 'Whirlpool' }
          ];
          
          let completed = 0;
          updates.forEach(update => {
            db.run('UPDATE devices SET brand = ? WHERE id = ?', [update.brand, update.id], function(err) {
              if (err) {
                console.error(`❌ Błąd aktualizacji urządzenia ${update.id}:`, err);
              } else {
                console.log(`✅ Zaktualizowano urządzenie ID: ${update.id} - marka: ${update.brand}`);
              }
              
              completed++;
              if (completed === updates.length) {
                console.log('🎉 Naprawa tabeli devices zakończona!');
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

// Uruchamiam naprawę
fixDevicesTable()
  .then(() => {
    console.log('✅ Skrypt naprawy urządzeń zakończony pomyślnie');
    db.close();
  })
  .catch(err => {
    console.error('❌ Błąd podczas naprawy urządzeń:', err);
    db.close();
  }); 