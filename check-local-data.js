const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');

console.log('🔍 Sprawdzam dane w lokalnej bazie SQLite...');
console.log('📁 Ścieżka:', dbPath);

const db = new sqlite3.Database(dbPath);

// Sprawdź zlecenia
db.all("SELECT COUNT(*) as count FROM service_orders", (err, result) => {
    if (err) {
        console.error('❌ Błąd:', err);
        return;
    }
    console.log(`📋 Zlecenia w lokalnej bazie: ${result[0].count}`);
    
    // Pokaż przykładowe zlecenia
    db.all(`
        SELECT 
            so.id,
            so.order_number,
            so.status,
            so.priority,
            so.assigned_user_id,
            c.first_name || ' ' || c.last_name as client_name,
            d.name as device_name
        FROM service_orders so
        LEFT JOIN clients c ON so.client_id = c.id
        LEFT JOIN devices d ON so.device_id = d.id
        ORDER BY so.created_at DESC
        LIMIT 10
    `, (err, orders) => {
        if (err) {
            console.error('❌ Błąd:', err);
            return;
        }
        console.log('\n📋 Przykładowe zlecenia:');
        orders.forEach(order => {
            console.log(`  - ${order.order_number}: ${order.client_name} (${order.status}) - Technik: ${order.assigned_user_id}`);
        });
        
        // Sprawdź techników
        db.all("SELECT id, username, full_name, role FROM users WHERE role IN ('technician', 'admin')", (err, users) => {
            if (err) {
                console.error('❌ Błąd:', err);
                return;
            }
            console.log('\n👥 Technicy w lokalnej bazie:');
            users.forEach(user => {
                console.log(`  - ID ${user.id}: ${user.full_name} (${user.username}) - ${user.role}`);
            });
            
            // Sprawdź klientów
            db.all("SELECT COUNT(*) as count FROM clients", (err, result) => {
                if (err) {
                    console.error('❌ Błąd:', err);
                    return;
                }
                console.log(`\n👥 Klienci w lokalnej bazie: ${result[0].count}`);
                
                // Sprawdź urządzenia
                db.all("SELECT COUNT(*) as count FROM devices", (err, result) => {
                    if (err) {
                        console.error('❌ Błąd:', err);
                        return;
                    }
                    console.log(`🔧 Urządzenia w lokalnej bazie: ${result[0].count}`);
                    
                    db.close();
                    console.log('\n✅ Sprawdzanie zakończone');
                });
            });
        });
    });
}); 