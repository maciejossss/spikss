require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// PostgreSQL connection (Railway)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQLite connection (local)
const sqliteDbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
console.log(`📂 SQLite database path: ${sqliteDbPath}`);

const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ SQLite connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

async function createTables() {
  console.log('🏗️ Creating PostgreSQL tables...');
  
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      nip VARCHAR(20),
      regon VARCHAR(20),
      address_street VARCHAR(255),
      address_city VARCHAR(100),
      address_postal_code VARCHAR(10),
      address_country VARCHAR(100) DEFAULT 'Polska',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Devices table  
    `CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id),
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100),
      model VARCHAR(100),
      serial_number VARCHAR(255),
      purchase_date DATE,
      warranty_end DATE,
      warranty_status VARCHAR(50),
      device_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Orders table
    `CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      service_number VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      device_id INTEGER REFERENCES devices(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      service_categories TEXT,
      estimated_hours DECIMAL(5,2),
      actual_hours DECIMAL(5,2),
      scheduled_date DATE,
      actual_start_date TIMESTAMP,
      actual_end_date TIMESTAMP,
      completion_notes TEXT,
      work_photos TEXT,
      completed_categories TEXT,
      assigned_to INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Spare Parts table
    `CREATE TABLE IF NOT EXISTS spare_parts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      part_number VARCHAR(100),
      brand VARCHAR(100),
      model_compatibility TEXT,
      category VARCHAR(100),
      price DECIMAL(10,2),
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      supplier VARCHAR(255),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const query of queries) {
    try {
      await pgPool.query(query);
      console.log('✅ Table created successfully');
    } catch (error) {
      console.error('❌ Error creating table:', error.message);
    }
  }
}

async function migrateData() {
  console.log('📦 Starting data migration...');
  
  try {
    // Migrate clients
    await migrateClients();
    
    // Migrate devices
    await migrateDevices();
    
    // Migrate orders
    await migrateOrders();
    
    // Migrate spare parts
    await migrateSpareParts();
    
    console.log('✅ Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function migrateClients() {
  return new Promise((resolve, reject) => {
    console.log('👥 Migrating clients...');
    
    sqliteDb.all('SELECT * FROM clients', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO clients (
              id, name, email, phone, company, nip, regon,
              address_street, address_city, address_postal_code, 
              address_country, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              company = EXCLUDED.company
          `, [
            row.id, row.name, row.email, row.phone, row.company, 
            row.nip, row.regon, row.address_street, row.address_city,
            row.address_postal_code, row.address_country || 'Polska',
            row.is_active !== 0, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating client ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} clients`);
      resolve();
    });
  });
}

async function migrateDevices() {
  return new Promise((resolve, reject) => {
    console.log('💻 Migrating devices...');
    
    sqliteDb.all('SELECT * FROM devices', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO devices (
              id, client_id, name, brand, model, serial_number,
              purchase_date, warranty_end, warranty_status, 
              device_type, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              brand = EXCLUDED.brand,
              model = EXCLUDED.model
          `, [
            row.id, row.client_id, row.name, row.brand, row.model,
            row.serial_number, row.purchase_date, row.warranty_end,
            row.warranty_status, row.device_type, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating device ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} devices`);
      resolve();
    });
  });
}

async function migrateOrders() {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrating orders...');
    
    sqliteDb.all('SELECT * FROM orders', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO orders (
              id, service_number, client_id, device_id, title, description,
              status, priority, service_categories, estimated_hours, actual_hours,
              scheduled_date, actual_start_date, actual_end_date, completion_notes,
              work_photos, completed_categories, assigned_to, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (service_number) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              status = EXCLUDED.status
          `, [
            row.id, row.service_number, row.client_id, row.device_id,
            row.title, row.description, row.status, row.priority,
            row.service_categories, row.estimated_hours, row.actual_hours,
            row.scheduled_date, row.actual_start_date, row.actual_end_date,
            row.completion_notes, row.work_photos, row.completed_categories,
            row.assigned_to, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating order ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} orders`);
      resolve();
    });
  });
}

async function migrateSpareParts() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Migrating spare parts...');
    
    sqliteDb.all('SELECT * FROM spare_parts', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO spare_parts (
              id, name, part_number, brand, model_compatibility, category,
              price, stock_quantity, min_stock_level, supplier, description, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              stock_quantity = EXCLUDED.stock_quantity
          `, [
            row.id, row.name, row.part_number, row.brand, row.model_compatibility,
            row.category, row.price, row.stock_quantity, row.min_stock_level,
            row.supplier, row.description, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating spare part ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} spare parts`);
      resolve();
    });
  });
}

async function addTestTechnician() {
  console.log('👨‍🔧 Adding test technician...');
  
  try {
    await pgPool.query(`
      INSERT INTO users (id, name, email, password, role) 
      VALUES (2, 'Jan Technik', 'jan.technik@serwis.pl', 'haslo123', 'technician')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
    console.log('✅ Test technician added');
  } catch (error) {
    console.error('❌ Error adding test technician:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Starting migration process...');
    
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    
    // Create tables
    await createTables();
    
    // Add test technician
    await addTestTechnician();
    
    // Migrate data
    await migrateData();
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { main }; 