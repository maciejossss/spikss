const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Ścieżka do bazy danych
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'serwis-desktop', 'serwis.db');

console.log('🔧 Naprawiam dane klientów...');
console.log('📁 Baza danych:', dbPath);

const db = new sqlite3.Database(dbPath);

// Funkcja do naprawy danych klientów
function fixClientsData() {
  return new Promise((resolve, reject) => {
    console.log('📋 Pobieram aktualne dane klientów...');
    
    db.all('SELECT * FROM clients', (err, clients) => {
      if (err) {
        console.error('❌ Błąd pobierania klientów:', err);
        reject(err);
        return;
      }
      
      console.log(`📊 Znaleziono ${clients.length} klientów`);
      
      // Naprawiam dane dla każdego klienta
      const updates = clients.map(client => {
        console.log(`🔧 Naprawiam klienta: ${client.first_name} ${client.last_name}`);
        
        // Naprawiam dane na podstawie ID
        switch(client.id) {
          case 1: // Jan Kowalski
            return {
              id: client.id,
              address_street: 'ul. Główna 15',
              address_city: 'Warszawa',
              address_postal_code: '00-001',
              address_country: 'Polska',
              nip: '1234567890',
              regon: null,
              is_active: 1
            };
          case 2: // Maria Nowak
            return {
              id: client.id,
              address_street: 'ul. Przemysłowa 45',
              address_city: 'Warszawa',
              address_postal_code: '02-600',
              address_country: 'Polska',
              nip: '9876543210',
              regon: null,
              is_active: 1
            };
          case 3: // Piotr Wiśniewski
            return {
              id: client.id,
              address_street: 'ul. Słoneczna 12',
              address_city: 'Warszawa',
              address_postal_code: '03-200',
              address_country: 'Polska',
              nip: null,
              regon: null,
              is_active: 1
            };
          case 4: // Maciej Banaszak
            return {
              id: client.id,
              address_street: 'Rynek 36',
              address_city: 'Leszno',
              address_postal_code: '64-100',
              address_country: 'Polska',
              nip: null,
              regon: null,
              is_active: 1
            };
          default:
            console.log(`⚠️ Nieznany klient ID: ${client.id}`);
            return null;
        }
      }).filter(update => update !== null);
      
      // Wykonuję aktualizacje
      let completed = 0;
      updates.forEach(update => {
        const query = `
          UPDATE clients 
          SET address_street = ?, 
              address_city = ?, 
              address_postal_code = ?, 
              address_country = ?, 
              nip = ?, 
              regon = ?, 
              is_active = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(query, [
          update.address_street,
          update.address_city,
          update.address_postal_code,
          update.address_country,
          update.nip,
          update.regon,
          update.is_active,
          update.id
        ], function(err) {
          if (err) {
            console.error(`❌ Błąd aktualizacji klienta ${update.id}:`, err);
          } else {
            console.log(`✅ Naprawiono klienta ID: ${update.id}`);
          }
          
          completed++;
          if (completed === updates.length) {
            console.log('🎉 Naprawa danych klientów zakończona!');
            resolve();
          }
        });
      });
    });
  });
}

// Uruchamiam naprawę
fixClientsData()
  .then(() => {
    console.log('✅ Skrypt naprawy zakończony pomyślnie');
    db.close();
  })
  .catch(err => {
    console.error('❌ Błąd podczas naprawy:', err);
    db.close();
  }); 