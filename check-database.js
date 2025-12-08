const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');

console.log('🔍 Sprawdzam strukturę bazy danych...');
console.log('📁 Ścieżka:', dbPath);

const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('❌ Błąd:', err);
        return;
    }
    
    console.log('\n📋 Dostępne tabele:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Sprawdź strukturę każdej tabeli
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
            if (err) {
                console.error(`❌ Błąd sprawdzania ${table.name}:`, err);
                return;
            }
            
            console.log(`\n📊 Struktura tabeli ${table.name}:`);
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });
        });
    });
    
    setTimeout(() => {
        db.close();
        console.log('\n✅ Sprawdzanie zakończone');
    }, 1000);
}); 