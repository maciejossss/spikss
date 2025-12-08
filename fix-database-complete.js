const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ścieżka do bazy danych
const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam bazę danych...');
console.log('📁 Ścieżka do bazy:', dbPath);

const db = new sqlite3.Database(dbPath);

// Funkcja do sprawdzenia czy kolumna istnieje
function columnExists(table, column) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const exists = rows.some(row => row.name === column);
            resolve(exists);
        });
    });
}

// Funkcja do sprawdzenia czy tabela istnieje
function tableExists(table) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(!!row);
        });
    });
}

async function fixDatabase() {
    try {
        console.log('🔍 Sprawdzam strukturę bazy danych...');

        // 1. Napraw tabelę devices - dodaj brakujące kolumny
        console.log('📱 Naprawiam tabelę devices...');
        
        const deviceColumns = ['brand', 'warranty_status', 'full_name'];
        for (const column of deviceColumns) {
            const exists = await columnExists('devices', column);
            if (!exists) {
                console.log(`➕ Dodaję kolumnę ${column} do tabeli devices`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE devices ADD COLUMN ${column} TEXT`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                console.log(`✅ Kolumna ${column} już istnieje w tabeli devices`);
            }
        }

        // 2. Sprawdź i utwórz tabelę time_entries
        console.log('⏰ Sprawdzam tabelę time_entries...');
        const timeEntriesExists = await tableExists('time_entries');
        
        if (!timeEntriesExists) {
            console.log('➕ Tworzę tabelę time_entries');
            await new Promise((resolve, reject) => {
                db.run(`
                    CREATE TABLE time_entries (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id INTEGER,
                        technician_id INTEGER,
                        start_time DATETIME,
                        end_time DATETIME,
                        hours_worked REAL,
                        description TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (order_id) REFERENCES orders (id),
                        FOREIGN KEY (technician_id) REFERENCES users (id)
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else {
            console.log('✅ Tabela time_entries już istnieje');
            
            // Sprawdź czy kolumna date istnieje
            const dateExists = await columnExists('time_entries', 'date');
            if (!dateExists) {
                console.log('➕ Dodaję kolumnę date do tabeli time_entries');
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE time_entries ADD COLUMN date DATE`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }

        // 3. Sprawdź inne ważne kolumny w orders
        console.log('📋 Sprawdzam tabelę orders...');
        const orderColumns = ['service_categories', 'completed_categories', 'work_photos', 'completion_notes'];
        for (const column of orderColumns) {
            const exists = await columnExists('orders', column);
            if (!exists) {
                console.log(`➕ Dodaję kolumnę ${column} do tabeli orders`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE orders ADD COLUMN ${column} TEXT`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                console.log(`✅ Kolumna ${column} już istnieje w tabeli orders`);
            }
        }

        // 4. Sprawdź kolumny w clients
        console.log('👥 Sprawdzam tabelę clients...');
        const clientColumns = ['address_street', 'address_city', 'address_postal_code', 'address_country', 'regon', 'is_active'];
        for (const column of clientColumns) {
            const exists = await columnExists('clients', column);
            if (!exists) {
                console.log(`➕ Dodaję kolumnę ${column} do tabeli clients`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE clients ADD COLUMN ${column} TEXT`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                console.log(`✅ Kolumna ${column} już istnieje w tabeli clients`);
            }
        }

        console.log('✅ Naprawa bazy danych zakończona pomyślnie!');
        
        // Pokaż podsumowanie
        console.log('\n📊 PODSUMOWANIE:');
        console.log('✅ Tabela devices - wszystkie kolumny gotowe');
        console.log('✅ Tabela time_entries - utworzona/zweryfikowana');
        console.log('✅ Tabela orders - wszystkie kolumny gotowe');
        console.log('✅ Tabela clients - wszystkie kolumny gotowe');

    } catch (error) {
        console.error('❌ Błąd podczas naprawy bazy danych:', error);
    } finally {
        db.close();
    }
}

fixDatabase(); 