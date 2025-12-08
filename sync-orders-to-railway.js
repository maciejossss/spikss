const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const https = require('https');

// Ścieżka do bazy danych desktop app
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');
const RAILWAY_URL = 'https://web-production-fc58d.up.railway.app';

console.log('🚀 Synchronizacja zleceń do Railway');
console.log('📁 Baza danych:', dbPath);
console.log('🌐 Railway URL:', RAILWAY_URL);
console.log('');

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    process.exit(1);
  }
  console.log('✅ Połączono z bazą danych SQLite\n');
  
  // 1. Najpierw zsynchronizuj wszystkich użytkowników
  console.log('📋 KROK 1: Synchronizacja użytkowników...\n');
  db.all('SELECT id, username, full_name, email, role, is_active, phone, mobile_pin_hash FROM users', [], (err, users) => {
    if (err) {
      console.error('❌ Błąd pobierania użytkowników:', err.message);
      db.close();
      return;
    }
    
    console.log(`   Znaleziono ${users.length} użytkowników\n`);
    
    const postUsers = JSON.stringify(users);
    const optionsUsers = {
      hostname: 'web-production-fc58d.up.railway.app',
      port: 443,
      path: '/api/sync/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postUsers)
      }
    };
    
    const reqUsers = https.request(optionsUsers, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('   ✅ Użytkownicy zsynchronizowani\n');
          syncDevices();
        } else {
          console.error('   ❌ Błąd sync użytkowników:', res.statusCode, data);
          db.close();
        }
      });
    });
    
    reqUsers.on('error', (error) => {
      console.error('   ❌ Błąd połączenia:', error.message);
      db.close();
    });
    
    reqUsers.write(postUsers);
    reqUsers.end();
  });
  
  // 2. Synchronizuj urządzenia
  function syncDevices() {
    console.log('📋 KROK 2: Synchronizacja urządzeń...\n');
    db.all('SELECT * FROM devices', [], (err, devices) => {
      if (err) {
        console.error('❌ Błąd pobierania urządzeń:', err.message);
        db.close();
        return;
      }
      
      console.log(`   Znaleziono ${devices.length} urządzeń\n`);
      
      const postDevices = JSON.stringify(devices);
      const optionsDevices = {
        hostname: 'web-production-fc58d.up.railway.app',
        port: 443,
        path: '/api/sync/devices',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postDevices)
        }
      };
      
      const reqDevices = https.request(optionsDevices, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('   ✅ Urządzenia zsynchronizowane\n');
            syncClients();
          } else {
            console.error('   ❌ Błąd sync urządzeń:', res.statusCode, data);
            db.close();
          }
        });
      });
      
      reqDevices.on('error', (error) => {
        console.error('   ❌ Błąd połączenia:', error.message);
        db.close();
      });
      
      reqDevices.write(postDevices);
      reqDevices.end();
    });
  }
  
  // 3. Synchronizuj klientów
  function syncClients() {
    console.log('📋 KROK 3: Synchronizacja klientów...\n');
    db.all('SELECT * FROM clients', [], (err, clients) => {
      if (err) {
        console.error('❌ Błąd pobierania klientów:', err.message);
        db.close();
        return;
      }
      
      console.log(`   Znaleziono ${clients.length} klientów\n`);
      
      const postClients = JSON.stringify(clients);
      const optionsClients = {
        hostname: 'web-production-fc58d.up.railway.app',
        port: 443,
        path: '/api/sync/clients',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postClients)
        }
      };
      
      const reqClients = https.request(optionsClients, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('   ✅ Klienci zsynchronizowani\n');
            syncOrders();
          } else {
            console.error('   ❌ Błąd sync klientów:', res.statusCode, data);
            db.close();
          }
        });
      });
      
      reqClients.on('error', (error) => {
        console.error('   ❌ Błąd połączenia:', error.message);
        db.close();
      });
      
      reqClients.write(postClients);
      reqClients.end();
    });
  }
  
  // 4. Synchronizuj zlecenia (tylko te przypisane do techników)
  function syncOrders() {
    console.log('📋 KROK 4: Synchronizacja zleceń...\n');
    db.all(`
      SELECT * FROM service_orders 
      WHERE assigned_user_id IS NOT NULL 
        AND status NOT IN ('deleted', 'cancelled')
      ORDER BY created_at DESC
    `, [], (err, orders) => {
      if (err) {
        console.error('❌ Błąd pobierania zleceń:', err.message);
        db.close();
        return;
      }
      
      console.log(`   Znaleziono ${orders.length} zleceń do synchronizacji\n`);
      
      if (orders.length === 0) {
        console.log('   ℹ️ Brak zleceń do synchronizacji');
        db.close();
        return;
      }
      
      const postOrders = JSON.stringify(orders);
      const optionsOrders = {
        hostname: 'web-production-fc58d.up.railway.app',
        port: 443,
        path: '/api/sync/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postOrders)
        }
      };
      
      const reqOrders = https.request(optionsOrders, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const result = JSON.parse(data);
              console.log('   ✅ ZLECENIA ZSYNCHRONIZOWANE!');
              console.log(`   📊 Zsynchronizowano: ${result.syncedCount || orders.length} zleceń\n`);
              console.log('🎉 SYNCHRONIZACJA ZAKOŃCZONA POMYŚLNIE!\n');
              console.log('💡 Możesz teraz zalogować się w aplikacji mobilnej:');
              console.log(`   ${RAILWAY_URL}`);
            } catch (e) {
              console.log('   ✅ Zlecenia zsynchronizowane:', data);
            }
          } else {
            console.error('   ❌ Błąd sync zleceń:', res.statusCode);
            console.error('   Odpowiedź:', data);
          }
          db.close();
        });
      });
      
      reqOrders.on('error', (error) => {
        console.error('   ❌ Błąd połączenia:', error.message);
        db.close();
      });
      
      reqOrders.write(postOrders);
      reqOrders.end();
    });
  }
});