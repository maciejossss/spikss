require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// PostgreSQL connection (Railway)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQLite connection (local) - graceful handling if file doesn't exist
const sqliteDbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
console.log(`📂 SQLite database path: ${sqliteDbPath}`);

let sqliteDb = null;
let sqliteConnected = false;

// Try to connect to SQLite, but don't fail if it doesn't exist
try {
  sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ SQLite connection error:', err.message);
      console.log('⚠️ SQLite not available - will create empty PostgreSQL tables with test data');
      sqliteConnected = false;
    } else {
      console.log('✅ Connected to SQLite database');
      sqliteConnected = true;
    }
  });
} catch (error) {
  console.error('❌ SQLite connection failed:', error.message);
  console.log('⚠️ SQLite not available - will create empty PostgreSQL tables with test data');
  sqliteConnected = false;
}

async function createTables() {
  console.log('🏗️ Creating PostgreSQL tables to match local SQLite structure...');
  
  const queries = [
    // Users table (technicians)
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      role VARCHAR(50) DEFAULT 'technician',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Device categories table
    `CREATE TABLE IF NOT EXISTS device_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Clients table (match local structure)
    `CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      company_name VARCHAR(255),
      type VARCHAR(50) DEFAULT 'individual',
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      address_street VARCHAR(255),
      address_city VARCHAR(100),
      address_postal_code VARCHAR(10),
      address_country VARCHAR(100) DEFAULT 'Polska',
      nip VARCHAR(20),
      regon VARCHAR(20),
      contact_person VARCHAR(255),
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Devices table (match local structure)
    `CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id),
      category_id INTEGER REFERENCES device_categories(id),
      name VARCHAR(255) NOT NULL,
      manufacturer VARCHAR(255),
      model VARCHAR(255),
      serial_number VARCHAR(255),
      production_year INTEGER,
      power_rating VARCHAR(100),
      fuel_type VARCHAR(100),
      installation_date DATE,
      last_service_date DATE,
      next_service_date DATE,
      warranty_end_date DATE,
      technical_data TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Service Orders table (EXACTLY match local structure)
    `CREATE TABLE IF NOT EXISTS service_orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      device_id INTEGER REFERENCES devices(id),
      assigned_user_id INTEGER REFERENCES users(id),
      service_categories TEXT,
      status VARCHAR(50) DEFAULT 'new',
      priority VARCHAR(20) DEFAULT 'medium',
      type VARCHAR(50) DEFAULT 'maintenance',
      title VARCHAR(255),
      description TEXT,
      scheduled_date TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      estimated_hours DECIMAL(5,2) DEFAULT 0,
      actual_hours DECIMAL(5,2) DEFAULT 0,
      labor_cost DECIMAL(10,2) DEFAULT 0,
      parts_cost DECIMAL(10,2) DEFAULT 0,
      total_cost DECIMAL(10,2) DEFAULT 0,
      completed_categories TEXT,
      work_photos TEXT,
      completion_notes TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Spare Parts table (match local structure)
    `CREATE TABLE IF NOT EXISTS spare_parts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      part_number VARCHAR(100),
      manufacturer VARCHAR(255),
      brand VARCHAR(100),
      price DECIMAL(10,2) DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 1,
      description TEXT,
      model_compatibility TEXT,
      device_id INTEGER REFERENCES devices(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Order Parts table
    `CREATE TABLE IF NOT EXISTS order_parts (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES service_orders(id),
      part_id INTEGER REFERENCES spare_parts(id),
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      total_price DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Invoices table
    `CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      order_id INTEGER REFERENCES service_orders(id),
      issue_date DATE,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'draft',
      net_amount DECIMAL(10,2) DEFAULT 0,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      gross_amount DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(100),
      paid_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Invoice Items table
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id),
      description VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2) DEFAULT 1,
      unit_price DECIMAL(10,2) DEFAULT 0,
      net_amount DECIMAL(10,2) DEFAULT 0,
      tax_rate DECIMAL(5,2) DEFAULT 23,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      gross_amount DECIMAL(10,2) DEFAULT 0
    )`,
    
    // Calendar Events table
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP,
      type VARCHAR(50) DEFAULT 'appointment',
      related_id INTEGER,
      client_id INTEGER REFERENCES clients(id),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Device Files table
    `CREATE TABLE IF NOT EXISTS device_files (
      id SERIAL PRIMARY KEY,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100) NOT NULL,
      file_category VARCHAR(100) DEFAULT 'other',
      file_size INTEGER DEFAULT 0,
      mime_type VARCHAR(100),
      title VARCHAR(255),
      description TEXT,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_service_orders_assigned_user ON service_orders(assigned_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_device_files_device ON device_files(device_id)'
  ];
  
  for (const index of indexes) {
    try {
      await pgPool.query(index);
      console.log('✅ Index created successfully');
    } catch (error) {
      console.error('❌ Error creating index:', error.message);
    }
  }
}

async function migrateData() {
  console.log('📦 Starting data migration from SQLite to PostgreSQL...');
  
  try {
    // Migrate in order due to foreign key constraints
    await migrateUsers();
    await migrateDeviceCategories();
    await migrateClients();
    await migrateDevices();
    await migrateServiceOrders();
    await migrateSpareParts();
    await migrateOrderParts();
    await migrateInvoices();
    await migrateInvoiceItems();
    await migrateCalendarEvents();
    await migrateDeviceFiles();
    
    console.log('✅ Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function migrateUsers() {
  return new Promise((resolve, reject) => {
    console.log('👥 Migrating users...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, creating test technician in PostgreSQL');
      (async () => {
        try {
          await pgPool.query(`
            INSERT INTO users (id, username, password_hash, full_name, email, role, is_active) 
            VALUES (2, 'jan.technik', '$2a$10$X8VcQUzK5v7QdD1CrO3A8uF8qW4nH2mT9jKpL6xR7sE9A1B3C4D5E6', 'Jan Technik', 'jan.technik@serwis.pl', 'technician', true)
            ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
          `);
          console.log('✅ Created test technician in PostgreSQL');
        } catch (error) {
          console.error('❌ Error creating test technician in PostgreSQL:', error.message);
        }
        resolve();
      })();
      return;
    }

    sqliteDb.all('SELECT * FROM users', async (err, rows) => {
      if (err) {
        console.log('⚠️ Users table does not exist in SQLite, creating test technician in PostgreSQL');
        // Create test technician if table doesn't exist
        try {
          await pgPool.query(`
            INSERT INTO users (id, username, password_hash, full_name, email, role, is_active) 
            VALUES (2, 'jan.technik', '$2a$10$X8VcQUzK5v7QdD1CrO3A8uF8qW4nH2mT9jKpL6xR7sE9A1B3C4D5E6', 'Jan Technik', 'jan.technik@serwis.pl', 'technician', true)
            ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
          `);
          console.log('✅ Created test technician in PostgreSQL');
        } catch (error) {
          console.error('❌ Error creating test technician in PostgreSQL:', error.message);
        }
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO users (
              id, username, password_hash, full_name, email, role, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (username) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              role = EXCLUDED.role,
              is_active = EXCLUDED.is_active
          `, [
            row.id, row.username, row.password_hash, row.full_name, 
            row.email, row.role, row.is_active !== 0, 
            row.created_at, row.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating user ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} users`);
      resolve();
    });
  });
}

async function migrateDeviceCategories() {
  return new Promise((resolve, reject) => {
    console.log('📦 Migrating device categories...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping device categories migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM device_categories', async (err, rows) => {
      if (err) {
        console.log('⚠️ Device categories table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO device_categories (
              id, name, description, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active
          `, [
            row.id, row.name, row.description, 
            row.is_active !== 0, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating device category ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} device categories`);
      resolve();
    });
  });
}

async function migrateClients() {
  return new Promise((resolve, reject) => {
    console.log('👥 Migrating clients...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping clients migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM clients', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO clients (
              id, first_name, last_name, company_name, type, email, phone, address,
              address_street, address_city, address_postal_code, address_country, 
              nip, regon, contact_person, notes, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              company_name = EXCLUDED.company_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone
          `, [
            row.id, row.first_name, row.last_name, row.company_name, row.type,
            row.email, row.phone, row.address, row.address_street, row.address_city,
            row.address_postal_code, row.address_country || 'Polska',
            row.nip, row.regon, row.contact_person, row.notes, 
            row.is_active !== 0, row.created_at, row.updated_at
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
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping devices migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM devices', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO devices (
              id, client_id, category_id, name, manufacturer, model, serial_number,
              production_year, power_rating, fuel_type, installation_date, 
              last_service_date, next_service_date, warranty_end_date,
              technical_data, notes, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              manufacturer = EXCLUDED.manufacturer,
              model = EXCLUDED.model
          `, [
            row.id, row.client_id, row.category_id, row.name, row.manufacturer,
            row.model, row.serial_number, row.production_year, row.power_rating,
            row.fuel_type, row.installation_date, row.last_service_date,
            row.next_service_date, row.warranty_end_date, row.technical_data,
            row.notes, row.is_active !== 0, row.created_at, row.updated_at
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

async function migrateServiceOrders() {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrating service orders...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping service orders migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM service_orders', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO service_orders (
              id, order_number, client_id, device_id, assigned_user_id, service_categories,
              status, priority, type, title, description, scheduled_date, started_at,
              completed_at, estimated_hours, actual_hours, labor_cost, parts_cost,
              total_cost, completed_categories, work_photos, completion_notes,
              notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            ON CONFLICT (order_number) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              assigned_user_id = EXCLUDED.assigned_user_id
          `, [
            row.id, row.order_number, row.client_id, row.device_id, row.assigned_user_id,
            row.service_categories, row.status, row.priority, row.type, row.title,
            row.description, row.scheduled_date, row.started_at, row.completed_at,
            row.estimated_hours, row.actual_hours, row.labor_cost, row.parts_cost,
            row.total_cost, row.completed_categories, row.work_photos, row.completion_notes,
            row.notes, row.created_at, row.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating service order ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} service orders`);
      resolve();
    });
  });
}

async function migrateSpareParts() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Migrating spare parts...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping spare parts migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM spare_parts', async (err, rows) => {
      if (err) {
        console.log('⚠️ Spare parts table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO spare_parts (
              id, name, category, part_number, manufacturer, brand, price,
              stock_quantity, min_stock_level, description, model_compatibility,
              device_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              stock_quantity = EXCLUDED.stock_quantity
          `, [
            row.id, row.name, row.category, row.part_number, row.manufacturer,
            row.brand, row.price, row.stock_quantity, row.min_stock_level,
            row.description, row.model_compatibility, row.device_id,
            row.created_at, row.updated_at
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

async function migrateOrderParts() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Migrating order parts...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping order parts migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM order_parts', async (err, rows) => {
      if (err) {
        console.log('⚠️ Order parts table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO order_parts (
              id, order_id, part_id, quantity, unit_price, total_price, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              total_price = EXCLUDED.total_price
          `, [
            row.id, row.order_id, row.part_id, row.quantity,
            row.unit_price, row.total_price, row.created_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating order part ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} order parts`);
      resolve();
    });
  });
}

async function migrateInvoices() {
  return new Promise((resolve, reject) => {
    console.log('🧾 Migrating invoices...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping invoices migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM invoices', async (err, rows) => {
      if (err) {
        console.log('⚠️ Invoices table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO invoices (
              id, invoice_number, client_id, order_id, issue_date, due_date,
              status, net_amount, tax_amount, gross_amount, payment_method,
              paid_date, notes, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (invoice_number) DO UPDATE SET
              status = EXCLUDED.status,
              paid_date = EXCLUDED.paid_date
          `, [
            row.id, row.invoice_number, row.client_id, row.order_id,
            row.issue_date, row.due_date, row.status, row.net_amount,
            row.tax_amount, row.gross_amount, row.payment_method,
            row.paid_date, row.notes, row.created_at, row.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating invoice ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} invoices`);
      resolve();
    });
  });
}

async function migrateInvoiceItems() {
  return new Promise((resolve, reject) => {
    console.log('📑 Migrating invoice items...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping invoice items migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM invoice_items', async (err, rows) => {
      if (err) {
        console.log('⚠️ Invoice items table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO invoice_items (
              id, invoice_id, description, quantity, unit_price, net_amount,
              tax_rate, tax_amount, gross_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              description = EXCLUDED.description,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price
          `, [
            row.id, row.invoice_id, row.description, row.quantity,
            row.unit_price, row.net_amount, row.tax_rate,
            row.tax_amount, row.gross_amount
          ]);
        } catch (error) {
          console.error(`❌ Error migrating invoice item ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} invoice items`);
      resolve();
    });
  });
}

async function migrateCalendarEvents() {
  return new Promise((resolve, reject) => {
    console.log('📅 Migrating calendar events...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping calendar events migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM calendar_events', async (err, rows) => {
      if (err) {
        console.log('⚠️ Calendar events table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO calendar_events (
              id, title, description, start_date, end_date, type,
              related_id, client_id, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              start_date = EXCLUDED.start_date
          `, [
            row.id, row.title, row.description, row.start_date,
            row.end_date, row.type, row.related_id, row.client_id,
            row.status, row.created_at, row.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating calendar event ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} calendar events`);
      resolve();
    });
  });
}

async function migrateDeviceFiles() {
  return new Promise((resolve, reject) => {
    console.log('📎 Migrating device files...');
    
    if (!sqliteConnected) {
      console.log('⚠️ SQLite not available, skipping device files migration in PostgreSQL');
      resolve();
      return;
    }

    sqliteDb.all('SELECT * FROM device_files', async (err, rows) => {
      if (err) {
        console.log('⚠️ Device files table does not exist in SQLite, skipping');
        resolve();
        return;
      }
      
      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO device_files (
              id, device_id, file_name, file_path, file_type, file_category,
              file_size, mime_type, title, description, is_primary,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              file_name = EXCLUDED.file_name,
              file_path = EXCLUDED.file_path,
              title = EXCLUDED.title
          `, [
            row.id, row.device_id, row.file_name, row.file_path,
            row.file_type, row.file_category, row.file_size,
            row.mime_type, row.title, row.description,
            row.is_primary !== 0, row.created_at, row.updated_at
          ]);
        } catch (error) {
          console.error(`❌ Error migrating device file ${row.id}:`, error.message);
        }
      }
      
      console.log(`✅ Migrated ${rows.length} device files`);
      resolve();
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting migration process...');
    
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');
    
    // Create tables with proper structure
    await createTables();
    
    // Migrate data from SQLite
    await migrateData();
    
    console.log('🎉 Migration completed successfully!');
    console.log('📱 Mobile app can now connect to Railway PostgreSQL!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
    await pgPool.end();
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { main }; 