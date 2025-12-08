require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// PostgreSQL connection (Railway)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Check if we're on Railway (production environment)
const isRailway = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;
// Domyślnie WYŁĄCZ seeding testowy na Railway (włączenie tylko jawnie ENV=RAILWAY_SEED_TEST=true).
const seedTest = (process.env.RAILWAY_SEED_TEST === 'true');

// SQLite connection (local) - only if not on Railway
let sqliteDb = null;
if (!isRailway) {
  const sqliteDbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
  console.log(`📂 SQLite database path: ${sqliteDbPath}`);

  sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ SQLite connection error:', err.message);
    } else {
      console.log('✅ Connected to SQLite database');
    }
  });
} else {
  console.log('🚂 Running on Railway - skipping SQLite connection');
}

async function createTables() {
  console.log('🏗️ Creating PostgreSQL tables to match local SQLite structure...');
  
  const queries = [
    // Users table (technicians)
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      external_id INTEGER,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      mobile_pin_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'technician',
      mobile_authorized BOOLEAN DEFAULT true,
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
      external_id VARCHAR(255) UNIQUE,
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
      external_id VARCHAR(255) UNIQUE,
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
      brand VARCHAR(255),
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
      title VARCHAR(255) NOT NULL,
      description TEXT,
      scheduled_date DATE,
      scheduled_time VARCHAR(8),
      estimated_hours DECIMAL(5,2),
      parts_cost DECIMAL(10,2) DEFAULT 0,
      labor_cost DECIMAL(10,2) DEFAULT 0,
      total_cost DECIMAL(10,2) DEFAULT 0,
      travel_cost DECIMAL(10,2) DEFAULT 0,
      estimated_cost_note TEXT,
      notes TEXT,
      actual_start_date TIMESTAMP,
      actual_end_date TIMESTAMP,
      completed_categories TEXT,
      work_photos TEXT,
      completion_notes TEXT,
      actual_hours DECIMAL(5,2),
      rejected_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Service categories table (mirror of SQLite)
    `CREATE TABLE IF NOT EXISTS service_categories (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Part categories table
    `CREATE TABLE IF NOT EXISTS part_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      parent_id INTEGER REFERENCES part_categories(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Spare Parts table
    `CREATE TABLE IF NOT EXISTS spare_parts (
      id SERIAL PRIMARY KEY,
      magazine_code VARCHAR(100) UNIQUE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      part_number VARCHAR(100),
      manufacturer VARCHAR(255),
      manufacturer_code VARCHAR(100),
      brand VARCHAR(255),
      assembly_group VARCHAR(100),
      barcode VARCHAR(100),
      net_price DECIMAL(12,2) DEFAULT 0,
      gross_price DECIMAL(12,2) DEFAULT 0,
      vat_rate DECIMAL(6,2) DEFAULT 23,
      currency VARCHAR(10) DEFAULT 'PLN',
      unit_price DECIMAL(10,2),
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      weight DECIMAL(12,4) DEFAULT 0,
      unit VARCHAR(32),
      package_size VARCHAR(64),
      description TEXT,
      model_compatibility TEXT,
      location VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      supplier VARCHAR(255),
      supplier_part_number VARCHAR(255),
      lead_time_days INTEGER DEFAULT 0,
      last_order_date DATE,
      notes TEXT,
      supplier_id INTEGER,
      synced_at TIMESTAMP,
      updated_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Order Parts table (junction table)
    `CREATE TABLE IF NOT EXISTS order_parts (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
      part_id INTEGER REFERENCES spare_parts(id),
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2),
      total_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS service_protocols (
      id SERIAL PRIMARY KEY,
      external_id INTEGER UNIQUE,
      order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
      technician_id INTEGER REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      device_id INTEGER REFERENCES devices(id),
      template_name TEXT,
      template_version INTEGER DEFAULT 1,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      remote_url TEXT,
      service_company_snapshot JSONB,
      client_snapshot JSONB,
      device_snapshot JSONB,
      technician_snapshot JSONB,
      checks_snapshot JSONB,
      steps_snapshot JSONB,
      parts_snapshot JSONB,
      summary_text TEXT,
      notes TEXT,
      acceptance_clause TEXT,
      pdf_filename TEXT,
      pdf_storage_path TEXT,
      pdf_uploaded BOOLEAN DEFAULT false
    )`,

    // Invoices table
    `CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      order_id INTEGER REFERENCES service_orders(id),
      client_id INTEGER REFERENCES clients(id),
      issue_date DATE NOT NULL,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'draft',
      subtotal DECIMAL(10,2) DEFAULT 0,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Invoice Items table
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      description VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Calendar Events table
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP,
      event_type VARCHAR(50),
      order_id INTEGER REFERENCES service_orders(id),
      user_id INTEGER REFERENCES users(id),
      is_all_day BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Device Files table
    `CREATE TABLE IF NOT EXISTS device_files (
      id SERIAL PRIMARY KEY,
      device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )`,

    // Work Sessions (for accurate labor time) — additive, safe
    `CREATE TABLE IF NOT EXISTS work_sessions (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
      technician_id INTEGER REFERENCES users(id),
      start_at TIMESTAMP NOT NULL,
      end_at TIMESTAMP,
      reason VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Pending data changes awaiting desktop approval
    `CREATE TABLE IF NOT EXISTS pending_changes (
      id SERIAL PRIMARY KEY,
      entity VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      payload JSONB NOT NULL,
      fields TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      proposed_by INTEGER,
      decided_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      decided_at TIMESTAMP
    )`
  ];

  try {
    for (const query of queries) {
      await pgPool.query(query);
    }
    console.log('✅ All tables created successfully');

    // Ensure service_categories structure & indexes (idempotent)
    try {
      const { rows } = await pgPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'service_categories'
      `);
      const existing = new Set(rows.map(r => r.column_name));
      if (!existing.has('description')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN description TEXT');
        console.log('✅ Added description column to service_categories');
      }
      if (!existing.has('sort_order')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN sort_order INTEGER DEFAULT 0');
        console.log('✅ Added sort_order column to service_categories');
      }
      if (!existing.has('is_active')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN is_active BOOLEAN DEFAULT true');
        console.log('✅ Added is_active column to service_categories');
      }
      if (!existing.has('parent_id')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN parent_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL');
        console.log('✅ Added parent_id column to service_categories');
      }
      if (!existing.has('created_at')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added created_at column to service_categories');
      }
      if (!existing.has('updated_at')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added updated_at column to service_categories');
      }
      if (!existing.has('code')) {
        await pgPool.query('ALTER TABLE service_categories ADD COLUMN code VARCHAR(50) UNIQUE');
        console.log('✅ Added code column to service_categories');
      }
    } catch (err) {
      console.error('❌ Error ensuring service_categories columns:', err.message);
    }
    try {
      await pgPool.query('CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON service_categories(parent_id)');
      await pgPool.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_service_categories_code ON service_categories(code)');
      console.log('✅ Ensured service_categories indexes');
    } catch (err) {
      console.error('❌ Error ensuring service_categories indexes:', err.message);
    }

    // Ensure part_categories structure & indexes
    try {
      const { rows } = await pgPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'part_categories'
      `);
      const existing = new Set(rows.map(r => r.column_name));
      if (!existing.has('description')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN description TEXT');
        console.log('✅ Added description column to part_categories');
      }
      if (!existing.has('sort_order')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN sort_order INTEGER DEFAULT 0');
        console.log('✅ Added sort_order column to part_categories');
      }
      if (!existing.has('is_active')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN is_active BOOLEAN DEFAULT true');
        console.log('✅ Added is_active column to part_categories');
      }
      if (!existing.has('parent_id')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN parent_id INTEGER REFERENCES part_categories(id)');
        console.log('✅ Added parent_id column to part_categories');
      }
      if (!existing.has('created_at')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added created_at column to part_categories');
      }
      if (!existing.has('updated_at')) {
        await pgPool.query('ALTER TABLE part_categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('✅ Added updated_at column to part_categories');
      }
    } catch (err) {
      console.error('❌ Error ensuring part_categories columns:', err.message);
    }
    try {
      await pgPool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'part_categories_name_key'
              AND conrelid = 'part_categories'::regclass
          ) THEN
            ALTER TABLE part_categories DROP CONSTRAINT part_categories_name_key;
          END IF;
        END
        $$;
      `);
      console.log('✅ Dropped legacy part_categories_name_key constraint (if existed)');
    } catch (err) {
      console.error('❌ Error dropping legacy part_categories constraint:', err.message);
    }
    try {
      await pgPool.query('CREATE INDEX IF NOT EXISTS idx_part_categories_parent ON part_categories(parent_id)');
      await pgPool.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_part_categories_root_name ON part_categories(name) WHERE parent_id IS NULL');
      await pgPool.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_part_categories_parent_name ON part_categories(parent_id, name) WHERE parent_id IS NOT NULL');
      console.log('✅ Ensured part_categories indexes');
    } catch (err) {
      console.error('❌ Error ensuring part_categories indexes:', err.message);
    }
    
    try {
      const cols = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'spare_parts'
      `);
      const have = new Set((cols.rows || []).map(r => r.column_name));
      const addColumn = async (sql) => {
        try { await pgPool.query(sql); } catch (_) {}
      };
      if (!have.has('magazine_code')) await addColumn('ALTER TABLE spare_parts ADD COLUMN magazine_code VARCHAR(100)');
      if (!have.has('manufacturer_code')) await addColumn('ALTER TABLE spare_parts ADD COLUMN manufacturer_code VARCHAR(100)');
      if (!have.has('assembly_group')) await addColumn('ALTER TABLE spare_parts ADD COLUMN assembly_group VARCHAR(100)');
      if (!have.has('barcode')) await addColumn('ALTER TABLE spare_parts ADD COLUMN barcode VARCHAR(100)');
      if (!have.has('net_price')) await addColumn('ALTER TABLE spare_parts ADD COLUMN net_price DECIMAL(12,2) DEFAULT 0');
      if (!have.has('gross_price')) await addColumn('ALTER TABLE spare_parts ADD COLUMN gross_price DECIMAL(12,2) DEFAULT 0');
      if (!have.has('vat_rate')) await addColumn('ALTER TABLE spare_parts ADD COLUMN vat_rate DECIMAL(6,2) DEFAULT 23');
      if (!have.has('currency')) await addColumn(`ALTER TABLE spare_parts ADD COLUMN currency VARCHAR(10) DEFAULT 'PLN'`);
      if (!have.has('weight')) await addColumn('ALTER TABLE spare_parts ADD COLUMN weight DECIMAL(12,4) DEFAULT 0');
      if (!have.has('unit')) await addColumn('ALTER TABLE spare_parts ADD COLUMN unit VARCHAR(32)');
      if (!have.has('package_size')) await addColumn('ALTER TABLE spare_parts ADD COLUMN package_size VARCHAR(64)');
      if (!have.has('supplier_part_number')) await addColumn('ALTER TABLE spare_parts ADD COLUMN supplier_part_number VARCHAR(255)');
      if (!have.has('lead_time_days')) await addColumn('ALTER TABLE spare_parts ADD COLUMN lead_time_days INTEGER DEFAULT 0');
      if (!have.has('last_order_date')) await addColumn('ALTER TABLE spare_parts ADD COLUMN last_order_date DATE');
      if (!have.has('notes')) await addColumn('ALTER TABLE spare_parts ADD COLUMN notes TEXT');
      if (!have.has('supplier')) await addColumn('ALTER TABLE spare_parts ADD COLUMN supplier VARCHAR(255)');
      if (!have.has('supplier_id')) await addColumn('ALTER TABLE spare_parts ADD COLUMN supplier_id INTEGER');
      if (!have.has('synced_at')) await addColumn('ALTER TABLE spare_parts ADD COLUMN synced_at TIMESTAMP');
      if (!have.has('updated_by')) await addColumn('ALTER TABLE spare_parts ADD COLUMN updated_by VARCHAR(255)');
    } catch (err) {
      console.error('❌ Error ensuring spare_parts columns:', err.message);
    }

    try {
      await pgPool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_spare_parts_mag_code ON spare_parts(magazine_code) WHERE magazine_code IS NOT NULL AND TRIM(magazine_code) <> ''`);
    } catch (err) {
      console.error('❌ Error creating idx_spare_parts_mag_code:', err.message);
    }
    try {
      await pgPool.query('CREATE INDEX IF NOT EXISTS idx_spare_parts_barcode ON spare_parts(barcode)');
    } catch (err) {
      console.error('❌ Error creating idx_spare_parts_barcode:', err.message);
    }
    try {
      await pgPool.query('CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON spare_parts(part_number)');
    } catch (err) {
      console.error('❌ Error creating idx_spare_parts_part_number:', err.message);
    }
    try {
      await pgPool.query(`
        UPDATE spare_parts 
        SET gross_price = CASE 
          WHEN gross_price IS NULL OR gross_price = 0 THEN COALESCE(unit_price, 0) 
          ELSE gross_price 
        END,
        net_price = CASE 
          WHEN net_price IS NULL OR net_price = 0 THEN 
            ROUND(CASE 
              WHEN COALESCE(vat_rate, 0) = 0 THEN COALESCE(unit_price, gross_price) 
              ELSE COALESCE(gross_price, unit_price) / (1 + (COALESCE(vat_rate, 0) / 100.0)) 
            END, 2)
          ELSE net_price
        END,
        vat_rate = COALESCE(vat_rate, 23),
        currency = COALESCE(currency, 'PLN')
      `);
    } catch (err) {
      console.error('❌ Error backfilling spare_parts pricing columns:', err.message);
    }
    
    // Add missing columns to users table if they don't exist (idempotent)
    try {
      const cols = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const have = new Set(cols.rows.map(r => r.column_name));
      if (!have.has('external_id')) {
        await pgPool.query('ALTER TABLE users ADD COLUMN external_id INTEGER');
        console.log('✅ Added external_id column to users');
      }
      if (!have.has('phone')) {
        await pgPool.query('ALTER TABLE users ADD COLUMN phone VARCHAR(50)');
        console.log('✅ Added phone column to users');
      }
      if (!have.has('mobile_pin_hash')) {
        await pgPool.query('ALTER TABLE users ADD COLUMN mobile_pin_hash VARCHAR(255)');
        console.log('✅ Added mobile_pin_hash column to users');
      }
      if (!have.has('mobile_authorized')) {
        await pgPool.query('ALTER TABLE users ADD COLUMN mobile_authorized BOOLEAN DEFAULT true');
        console.log('✅ Added mobile_authorized column to users');
      }
    } catch (err) {
      console.error('❌ Error ensuring users extra columns:', err.message);
    }

    // Add brand column to existing devices table if it doesn't exist
    try {
      // First check if the column exists
      const checkResult = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'brand'
      `);
      
      if (checkResult.rows.length === 0) {
        // Column doesn't exist, add it
        await pgPool.query('ALTER TABLE devices ADD COLUMN brand VARCHAR(255)');
        console.log('✅ Added brand column to existing devices table');
      } else {
        console.log('ℹ️ Brand column already exists in devices table');
      }
    } catch (error) {
      console.error('❌ Error checking/adding brand column:', error.message);
      // Try alternative approach
      try {
        await pgPool.query('ALTER TABLE devices ADD COLUMN brand VARCHAR(255)');
        console.log('✅ Added brand column using alternative method');
      } catch (altError) {
        if (altError.code === '42701') { // column already exists
          console.log('ℹ️ Brand column already exists in devices table (alternative check)');
        } else {
          console.error('❌ Error adding brand column (alternative):', altError.message);
        }
      }
    }

    // Ensure service_orders has column estimated_cost_note (idempotent)
    try {
      const cols = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'service_orders'
      `)
      const have = new Set((cols.rows || []).map(r => r.column_name))
      // Add estimated_cost_note when missing
      if (!have.has('estimated_cost_note')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN estimated_cost_note TEXT')
        console.log('✅ Added estimated_cost_note column to service_orders table')
      } else {
        console.log('ℹ️ estimated_cost_note column already exists in service_orders')
      }
      // Add external_id used for safe upserts from desktop (idempotent)
      if (!have.has('external_id')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN external_id INTEGER')
        console.log('✅ Added external_id column to service_orders table')
        try {
          await pgPool.query('CREATE INDEX IF NOT EXISTS idx_service_orders_external_id ON service_orders(external_id)')
          console.log('✅ Created idx_service_orders_external_id')
        } catch (e) {
          console.log('ℹ️ Index idx_service_orders_external_id exists or cannot be created:', e.message)
        }
      } else {
        console.log('ℹ️ external_id column already exists in service_orders')
      }
      // Add scheduled_time column (for mobile compatibility)
      if (!have.has('scheduled_time')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN scheduled_time VARCHAR(8)')
        console.log('✅ Added scheduled_time column to service_orders table')
      } else {
        console.log('ℹ️ scheduled_time column already exists in service_orders')
      }
      // Add started_at and completed_at columns (for mobile workflow)
      if (!have.has('started_at')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN started_at TIMESTAMP')
        console.log('✅ Added started_at column to service_orders table')
      } else {
        console.log('ℹ️ started_at column already exists in service_orders')
      }
      if (!have.has('completed_at')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN completed_at TIMESTAMP')
        console.log('✅ Added completed_at column to service_orders table')
      } else {
        console.log('ℹ️ completed_at column already exists in service_orders')
      }
      // Add parts_used column (for mobile completion)
      if (!have.has('parts_used')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN parts_used TEXT')
        console.log('✅ Added parts_used column to service_orders table')
      } else {
        console.log('ℹ️ parts_used column already exists in service_orders')
      }
      // Add travel_cost column for desktop costs
      if (!have.has('travel_cost')) {
        await pgPool.query('ALTER TABLE service_orders ADD COLUMN travel_cost DECIMAL(10,2) DEFAULT 0')
        console.log('✅ Added travel_cost column to service_orders table')
      } else {
        console.log('ℹ️ travel_cost column already exists in service_orders')
      }
    } catch (err) {
      console.error('❌ Error ensuring estimated_cost_note column:', err.message)
    }

    // Ensure clients table has external_id column/index
    try {
      const cols = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clients'
      `)
      const have = new Set((cols.rows || []).map(r => r.column_name))
      if (!have.has('external_id')) {
        await pgPool.query('ALTER TABLE clients ADD COLUMN external_id VARCHAR(255)')
        console.log('✅ Added external_id column to clients table')
      } else {
        console.log('ℹ️ external_id column already exists in clients table')
      }
      try {
        await pgPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id)')
        console.log('✅ Ensured idx_clients_external_id')
      } catch (e) {
        console.log('ℹ️ idx_clients_external_id exists or cannot be created:', e.message)
      }
    } catch (err) {
      console.error('❌ Error ensuring clients.external_id column:', err.message)
    }

    // Ensure devices table has external_id column/index
    try {
      const cols = await pgPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices'
      `)
      const have = new Set((cols.rows || []).map(r => r.column_name))
      if (!have.has('external_id')) {
        await pgPool.query('ALTER TABLE devices ADD COLUMN external_id VARCHAR(255)')
        console.log('✅ Added external_id column to devices table')
      } else {
        console.log('ℹ️ external_id column already exists in devices table')
      }
      try {
        await pgPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_external_id ON devices(external_id)')
        console.log('✅ Ensured idx_devices_external_id')
      } catch (e) {
        console.log('ℹ️ idx_devices_external_id exists or cannot be created:', e.message)
      }
    } catch (err) {
      console.error('❌ Error ensuring devices.external_id column:', err.message)
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
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
    await migrateServiceProtocols();
    await migrateInvoices();
    await migrateInvoiceItems();
    await migrateCalendarEvents();
    await migrateDeviceFiles();
    await migrateCompanyProfile(); // Add this line
    
    console.log('✅ Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function migrateUsers() {
  console.log('👥 Migrating users...');
  
  if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', async (err, rows) => {
        if (err) {
          console.log('⚠️ Users table does not exist in SQLite, creating test technician');
          // Create test technician if table doesn't exist
          try {
            await pgPool.query(`
              INSERT INTO users (id, username, password_hash, full_name, email, role, is_active) 
              VALUES (2, 'jan.technik', '$2a$10$X8VcQUzK5v7QdD1CrO3A8uF8qW4nH2mT9jKpL6xR7sE9A1B3C4D5E6', 'Jan Technik', 'jan.technik@serwis.pl', 'technician', true)
              ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
            `);
            console.log('✅ Created test technician');
          } catch (error) {
            console.error('❌ Error creating test technician:', error.message);
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
  } else {
    if (!seedTest) {
      console.log('🚂 Running on Railway - skipping creation of test data (RAILWAY_SEED_TEST != true)');
      return;
    }
    console.log('🚂 Running on Railway - creating test data');
    try {
      // Create test technician
      await pgPool.query(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, is_active) 
        VALUES (2, 'jan.technik', '$2a$10$X8VcQUzK5v7QdD1CrO3A8uF8qW4nH2mT9jKpL6xR7sE9A1B3C4D5E6', 'Jan Technik', 'jan.technik@serwis.pl', 'technician', true)
        ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
      `);
      console.log('✅ Created test technician on Railway');
      
      // Create test client (use DO NOTHING to avoid invalid EXCLUDED columns)
      await pgPool.query(`
        INSERT INTO clients (id, first_name, last_name, company_name, type, email, phone, address, is_active) 
        VALUES (1, 'Jan', 'Kowalski', 'Kowalski Sp. z o.o.', 'business', 'jan.kowalski@example.com', '+48 123 456 789', 'ul. Główna 15, 00-001 Warszawa', true)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Created test client on Railway (id=1)');
      
      // Create test device
      await pgPool.query(`
        INSERT INTO devices (id, client_id, name, manufacturer, model, brand, is_active) 
        VALUES (1, 1, 'Kocioł gazowy', 'Vaillant', 'EcoTEC Plus', 'Vaillant', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `);
      console.log('✅ Created test device on Railway');
      
      // Create test order
      await pgPool.query(`
        INSERT INTO service_orders (id, order_number, client_id, device_id, assigned_user_id, title, description, status, priority, scheduled_date) 
        VALUES (1, 'SO-2025-001', 1, 1, 2, 'Przegląd kotła', 'Rutynowy przegląd kotła gazowego', 'new', 'medium', '2025-08-05')
        ON CONFLICT (order_number) DO UPDATE SET title = EXCLUDED.title
      `);
      console.log('✅ Created test order on Railway');
      
    } catch (error) {
      console.error('❌ Error creating test data on Railway:', error.message);
    }
  }
}

async function migrateDeviceCategories() {
  return new Promise((resolve, reject) => {
    console.log('📦 Migrating device categories...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM device_categories', async (err, rows) => {
        if (err) {
          console.log('⚠️ Device categories table does not exist, skipping');
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
    } else {
      console.log('🚂 Running on Railway - skipping device category migration');
      resolve();
    }
  });
}

async function migrateCompanyProfile() {
  try {
    console.log('🏢 Migrating company profile...')
    await pgPool.query(`CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT,
      nip TEXT,
      regon TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      location_lat REAL,
      location_lng REAL,
      logo_base64 TEXT,
      logo_mime TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`)
    await pgPool.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo_base64 TEXT').catch(() => {})
    await pgPool.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo_mime TEXT').catch(() => {})
    await pgPool.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS location_lat REAL').catch(() => {})
    await pgPool.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS location_lng REAL').catch(() => {})

    if (!sqliteDb) {
      console.log('🚂 Railway environment – no local company settings to migrate')
      return
    }

    const row = await new Promise((resolve) => {
      const handleResult = (err, res) => {
        if (err) {
          resolve(null)
          return
        }
        resolve(res || null)
      }

      sqliteDb.get(
        'SELECT name, nip, regon, address, email, phone, website, location_lat, location_lng, logo_base64, logo_mime FROM company LIMIT 1',
        (err, res) => {
          if (err && /no such column/i.test(err.message || '')) {
            sqliteDb.get(
              `SELECT name, nip, regon, address, email, phone, website,
                      NULL AS location_lat,
                      NULL AS location_lng,
                      NULL AS logo_base64,
                      NULL AS logo_mime
               FROM company LIMIT 1`,
              handleResult
            )
            return
          }
          handleResult(err, res)
        }
      )
    })

    if (row) {
      const toNumberOrNull = (value) => {
        if (value == null) return null
        if (typeof value === 'string') {
          const normalized = value.replace(',', '.').trim()
          if (!normalized.length) return null
          const num = Number(normalized)
          return Number.isFinite(num) ? num : null
        }
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      }

      await pgPool.query(
        `INSERT INTO company_profile (id, name, nip, regon, address, email, phone, website, location_lat, location_lng, logo_base64, logo_mime)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           nip = EXCLUDED.nip,
           regon = EXCLUDED.regon,
           address = EXCLUDED.address,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           website = EXCLUDED.website,
           location_lat = EXCLUDED.location_lat,
           location_lng = EXCLUDED.location_lng,
           logo_base64 = EXCLUDED.logo_base64,
           logo_mime = EXCLUDED.logo_mime,
           updated_at = CURRENT_TIMESTAMP`,
        [
          row.name || null,
          row.nip || null,
          row.regon || null,
          row.address || null,
          row.email || null,
          row.phone || null,
          row.website || null,
          toNumberOrNull(row.location_lat),
          toNumberOrNull(row.location_lng),
          row.logo_base64 || null,
          row.logo_mime || null
        ]
      )
      console.log('✅ Migrated company profile from SQLite')
    } else {
      console.log('ℹ️ No company profile found in SQLite, skipping')
    }
  } catch (error) {
    console.error('❌ Error migrating company profile:', error.message)
  }
}

async function migrateClients() {
  return new Promise((resolve, reject) => {
    console.log('👥 Migrating clients...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM clients', async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO clients (
                id, external_id, first_name, last_name, company_name, type, email, phone, address,
                address_street, address_city, address_postal_code, address_country, 
                nip, regon, contact_person, notes, is_active, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
              ON CONFLICT (id) DO UPDATE SET
                external_id = COALESCE(EXCLUDED.external_id, clients.external_id),
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                company_name = EXCLUDED.company_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone
            `, [
              row.id,
              row.external_id || null,
              row.first_name, row.last_name, row.company_name, row.type,
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
    } else {
      console.log('🚂 Running on Railway - skipping client migration');
      resolve();
    }
  });
}

async function migrateDevices() {
  return new Promise((resolve, reject) => {
    console.log('💻 Migrating devices...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM devices', async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO devices (
                id, external_id, client_id, category_id, name, manufacturer, model, serial_number,
                production_year, power_rating, fuel_type, installation_date, 
                last_service_date, next_service_date, warranty_end_date,
                technical_data, notes, brand, is_active, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
              ON CONFLICT (id) DO UPDATE SET
                external_id = COALESCE(EXCLUDED.external_id, devices.external_id),
                name = EXCLUDED.name,
                manufacturer = EXCLUDED.manufacturer,
                model = EXCLUDED.model
            `, [
              row.id,
              row.external_id || null,
              row.client_id, row.category_id, row.name, row.manufacturer,
              row.model, row.serial_number, row.production_year, row.power_rating,
              row.fuel_type, row.installation_date, row.last_service_date,
              row.next_service_date, row.warranty_end_date, row.technical_data,
              row.notes, row.brand, row.is_active !== 0, row.created_at, row.updated_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating device ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} devices`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping device migration');
      resolve();
    }
  });
}

async function migrateServiceOrders() {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrating service orders...');
    
    if (sqliteDb) {
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
                status, priority, type, title, description, scheduled_date, 
                estimated_hours, parts_cost, labor_cost, total_cost, notes,
                actual_start_date, actual_end_date, completed_categories, work_photos, 
                completion_notes, actual_hours, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
              ON CONFLICT (order_number) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                status = EXCLUDED.status,
                assigned_user_id = EXCLUDED.assigned_user_id
            `, [
              row.id, row.order_number, row.client_id, row.device_id, row.assigned_user_id,
              row.service_categories, row.status, row.priority, row.type, row.title,
              row.description, row.scheduled_date, row.estimated_hours, row.parts_cost || 0,
              row.labor_cost || 0, row.total_cost || 0, row.notes, row.actual_start_date,
              row.actual_end_date, row.completed_categories, row.work_photos, 
              row.completion_notes, row.actual_hours, row.created_at, row.updated_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating service order ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} service orders`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping service order migration');
      resolve();
    }
  });
}

// Ensure indexes/constraints exist (idempotent)
async function ensureOrderIndexes() {
  try {
    // Partial unique index to block multiple active rows for the same order_number
    await pgPool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'ux_service_orders_order_number_active'
        ) THEN
          CREATE UNIQUE INDEX ux_service_orders_order_number_active
          ON service_orders (order_number)
          WHERE status IS DISTINCT FROM 'archived';
        END IF;
      END $$;
    `);
    console.log('✅ Ensured ux_service_orders_order_number_active index');
  } catch (e) {
    console.log('ℹ️ Could not ensure unique active index (may already exist):', e.message);
  }
}

async function migrateSpareParts() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Migrating spare parts...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM spare_parts', async (err, rows) => {
        if (err) {
          console.log('⚠️ Spare parts table does not exist, skipping');
          resolve();
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO spare_parts (
                id, name, part_number, manufacturer, category, description,
                unit_price, stock_quantity, min_stock_level, location,
                is_active, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                unit_price = EXCLUDED.unit_price,
                stock_quantity = EXCLUDED.stock_quantity
            `, [
              row.id, row.name, row.part_number, row.manufacturer, row.category,
              row.description, row.unit_price || row.price || 0, row.stock_quantity,
              row.min_stock_level, row.location, row.is_active !== 0,
              row.created_at, row.updated_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating spare part ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} spare parts`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping spare part migration');
      resolve();
    }
  });
}

async function migrateOrderParts() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Migrating order parts...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM order_parts', async (err, rows) => {
        if (err) {
          console.log('⚠️ Order parts table does not exist, skipping');
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
    } else {
      console.log('🚂 Running on Railway - skipping order part migration');
      resolve();
    }
  });
}

async function migrateServiceProtocols() {
  console.log('📄 Migrating service protocols...');

  if (!sqliteDb) {
    console.log('🚂 Railway environment – no local service protocols to migrate');
    return;
  }

  const parseSnapshot = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return { raw: String(value) };
    }
  };

  return new Promise((resolve) => {
    sqliteDb.all('SELECT * FROM service_protocols', async (err, rows) => {
      if (err) {
        console.log('⚠️ service_protocols table does not exist, skipping');
        resolve();
        return;
      }

      for (const row of rows) {
        try {
          await pgPool.query(`
            INSERT INTO service_protocols (
              external_id, order_id, technician_id, client_id, device_id,
              template_name, template_version, issued_at, created_at, updated_at,
              sync_status, remote_url, service_company_snapshot, client_snapshot,
              device_snapshot, technician_snapshot, checks_snapshot, steps_snapshot,
              parts_snapshot, summary_text, notes, acceptance_clause, pdf_filename,
              pdf_storage_path, pdf_uploaded
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, $13, $14,
              $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25
            )
            ON CONFLICT (external_id) DO UPDATE SET
              order_id = EXCLUDED.order_id,
              technician_id = EXCLUDED.technician_id,
              client_id = EXCLUDED.client_id,
              device_id = EXCLUDED.device_id,
              template_name = EXCLUDED.template_name,
              template_version = EXCLUDED.template_version,
              issued_at = EXCLUDED.issued_at,
              created_at = COALESCE(service_protocols.created_at, EXCLUDED.created_at),
              updated_at = EXCLUDED.updated_at,
              sync_status = EXCLUDED.sync_status,
              remote_url = EXCLUDED.remote_url,
              service_company_snapshot = EXCLUDED.service_company_snapshot,
              client_snapshot = EXCLUDED.client_snapshot,
              device_snapshot = EXCLUDED.device_snapshot,
              technician_snapshot = EXCLUDED.technician_snapshot,
              checks_snapshot = EXCLUDED.checks_snapshot,
              steps_snapshot = EXCLUDED.steps_snapshot,
              parts_snapshot = EXCLUDED.parts_snapshot,
              summary_text = EXCLUDED.summary_text,
              notes = EXCLUDED.notes,
              acceptance_clause = EXCLUDED.acceptance_clause,
              pdf_filename = EXCLUDED.pdf_filename,
              pdf_storage_path = EXCLUDED.pdf_storage_path,
              pdf_uploaded = EXCLUDED.pdf_uploaded
          `, [
            row.id,
            row.order_id,
            row.technician_id,
            row.client_id,
            row.device_id,
            row.template_name,
            row.template_version,
            row.issued_at,
            row.created_at,
            row.updated_at,
            row.desktop_sync_status || 'pending',
            row.remote_url,
            parseSnapshot(row.service_company_snapshot),
            parseSnapshot(row.client_snapshot),
            parseSnapshot(row.device_snapshot),
            parseSnapshot(row.technician_snapshot),
            parseSnapshot(row.checks_snapshot),
            parseSnapshot(row.steps_snapshot),
            parseSnapshot(row.parts_snapshot),
            row.summary_text,
            row.notes,
            row.acceptance_clause,
            row.pdf_filename,
            row.local_pdf_path,
            row.pdf_uploaded === 1
          ]);
        } catch (error) {
          console.error(`❌ Error migrating service protocol ${row.id}:`, error.message);
        }
      }

      console.log(`✅ Migrated ${rows.length} service protocols`);
      resolve();
    });
  });
}

async function migrateInvoices() {
  return new Promise((resolve, reject) => {
    console.log('🧾 Migrating invoices...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM invoices', async (err, rows) => {
        if (err) {
          console.log('⚠️ Invoices table does not exist, skipping');
          resolve();
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO invoices (
                id, invoice_number, order_id, client_id, issue_date, due_date,
                status, subtotal, tax_amount, total_amount, notes, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (invoice_number) DO UPDATE SET
                status = EXCLUDED.status,
                total_amount = EXCLUDED.total_amount
            `, [
              row.id, row.invoice_number, row.order_id, row.client_id,
              row.issue_date, row.due_date, row.status, row.subtotal || row.net_amount || 0,
              row.tax_amount || 0, row.total_amount || row.gross_amount || 0,
              row.notes, row.created_at, row.updated_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating invoice ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} invoices`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping invoice migration');
      resolve();
    }
  });
}

async function migrateInvoiceItems() {
  return new Promise((resolve, reject) => {
    console.log('📑 Migrating invoice items...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM invoice_items', async (err, rows) => {
        if (err) {
          console.log('⚠️ Invoice items table does not exist, skipping');
          resolve();
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO invoice_items (
                id, invoice_id, description, quantity, unit_price, total_price, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price,
                total_price = EXCLUDED.total_price
            `, [
              row.id, row.invoice_id, row.description, row.quantity,
              row.unit_price, row.total_price || row.gross_amount || 0, row.created_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating invoice item ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} invoice items`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping invoice item migration');
      resolve();
    }
  });
}

async function migrateCalendarEvents() {
  return new Promise((resolve, reject) => {
    console.log('📅 Migrating calendar events...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM calendar_events', async (err, rows) => {
        if (err) {
          console.log('⚠️ Calendar events table does not exist, skipping');
          resolve();
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO calendar_events (
                id, title, description, start_date, end_date, event_type,
                order_id, user_id, is_all_day, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                start_date = EXCLUDED.start_date
            `, [
              row.id, row.title, row.description, row.start_date,
              row.end_date, row.event_type || row.type, row.order_id || row.related_id,
              row.user_id, row.is_all_day !== 0, row.created_at, row.updated_at
            ]);
          } catch (error) {
            console.error(`❌ Error migrating calendar event ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} calendar events`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping calendar event migration');
      resolve();
    }
  });
}

async function migrateDeviceFiles() {
  return new Promise((resolve, reject) => {
    console.log('📎 Migrating device files...');
    
    if (sqliteDb) {
      sqliteDb.all('SELECT * FROM device_files', async (err, rows) => {
        if (err) {
          console.log('⚠️ Device files table does not exist, skipping');
          resolve();
          return;
        }
        
        for (const row of rows) {
          try {
            await pgPool.query(`
              INSERT INTO device_files (
                id, device_id, file_name, file_path, file_type, file_size,
                upload_date, description
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO UPDATE SET
                file_name = EXCLUDED.file_name,
                file_path = EXCLUDED.file_path,
                description = EXCLUDED.description
            `, [
              row.id, row.device_id, row.file_name, row.file_path,
              row.file_type, row.file_size, row.upload_date || row.created_at,
              row.description
            ]);
          } catch (error) {
            console.error(`❌ Error migrating device file ${row.id}:`, error.message);
          }
        }
        
        console.log(`✅ Migrated ${rows.length} device files`);
        resolve();
      });
    } else {
      console.log('🚂 Running on Railway - skipping device file migration');
      resolve();
    }
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
  // Ensure indexes after data migration
  await ensureOrderIndexes();
    
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

module.exports = main; 