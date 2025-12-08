const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const https = require('https');

// Ścieżka do bazy danych desktop app
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');
const RAILWAY_URL = 'https://web-production-fc58d.up.railway.app';

console.log('🚀 Synchronizacja użytkownika ID 13 do Railway');
console.log('📁 Baza danych:', dbPath);
console.log('🌐 Railway URL:', RAILWAY_URL);
console.log('');

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('❌ Błąd połączenia z bazą danych:', err.message);
    process.exit(1);
  }
  console.log('✅ Połączono z bazą danych SQLite\n');
  
  // Pobierz użytkownika ID 13
  db.get(`
    SELECT 
      id, 
      username, 
      full_name, 
      email, 
      role, 
      is_active,
      phone,
      mobile_pin_hash,
      mobile_pin_encrypted,
      mobile_authorized
    FROM users 
    WHERE id = 13
  `, [], async (err, user) => {
    if (err) {
      console.error('❌ Błąd pobierania użytkownika:', err.message);
      db.close();
      return;
    }
    
    if (!user) {
      console.error('❌ Użytkownik ID 13 nie istnieje w lokalnej bazie!');
      console.log('\n💡 Rozwiązanie:');
      console.log('   1. Otwórz aplikację desktop');
      console.log('   2. Przejdź do Ustawień → Użytkownicy');
      console.log('   3. Dodaj użytkownika "Radosław Cichorek"');
      console.log('   4. Ustaw PIN mobilny (4-8 cyfr)');
      console.log('   5. Uruchom ten skrypt ponownie');
      db.close();
      return;
    }
    
    console.log('📋 DANE UŻYTKOWNIKA ID 13 (desktop):');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Pełna nazwa: ${user.full_name}`);
    console.log(`   Email: ${user.email || 'BRAK'}`);
    console.log(`   Telefon: ${user.phone || 'BRAK'}`);
    console.log(`   Rola: ${user.role}`);
    console.log(`   Aktywny: ${user.is_active ? 'TAK' : 'NIE'}`);
    console.log(`   Mobile PIN hash: ${user.mobile_pin_hash ? '✅ USTAWIONY' : '❌ BRAK'}`);
    console.log(`   Mobile PIN encrypted: ${user.mobile_pin_encrypted ? '✅ JEST' : '❌ BRAK'}`);
    console.log(`   Mobile authorized: ${user.mobile_authorized ? 'TAK' : 'NIE'}`);
    console.log('');
    
    // Sprawdź czy ma PIN
    if (!user.mobile_pin_hash) {
      console.error('⚠️ PROBLEM: Użytkownik nie ma ustawionego PIN mobilnego!');
      console.log('\n💡 Rozwiązanie:');
      console.log('   1. Otwórz aplikację desktop');
      console.log('   2. Przejdź do Ustawień → Użytkownicy');
      console.log('   3. Edytuj użytkownika "' + user.full_name + '"');
      console.log('   4. Ustaw PIN mobilny (4-8 cyfr, np. 1234)');
      console.log('   5. Zaznacz "Autoryzacja mobilna"');
      console.log('   6. Zapisz');
      console.log('   7. Uruchom ten skrypt ponownie');
      db.close();
      process.exit(1);
    }
    
    // Synchronizuj do Railway
    console.log('🔄 Synchronizuję użytkownika do Railway...\n');
    
    const postData = JSON.stringify([user]);
    const options = {
      hostname: 'web-production-fc58d.up.railway.app',
      port: 443,
      path: '/api/sync/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            console.log('✅ SYNCHRONIZACJA ZAKOŃCZONA POMYŚLNIE!');
            console.log('   Zsynchronizowano:', result.syncedCount || 1, 'użytkowników');
            console.log('');
            console.log('🎉 Teraz możesz zalogować się w aplikacji mobilnej:');
            console.log(`   1. Otwórz: ${RAILWAY_URL}`);
            console.log(`   2. Wybierz: ${user.full_name}`);
            console.log(`   3. Wprowadź PIN (ten który ustawiłeś w desktop)`);
            console.log('');
          } catch (e) {
            console.log('✅ Synchronizacja zakończona (odpowiedź:', data, ')');
          }
        } else {
          console.error('❌ BŁĄD SYNCHRONIZACJI:');
          console.error('   Status:', res.statusCode);
          console.error('   Odpowiedź:', data);
          console.log('\n💡 Sprawdź czy Railway backend działa poprawnie');
        }
        db.close();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ BŁĄD POŁĄCZENIA Z RAILWAY:', error.message);
      console.log('\n💡 Sprawdź:');
      console.log('   1. Czy masz połączenie z internetem');
      console.log('   2. Czy Railway URL jest poprawny:', RAILWAY_URL);
      console.log('   3. Czy Railway backend jest uruchomiony');
      db.close();
    });
    
    req.write(postData);
    req.end();
  });
});
