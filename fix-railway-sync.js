const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Railway PostgreSQL connection
const railwayClient = new Client({
  connectionString: 'postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway',
  ssl: { rejectUnauthorized: false }
});

// Local SQLite connection
const localDbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
const localDb = new sqlite3.Database(localDbPath);

class RailwaySyncFix {
  constructor() {
    this.railwayClient = railwayClient;
    this.localDb = localDb;
  }

  async init() {
    try {
      console.log('🔧 Inicjalizacja naprawy synchronizacji...');
      await this.railwayClient.connect();
      console.log('✅ Połączono z Railway PostgreSQL');
      console.log('✅ Połączono z lokalną SQLite');
    } catch (error) {
      console.error('❌ Błąd inicjalizacji:', error);
      throw error;
    }
  }

  // Sprawdź czy tabela service_orders istnieje w Railway
  async checkRailwayTables() {
    try {
      const result = await this.railwayClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'service_orders'
      `);
      
      if (result.rows.length === 0) {
        console.log('❌ Tabela service_orders nie istnieje w Railway');
        return false;
      } else {
        console.log('✅ Tabela service_orders istnieje w Railway');
        return true;
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania tabel:', error);
      return false;
    }
  }

  // Utwórz tabelę service_orders w Railway
  async createServiceOrdersTable() {
    try {
      console.log('🔧 Tworzę tabelę service_orders w Railway...');
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS service_orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(255) UNIQUE NOT NULL,
          client_id UUID REFERENCES clients(id),
          device_id UUID REFERENCES devices(id),
          assigned_user_id UUID REFERENCES users(id),
          service_categories TEXT,
          status VARCHAR(50) DEFAULT 'new',
          priority VARCHAR(50) DEFAULT 'medium',
          type VARCHAR(50) DEFAULT 'maintenance',
          title TEXT,
          description TEXT,
          scheduled_date TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          estimated_hours DECIMAL(5,2) DEFAULT 0,
          actual_hours DECIMAL(5,2) DEFAULT 0,
          labor_cost DECIMAL(10,2) DEFAULT 0,
          parts_cost DECIMAL(10,2) DEFAULT 0,
          total_cost DECIMAL(10,2) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actual_start_date TIMESTAMP,
          actual_end_date TIMESTAMP,
          completed_categories TEXT,
          work_photos TEXT,
          completion_notes TEXT
        )
      `;
      
      await this.railwayClient.query(createTableQuery);
      console.log('✅ Tabela service_orders została utworzona w Railway');
    } catch (error) {
      console.error('❌ Błąd tworzenia tabeli:', error);
      throw error;
    }
  }

  // Synchronizuj zlecenia z lokalnej bazy do Railway
  async syncOrdersToRailway() {
    try {
      console.log('📤 Synchronizuję zlecenia z lokalnej bazy do Railway...');
      
      // Pobierz zlecenia z lokalnej bazy
      const localOrders = await this.getLocalOrders();
      console.log(`📋 Znaleziono ${localOrders.length} zleceń w lokalnej bazie`);
      
      for (const order of localOrders) {
        try {
          // Sprawdź czy zlecenie już istnieje w Railway
          const existingOrder = await this.railwayClient.query(
            'SELECT id FROM service_orders WHERE order_number = $1',
            [order.order_number]
          );
          
          if (existingOrder.rows.length > 0) {
            console.log(`⏭️ Zlecenie ${order.order_number} już istnieje w Railway`);
            continue;
          }
          
          // Wstaw zlecenie do Railway
          const insertQuery = `
            INSERT INTO service_orders (
              order_number, client_id, device_id, assigned_user_id,
              service_categories, status, priority, type, title, description,
              scheduled_date, estimated_hours, labor_cost, parts_cost, total_cost,
              notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `;
          
          await this.railwayClient.query(insertQuery, [
            order.order_number,
            order.client_id,
            order.device_id,
            order.assigned_user_id,
            order.service_categories,
            order.status,
            order.priority,
            order.type,
            order.title,
            order.description,
            order.scheduled_date,
            order.estimated_hours,
            order.labor_cost,
            order.parts_cost,
            order.total_cost,
            order.notes,
            order.created_at,
            order.updated_at
          ]);
          
          console.log(`✅ Zsynchronizowano zlecenie: ${order.order_number}`);
        } catch (error) {
          console.error(`❌ Błąd synchronizacji zlecenia ${order.order_number}:`, error.message);
        }
      }
      
      console.log('📤 Synchronizacja zleceń zakończona');
    } catch (error) {
      console.error('❌ Błąd synchronizacji zleceń:', error);
    }
  }

  // Pobierz zlecenia z lokalnej bazy
  getLocalOrders() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          so.*,
          c.first_name || ' ' || c.last_name as client_name,
          d.name as device_name
        FROM service_orders so
        LEFT JOIN clients c ON so.client_id = c.id
        LEFT JOIN devices d ON so.device_id = d.id
        ORDER BY so.created_at DESC
      `;
      
      this.localDb.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Synchronizuj klientów
  async syncClientsToRailway() {
    try {
      console.log('👥 Synchronizuję klientów z lokalnej bazy do Railway...');
      
      const localClients = await this.getLocalClients();
      console.log(`📋 Znaleziono ${localClients.length} klientów w lokalnej bazie`);
      
      for (const client of localClients) {
        try {
          // Sprawdź czy klient już istnieje w Railway
          const existingClient = await this.railwayClient.query(
            'SELECT id FROM clients WHERE contact_person = $1 AND phone = $2',
            [client.contact_person, client.phone]
          );
          
          if (existingClient.rows.length > 0) {
            console.log(`⏭️ Klient ${client.contact_person} już istnieje w Railway`);
            continue;
          }
          
          // Wstaw klienta do Railway
          const insertQuery = `
            INSERT INTO clients (
              company_name, contact_person, phone, email,
              address_street, address_city, address_postal_code, address_country,
              nip, regon, notes, client_type, priority_level,
              payment_terms, discount_percentage, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `;
          
          await this.railwayClient.query(insertQuery, [
            client.company_name,
            client.contact_person,
            client.phone,
            client.email,
            client.address_street,
            client.address_city,
            client.address_postal_code,
            client.address_country,
            client.nip,
            client.regon,
            client.notes,
            client.type || 'individual',
            'standard',
            30,
            0,
            true,
            client.created_at,
            client.updated_at
          ]);
          
          console.log(`✅ Zsynchronizowano klienta: ${client.contact_person}`);
        } catch (error) {
          console.error(`❌ Błąd synchronizacji klienta ${client.contact_person}:`, error.message);
        }
      }
      
      console.log('👥 Synchronizacja klientów zakończona');
    } catch (error) {
      console.error('❌ Błąd synchronizacji klientów:', error);
    }
  }

  // Pobierz klientów z lokalnej bazy
  getLocalClients() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          first_name, last_name, company_name, type,
          email, phone, address, address_street, address_city,
          address_postal_code, address_country, nip, regon,
          contact_person, notes, created_at, updated_at
        FROM clients
        ORDER BY created_at DESC
      `;
      
      this.localDb.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Główna funkcja naprawy
  async fixSync() {
    try {
      await this.init();
      
      // Sprawdź czy tabela service_orders istnieje
      const hasServiceOrders = await this.checkRailwayTables();
      
      if (!hasServiceOrders) {
        await this.createServiceOrdersTable();
      }
      
      // Synchronizuj dane
      await this.syncClientsToRailway();
      await this.syncOrdersToRailway();
      
      console.log('✅ Naprawa synchronizacji zakończona');
      
    } catch (error) {
      console.error('❌ Błąd naprawy synchronizacji:', error);
    } finally {
      await this.railwayClient.end();
      this.localDb.close();
    }
  }
}

// Uruchom naprawę
const fixer = new RailwaySyncFix();
fixer.fixSync().then(() => {
  console.log('🎯 Naprawa zakończona');
  process.exit(0);
}).catch(error => {
  console.error('❌ Naprawa nie powiodła się:', error);
  process.exit(1);
}); 