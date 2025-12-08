const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const bcrypt = require('bcryptjs');

// Loosely accept various content types for desktop sync calls
router.use(express.json({ limit: '2mb' }));
router.use(express.urlencoded({ extended: true }));
router.use(express.text({ type: ['text/*', 'application/*+json', '*/*'], limit: '2mb' }));

// POST /api/sync/users - Synchronizuj użytkowników z desktop app
router.post('/users', async (req, res) => {
  try {
    console.log('📱 Synchronizacja użytkowników z desktop app...');
    
    const usersData = req.body;
    
    // Sprawdź czy dane są tablicą
    if (!Array.isArray(usersData)) {
      console.error('❌ Błąd: usersData musi być tablicą');
      return res.status(400).json({ 
        success: false, 
        error: 'usersData must be an array' 
      });
    }
    
    console.log(`📊 Otrzymano ${usersData.length} użytkowników do synchronizacji`);
    
    for (const user of usersData) {
      try {
        // Przyjmij password_hash lub plaintext password i zamień na bcrypt hash
        let passHash = null;
        try {
          if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
            passHash = user.password_hash;
          } else if (typeof user.password === 'string' && user.password.length >= 6) {
            passHash = await bcrypt.hash(String(user.password), 10);
          }
        } catch (_) { passHash = null; }

        // Domyślnie ustaw konto jako aktywne, chyba że wyraźnie przesłano false
        const isActive = user.is_active !== false;
        // Sprawdź czy użytkownik już istnieje
        const existingUser = await db.query(
          'SELECT id FROM users WHERE username = $1',
          [user.username]
        );
        
        if (existingUser.rows.length > 0) {
          // Aktualizuj istniejącego użytkownika
          await db.query(`
            UPDATE users 
            SET full_name = $1, email = $2, role = $3, is_active = $4,
                password_hash = COALESCE($5, password_hash),
                updated_at = CURRENT_TIMESTAMP
            WHERE username = $6
          `, [user.full_name, user.email, user.role, isActive, passHash, user.username]);
          console.log(`✅ Zaktualizowano użytkownika: ${user.username}`);
        } else {
          // Dodaj nowego użytkownika
          await db.query(`
            INSERT INTO users (username, full_name, email, password_hash, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [user.username, user.full_name, user.email, passHash, user.role, isActive]);
          console.log(`✅ Dodano nowego użytkownika: ${user.username}`);
        }
      } catch (error) {
        console.error(`❌ Błąd synchronizacji użytkownika ${user.username}:`, error.message);
      }
    }
    
    console.log('✅ Synchronizacja użytkowników zakończona');
    res.json({ success: true, message: 'Users synchronized successfully' });
  } catch (error) {
    console.error('❌ Błąd synchronizacji użytkowników:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sync/users/:id - Usuń użytkownika w Railway (fallback: dezaktywacja)
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    try {
      const del = await db.query('DELETE FROM users WHERE id = $1', [id]);
      if ((del.rowCount || 0) === 0) return res.status(404).json({ success: false, error: 'Not found' });
      return res.json({ success: true, deleted: 1, deactivated: 0 });
    } catch (e) {
      // Jeśli FK blokuje, dezaktywuj zamiast usuwać
      try {
        const upd = await db.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        if ((upd.rowCount || 0) === 0) return res.status(404).json({ success: false, error: 'Not found' });
        return res.json({ success: true, deleted: 0, deactivated: 1 });
      } catch (e2) {
        return res.status(500).json({ success: false, error: e2.message });
      }
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/clients - Synchronizuj klientów z desktop app
router.post('/clients', async (req, res) => {
  try {
    console.log('📱 Synchronizacja klientów z desktop app...');
    
    const clientsData = req.body;
    
    // Sprawdź czy dane są tablicą
    if (!Array.isArray(clientsData)) {
      console.error('❌ Błąd: clientsData musi być tablicą');
      return res.status(400).json({ 
        success: false, 
        error: 'clientsData must be an array' 
      });
    }
    
    console.log(`📊 Otrzymano ${clientsData.length} klientów do synchronizacji`);
    
    for (const client of clientsData) {
      try {
        // Sprawdź czy klient już istnieje
        const existingClient = await db.query(
          'SELECT id FROM clients WHERE email = $1 OR (phone = $2 AND phone IS NOT NULL)',
          [client.email, client.phone]
        );
        
        if (existingClient.rows.length > 0) {
          // Aktualizuj istniejącego klienta
          await db.query(`
            UPDATE clients 
            SET first_name = $1, last_name = $2, company_name = $3, type = $4, 
                phone = $5, address = $6, address_street = $7, address_city = $8,
                address_postal_code = $9, address_country = $10, nip = $11, regon = $12,
                contact_person = $13, notes = $14, is_active = $15, updated_at = CURRENT_TIMESTAMP
            WHERE id = $16
          `, [
            client.first_name, client.last_name, client.company_name, client.type,
            client.phone, client.address, client.address_street, client.address_city,
            client.address_postal_code, client.address_country, client.nip, client.regon,
            client.contact_person, client.notes, client.is_active, existingClient.rows[0].id
          ]);
          console.log(`✅ Zaktualizowano klienta: ${client.first_name} ${client.last_name}`);
        } else {
          // Dodaj nowego klienta
          await db.query(`
            INSERT INTO clients (first_name, last_name, company_name, type, email, phone, 
                               address, address_street, address_city, address_postal_code, 
                               address_country, nip, regon, contact_person, notes, is_active, 
                               created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            client.first_name, client.last_name, client.company_name, client.type,
            client.email, client.phone, client.address, client.address_street, client.address_city,
            client.address_postal_code, client.address_country, client.nip, client.regon,
            client.contact_person, client.notes, client.is_active
          ]);
          console.log(`✅ Dodano nowego klienta: ${client.first_name} ${client.last_name}`);
        }
      } catch (error) {
        console.error(`❌ Błąd synchronizacji klienta ${client.first_name} ${client.last_name}:`, error.message);
      }
    }
    
    console.log('✅ Synchronizacja klientów zakończona');
    res.json({ success: true, message: 'Clients synchronized successfully' });
  } catch (error) {
    console.error('❌ Błąd synchronizacji klientów:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/devices - Synchronizuj urządzenia z desktop app
router.post('/devices', async (req, res) => {
  try {
    console.log('📱 Synchronizacja urządzeń z desktop app...');
    
    const devicesData = req.body;
    
    // Sprawdź czy dane są tablicą
    if (!Array.isArray(devicesData)) {
      console.error('❌ Błąd: devicesData musi być tablicą');
      return res.status(400).json({ 
        success: false, 
        error: 'devicesData must be an array' 
      });
    }
    
    console.log(`📊 Otrzymano ${devicesData.length} urządzeń do synchronizacji`);
    
    for (const device of devicesData) {
      try {
        // Sprawdź czy urządzenie już istnieje
        const existingDevice = await db.query(
          'SELECT id FROM devices WHERE serial_number = $1 AND serial_number IS NOT NULL',
          [device.serial_number]
        );
        
        if (existingDevice.rows.length > 0) {
          // Aktualizuj istniejące urządzenie
          await db.query(`
            UPDATE devices 
            SET name = $1, full_name = $2, model = $3, brand = $4, serial_number = $5,
                warranty_status = $6, client_id = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
          `, [
            device.name, device.full_name, device.model, device.brand, device.serial_number,
            device.warranty_status, device.client_id, device.notes, existingDevice.rows[0].id
          ]);
          console.log(`✅ Zaktualizowano urządzenie: ${device.name}`);
        } else {
          // Dodaj nowe urządzenie
          await db.query(`
            INSERT INTO devices (name, full_name, model, brand, serial_number, warranty_status, 
                               client_id, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            device.name, device.full_name, device.model, device.brand, device.serial_number,
            device.warranty_status, device.client_id, device.notes
          ]);
          console.log(`✅ Dodano nowe urządzenie: ${device.name}`);
        }
      } catch (error) {
        console.error(`❌ Błąd synchronizacji urządzenia ${device.name}:`, error.message);
      }
    }
    
    console.log('✅ Synchronizacja urządzeń zakończona');
    res.json({ success: true, message: 'Devices synchronized successfully' });
  } catch (error) {
    console.error('❌ Błąd synchronizacji urządzeń:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/orders - Synchronizuj zlecenia z desktop app
router.post('/orders', async (req, res) => {
  try {
    console.log('📱 Synchronizacja zleceń z desktop app...');
    // Tombstone table to prevent resurrection of hard-deleted orders
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS deleted_orders (order_number VARCHAR(255) PRIMARY KEY, deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    } catch (_) {}
    
    let ordersData = req.body;
    // Jeżeli body przyszło jako string, spróbuj sparsować
    if (typeof ordersData === 'string') {
      try { ordersData = JSON.parse(ordersData); } catch (_) { ordersData = null; }
    }
    // Obsłuż wrappery { orders: [...] } lub { data: [...] }
    if (ordersData && !Array.isArray(ordersData) && typeof ordersData === 'object') {
      if (Array.isArray(ordersData.orders)) ordersData = ordersData.orders;
      else if (Array.isArray(ordersData.data)) ordersData = ordersData.data;
    }
    // Akceptuj tablicę lub pojedynczy obiekt
    if (!Array.isArray(ordersData)) {
      if (ordersData && typeof ordersData === 'object') ordersData = [ordersData];
    }
    if (!Array.isArray(ordersData) || ordersData.length === 0) {
      console.warn('⚠️ /api/sync/orders: empty or invalid payload');
      // Zwróć 200 aby nie blokować desktopu, ale nic nie zapisuj
      return res.json({ success: true, message: 'No orders to sync' });
    }
    
    console.log(`📊 Otrzymano ${ordersData.length} zleceń do synchronizacji`);
    
    for (const order of ordersData) {
      try {
        // Normalizacja payloadu
        const normalized = {
          order_number: String(order.order_number || ''),
          client_id: order.client_id ?? null,
          device_id: order.device_id ?? null,
          assigned_user_id: (order.assigned_user_id != null ? parseInt(order.assigned_user_id) : null),
          status: String(order.status || 'new'),
          priority: String(order.priority || 'medium'),
          service_categories: Array.isArray(order.service_categories) ? order.service_categories : [],
          completed_categories: Array.isArray(order.completed_categories) ? order.completed_categories : [],
          work_photos: Array.isArray(order.work_photos) ? order.work_photos : [],
          description: String(order.description || ''),
          scheduled_date: order.scheduled_date || null,
          actual_start_date: order.actual_start_date || null,
          actual_end_date: order.actual_end_date || null,
          completion_notes: order.completion_notes || null,
          actual_hours: order.actual_hours || null
        };
        if (!normalized.order_number) continue;

        // Walidacja FK – ustawiaj NULL, jeśli rekordów brak (unikamy 400/500)
        let safeClientId = null;
        if (normalized.client_id != null) {
          try {
            const r = await db.query('SELECT id FROM clients WHERE id = $1', [normalized.client_id]);
            if (r.rows && r.rows[0]) safeClientId = normalized.client_id;
          } catch (_) { /* ignore */ }
        }
        let safeDeviceId = null;
        if (normalized.device_id != null) {
          try {
            const r = await db.query('SELECT id FROM devices WHERE id = $1', [normalized.device_id]);
            if (r.rows && r.rows[0]) safeDeviceId = normalized.device_id;
          } catch (_) { /* ignore */ }
        }
        let safeAssignedUserId = null;
        if (normalized.assigned_user_id != null && !Number.isNaN(normalized.assigned_user_id)) {
          try {
            const r = await db.query('SELECT id FROM users WHERE id = $1', [normalized.assigned_user_id]);
            if (r.rows && r.rows[0]) safeAssignedUserId = normalized.assigned_user_id;
          } catch (_) { /* ignore */ }
        }
        // Sprawdź czy zlecenie już istnieje (i czy nie jest w tombstone)
        try {
          const td = await db.query('SELECT 1 FROM deleted_orders WHERE order_number = $1', [normalized.order_number]);
          if (td.rows && td.rows[0]) {
            console.log(`⚠️ Pomijam zlecenie ${normalized.order_number} – na liście tombstone`);
            continue;
          }
        } catch (_) {}
        // Sprawdź czy zlecenie już istnieje
        const existingOrder = await db.query(
          'SELECT id FROM service_orders WHERE order_number = $1',
          [normalized.order_number]
        );
        
        if (existingOrder.rows.length > 0) {
          // Aktualizuj istniejące zlecenie – nie nadpisuj wartości NULL nad danymi już istniejącymi
          await db.query(`
            UPDATE service_orders 
            SET client_id = $1,
                device_id = $2,
                assigned_user_id = COALESCE($3, assigned_user_id),
                status = $4,
                priority = $5,
                service_categories = COALESCE($6, service_categories),
                completed_categories = COALESCE($7, completed_categories),
                work_photos = COALESCE($8, work_photos),
                description = COALESCE($9, description),
                scheduled_date = COALESCE($10, scheduled_date),
                actual_start_date = COALESCE($11, actual_start_date),
                actual_end_date = COALESCE($12, actual_end_date),
                completion_notes = COALESCE($13, completion_notes),
                actual_hours = COALESCE($14, actual_hours),
                updated_at = CURRENT_TIMESTAMP
            WHERE order_number = $15
          `, [
            safeClientId, safeDeviceId, safeAssignedUserId, normalized.status,
            normalized.priority,
            (Array.isArray(normalized.service_categories) ? JSON.stringify(normalized.service_categories) : null),
            (Array.isArray(normalized.completed_categories) ? JSON.stringify(normalized.completed_categories) : null),
            (Array.isArray(normalized.work_photos) ? JSON.stringify(normalized.work_photos) : null),
            (normalized.description ? String(normalized.description) : null),
            (normalized.scheduled_date || null),
            (normalized.actual_start_date || null),
            (normalized.actual_end_date || null),
            (normalized.completion_notes ? String(normalized.completion_notes) : null),
            (normalized.actual_hours != null ? normalized.actual_hours : null),
            normalized.order_number
          ]);
          console.log(`✅ Zaktualizowano zlecenie (bez nadpisywania null): ${order.order_number}`);
        } else {
          // Dodaj nowe zlecenie
          await db.query(`
            INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, status,
                                     priority, service_categories, completed_categories, work_photos,
                                     description, scheduled_date, actual_start_date, actual_end_date,
                                     completion_notes, actual_hours, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            normalized.order_number, safeClientId, safeDeviceId, safeAssignedUserId, normalized.status,
            normalized.priority, JSON.stringify(normalized.service_categories), JSON.stringify(normalized.completed_categories),
            JSON.stringify(normalized.work_photos), normalized.description, normalized.scheduled_date, normalized.actual_start_date,
            normalized.actual_end_date, normalized.completion_notes, normalized.actual_hours
          ]);
          console.log(`✅ Dodano nowe zlecenie: ${order.order_number}`);
        }
      } catch (error) {
        console.error(`❌ Błąd synchronizacji zlecenia ${order.order_number}:`, error.message);
      }
    }
    
    console.log('✅ Synchronizacja zleceń zakończona');
    res.json({ success: true, message: 'Orders synchronized successfully' });
  } catch (error) {
    console.error('❌ Błąd synchronizacji zleceń:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sync/assign - Aktualizuj przypisanie zlecenia
router.put('/assign', async (req, res) => {
  try {
    console.log('📱 Aktualizacja przypisania zlecenia...');
    // Accept desktop payload variants
    const order_number = req.body.order_number || req.body.orderNumber;
    const orderId = req.body.id != null ? parseInt(req.body.id) : (req.body.orderId != null ? parseInt(req.body.orderId) : null);
    // Allow resolving technician by username/email if IDs differ between desktop and Railway
    let assigned_user_id_raw = (req.body.assigned_user_id ?? req.body.technicianId);
    const technicianUsername = req.body.technicianUsername || req.body.username || null;
    const technicianEmail = req.body.technicianEmail || req.body.email || null;
    if ((assigned_user_id_raw == null || Number.isNaN(parseInt(assigned_user_id_raw))) && (technicianUsername || technicianEmail)) {
      try {
        const r = await db.query(
          `SELECT id FROM users WHERE ($1::text IS NULL OR LOWER(username)=LOWER($1)) OR ($2::text IS NULL OR LOWER(email)=LOWER($2)) ORDER BY is_active DESC LIMIT 1`,
          [technicianUsername, technicianEmail]
        );
        if (r.rows && r.rows[0]) assigned_user_id_raw = r.rows[0].id;
      } catch (_) { /* ignore */ }
    }
    const assigned_user_id = assigned_user_id_raw != null ? parseInt(assigned_user_id_raw) : null;
    const status = req.body.status || 'assigned';

    if (!order_number && !orderId) {
      return res.status(400).json({ success: false, error: 'order_number or orderId is required' });
    }
    if (assigned_user_id == null || Number.isNaN(assigned_user_id)) {
      return res.status(400).json({ success: false, error: 'valid technicianId/assigned_user_id is required' });
    }

    // Validate technician exists and is active
    const tech = await db.query(`
      SELECT id FROM users WHERE id = $1 AND role IN ('technician','installer','admin') AND COALESCE(is_active, true) = true
    `, [assigned_user_id]);
    if (!tech.rows || tech.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Technician ${assigned_user_id} not found or inactive` });
    }

    // Do not overwrite completed status back to assigned
    const whereClause = order_number ? 'order_number = $3' : 'id = $3';
    const idValue = order_number || orderId;
    const current = await db.query(`SELECT status, assigned_user_id FROM service_orders WHERE ${whereClause}`, [/*$1*/null, /*$2*/null, idValue].slice(0,1));
    // Fallback simple fetch by separate query to avoid param dance
    let currentStatus = null;
    try {
      const cur = order_number
        ? await db.query('SELECT status, assigned_user_id FROM service_orders WHERE order_number = $1', [order_number])
        : await db.query('SELECT status, assigned_user_id FROM service_orders WHERE id = $1', [orderId]);
      currentStatus = cur.rows && cur.rows[0] ? cur.rows[0].status : null;
      if (cur.rows && cur.rows[0]) {
        console.log('ℹ️ Before assign:', { order: order_number || orderId, status: cur.rows[0].status, prev_assigned: cur.rows[0].assigned_user_id, new_assigned: assigned_user_id });
      }
    } catch (_) {}

    const nextStatus = currentStatus === 'completed' ? 'completed' : status;

    // Update by order_number or id
    if (order_number) {
      const upd = await db.query(`
        UPDATE service_orders 
           SET assigned_user_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE order_number = $3
      `, [assigned_user_id, nextStatus, order_number]);
      if ((upd.rowCount || 0) === 0) {
        // Create minimal record for visibility if missing
        await db.query(`
          INSERT INTO service_orders (order_number, assigned_user_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [order_number, assigned_user_id, nextStatus]);
      }
    } else {
      const upd = await db.query(`
        UPDATE service_orders 
           SET assigned_user_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
      `, [assigned_user_id, nextStatus, orderId]);
      if ((upd.rowCount || 0) === 0) {
        return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
      }
    }

    console.log(`✅ Przypisano zlecenie ${order_number || orderId} do technika ${assigned_user_id}; status: ${nextStatus}`);
    res.json({ success: true, message: 'Order assignment updated successfully' });
  } catch (error) {
    console.error('❌ Błąd aktualizacji przypisania zlecenia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/force-update-order - Wymuś aktualizację zlecenia przez ID
router.post('/force-update-order', async (req, res) => {
  try {
    console.log('📱 Wymuszenie aktualizacji zlecenia...');
    
    const orderData = req.body;
    
    if (!orderData.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'order ID is required' 
      });
    }
    
    // Sprawdź czy zlecenie istnieje
    const existingOrder = await db.query(
      'SELECT id FROM service_orders WHERE id = $1',
      [orderData.id]
    );
    
    if (existingOrder.rows.length > 0) {
      // Aktualizuj istniejące zlecenie
      await db.query(`
        UPDATE service_orders 
        SET order_number = $1, client_id = $2, device_id = $3, assigned_user_id = $4, 
            status = $5, priority = $6, service_categories = $7, completed_categories = $8,
            work_photos = $9, description = $10, scheduled_date = $11, actual_start_date = $12,
            actual_end_date = $13, completion_notes = $14, actual_hours = $15,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
      `, [
        orderData.order_number, orderData.client_id, orderData.device_id, orderData.assigned_user_id,
        orderData.status, orderData.priority, JSON.stringify(orderData.service_categories), 
        JSON.stringify(orderData.completed_categories), JSON.stringify(orderData.work_photos), 
        orderData.description, orderData.scheduled_date, orderData.actual_start_date,
        orderData.actual_end_date, orderData.completion_notes, orderData.actual_hours, orderData.id
      ]);
      console.log(`✅ Wymuszono aktualizację zlecenia ID: ${orderData.id}`);
    } else {
      // Dodaj nowe zlecenie
      await db.query(`
        INSERT INTO service_orders (id, order_number, client_id, device_id, assigned_user_id, status,
                                 priority, service_categories, completed_categories, work_photos,
                                 description, scheduled_date, actual_start_date, actual_end_date,
                                 completion_notes, actual_hours, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        orderData.id, orderData.order_number, orderData.client_id, orderData.device_id, 
        orderData.assigned_user_id, orderData.status, orderData.priority, 
        JSON.stringify(orderData.service_categories), JSON.stringify(orderData.completed_categories),
        JSON.stringify(orderData.work_photos), orderData.description, orderData.scheduled_date, 
        orderData.actual_start_date, orderData.actual_end_date, orderData.completion_notes, 
        orderData.actual_hours
      ]);
      console.log(`✅ Dodano nowe zlecenie ID: ${orderData.id}`);
    }
    
    res.json({ success: true, message: 'Order force updated successfully' });
  } catch (error) {
    console.error('❌ Błąd wymuszenia aktualizacji zlecenia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 