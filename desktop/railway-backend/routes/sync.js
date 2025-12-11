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

function normalizeExternalId(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function normalizePlain(value) {
  if (value == null) return null;
  const trimmed = String(value).trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function normalizePhone(value) {
  if (value == null) return null;
  const digits = String(value).replace(/\D+/g, '');
  return digits.length ? digits : null;
}

function buildClientFingerprint(data) {
  return {
    phone: normalizePhone(data?.phone),
    firstName: normalizePlain(data?.first_name),
    lastName: normalizePlain(data?.last_name),
    street: normalizePlain(data?.address_street),
    city: normalizePlain(data?.address_city)
  };
}

async function warnPotentialClientDuplicate(fingerprint, externalId) {
  try {
    if (!fingerprint) return;
    const conditions = [];
    const params = [];
    let idx = 1;
    if (fingerprint.phone) {
      conditions.push(`REGEXP_REPLACE(COALESCE(phone,''), '\\\\D', '', 'g') = $${idx++}`);
      params.push(fingerprint.phone);
    }
    if (fingerprint.lastName) {
      conditions.push(`LOWER(COALESCE(last_name,'')) = $${idx++}`);
      params.push(fingerprint.lastName);
    }
    if (!conditions.length) return;
    const where = conditions.join(' AND ');
    const { rows } = await db.query(
      `SELECT external_id FROM clients WHERE ${where} LIMIT 3`,
      params
    );
    if (rows && rows.length > 0) {
      console.warn(`[SYNC WARNING] potential client duplicate for external_id=${externalId}`, {
        matches: rows.map(r => r.external_id).filter(Boolean)
      });
    }
  } catch (error) {
    console.warn('[SYNC WARNING] fingerprint duplicate check failed:', error?.message || error);
  }
}

async function warnPotentialDeviceDuplicate(deviceData, externalId) {
  try {
    const serial = deviceData && deviceData.serial_number ? String(deviceData.serial_number).trim() : null;
    if (!serial) return;
    const { rows } = await db.query('SELECT external_id FROM devices WHERE serial_number = $1 LIMIT 3', [serial]);
    if (rows && rows.length > 0) {
      console.warn(`[SYNC WARNING] potential device duplicate for external_id=${externalId}`, {
        serial_number: serial,
        matches: rows.map(r => r.external_id).filter(Boolean)
      });
    }
  } catch (error) {
    console.warn('[SYNC WARNING] serial duplicate check failed:', error?.message || error);
  }
}

function logQueuePause(scope, reason, items) {
  let preview = '';
  try {
    preview = JSON.stringify(items).slice(0, 500);
  } catch (_) {}
  console.error(`SYNC ERROR 409 ${scope} ${reason} → retry disabled → QUEUE PAUSED ${preview}`);
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

    const conflicts = [];
    let inserted = 0;
    let updated = 0;

    for (const clientData of clientsData) {
      const externalId = normalizeExternalId(clientData.external_id);
      const fingerprint = buildClientFingerprint(clientData);

      if (!externalId) {
        conflicts.push({
          type: 'missing_external_id',
          fingerprint,
          email: clientData.email || null
        });
        continue;
      }

      const existingClient = await db.query('SELECT id FROM clients WHERE external_id = $1 LIMIT 1', [externalId]);

      if (existingClient.rows.length > 0) {
        await db.query(`
          UPDATE clients SET
            external_id = $1,
            first_name = $2,
            last_name = $3,
            company_name = $4,
            type = $5,
            email = $6,
            phone = $7,
            address = $8,
            address_street = $9,
            address_city = $10,
            address_postal_code = $11,
            address_country = $12,
            nip = $13,
            regon = $14,
            contact_person = $15,
            notes = $16,
            is_active = $17,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $18
        `, [
          externalId,
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
          clientData.is_active,
          existingClient.rows[0].id
        ]);
        updated++;
        console.log(`🔄 Zaktualizowano klienta external_id=${externalId}`);
      } else {
        await warnPotentialClientDuplicate(fingerprint, externalId);
        await db.query(`
          INSERT INTO clients (
            external_id, first_name, last_name, company_name, type, email, phone, address,
            address_street, address_city, address_postal_code, address_country,
            nip, regon, contact_person, notes, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          externalId,
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
        inserted++;
        console.log(`✨ Dodano nowego klienta (external_id=${externalId})`);
      }
    }

    if (conflicts.length > 0) {
      logQueuePause('/api/sync/clients', 'missing_or_invalid_external_id', conflicts);
      return res.status(409).json({
        success: false,
        error: 'QUEUE_PAUSED',
        conflicts,
        queuePaused: true
      });
    }

    res.json({
      success: true,
      message: `${clientsData.length} clients processed`,
      stats: { inserted, updated }
    });
  } catch (error) {
    console.error('❌ Błąd synchronizacji klientów:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/devices - Synchronizuj urządzenia z desktop do Railway
router.post('/devices', async (req, res) => {
  try {
    let devicesData = req.body;
    if (devicesData && typeof devicesData === 'object' && !Array.isArray(devicesData)) {
      if (Array.isArray(devicesData.devices)) devicesData = devicesData.devices;
      else if (devicesData.device && typeof devicesData.device === 'object') devicesData = [devicesData.device];
    }
    if (!Array.isArray(devicesData)) devicesData = [devicesData].filter(Boolean);
    if (!Array.isArray(devicesData)) devicesData = [];
    devicesData = devicesData.map(d => ({
      external_id: d?.external_id ?? d?.externalId ?? d?.external_device_id ?? d?.device_external_id ?? null,
      client_external_id: d?.client_external_id ?? d?.external_client_id ?? null,
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
      is_active: (d?.is_active !== false),
      brand: d?.brand ?? null
    }));

    console.log(`📤 Otrzymano ${devicesData.length} urządzeń do synchronizacji.`);

    const conflicts = [];
    let inserted = 0;
    let updated = 0;

    for (const deviceData of devicesData) {
      const externalId = normalizeExternalId(deviceData.external_id);
      if (!externalId) {
        conflicts.push({
          type: 'missing_external_id',
          serial_number: deviceData.serial_number || null
        });
        continue;
      }

      const clientExternalId = normalizeExternalId(deviceData.client_external_id);
      if (!clientExternalId) {
        conflicts.push({
          type: 'missing_client_external_id',
          device_external_id: externalId,
          serial_number: deviceData.serial_number || null
        });
        continue;
      }

      const clientRow = await db.query('SELECT id FROM clients WHERE external_id = $1 LIMIT 1', [clientExternalId]);
      if (!clientRow.rows || clientRow.rows.length === 0) {
        conflicts.push({
          type: 'client_not_found',
          device_external_id: externalId,
          client_external_id: clientExternalId
        });
        continue;
      }

      const clientIdForInsert = clientRow.rows[0].id;
      const existingDevice = await db.query('SELECT id FROM devices WHERE external_id = $1 LIMIT 1', [externalId]);

      if (existingDevice.rows.length > 0) {
        await db.query(`
          UPDATE devices SET
            external_id = $1,
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
            serial_number = $18,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $19
        `, [
          externalId,
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
          deviceData.serial_number,
          existingDevice.rows[0].id
        ]);
        updated++;
        console.log(`🔄 Zaktualizowano urządzenie external_id=${externalId}`);
      } else {
        await warnPotentialDeviceDuplicate(deviceData, externalId);
        await db.query(`
          INSERT INTO devices (
            external_id, client_id, category_id, name, manufacturer, model, production_year, power_rating, fuel_type,
            installation_date, last_service_date, next_service_date, warranty_end_date, technical_data, notes, is_active, brand, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          externalId,
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
          deviceData.serial_number
        ]);
        inserted++;
        console.log(`✨ Dodano nowe urządzenie (external_id=${externalId})`);
      }
    }

    if (conflicts.length > 0) {
      logQueuePause('/api/sync/devices', 'missing_dependencies', conflicts);
      return res.status(409).json({
        success: false,
        error: 'QUEUE_PAUSED',
        conflicts,
        queuePaused: true
      });
    }

    res.json({
      success: true,
      message: `${devicesData.length} devices processed`,
      stats: { inserted, updated }
    });
  } catch (error) {
    console.error('❌ Błąd synchronizacji urządzeń:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/orders - Synchronizuj zlecenie z desktop do Railway
router.post('/orders', async (req, res) => {
  try {
    let ordersData = req.body;

    if (ordersData && typeof ordersData === 'object' && !Array.isArray(ordersData)) {
      if (Array.isArray(ordersData.orders)) ordersData = ordersData.orders;
      else if (Array.isArray(ordersData.data)) ordersData = ordersData.data;
      else if (ordersData.order && typeof ordersData.order === 'object') ordersData = [ordersData.order];
    }
    if (!Array.isArray(ordersData)) {
      console.error('❌ ordersData nie jest tablicą:', typeof ordersData);
      return res.status(400).json({
        success: false,
        error: 'ordersData must be an array'
      });
    }

    console.log('📤 Otrzymano ' + ordersData.length + ' zleceń do synchronizacji.');

    const conflicts = [];
    const normalizedOrders = [];

    for (const raw of ordersData) {
      if (!raw || typeof raw !== 'object') {
        conflicts.push({ type: 'invalid_payload_shape' });
        continue;
      }

      const orderExternalId = normalizeExternalId(
        raw.external_id ?? raw.externalId ?? raw.order_external_id ?? raw.orderExternalId ?? null
      );
      const orderNumber = String(raw.order_number ?? raw.orderNumber ?? '').trim();

      if (!orderExternalId && !orderNumber) {
        conflicts.push({ type: 'missing_order_identifier' });
        continue;
      }

      const clientExternalId = normalizeExternalId(
        raw.client_external_id ?? raw.external_client_id ?? raw.clientExternalId ?? null
      );
      if (!clientExternalId) {
        conflicts.push({
          type: 'missing_client_external_id',
          order_external_id: orderExternalId,
          order_number: orderNumber || null
        });
        continue;
      }
      const clientRow = await db.query('SELECT id FROM clients WHERE external_id = $1 LIMIT 1', [clientExternalId]);
      if (!clientRow.rows || clientRow.rows.length === 0) {
        conflicts.push({
          type: 'client_not_found',
          order_external_id: orderExternalId,
          order_number: orderNumber || null,
          client_external_id: clientExternalId
        });
        continue;
      }

      const deviceExternalId = normalizeExternalId(
        raw.device_external_id ?? raw.external_device_id ?? raw.deviceExternalId ?? null
      );
      if (!deviceExternalId) {
        conflicts.push({
          type: 'missing_device_external_id',
          order_external_id: orderExternalId,
          order_number: orderNumber || null
        });
        continue;
      }
      const deviceRow = await db.query('SELECT id FROM devices WHERE external_id = $1 LIMIT 1', [deviceExternalId]);
      if (!deviceRow.rows || deviceRow.rows.length === 0) {
        conflicts.push({
          type: 'device_not_found',
          order_external_id: orderExternalId,
          order_number: orderNumber || null,
          device_external_id: deviceExternalId
        });
        continue;
      }

      const assignedUserId = await resolveUserIdSafe(raw.assigned_user_id ?? raw.assignedUserId);

      const serviceCategoriesText = (() => {
        try {
          const sc = raw.service_categories ?? raw.serviceCategories;
          if (Array.isArray(sc)) return JSON.stringify(sc);
          if (sc && typeof sc === 'object') return JSON.stringify(sc);
          if (typeof sc === 'string') return sc;
          return null;
        } catch (_) {
          return null;
        }
      })();
      const completedCategoriesText = (() => {
        try {
          const val = raw.completed_categories ?? raw.completedCategories;
          if (!val) return null;
          if (typeof val === 'string') {
            const trimmed = val.trim();
            return trimmed.length ? trimmed : null;
          }
          return JSON.stringify(val);
        } catch (_) {
          return null;
        }
      })();
      const workPhotosText = (() => {
        try {
          const val = raw.work_photos ?? raw.workPhotos;
          if (!val) return null;
          if (typeof val === 'string') {
            const trimmed = val.trim();
            return trimmed.length ? trimmed : null;
          }
          return JSON.stringify(val);
        } catch (_) {
          return null;
        }
      })();

      const title = (() => {
        const value = raw.title ?? raw.description ?? 'Zlecenie serwisowe';
        const str = String(value);
        return str.length > 255 ? str.slice(0, 255) : str;
      })();

      const description = raw.description != null ? String(raw.description) : null;
      const scheduledDateRaw = raw.scheduled_date ?? raw.scheduledDate ?? null;
      const scheduledDate = sanitizeDate(scheduledDateRaw);
      const scheduledTime = extractTime(scheduledDateRaw);
      const actualStartDate = sanitizeDate(raw.actual_start_date ?? raw.actualStartDate ?? raw.started_at ?? null);
      const actualEndDate = sanitizeDate(raw.actual_end_date ?? raw.actualEndDate ?? raw.completed_at ?? null);
      const startedAt = raw.started_at ?? null;
      const completedAt = raw.completed_at ?? null;
      const estimatedHours = sanitizeNumber(raw.estimated_hours);
      const actualHours = sanitizeNumber(raw.actual_hours ?? raw.actualHours);
      const laborCost = sanitizeNumber(raw.labor_cost);
      const partsCost = sanitizeNumber(raw.parts_cost);
      const totalCost = sanitizeNumber(raw.total_cost);
      const estimatedCostNote = raw.estimated_cost_note ?? raw.estimate_text ?? null;
      const notes = raw.notes ?? null;
      const completionNotes = raw.completion_notes ?? raw.completionNotes ?? null;
      const partsUsed = (() => {
        const val = raw.parts_used;
        if (val == null) return null;
        const str = String(val).trim();
        return str.length ? str : null;
      })();

      normalizedOrders.push({
        orderExternalId,
        orderNumber,
        clientId: clientRow.rows[0].id,
        deviceId: deviceRow.rows[0].id,
        assignedUserId,
        status: raw.status ?? 'new',
        priority: raw.priority ?? 'medium',
        type: raw.type ?? 'maintenance',
        title,
        description,
        scheduledDate,
        scheduledTime,
        actualStartDate,
        actualEndDate,
        startedAt,
        completedAt,
        estimatedHours,
        actualHours,
        laborCost,
        partsCost,
        totalCost,
        estimatedCostNote,
        notes,
        completionNotes,
        serviceCategoriesText,
        completedCategoriesText,
        workPhotosText,
        partsUsed
      });
    }

    if (conflicts.length > 0) {
      logQueuePause('/api/sync/orders', 'missing_dependencies_or_identifiers', conflicts);
      return res.status(409).json({
        success: false,
        error: 'QUEUE_PAUSED',
        conflicts,
        queuePaused: true
      });
    }

    const pgClient = await db.beginTransaction();
    let inserted = 0;
    let updated = 0;

    try {
      for (const order of normalizedOrders) {
        let existing = null;

        if (order.orderExternalId) {
          existing = await pgClient.query('SELECT id FROM service_orders WHERE external_id = $1 LIMIT 1', [order.orderExternalId]);
        }

        if (!existing || existing.rows.length === 0) {
          existing = await pgClient.query('SELECT id FROM service_orders WHERE order_number = $1 LIMIT 1', [order.orderNumber]);
        }

        if (existing && existing.rows.length > 0) {
          await pgClient.query(`
            UPDATE service_orders
               SET external_id = $1,
                   order_number = $2,
                   client_id = $3,
                   device_id = $4,
                   assigned_user_id = $5,
                   status = $6,
                   priority = $7,
                   type = $8,
                   title = $9,
                   description = $10,
                   scheduled_date = $11,
                   scheduled_time = $12,
                   actual_start_date = $13,
                   actual_end_date = $14,
                   started_at = $15,
                   completed_at = $16,
                   estimated_hours = $17,
                   actual_hours = $18,
                   labor_cost = $19,
                   parts_cost = $20,
                   total_cost = $21,
                   estimated_cost_note = $22,
                   notes = $23,
                   completion_notes = $24,
                   service_categories = $25,
                   completed_categories = $26,
                   work_photos = $27,
                   parts_used = $28,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = $29
          `, [
            order.orderExternalId,
            order.orderNumber,
            order.clientId,
            order.deviceId,
            order.assignedUserId,
            order.status,
            order.priority,
            order.type,
            order.title,
            order.description,
            order.scheduledDate,
            order.scheduledTime,
            order.actualStartDate,
            order.actualEndDate,
            order.startedAt,
            order.completedAt,
            order.estimatedHours,
            order.actualHours,
            order.laborCost,
            order.partsCost,
            order.totalCost,
            order.estimatedCostNote,
            order.notes,
            order.completionNotes,
            order.serviceCategoriesText,
            order.completedCategoriesText,
            order.workPhotosText,
            order.partsUsed,
            existing.rows[0].id
          ]);
          updated++;
        } else {
          await pgClient.query(`
            INSERT INTO service_orders (
              external_id, order_number, client_id, device_id, assigned_user_id,
              status, priority, type, title, description, scheduled_date, scheduled_time,
              actual_start_date, actual_end_date, started_at, completed_at,
              estimated_hours, actual_hours, labor_cost, parts_cost, total_cost,
              estimated_cost_note, notes, completion_notes, service_categories,
              completed_categories, work_photos, parts_used, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10, $11, $12,
              $13, $14, $15, $16,
              $17, $18, $19, $20, $21,
              $22, $23, $24, $25,
              $26, $27, $28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `, [
            order.orderExternalId,
            order.orderNumber,
            order.clientId,
            order.deviceId,
            order.assignedUserId,
            order.status,
            order.priority,
            order.type,
            order.title,
            order.description,
            order.scheduledDate,
            order.scheduledTime,
            order.actualStartDate,
            order.actualEndDate,
            order.startedAt,
            order.completedAt,
            order.estimatedHours,
            order.actualHours,
            order.laborCost,
            order.partsCost,
            order.totalCost,
            order.estimatedCostNote,
            order.notes,
            order.completionNotes,
            order.serviceCategoriesText,
            order.completedCategoriesText,
            order.workPhotosText,
            order.partsUsed
          ]);
          inserted++;
        }
      }

      await db.commitTransaction(pgClient);
    } catch (transactionError) {
      await db.rollbackTransaction(pgClient);
      throw transactionError;
    }

    res.json({
      success: true,
      message: normalizedOrders.length + ' orders processed',
      stats: { inserted, updated }
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
})
})