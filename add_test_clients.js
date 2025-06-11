const https = require('http');

const testClients = [
    {
        company_name: 'TERMO-BUD Sp. z o.o.',
        contact_person: 'Marek Zawadzki',
        nip: '1234567890',
        regon: '123456789',
        address_street: 'ul. Przemysłowa 15',
        address_city: 'Warszawa',
        address_postal_code: '02-232',
        phone: '+48223334455',
        email: 'biuro@termobud.pl',
        website: 'www.termobud.pl',
        client_type: 'business',
        priority_level: 'high',
        payment_terms: 14,
        notes: 'Klient priorytetowy - duże instalacje przemysłowe'
    },
    {
        company_name: 'Hotel Skalski',
        contact_person: 'Piotr Skalski',
        nip: '9876543210',
        address_street: 'ul. Hotelowa 25',
        address_city: 'Kraków',
        address_postal_code: '31-222',
        phone: '+48123987654',
        email: 'p.skalski@hotelskalski.pl',
        client_type: 'business',
        priority_level: 'standard',
        payment_terms: 30,
        notes: 'Hotel - 3 kotły gazowe, serwis co 6 miesięcy'
    },
    {
        contact_person: 'Maria Kowalczyk',
        address_street: 'ul. Słoneczna 10',
        address_city: 'Gdańsk',
        address_postal_code: '80-001',
        phone: '+48501234567',
        email: 'm.kowalczyk@gmail.com',
        client_type: 'individual',
        priority_level: 'standard',
        payment_terms: 30,
        notes: 'Dom jednorodzinny - kocioł gazowy 24kW'
    },
    {
        company_name: 'Restauracja U Stefana',
        contact_person: 'Stefan Nowak',
        address_street: 'Rynek 36',
        address_city: 'Leszno',
        address_postal_code: '64-100',
        phone: '+48725420005',
        email: 'maciej1banaszak@gmail.com',
        client_type: 'business',
        priority_level: 'high',
        payment_terms: 21,
        notes: 'Restauracja - kocioł gazowy, ważne zamówienia catering'
    }
];

async function loginAndAddClients() {
    console.log('🔐 Logowanie do systemu...');
    
    // Najpierw logowanie
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'Admin123!'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    return new Promise((resolve, reject) => {
        const loginReq = https.request(loginOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const loginResult = JSON.parse(data);
                    if (loginResult.success) {
                        console.log('✅ Zalogowano pomyślnie!');
                        const token = loginResult.data.token;
                        
                        // Teraz dodaj klientów
                        for (let i = 0; i < testClients.length; i++) {
                            const client = testClients[i];
                            console.log(`📝 Dodawanie klienta ${i + 1}/${testClients.length}: ${client.contact_person}...`);
                            
                            await addClient(client, token);
                            await new Promise(resolve => setTimeout(resolve, 500)); // Pauza między requestami
                        }
                        
                        console.log('🎉 Wszystko gotowe! Odśwież stronę w przeglądarce.');
                        resolve();
                    } else {
                        reject(new Error('Login failed: ' + loginResult.message));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        loginReq.on('error', reject);
        loginReq.write(loginData);
        loginReq.end();
    });
}

function addClient(clientData, token) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(clientData);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/clients',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log(`  ✅ ${clientData.contact_person} - dodano pomyślnie`);
                    } else {
                        console.log(`  ❌ ${clientData.contact_person} - błąd: ${result.message}`);
                    }
                    resolve(result);
                } catch (error) {
                    console.log(`  ❌ ${clientData.contact_person} - błąd parsowania: ${error.message}`);
                    resolve({});
                }
            });
        });

        req.on('error', (error) => {
            console.log(`  ❌ ${clientData.contact_person} - błąd sieci: ${error.message}`);
            resolve({});
        });

        req.write(postData);
        req.end();
    });
}

// Uruchom
loginAndAddClients().catch(error => {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
}); 