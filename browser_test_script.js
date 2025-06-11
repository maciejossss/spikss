// 🚀 SKRYPT DO KONSOLI PRZEGLĄDARKI - dodaje przykładowych klientów
// Otwórz http://localhost:8080, naciśnij F12, przejdź do zakładki Console i wklej ten kod:

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

async function addTestClients() {
    console.log('🔐 Logowanie do systemu...');
    
    // Najpierw logowanie
    try {
        const loginResponse = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'Admin123!'
            })
        });
        
        const loginResult = await loginResponse.json();
        
        if (!loginResult.success) {
            console.error('❌ Błąd logowania:', loginResult.message);
            return;
        }
        
        console.log('✅ Zalogowano pomyślnie!');
        const token = loginResult.data.token;
        
        // Dodaj klientów jeden po drugim
        for (let i = 0; i < testClients.length; i++) {
            const client = testClients[i];
            console.log(`📝 Dodawanie klienta ${i + 1}/${testClients.length}: ${client.contact_person}...`);
            
            try {
                const response = await fetch('http://localhost:3000/api/v1/clients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(client)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log(`  ✅ ${client.contact_person} - dodano pomyślnie`);
                } else {
                    console.log(`  ❌ ${client.contact_person} - błąd: ${result.message}`);
                }
            } catch (error) {
                console.log(`  ❌ ${client.contact_person} - błąd sieci: ${error.message}`);
            }
            
            // Pauza między requestami
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('🎉 Wszystko gotowe! Odśwież stronę żeby zobaczyć nowych klientów.');
        
    } catch (error) {
        console.error('❌ Błąd:', error.message);
    }
}

// Uruchom automatycznie
addTestClients(); 