require('dotenv').config();
const DatabaseService = require('./src/shared/database/database');

async function createClients() {
    try {
        // Initialize database
        await DatabaseService.initialize();
        console.log('Database connected');

        // Test clients data
        const clients = [
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
            }
        ];

        console.log('Creating clients...');

        for (const client of clients) {
            const query = `
                INSERT INTO clients (
                    company_name, contact_person, nip, regon, 
                    address_street, address_city, address_postal_code,
                    phone, email, website, client_type, priority_level,
                    payment_terms, notes, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
                ) RETURNING id, company_name, contact_person;
            `;

            const result = await DatabaseService.query(query, [
                client.company_name,
                client.contact_person,
                client.nip,
                client.regon,
                client.address_street,
                client.address_city,
                client.address_postal_code,
                client.phone,
                client.email,
                client.website,
                client.client_type,
                client.priority_level,
                client.payment_terms,
                client.notes
            ]);

            console.log('Created client:', result.rows[0]);
        }

        console.log('All clients created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating clients:', error);
        process.exit(1);
    }
}

// Run the script
createClients(); 