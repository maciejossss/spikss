const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const ensureOrderColumns = require('../utils/ensureOrderColumns');

let ensureColumnsPromise = null;
async function ensureColumnsOnce() {
  if (!ensureColumnsPromise) {
    ensureColumnsPromise = ensureOrderColumns(db).catch(err => {
      ensureColumnsPromise = null;
      throw err;
    });
  }
  return ensureColumnsPromise;
}

router.use(async (_req, res, next) => {
  try {
    await ensureColumnsOnce();
    next();
  } catch (err) {
    console.error('ensure order columns failed (sync)', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Helper: resolve various user identifiers to Railway users.id (robust and idempotent)
async function resolveUserIdSafe(maybeIdOrUsername) {
  try {
    if (maybeIdOrUsername == null) return null;
    // Numeric candidate
    const numeric = Number(maybeIdOrUsername);
    if (Number.isInteger(numeric) && numeric > 0) {
      // 1) Exact users.id
      try {
        const { rows } = await db.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [numeric]);
        if (rows && rows.length > 0) return rows[0].id;
      } catch (_) {}
      // 2) Map via users.external_id (desktop id)
      try {
        const { rows } = await db.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [numeric]);
        if (rows && rows.length > 0) return rows[0].id;
      } catch (_) {}
    }
    // String candidate → try username (case-insensitive)
    const username = String(maybeIdOrUsername || '').trim();
    if (username) {
      try {
        const { rows } = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
        if (rows && rows.length > 0) return rows[0].id;
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

// Helpers: sanitize incoming values to avoid PG type errors
function sanitizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeDate(value) {
  try {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Accept ISO with time, strip time
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    return null;
  } catch (_) { return null; }
}

function extractTime(value) {
  try {
    if (!value) return null;
    const s = String(value).trim();
    const m = s.match(/T(\d{2}:\d{2})/);
    return m ? m[1] + ':00' : null;
  } catch (_) { return null; }
}

// POST /api/sync/users - Synchronizuj użytkowników z desktop do Railway
router.post('/users', async (req, res) => {
  try {
    const usersData = req.body;
    
    // Sprawdź czy usersData jest tablicą
    if (!Array.isArray(usersData)) {
      console.error('❌ usersData nie jest tablicą:', typeof usersData);
      return res.status(400).json({ 
        success: false, 
        error: 'usersData must be an array' 
      });
    }
    
    console.log(`📤 Otrzymano ${usersData.length} użytkowników do synchronizacji.`);
    let syncedCount = 0;

    const bcrypt = require('bcryptjs');
    for (const userData of usersData) {
      const existingUser = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [userData.username]);

      if (existingUser.rows.length > 0) {
        // Update existing user
        await db.query(`
          UPDATE users SET
            full_name = $1,
            email = $2,
            phone = $3,
            role = $4,
            is_active = $5,
            mobile_authorized = COALESCE($6, mobile_authorized),
            mobile_pin_hash = COALESCE($7, mobile_pin_hash),
            external_id = COALESCE($9, external_id),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [
          userData.full_name,
          userData.email,
          userData.phone || null,
          userData.role,
          !!userData.is_active,
          (userData.mobile_authorized == null ? null : !!userData.mobile_authorized),
          (userData.mobile_pin_hash && String(userData.mobile_pin_hash).length >= 20) ? String(userData.mobile_pin_hash) : null,
          existingUser.rows[0].id,
          userData.id || null
        ]);

        // Obsłuż mobilny PIN: preferuj dostarczony hash, w przeciwnym razie zhashuj PIN
        if (userData.mobile_pin_hash && String(userData.mobile_pin_hash).length >= 20) {
          await db.query('UPDATE users SET mobile_pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [String(userData.mobile_pin_hash), existingUser.rows[0].id]);
        } else if (userData.mobile_pin && /^[0-9]{4,8}$/.test(String(userData.mobile_pin))) {
          const hash = await bcrypt.hash(String(userData.mobile_pin), 10);
          await db.query('UPDATE users SET mobile_pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, existingUser.rows[0].id]);
        }
        syncedCount++;
        console.log(`🔄 Zaktualizowano użytkownika: ${userData.username}`);
      } else {
        // Insert new user
        await db.query(`
          INSERT INTO users (username, full_name, email, phone, role, is_active, mobile_authorized, password_hash, mobile_pin_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          userData.username,
          userData.full_name,
          userData.email || null,
          userData.phone || null,
          userData.role,
          !!userData.is_active,
          !!userData.mobile_authorized,
          'default_password_hash',
          userData.mobile_pin_hash && String(userData.mobile_pin_hash).length >= 20
            ? String(userData.mobile_pin_hash)
            : ((userData.mobile_pin && /^[0-9]{4,8}$/.test(String(userData.mobile_pin))) ? await bcrypt.hash(String(userData.mobile_pin), 10) : null)
        ]);
        // ustaw external_id jeśli przyszedł z desktopu
        if (userData.id) {
          await db.query('UPDATE users SET external_id = $1 WHERE username = $2', [userData.id, userData.username]);
        }
        syncedCount++;
        console.log(`✨ Dodano nowego użytkownika: ${userData.username}`);
      }
    }
    res.json({ success: true, message: `${usersData.length} users processed`, syncedCount });
  } catch (error) {
    console.error('❌ Błąd synchronizacji użytkowników:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sync/users/:id - usuń użytkownika (synchronizacja desktop → Railway)
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Błąd usuwania użytkownika (sync):', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sync/users/by-username/:username - bezpieczne usuwanie po username
router.delete('/users/by-username/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) return res.status(400).json({ success: false, error: 'Invalid username' });
    await db.query('DELETE FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Błąd usuwania użytkownika po username (sync):', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sync/users - usuń wszystkich poza wskazaną listą ID (opcjonalnie dryRun)
router.delete('/users', express.json(), async (req, res) => {
  try {
    const keepIds = Array.isArray(req.body && req.body.keepIds) ? req.body.keepIds.map(n => Number(n)).filter(n => Number.isInteger(n) && n > 0) : [];
    const dryRun = !!(req.body && req.body.dryRun);
    const { rows } = await db.query('SELECT id, username FROM users');
    const toDelete = rows.filter(u => !keepIds.includes(u.id));
    if (dryRun) {
      return res.json({ success: true, dryRun: true, willDelete: toDelete });
    }
    for (const u of toDelete) {
      await db.query('DELETE FROM users WHERE id = $1', [u.id]);
    }
    return res.json({ success: true, deleted: toDelete.map(u => ({ id: u.id, username: u.username })), kept: keepIds });
  } catch (error) {
    console.error('❌ Błąd masowego usuwania użytkowników (sync):', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/clients - Synchronizuj klientów z desktop do Railway
router.post('/clients', async (req, res) => {
  try {
    // Akceptuj trzy formaty: [ ... ], { clients: [...] }, { client: { ... } } lub pojedynczy obiekt
    let clientsData = req.body;
    if (clientsData && typeof clientsData === 'object' && !Array.isArray(clientsData)) {
      if (Array.isArray(clientsData.clients)) clientsData = clientsData.clients;
      else if (clientsData.client && typeof clientsData.client === 'object') clientsData = [clientsData.client];
    }
    if (!Array.isArray(clientsData)) clientsData = [clientsData].filter(Boolean);
    if (!Array.isArray(clientsData)) clientsData = [];
    // Filtruj do dozwolonych pól, aby być odpornym na inne kształty
    clientsData = clientsData.map(c => ({
      external_id: c?.external_id ?? c?.externalId ?? c?.external_client_id ?? c?.client_external_id ?? null,
      first_name: c?.first_name ?? null,
      last_name: c?.last_name ?? null,
      company_name: c?.company_name ?? null,
      type: c?.type ?? 'individual',
      email: c?.email ?? null,
      phone: c?.phone ?? null,
      address: c?.address ?? null,
      address_street: c?.address_street ?? null,
      address_city: c?.address_city ?? null,
      address_postal_code: c?.address_postal_code ?? null,
      address_country: c?.address_country ?? null,
      nip: c?.nip ?? null,
      regon: c?.regon ?? null,
      contact_person: c?.contact_person ?? null,
      notes: c?.notes ?? null,
      is_active: (c?.is_active !== false)
    }));
    
    console.log(`📤 Otrzymano ${clientsData.length} klientów do synchronizacji.`);

    for (const clientData of clientsData) {
      let existingClient = { rows: [] };
      // PRIORYTET 1: external_id - to jest klucz synchronizacji między desktop a Railway
      if (clientData.external_id) {
        existingClient = await db.query('SELECT id FROM clients WHERE external_id = $1 LIMIT 1', [clientData.external_id]);
      }
      // PRIORYTET 2: email (fallback dla starych rekordów bez external_id)
      if ((!existingClient.rows || existingClient.rows.length === 0) && clientData.email) {
        existingClient = await db.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [clientData.email]);
      }
      // PRIORYTET 3: ID z payloadu (tylko jeśli external_id nie istnieje i email nie pasuje)
      // Używamy ID tylko jako ostatni fallback, bo Railway ID może różnić się od desktop ID
      const requestedId = clientData.id != null ? parseInt(clientData.id, 10) : null
      if ((!existingClient.rows || existingClient.rows.length === 0) && requestedId && Number.isInteger(requestedId) && requestedId > 0) {
        existingClient = await db.query('SELECT id FROM clients WHERE id = $1 LIMIT 1', [requestedId]);
      }

      if (existingClient.rows.length > 0) {
        // Update existing client
        await db.query(`
          UPDATE clients SET
            external_id = COALESCE($1, external_id),
            first_name = $2,
            last_name = $3,
            company_name = $4,
            type = $5,
            phone = $6,
            address = $7,
            address_street = $8,
            address_city = $9,
            address_postal_code = $10,
            address_country = $11,
            nip = $12,
            regon = $13,
            contact_person = $14,
            notes = $15,
            is_active = $16,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $17
        `, [
          clientData.external_id,
          clientData.first_name,
          clientData.last_name,
          clientData.company_name,
          clientData.type,
          clientData.phone,
          clientData.address,
          clientData.address_street,
          clientData.address_city,
          clientData.address_postal_code,
          clientData.address_country,
          clientData.nip,
          clientData.regon,
          clientData.contact_person,
          clientData.notes,
          clientData.is_active,
          existingClient.rows[0].id
        ]);
        console.log(`🔄 Zaktualizowano klienta: ${clientData.email}`);
      } else {
        // Insert new client - Railway użyje AUTO_INCREMENT ID (może różnić się od desktop ID)
        // Ważne: external_id jest kluczem synchronizacji, nie ID!
        await db.query(`
          INSERT INTO clients (
            external_id, first_name, last_name, company_name, type, email, phone, address,
            address_street, address_city, address_postal_code, address_country,
            nip, regon, contact_person, notes, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          clientData.external_id,
          clientData.first_name,
          clientData.last_name,
          clientData.company_name,
          clientData.type,
          clientData.email,
          clientData.phone,
          clientData.address,
          clientData.address_street,
          clientData.address_city,
          clientData.address_postal_code,
          clientData.address_country,
          clientData.nip,
          clientData.regon,
          clientData.contact_person,
          clientData.notes,
          clientData.is_active
        ]);
        console.log(`✨ Dodano nowego klienta (external_id=${clientData.external_id}): ${clientData.email}`);
      }
    }
    res.json({ success: true, message: `${clientsData.length} clients synced to Railway PostgreSQL` });
  } catch (error) {
    console.error('❌ Błąd synchronizacji klientów:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/devices - Synchronizuj urządzenia z desktop do Railway
router.post('/devices', async (req, res) => {
  try {
    // Akceptuj trzy formaty: [ ... ], { devices: [...] }, { device: { ... } } lub pojedynczy obiekt
    let devicesData = req.body;
    if (devicesData && typeof devicesData === 'object' && !Array.isArray(devicesData)) {
      if (Array.isArray(devicesData.devices)) devicesData = devicesData.devices;
      else if (devicesData.device && typeof devicesData.device === 'object') devicesData = [devicesData.device];
    }
    if (!Array.isArray(devicesData)) devicesData = [devicesData].filter(Boolean);
    if (!Array.isArray(devicesData)) devicesData = [];
    // Normalizacja pól wejściowych
    devicesData = devicesData.map(d => ({
      external_id: d?.external_id ?? d?.externalId ?? d?.external_device_id ?? d?.device_external_id ?? null,
      client_external_id: d?.client_external_id ?? d?.external_client_id ?? null,
      client_id: d?.client_id ?? null,
      category_id: d?.category_id ?? null,
      name: d?.name ?? null,
      manufacturer: d?.manufacturer ?? d?.brand ?? null,
      model: d?.model ?? null,
      serial_number: d?.serial_number ?? null,
      production_year: d?.production_year ?? null,
      power_rating: d?.power_rating ?? null,
      fuel_type: d?.fuel_type ?? null,
      installation_date: d?.installation_date ?? d?.installationDate ?? null,
      last_service_date: d?.last_service_date ?? d?.lastService ?? null,
      next_service_date: d?.next_service_date ?? d?.nextService ?? null,
      warranty_end_date: d?.warranty_end_date ?? null,
      technical_data: d?.technical_data ?? null,
      notes: d?.notes ?? null,
      is_active: (d?.is_active !== false)
    }));
    
    console.log(`📤 Otrzymano ${devicesData.length} urządzeń do synchronizacji.`);

    for (const deviceData of devicesData) {
      let clientIdResolved = null;
      try {
        clientIdResolved = await resolveClientIdSafe({
          external_client_id: deviceData.client_external_id,
          client_external_id: deviceData.client_external_id,
          client_id: deviceData.client_id
        });
      } catch (_) { clientIdResolved = null; }
      const fallbackClientId = deviceData.client_id != null ? Number(deviceData.client_id) : null;
      const clientIdForInsert = clientIdResolved != null
        ? clientIdResolved
        : (Number.isInteger(fallbackClientId) ? fallbackClientId : null);

      let existingDevice = { rows: [] };
      // PRIORYTET 1: external_id - to jest klucz synchronizacji między desktop a Railway
      if (deviceData.external_id) {
        existingDevice = await db.query('SELECT id FROM devices WHERE external_id = $1 LIMIT 1', [deviceData.external_id]);
      }
      // PRIORYTET 2: serial_number (fallback dla starych rekordów bez external_id)
      if ((!existingDevice.rows || existingDevice.rows.length === 0) && deviceData.serial_number) {
        existingDevice = await db.query('SELECT id FROM devices WHERE serial_number = $1 LIMIT 1', [deviceData.serial_number]);
      }
      // PRIORYTET 3: ID z payloadu (tylko jeśli external_id nie istnieje i serial_number nie pasuje)
      // Używamy ID tylko jako ostatni fallback, bo Railway ID może różnić się od desktop ID
      const requestedId = deviceData.id != null ? parseInt(deviceData.id, 10) : null
      if ((!existingDevice.rows || existingDevice.rows.length === 0) && requestedId && Number.isInteger(requestedId) && requestedId > 0) {
        existingDevice = await db.query('SELECT id FROM devices WHERE id = $1 LIMIT 1', [requestedId]);
      }

      if (existingDevice.rows.length > 0) {
        // Update existing device
        await db.query(`
          UPDATE devices SET
            external_id = COALESCE($1, external_id),
            client_id = $2,
            category_id = $3,
            name = $4,
            manufacturer = $5,
            model = $6,
            production_year = $7,
            power_rating = $8,
            fuel_type = $9,
            installation_date = $10,
            last_service_date = $11,
            next_service_date = $12,
            warranty_end_date = $13,
            technical_data = $14,
            notes = $15,
            is_active = $16,
            brand = $17,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $18
        `, [
          deviceData.external_id,
          clientIdForInsert,
          deviceData.category_id,
          deviceData.name,
          deviceData.manufacturer,
          deviceData.model,
          deviceData.production_year,
          deviceData.power_rating,
          deviceData.fuel_type,
          deviceData.installation_date,
          deviceData.last_service_date,
          deviceData.next_service_date,
          deviceData.warranty_end_date,
          deviceData.technical_data,
          deviceData.notes,
          deviceData.is_active,
          deviceData.brand,
          existingDevice.rows[0].id
        ]);
        console.log(`🔄 Zaktualizowano urządzenie: ${deviceData.serial_number}`);
      } else {
        // Insert new device - Railway użyje AUTO_INCREMENT ID (może różnić się od desktop ID)
        // Ważne: external_id jest kluczem synchronizacji, nie ID!
        await db.query(`
          INSERT INTO devices (
            external_id, client_id, category_id, name, manufacturer, model, serial_number,
            production_year, power_rating, fuel_type, installation_date,
            last_service_date, next_service_date, warranty_end_date,
            technical_data, notes, is_active, brand
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          deviceData.external_id,
          clientIdForInsert,
          deviceData.category_id,
          deviceData.name,
          deviceData.manufacturer,
          deviceData.model,
          deviceData.serial_number,
          deviceData.production_year,
          deviceData.power_rating,
          deviceData.fuel_type,
          deviceData.installation_date,
          deviceData.last_service_date,
          deviceData.next_service_date,
          deviceData.warranty_end_date,
          deviceData.technical_data,
          deviceData.notes,
          deviceData.is_active,
          deviceData.brand
        ]);
        console.log(`✨ Dodano nowe urządzenie (external_id=${deviceData.external_id}): ${deviceData.serial_number}`);
      }
    }
    res.json({ success: true, message: `${devicesData.length} devices synced to Railway PostgreSQL` });
  } catch (error) {
    console.error('❌ Błąd synchronizacji urządzeń:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/orders - Synchronizuj zlecenie z desktop do Railway
router.post('/orders', async (req, res) => {
  try {
    const ordersData = req.body;
    
    // Sprawdź czy ordersData jest tablicą
    if (!Array.isArray(ordersData)) {
      console.error('❌ ordersData nie jest tablicą:', typeof ordersData);
      return res.status(400).json({ 
        success: false, 
        error: 'ordersData must be an array' 
      });
    }
    
    console.log(`📤 Otrzymano ${ordersData.length} zleceń do synchronizacji.`);

    // Helpery mapujące ID klienta/urządzenia z desktop po unikalnych polach na Railway
    async function resolveClientIdSafe(data) {
      try {
        // 1) Preferuj email (najbezpieczniejszy klucz)
        if (data.client_email) {
          const { rows } = await db.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [data.client_email]);
          if (rows && rows.length > 0) return rows[0].id;
        }
        // 2) Opcjonalnie: wspieraj external_id (string)
        try {
          const extRaw = (
            data.external_client_id ??
            data.client_external_id ??
            data.external_id ??
            null
          );
          if (extRaw != null && String(extRaw).trim() !== '') {
            const ext = String(extRaw).trim();
            const { rows } = await db.query('SELECT id FROM clients WHERE external_id = $1 LIMIT 1', [ext]);
            if (rows && rows.length > 0) return rows[0].id;
          }
        } catch (_) { /* kolumna może nie istnieć – pomiń */ }
        // 3) NIE ufaj lokalnemu client_id z desktopu (może kolidować z innym klientem na Railway)
      } catch (_) {}
      return null;
    }

    async function resolveDeviceIdSafe(data) {
      try {
        const deviceExtRaw = data.external_device_id ?? data.device_external_id ?? data.external_id ?? null;
        if (deviceExtRaw != null && String(deviceExtRaw).trim() !== '') {
          const ext = String(deviceExtRaw).trim();
          const { rows } = await db.query('SELECT id FROM devices WHERE external_id = $1 LIMIT 1', [ext]);
          if (rows && rows.length > 0) return rows[0].id;
        }
        // Ufać tylko numerowi seryjnemu – ID z desktopu może wskazać inne urządzenie w Railway
        if (data.device_serial) {
          const { rows } = await db.query('SELECT id FROM devices WHERE serial_number = $1 LIMIT 1', [data.device_serial]);
          if (rows && rows.length > 0) return rows[0].id;
        }
      } catch (_) {}
      return null;
    }

    const client = await db.beginTransaction();
    try {
      for (const orderData of ordersData) {
        console.log('📤 Synchronizuję zlecenie:', orderData.order_number);
        const clientIdResolved = await resolveClientIdSafe(orderData);
        const deviceIdResolved = await resolveDeviceIdSafe(orderData);
        const externalId = (orderData.external_id != null ? parseInt(orderData.external_id) : (orderData.id != null ? parseInt(orderData.id) : null)) || null;
        const assignedUserResolved = await resolveUserIdSafe(orderData.assigned_user_id);
        const serviceCategoriesText = (() => {
          try {
            const sc = orderData && orderData.service_categories;
            if (Array.isArray(sc)) return JSON.stringify(sc);
            if (sc && typeof sc === 'object') return JSON.stringify(sc);
            if (typeof sc === 'string') return sc;
            return null;
          } catch (_) { return null; }
        })();
        const safeTitle = (orderData && (orderData.title || orderData.description)) || 'Zlecenie serwisowe';
        const scheduledDate = sanitizeDate(orderData && orderData.scheduled_date);
        const scheduledTime = extractTime(orderData && orderData.scheduled_date);
        try { console.log('[SYNC] incoming scheduled_date=', orderData && orderData.scheduled_date, '→ date=', scheduledDate, 'time=', scheduledTime); } catch (_) {}
        const estimatedHours = sanitizeNumber(orderData && orderData.estimated_hours);
        const partsCost = sanitizeNumber(orderData && orderData.parts_cost);
        const laborCost = sanitizeNumber(orderData && orderData.labor_cost);
        const totalCost = sanitizeNumber(orderData && orderData.total_cost);
        const partsUsed = (orderData.parts_used && String(orderData.parts_used).trim() !== '') 
          ? String(orderData.parts_used).trim() 
          : null;
        const completedAt = orderData.completed_at || null;
        const completionNotes = orderData.completion_notes ?? orderData.completionNotes ?? null;
        const completedCategoriesText = (() => {
          try {
            const raw = orderData.completed_categories ?? orderData.completedCategories;
            if (!raw) return null;
            if (typeof raw === 'string') {
              const trimmed = raw.trim();
              return trimmed.length ? trimmed : null;
            }
            return JSON.stringify(raw);
          } catch (_) {
            return null;
          }
        })();
        const workPhotosText = (() => {
          try {
            const raw = orderData.work_photos ?? orderData.workPhotos;
            if (!raw) return null;
            if (typeof raw === 'string') {
              const trimmed = raw.trim();
              return trimmed.length ? trimmed : null;
            }
            return JSON.stringify(raw);
          } catch (_) {
            return null;
          }
        })();
        const actualHours = sanitizeNumber(orderData.actual_hours ?? orderData.actualHours);
        const actualStartDate = sanitizeDate(orderData.actual_start_date ?? orderData.actualStartDate ?? orderData.started_at);
        const actualEndDate = sanitizeDate(orderData.actual_end_date ?? orderData.actualEndDate ?? orderData.completed_at);
        const startedAtValue = orderData.started_at || null;
        
        let existingByExternal = { rows: [] };
        if (externalId) {
          try {
            existingByExternal = await client.query('SELECT id FROM service_orders WHERE external_id = $1', [externalId]);
          } catch (_) { existingByExternal = { rows: [] }; }
        }

        let existingByNumber = { rows: [] };
        if (!existingByExternal.rows.length && orderData.order_number) {
          existingByNumber = await client.query('SELECT id, client_id, device_id FROM service_orders WHERE order_number = $1', [orderData.order_number]);
        }
        
        if (existingByExternal.rows.length > 0) {
          const recId = existingByExternal.rows[0].id;
          await client.query(`
            UPDATE service_orders SET
              external_id = COALESCE($1, external_id),
              client_id = COALESCE($2, client_id),
              device_id = COALESCE($3, device_id),
              assigned_user_id = COALESCE($4, assigned_user_id),
              type = $5,
              service_categories = $6,
              completed_categories = COALESCE($7, completed_categories),
              status = $8,
              priority = $9,
              title = $10,
              description = $11,
              scheduled_date = $12,
              scheduled_time = COALESCE($13, scheduled_time),
              actual_start_date = COALESCE($14, actual_start_date),
              actual_end_date = COALESCE($15, actual_end_date),
              started_at = COALESCE($16, started_at),
              completed_at = COALESCE($17, completed_at),
              estimated_hours = $18,
              actual_hours = COALESCE($19, actual_hours),
              parts_cost = $20,
              labor_cost = $21,
              total_cost = $22,
              estimated_cost_note = COALESCE($23, estimated_cost_note),
              notes = COALESCE($24, notes),
              completion_notes = COALESCE($25, completion_notes),
              parts_used = COALESCE($26, parts_used),
              work_photos = COALESCE($27, work_photos),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $28
          `, [
            externalId,
            clientIdResolved,
            deviceIdResolved,
            assignedUserResolved || null,
            orderData.type,
            serviceCategoriesText,
            completedCategoriesText,
            orderData.status || 'new',
            orderData.priority || 'medium',
            safeTitle,
            orderData.description,
            scheduledDate,
            scheduledTime,
            actualStartDate,
            actualEndDate,
            startedAtValue,
            completedAt,
            estimatedHours,
            actualHours,
            partsCost,
            laborCost,
            totalCost,
            orderData.estimated_cost_note || orderData.estimate_text || null,
            orderData.notes,
            completionNotes,
            partsUsed,
            workPhotosText,
            recId
          ]);
          console.log('✅ Zlecenie zaktualizowane w Railway (external_id)');
        } else if (existingByNumber.rows.length > 0) {
          console.log('⚠️ Zlecenie już istnieje, aktualizuję...');
          const current = existingByNumber.rows[0];
          const mismatch = (
            (clientIdResolved && current.client_id && clientIdResolved !== current.client_id) ||
            (deviceIdResolved && current.device_id && deviceIdResolved !== current.device_id)
          );
          if (mismatch) {
            const hasReliableClientMapping = !!orderData.client_email && !!clientIdResolved;
            if (hasReliableClientMapping) {
              const pick = await client.query(
                `SELECT id FROM service_orders WHERE order_number = $1 ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1`,
                [orderData.order_number]
              );
              const targetId = (pick.rows && pick.rows[0]) ? pick.rows[0].id : null;
              if (targetId) {
              await client.query(`
                  UPDATE service_orders SET
                    external_id = COALESCE($1, external_id),
                    client_id = COALESCE($2, client_id),
                    device_id = COALESCE($3, device_id),
                    assigned_user_id = COALESCE($4, assigned_user_id),
                    type = $5,
                    service_categories = $6,
                    completed_categories = COALESCE($7, completed_categories),
                    status = $8,
                    priority = $9,
                    title = $10,
                    description = $11,
                    scheduled_date = $12,
                    scheduled_time = COALESCE($13, scheduled_time),
                    actual_start_date = COALESCE($14, actual_start_date),
                    actual_end_date = COALESCE($15, actual_end_date),
                    started_at = COALESCE($16, started_at),
                    completed_at = COALESCE($17, completed_at),
                    estimated_hours = $18,
                    actual_hours = COALESCE($19, actual_hours),
                    parts_cost = $20,
                    labor_cost = $21,
                    total_cost = $22,
                    estimated_cost_note = COALESCE($23, estimated_cost_note),
                    notes = COALESCE($24, notes),
                    completion_notes = COALESCE($25, completion_notes),
                    parts_used = COALESCE($26, parts_used),
                    work_photos = COALESCE($27, work_photos),
                    updated_at = CURRENT_TIMESTAMP
                  WHERE id = $28
                `, [
                  externalId,
                  clientIdResolved,
                  deviceIdResolved,
                  assignedUserResolved || null,
                  orderData.type,
                  serviceCategoriesText,
                  completedCategoriesText,
                  orderData.status || 'new',
                  orderData.priority || 'medium',
                  safeTitle,
                  orderData.description,
                  scheduledDate,
                  scheduledTime,
                  actualStartDate,
                  actualEndDate,
                  startedAtValue,
                  completedAt,
                  estimatedHours,
                  actualHours,
                  partsCost,
                  laborCost,
                  totalCost,
                  orderData.estimated_cost_note || orderData.estimate_text || null,
                  orderData.notes,
                  completionNotes,
                  partsUsed,
                  workPhotosText,
                  targetId
                ]);
                try {
                  await client.query(
                    `UPDATE service_orders SET status = CASE WHEN status = 'completed' THEN status ELSE 'archived' END, updated_at = CURRENT_TIMESTAMP
                     WHERE order_number = $1 AND id <> $2`,
                    [orderData.order_number, targetId]
                  );
                } catch (_) {}
              }
              console.log('✅ Naprawiono mapowanie klienta/urządzenia dla istniejącego order_number na Railway');
            } else {
              const newOrderNumber = `${String(orderData.order_number)}-${Date.now().toString().slice(-4)}`;
              await client.query(`
                INSERT INTO service_orders (
                  order_number, external_id, client_id, device_id, type, service_categories, completed_categories,
                  status, priority, title, description, scheduled_date, scheduled_time,
                  actual_start_date, actual_end_date, started_at, completed_at,
                  estimated_hours, actual_hours, parts_cost, labor_cost, total_cost,
                  estimated_cost_note, notes, completion_notes, parts_used, work_photos,
                  assigned_user_id
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
              `, [
                newOrderNumber,
                externalId,
                clientIdResolved,
                deviceIdResolved,
                orderData.type,
                orderData.service_categories,
                completedCategoriesText,
                orderData.status || 'new',
                orderData.priority || 'medium',
                orderData.title,
                orderData.description,
                scheduledDate,
                scheduledTime,
                actualStartDate,
                actualEndDate,
                startedAtValue,
                completedAt,
                estimatedHours,
                actualHours,
                partsCost || 0,
                laborCost || 0,
                totalCost || 0,
                orderData.estimated_cost_note || orderData.estimate_text || null,
                orderData.notes,
                completionNotes,
                partsUsed,
                workPhotosText,
                assignedUserResolved || null
              ]);
              console.log('✅ Utworzono nowe zlecenie (unik kolizji order_number) w Railway');
            }
          } else {
            await client.query(`
            UPDATE service_orders SET
              external_id = COALESCE($1, external_id),
              client_id = COALESCE($2, client_id),
              device_id = COALESCE($3, device_id),
              assigned_user_id = COALESCE($4, assigned_user_id),
              type = $5,
              service_categories = $6,
              completed_categories = COALESCE($7, completed_categories),
              status = $8,
              priority = $9,
              title = $10,
              description = $11,
              scheduled_date = $12,
              scheduled_time = COALESCE($13, scheduled_time),
              actual_start_date = COALESCE($14, actual_start_date),
              actual_end_date = COALESCE($15, actual_end_date),
              started_at = COALESCE($16, started_at),
              completed_at = COALESCE($17, completed_at),
              estimated_hours = $18,
              actual_hours = COALESCE($19, actual_hours),
              parts_cost = $20,
              labor_cost = $21,
              total_cost = $22,
              estimated_cost_note = COALESCE($23, estimated_cost_note),
              notes = COALESCE($24, notes),
              completion_notes = COALESCE($25, completion_notes),
              parts_used = COALESCE($26, parts_used),
              work_photos = COALESCE($27, work_photos),
              updated_at = CURRENT_TIMESTAMP
            WHERE order_number = $28
          `, [
            externalId,
            clientIdResolved,
            deviceIdResolved,
            assignedUserResolved || null,
            orderData.type,
            serviceCategoriesText,
            completedCategoriesText,
            orderData.status || 'new',
            orderData.priority || 'medium',
            safeTitle,
            orderData.description,
            scheduledDate,
            scheduledTime,
            actualStartDate,
            actualEndDate,
            startedAtValue,
            completedAt,
            estimatedHours,
            actualHours,
            partsCost,
            laborCost,
            totalCost,
            orderData.estimated_cost_note || orderData.estimate_text || null,
            orderData.notes,
            completionNotes,
            partsUsed,
            workPhotosText,
            orderData.order_number
          ]);
            console.log('✅ Zlecenie zaktualizowane w Railway');
          }
        } else {
          console.log('📋 Tworzę nowe zlecenie w Railway...');
          await client.query(`
            INSERT INTO service_orders (
              order_number, external_id, client_id, device_id, type, service_categories, completed_categories,
              status, priority, title, description, scheduled_date, scheduled_time,
              actual_start_date, actual_end_date, started_at, completed_at,
              estimated_hours, actual_hours, parts_cost, labor_cost, total_cost, estimated_cost_note,
              notes, completion_notes, parts_used, work_photos, assigned_user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
          `, [
            orderData.order_number,
            externalId,
            clientIdResolved,
            deviceIdResolved,
            orderData.type,
            serviceCategoriesText,
            completedCategoriesText,
            orderData.status || 'new',
            orderData.priority || 'medium',
            safeTitle,
            orderData.description,
            scheduledDate,
            scheduledTime,
            actualStartDate,
            actualEndDate,
            startedAtValue,
            completedAt,
            estimatedHours,
            actualHours,
            partsCost,
            laborCost,
            totalCost,
            orderData.estimated_cost_note || orderData.estimate_text || null,
            orderData.notes,
            completionNotes,
            partsUsed,
            workPhotosText,
            assignedUserResolved || null
          ]);
          console.log('✅ Nowe zlecenie utworzone w Railway');
        }
      }
      await db.commitTransaction(client);
    } catch (e) {
      try { await db.rollbackTransaction(client); } catch (_) {}
      throw e;
    }
    
    res.json({
      success: true,
      message: `${ordersData.length} zleceń zsynchronizowanych`,
      count: ordersData.length
    });
    
  } catch (error) {
    console.error('❌ Błąd synchronizacji zleceń:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/orders/attach
// Body: { orderNumber: string, client_email?: string, device_serial?: string }
// Działanie: bezpiecznie podpinamy klienta/urządzenie do najnowszego rekordu z tym orderNumber.
router.post('/orders/attach', async (req, res) => {
  try {
    const orderNumber = String(req.body?.orderNumber || '').trim();
    if (!orderNumber) return res.status(400).json({ success: false, error: 'orderNumber is required' });

    const email = (req.body?.client_email && String(req.body.client_email).trim()) || null;
    const serial = (req.body?.device_serial && String(req.body.device_serial).trim()) || null;

    let clientId = null;
    let deviceId = null;
    if (email) {
      try {
        const { rows } = await db.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [email]);
        if (rows && rows.length > 0) clientId = rows[0].id;
      } catch (_) {}
    }
    if (serial) {
      try {
        const { rows } = await db.query('SELECT id FROM devices WHERE serial_number = $1 LIMIT 1', [serial]);
        if (rows && rows.length > 0) deviceId = rows[0].id;
      } catch (_) {}
    }

    // Znajdź najnowszy rekord tego zlecenia
    const pick = await db.query(
      `SELECT id FROM service_orders WHERE order_number = $1 ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1`,
      [orderNumber]
    );
    if (!pick.rows || pick.rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
    const targetId = pick.rows[0].id;

    // Zaktualizuj tylko jeśli mamy co podpiąć
    if (!clientId && !deviceId) return res.json({ success: true, message: 'Nothing to attach', targetId });

    await db.query(
      `UPDATE service_orders SET
         client_id = CASE WHEN $1::int IS NOT NULL THEN $1 ELSE client_id END,
         device_id = CASE WHEN $2::int IS NOT NULL THEN $2 ELSE device_id END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [clientId, deviceId, targetId]
    );

    return res.json({ success: true, message: 'Attached', order_number: orderNumber, client_id: clientId, device_id: deviceId, id: targetId });
  } catch (error) {
    console.error('❌ /api/sync/orders/attach error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sync/assign - Przypisz zlecenie do technika
router.put('/assign', async (req, res) => {
  try {
    const { orderNumber, technicianId, notes, status, assignedAt } = req.body;
    
    console.log(`📤 Przypisuję zlecenie ${orderNumber} do technika ${technicianId}`);
    
    // Zmapuj technicianId do prawdziwego users.id na Railway (obsługa external_id/username)
    const mappedUserId = await resolveUserIdSafe(technicianId);

    // Aktualizuj przypisanie zlecenia
    await db.query(`
      UPDATE service_orders SET
        assigned_user_id = $1,
        status = CASE WHEN status = 'in_progress' THEN 'in_progress' ELSE COALESCE($2,'assigned') END,
        notes = COALESCE(notes, '') || $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE order_number = $4
    `, [
      mappedUserId,
      status || 'assigned',
      notes ? `\nPrzypisane: ${notes}` : '',
      orderNumber
    ]);
    
    console.log('✅ Zlecenie przypisane do technika');
    
    res.json({
      success: true,
      message: 'Zlecenie przypisane',
      order_number: orderNumber,
      technician_id: mappedUserId
    });
    
  } catch (error) {
    console.error('❌ Błąd przypisania zlecenia:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd przypisania zlecenia',
      details: error.message
    });
  }
});

// POST /api/sync/users/authorize
// Body: { allowIds?: number[], allowUsernames?: string[], dryRun?: boolean }
// Działanie: ustawia mobile_authorized=true dla wskazanych kont, a dla pozostałych false (bez kasowania)
router.post('/users/authorize', express.json(), async (req, res) => {
  try {
    const allowIds = Array.isArray(req.body?.allowIds) ? req.body.allowIds.map(n => Number(n)).filter(n => Number.isInteger(n) && n > 0) : [];
    const allowUsernames = Array.isArray(req.body?.allowUsernames)
      ? req.body.allowUsernames.map(s => String(s).trim()).filter(Boolean)
      : [];
    const dryRun = !!req.body?.dryRun;

    // Zbuduj warunek wyboru do autoryzacji
    const params = [];
    const allowClauses = [];
    if (allowIds.length > 0) {
      allowClauses.push(`id = ANY($${params.push(allowIds)})`);
    }
    if (allowUsernames.length > 0) {
      allowClauses.push(`LOWER(username) = ANY($${params.push(allowUsernames.map(u => u.toLowerCase()))})`);
    }
    if (allowClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide allowIds or allowUsernames' });
    }

    const selectSql = `SELECT id, username, full_name, COALESCE(mobile_authorized, true) AS mobile_authorized FROM users`;
    const { rows: allUsers } = await db.query(selectSql);

    const { rows: toAuthorize } = await db.query(
      `SELECT id, username FROM users WHERE ${allowClauses.join(' OR ')}`,
      params
    );
    const allowedIdSet = new Set(toAuthorize.map(u => u.id));

    const disableList = allUsers.filter(u => !allowedIdSet.has(u.id));

    if (dryRun) {
      return res.json({ success: true, dryRun: true, authorize: Array.from(allowedIdSet), disable: disableList.map(u => ({ id: u.id, username: u.username })) });
    }

    // Autoryzuj wskazanych
    if (allowedIdSet.size > 0) {
      await db.query(`UPDATE users SET mobile_authorized = true, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [Array.from(allowedIdSet)]);
    }
    // Wyłącz u pozostałych
    if (disableList.length > 0) {
      await db.query(`UPDATE users SET mobile_authorized = false, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)`, [disableList.map(u => u.id)]);
    }

    return res.json({ success: true, authorized: Array.from(allowedIdSet), disabled: disableList.map(u => u.id) });
  } catch (error) {
    console.error('❌ Błąd masowej autoryzacji użytkowników:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 

// Note: legacy delete endpoint used by mobile UI
// Mounted after module.exports to avoid interfering with other imports
// (CommonJS allows adding properties after export as router is an object)
router.delete && router.delete('/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const pick = await db.query('SELECT status FROM service_orders WHERE id = $1 LIMIT 1', [id])
    if (!pick.rows || pick.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    const status = String(pick.rows[0].status || '').toLowerCase()
    if (status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Order not completed', status })
    }
    await db.query('DELETE FROM service_orders WHERE id = $1', [id])
    return res.json({ success: true, deleted: id })
  } catch (error) {
    console.error('DELETE /api/sync/orders/:id error', error)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// DELETE /api/sync/orders/by-number/:orderNumber - usuń zlecenie po order_number (używane przez desktop hard delete)
router.delete && router.delete('/orders/by-number/:orderNumber', async (req, res) => {
  try {
    // Wymagany admin secret, aby uniknąć przypadkowych kasowań
    const adminSecret = String(process.env.DELETE_ADMIN_SECRET || '').trim()
    const provided = String(req.get('X-Admin-Secret') || '').trim()
    if (!adminSecret || provided !== adminSecret) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    const orderNumber = String(req.params.orderNumber || '').trim()
    if (!orderNumber) return res.status(400).json({ success: false, error: 'Invalid orderNumber' })
    const pick = await db.query('SELECT id FROM service_orders WHERE order_number = $1', [orderNumber])
    if (!pick.rows || pick.rows.length === 0) {
      return res.json({ success: true, deleted: 0 })
    }
    await db.query('DELETE FROM service_orders WHERE order_number = $1', [orderNumber])
    return res.json({ success: true, deleted: pick.rows.length })
  } catch (error) {
    console.error('DELETE /api/sync/orders/by-number/:orderNumber error', error)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})