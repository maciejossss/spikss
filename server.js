require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database/connection');

// Import routes
const healthRoutes = require('./routes/health');
const techniciansRoutes = require('./routes/technicians');
const ordersRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  }
});
app.use('/api/', limiter);

// CORS configuration for global access
app.use(cors({
  origin: '*', // Pozwól na wszystkie origins dla globalnego dostępu
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'Origin', 'Accept']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for mobile debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const origin = req.get('Origin') || 'Direct';
  
  console.log(`📱 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   └─ IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`   └─ User-Agent: ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}`);
  console.log(`   └─ Origin: ${origin}`);
  
  next();
});

// ===== STATIC FILES =====

// Serve mobile app static files
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));

// ===== ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: '🚀 Serwis Mobile API - Railway Deployment Ready!',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Test database connection
app.get('/api/health/db', async (req, res) => {
  try {
    const start = Date.now();
    await db.testConnection();
    const responseTime = Date.now() - start;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        pool: {
          totalCount: db.pool?.totalCount || 0,
          idleCount: db.pool?.idleCount || 0,
          waitingCount: db.pool?.waitingCount || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});



// Napraw kodowanie UTF-8 w bazie danych
app.get('/api/health/fix-encoding', async (req, res) => {
  try {
    console.log('🔧 Naprawiam kodowanie UTF-8 w bazie danych...');
    
    // Ustaw kodowanie dla sesji
    await db.query('SET client_encoding = UTF8');
    await db.query('SET names UTF8');
    
    // Sprawdź aktualne kodowanie
    const encodingResult = await db.query('SHOW client_encoding');
    const namesResult = await db.query('SHOW names');
    
    console.log('✅ Kodowanie naprawione:', {
      client_encoding: encodingResult.rows[0]?.client_encoding,
      names: namesResult.rows[0]?.names
    });
    
    res.json({
      status: 'OK',
      message: 'Kodowanie UTF-8 zostało naprawione',
      encoding: {
        client_encoding: encodingResult.rows[0]?.client_encoding,
        names: namesResult.rows[0]?.names
      }
    });
  } catch (error) {
    console.error('❌ Błąd naprawy kodowania:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Manual migration trigger endpoint
app.post('/api/health/migrate', async (req, res) => {
  try {
    console.log('🔧 Manual migration triggered...');
    const migrate = require('./database/migrate');
    await migrate.main();
    
    res.json({
      status: 'SUCCESS',
      message: 'Database migrations completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual migration failed:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Check database tables endpoint
app.get('/api/health/tables', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    const expectedTables = ['users', 'clients', 'devices', 'service_orders', 'spare_parts'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      tables: tables,
      expectedTables: expectedTables,
      missingTables: missingTables,
      allTablesExist: missingTables.length === 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Fix missing service_orders table endpoint
app.post('/api/health/fix-tables', async (req, res) => {
  try {
    console.log('🔧 Naprawiam brakującą tabelę service_orders...');
    
    // Sprawdź czy tabela service_orders już istnieje
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'service_orders'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ Tabela service_orders już istnieje');
      return res.json({
        status: 'SUCCESS',
        message: 'Table service_orders already exists',
        timestamp: new Date().toISOString()
      });
    }
    
    // Utwórz tabelę service_orders
    console.log('🏗️ Tworzę tabelę service_orders...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_orders (
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
      )
    `);
    
    // Utwórz indeksy
    console.log('📋 Tworzę indeksy...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_service_orders_assigned_user ON service_orders(assigned_user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders(client_id)');
    
    console.log('✅ Tabela service_orders utworzona pomyślnie!');
    
    res.json({
      status: 'SUCCESS',
      message: 'Table service_orders created successfully with indexes',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas tworzenia tabeli service_orders:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DEBUG: Zwróć wszystkich użytkowników z bazy
app.get('/api/debug/all-users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🚀 SYNC ENDPOINT: Odbieraj użytkowników/techników z desktop app
app.post('/api/sync/users', async (req, res) => {
  try {
    const users = req.body;
    console.log(`📤 Otrzymano ${Array.isArray(users) ? users.length : 1} użytkowników do synchronizacji`);
    console.log('📋 Dane użytkowników:', JSON.stringify(users, null, 2));
    
    if (!Array.isArray(users)) {
      return res.status(400).json({
        success: false,
        error: 'Expected array of users'
      });
    }
    
    let syncedCount = 0;
    
    for (const user of users) {
      try {
        console.log(`🔍 Sprawdzam użytkownika ID: ${user.id}, username: ${user.username}`);
        
        // Sprawdź czy użytkownik już istnieje
        const existingUser = await db.query(
          'SELECT id FROM users WHERE id = $1',
          [user.id]
        );
        
        console.log(`📊 Wynik sprawdzenia: ${existingUser.rows.length} wierszy`);
        
        if (existingUser.rows.length > 0) {
          // Aktualizuj istniejącego użytkownika
          await db.query(`
            UPDATE users 
            SET username = $1, full_name = $2, email = $3, role = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
          `, [user.username, user.full_name, user.email || '', user.role, user.id]);
          
          console.log(`♻️ Zaktualizowano użytkownika ${user.full_name} (ID: ${user.id})`);
        } else {
          // Dodaj nowego użytkownika z zachowaniem ID z desktop app
          await db.query(`
            INSERT INTO users (id, username, full_name, email, role, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [user.id, user.username, user.full_name, user.email || '', user.role, 'default_password_hash']);
          
          console.log(`➕ Dodano użytkownika ${user.full_name} (ID: ${user.id})`);
        }
        
        syncedCount++;
      } catch (userError) {
        console.error(`❌ Błąd synchronizacji użytkownika ${user.full_name}:`, userError.message);
        console.error(`❌ Szczegóły błędu:`, userError);
      }
    }
    
    console.log(`✅ Zsynchronizowano ${syncedCount}/${users.length} użytkowników do Railway PostgreSQL`);
    
    res.json({
      success: true,
      message: `${syncedCount} users synced to Railway PostgreSQL`,
      syncedCount: syncedCount
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji użytkowników:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during users sync',
      details: error.message
    });
  }
});

// 🗑️ DELETE ENDPOINT: Usuń użytkownika z Railway
app.delete('/api/sync/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log(`🗑️ Próba usunięcia użytkownika ID: ${userId}`);
    
    // Sprawdź czy użytkownik istnieje
    const existingUser = await db.query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (existingUser.rows.length === 0) {
      console.log(`⚠️ Użytkownik ID: ${userId} nie istnieje w Railway`);
      return res.status(404).json({
        success: false,
        error: 'User not found in Railway'
      });
    }
    
    // 🔧 ROZWIĄZANIE: Najpierw odłącz zlecenia od technika
    console.log(`🔧 Sprawdzam zlecenia przypisane do technika ${userId}...`);
    const assignedOrders = await db.query(
      'SELECT id, order_number FROM service_orders WHERE assigned_user_id = $1',
      [userId]
    );
    
    if (assignedOrders.rows.length > 0) {
      console.log(`⚠️ Znaleziono ${assignedOrders.rows.length} zleceń przypisanych do technika ${userId}`);
      console.log('🔧 Odłączam zlecenia od technika...');
      
      // Odłącz zlecenia od technika (ustaw assigned_user_id na NULL)
      await db.query(
        'UPDATE service_orders SET assigned_user_id = NULL WHERE assigned_user_id = $1',
        [userId]
      );
      
      console.log(`✅ Odłączono ${assignedOrders.rows.length} zleceń od technika ${userId}`);
    } else {
      console.log(`✅ Brak zleceń przypisanych do technika ${userId}`);
    }
    
    // Teraz usuń użytkownika
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    console.log(`✅ Usunięto użytkownika ${existingUser.rows[0].full_name} (ID: ${userId}) z Railway`);
    
    res.json({
      success: true,
      message: `User ${existingUser.rows[0].full_name} (ID: ${userId}) deleted from Railway`,
      deletedUserId: userId,
      unassignedOrders: assignedOrders.rows.length
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas usuwania użytkownika:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during user deletion',
      details: error.message
    });
  }
});

// 🚀 SYNC ENDPOINT: Odbieraj zlecenia z desktop app
app.post('/api/sync/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log(`📤 Otrzymano zlecenie z desktop: ${orderData.order_number}`);
    
    // Walidacja wymaganych pól
    if (!orderData.order_number || !orderData.title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_number, title'
      });
    }
    
    // Przygotuj dane do PostgreSQL
    const now = new Date().toISOString();
    const insertData = {
      order_number: orderData.order_number,
      client_id: orderData.client_id || null,
      device_id: orderData.device_id || null,
      assigned_user_id: orderData.assigned_user_id || orderData.assigned_to || null,
      service_categories: JSON.stringify(orderData.service_categories || []),
      status: orderData.status || 'new',
      priority: orderData.priority || 'medium',
      type: orderData.type || 'maintenance',
      title: orderData.title,
      description: orderData.description || '',
      scheduled_date: orderData.scheduled_date || null,
      estimated_hours: orderData.estimated_hours || 0,
      labor_cost: orderData.labor_cost || 0,
      parts_cost: orderData.parts_cost || 0,
      total_cost: orderData.total_cost || 0,
      notes: orderData.notes || '',
      created_at: now,
      updated_at: now
    };
    
        // Zabezpieczenie foreign keys - ustaw na NULL jeśli nie istnieją
    let safeClientId = null;
    if (insertData.client_id) {
      try {
        const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [insertData.client_id]);
        safeClientId = clientCheck.rows.length > 0 ? insertData.client_id : null;
      } catch (e) {
        console.warn(`⚠️ Klient ${insertData.client_id} nie istnieje w Railway, ustawiam NULL`);
      }
    }
    
    let safeDeviceId = null;
    if (insertData.device_id) {
      try {
        const deviceCheck = await db.query('SELECT id FROM devices WHERE id = $1', [insertData.device_id]);
        safeDeviceId = deviceCheck.rows.length > 0 ? insertData.device_id : null;
      } catch (e) {
        console.warn(`⚠️ Urządzenie ${insertData.device_id} nie istnieje w Railway, ustawiam NULL`);
      }
    }
    
    let safeUserId = null;
    if (insertData.assigned_user_id) {
      try {
        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [insertData.assigned_user_id]);
        safeUserId = userCheck.rows.length > 0 ? insertData.assigned_user_id : null;
      } catch (e) {
        console.warn(`⚠️ Użytkownik ${insertData.assigned_user_id} nie istnieje w Railway, ustawiam NULL`);
      }
    }

    // Zapisz w PostgreSQL
    const query = `
      INSERT INTO service_orders (
        order_number, client_id, device_id, assigned_user_id, service_categories,
        status, priority, type, title, description, scheduled_date, 
        estimated_hours, labor_cost, parts_cost, total_cost, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (order_number) 
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        assigned_user_id = EXCLUDED.assigned_user_id,
        updated_at = EXCLUDED.updated_at
      RETURNING id, order_number, status
    `;

    const result = await db.query(query, [
      insertData.order_number, safeClientId, safeDeviceId, 
      safeUserId, insertData.service_categories, insertData.status,
      insertData.priority, insertData.type, insertData.title, insertData.description,
      insertData.scheduled_date, insertData.estimated_hours, insertData.labor_cost,
      insertData.parts_cost, insertData.total_cost, insertData.notes,
      insertData.created_at, insertData.updated_at
    ]);
    
    const savedOrder = result.rows[0];
    
    console.log(`✅ Zlecenie ${savedOrder.order_number} zapisane w Railway PostgreSQL (ID: ${savedOrder.id})`);
    
    res.json({
      success: true,
      message: 'Order synced to Railway PostgreSQL',
      order: {
        id: savedOrder.id,
        order_number: savedOrder.order_number,
        status: savedOrder.status
      }
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji zlecenia:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during order sync',
      details: error.message
    });
  }
});

// 🚀 SYNC ENDPOINT: Odbieraj przypisania zleceń z desktop app
app.put('/api/sync/assign', async (req, res) => {
  try {
    const { orderId, orderNumber, technicianId, notes, status, assignedAt } = req.body;
    
    console.log(`📤 Otrzymano przypisanie zlecenia ${orderId || orderNumber} do technika ${technicianId}`);
    
    // Walidacja wymaganych pól
    if ((!orderId && !orderNumber) || !technicianId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId/orderNumber, technicianId'
      });
    }
    
    const now = new Date().toISOString();
    
    // Zaktualizuj zlecenie w PostgreSQL - używaj orderNumber jeśli orderId nie jest dostępne
    const query = orderId ? `
      UPDATE service_orders 
      SET 
        assigned_user_id = $1,
        status = $2,
        notes = COALESCE($3, notes),
        updated_at = $4
      WHERE id = $5
      RETURNING id, order_number, assigned_user_id, status
    ` : `
      UPDATE service_orders 
      SET 
        assigned_user_id = $1,
        status = $2,
        notes = COALESCE($3, notes),
        updated_at = $4
      WHERE order_number = $5
      RETURNING id, order_number, assigned_user_id, status
    `;
    
    const result = await db.query(query, [
      technicianId,
      status || 'new',
      notes,
      assignedAt || now,
      orderId || orderNumber
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Order ${orderId} not found in Railway database`
      });
    }
    
    const updatedOrder = result.rows[0];
    
    console.log(`✅ Zlecenie ${updatedOrder.order_number} przypisane do technika ${technicianId} w Railway PostgreSQL`);
    
    res.json({
      success: true,
      message: 'Order assignment synced to Railway PostgreSQL',
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        assigned_user_id: updatedOrder.assigned_user_id,
        status: updatedOrder.status
      }
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji przypisania:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during assignment sync',
      details: error.message
    });
  }
});

// === SYNC ENDPOINTS FOR DESKTOP ===

// 🚀 SYNC ENDPOINT: Synchronizuj klientów z desktop app
app.post('/api/sync/clients', async (req, res) => {
  try {
    const clients = req.body.clients || [];
    
    console.log(`📤 Otrzymano ${clients.length} klientów z desktop app`);
    
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No clients data provided'
      });
    }
    
    let syncedCount = 0;
    
    for (const client of clients) {
      if (!client.id || (!client.first_name && !client.company_name)) {
        continue; // Pomiń niepełne dane
      }
      
      const query = `
        INSERT INTO clients (
          id, type, first_name, last_name, company_name, email, phone, 
          address_street, address_city, address_postal_code, address_country,
          nip, regon, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) 
        DO UPDATE SET
          type = EXCLUDED.type,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          company_name = EXCLUDED.company_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          updated_at = EXCLUDED.updated_at
      `;
      
      const now = new Date().toISOString();
      
      await db.query(query, [
        client.id, client.type || 'individual', client.first_name || null, 
        client.last_name || null, client.company_name || null, client.email || null,
        client.phone || null, client.address_street || null, client.address_city || null,
        client.address_postal_code || null, client.address_country || 'PL',
        client.nip || null, client.regon || null, client.is_active !== undefined ? client.is_active : true,
        client.created_at || now, now
      ]);
      
      syncedCount++;
    }
    
    console.log(`✅ Zsynchronizowano ${syncedCount} klientów do Railway PostgreSQL`);
    
    res.json({
      success: true,
      message: `${syncedCount} clients synced to Railway PostgreSQL`,
      syncedCount
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji klientów:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during client sync',
      details: error.message
    });
  }
});

// 📦 SYNC ENDPOINT: Synchronizuj urządzenia z desktop app
app.post('/api/sync/devices', async (req, res) => {
  try {
    const devices = req.body.devices || [];
    
    console.log(`📦 Otrzymano ${devices.length} urządzeń z desktop app`);
    
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No devices data provided'
      });
    }
    
    let syncedCount = 0;
    
    for (const device of devices) {
      if (!device.id || !device.name) {
        continue; // Pomiń niepełne dane
      }
      
      const query = `
        INSERT INTO devices (
          id, client_id, name, manufacturer, model, serial_number,
          production_year, power_rating, fuel_type, installation_date,
          last_service_date, next_service_date, warranty_end_date,
          technical_data, notes, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) 
        DO UPDATE SET
          client_id = EXCLUDED.client_id,
          name = EXCLUDED.name,
          manufacturer = EXCLUDED.manufacturer,
          model = EXCLUDED.model,
          serial_number = EXCLUDED.serial_number,
          updated_at = EXCLUDED.updated_at
      `;
      
      const now = new Date().toISOString();
      
      await db.query(query, [
        device.id, device.client_id, device.name, device.manufacturer || null,
        device.model || null, device.serial_number || null, device.production_year || null,
        device.power_rating || null, device.fuel_type || null, device.installation_date || null,
        device.last_service_date || null, device.next_service_date || null, device.warranty_end_date || null,
        device.technical_data || null, device.notes || null, device.is_active !== undefined ? device.is_active : true,
        device.created_at || now, now
      ]);
      
      syncedCount++;
    }
    
    console.log(`✅ Zsynchronizowano ${syncedCount} urządzeń do Railway PostgreSQL`);
    
    res.json({
      success: true,
      message: `${syncedCount} devices synced to Railway PostgreSQL`,
      syncedCount
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji urządzeń:', error);
    res.status(500).json({
      success: false,
      error: 'Database error during device sync',
      details: error.message
    });
  }
});

// API Routes
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/desktop/orders', require('./routes/orders'));

// Mobile App SPA - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: ['/api/health', '/api/technicians', '/api/desktop/orders/:userId']
    });
  }
  
  // Serve mobile app
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await db.testConnection();
    console.log('✅ Database connected successfully');
    
    // Run database migrations for Railway
    console.log('🔧 Running database migrations...');
    try {
      const migrate = require('./database/migrate');
      await migrate.main();
      console.log('✅ Database migrations completed');
    } catch (migrationError) {
      console.error('⚠️ Migration error (continuing):', migrationError.message);
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ========================================');
      console.log(`🌍 Serwis Mobile API running on port ${PORT}`);
        console.log(`📱 Railway URL: https://web-production-fc58d.up.railway.app`);
  console.log(`🏥 Health check: https://web-production-fc58d.up.railway.app/api/health`);
  console.log(`👨‍🔧 Technicians: https://web-production-fc58d.up.railway.app/api/technicians`);
  console.log(`📱 Mobile App: https://web-production-fc58d.up.railway.app/`);
      console.log('🚀 ========================================');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

// Start the server
startServer(); 