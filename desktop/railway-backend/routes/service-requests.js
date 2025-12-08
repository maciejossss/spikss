const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Ensure minimal table for service requests (idempotent)
async function ensureServiceRequestsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        nip VARCHAR(20),
        address TEXT,
      address_postal_code VARCHAR(20),
      address_city VARCHAR(255),
        directions TEXT,
        is_urgent BOOLEAN,
        device_type VARCHAR(100),
        device_brand VARCHAR(100),
        brand_model VARCHAR(255),
      service_category_id INTEGER,
      client_type VARCHAR(50),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      company_name VARCHAR(255),
        is_existing_client BOOLEAN,
        description TEXT,
        client_id INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Backward-compatible migrations (add status/updated_at when missing)
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN is_urgent BOOLEAN`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN device_brand VARCHAR(100)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN device_model VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN brand_model VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN client_type VARCHAR(50)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN first_name VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN last_name VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN company_name VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN address_postal_code VARCHAR(20)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN address_city VARCHAR(255)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_requests ADD COLUMN service_category_id INTEGER`)} catch (_) {}
  } catch (e) {
    // silent – jeśli tabela istnieje lub brak uprawnień migracyjnych
  }
}

// Read available columns from service_requests to adapt to legacy schemas
async function getServiceRequestsColumns() {
  try {
    const q = `SELECT column_name FROM information_schema.columns WHERE table_name = 'service_requests' AND table_schema = 'public'`;
    const r = await db.query(q);
    const cols = new Set((r.rows || []).map(x => String(x.column_name || '').toLowerCase()));
    return cols;
  } catch {
    return new Set();
  }
}

// POST /api/service-requests - przyjmij zgłoszenie z PWA (bez uploadów, opis opcjonalny)
router.post('/', async (req, res) => {
  try {
    await ensureServiceRequestsTable();
    const columns = await getServiceRequestsColumns();

    const {
      type,
      name: rawName,
      phone,
      email,
      nip,
      address,
      address_street,
      address_city_postal,
      address_city,
      postal_code,
      directions,
      device_type,
      device_brand,
      brand_model,
      device_model,
      service_category_id,
      is_existing_client,
      is_urgent,
      description,
      client_type,
      first_name,
      last_name,
      company_name
    } = req.body || {};

    // Minimalne wymagane dane: name, phone, oraz jakaś forma adresu (może być rozbita)
    const addressCityPostalValue = (() => {
      const raw = address_city_postal && String(address_city_postal).trim();
      if (raw) return raw;
      const combined = [postal_code, address_city].filter(Boolean).join(' ').trim();
      return combined;
    })();

    const addrMerged = (typeof address === 'string' && address.trim())
      ? address.trim()
      : [address_street, postal_code, address_city].filter(Boolean).join(', ').trim();

    const normalizedClientType = (String(client_type || '').toLowerCase() === 'business') ? 'business' : 'individual';
    const normalizedType = (() => {
      const trimmed = type && String(type).trim();
      if (trimmed) return trimmed;
      if (device_type && String(device_type).trim()) return String(device_type).trim();
      return null;
    })();
    const computedName = (() => {
      if (rawName && String(rawName).trim()) return String(rawName).trim();
      if (normalizedClientType === 'business') {
        return company_name || [first_name, last_name].filter(Boolean).join(' ') || 'Klient firmowy';
      }
      return [first_name, last_name].filter(Boolean).join(' ') || 'Klient prywatny';
    })();

    const hasStructuredAddress = !!(address_street || (postal_code && address_city) || address_city_postal);
    if (!computedName || !phone || (!addrMerged && !hasStructuredAddress)) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Opcjonalne mapowanie do klienta (po telefonie)
    let clientId = null;
    try {
      const existing = await db.query('SELECT id FROM clients WHERE phone = $1 LIMIT 1', [phone]);
      if (existing.rows && existing.rows[0]) {
        clientId = existing.rows[0].id;
      } else {
        // Bez forsowania – jeśli nie uda się stworzyć, samo zgłoszenie i tak zostanie zapisane
        let first = null;
        let last = null;
        if (normalizedClientType === 'business') {
          first = first_name || null;
          last = last_name || null;
        } else {
          first = first_name || null;
          last = last_name || null;
          if (!first || !last) {
            const names = String(computedName).trim().split(/\s+/);
            first = first || names.shift() || computedName;
            last = last || names.join(' ') || null;
          }
        }
        const company = normalizedClientType === 'business' ? (company_name || computedName) : null;
        const ins = await db.query(`
          INSERT INTO clients (first_name, last_name, company_name, type, email, phone, address, nip, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          normalizedClientType === 'business' ? (first || null) : (first || null),
          normalizedClientType === 'business' ? (last || null) : (last || null),
          company,
          normalizedClientType,
          email || null,
          phone,
          (address || addrMerged || null),
          normalizedClientType === 'business' ? (nip || null) : (nip || null)
        ]);
        clientId = ins.rows[0].id;
      }
    } catch (_) { /* ignore */ }

    // Wygeneruj numer referencyjny REQ-YYYY-XXXXXX
    const now = new Date();
    const ref = `REQ-${now.getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

    // Zbuduj dynamiczny INSERT zależnie od schematu
    const cols = [];
    const params = [];
    const values = [];
    const push = (col, val) => { cols.push(col); values.push(val); params.push(`$${params.length+1}`); };

    // Obowiązkowe pola
    push('reference_number', ref);
    if (columns.has('type')) push('type', normalizedType || null);
    else if (columns.has('request_type')) push('request_type', normalizedType || null);
    if (columns.has('client_type')) push('client_type', normalizedClientType);
    if (columns.has('first_name')) push('first_name', first_name || null);
    if (columns.has('last_name')) push('last_name', last_name || null);
    if (columns.has('company_name')) push('company_name', company_name || null);
    const nameToStore = computedName;
    if (columns.has('name')) push('name', nameToStore);
    else if (columns.has('contact_name')) push('contact_name', nameToStore);
    if (columns.has('phone')) push('phone', phone);
    else if (columns.has('contact_phone')) push('contact_phone', phone);
    if (columns.has('email')) push('email', email || null);
    if (columns.has('nip')) push('nip', nip || null);

    // Adres – zapisuj zarówno pełny string, jak i poszczególne części
    const streetValue = address_street ? String(address_street).trim() : null;
    let parsedPostal = postal_code ? String(postal_code).trim() : null;
    let parsedCity = address_city ? String(address_city).trim() : null;
    if (addressCityPostalValue) {
      const m = addressCityPostalValue.match(/^(\S+)\s+(.+)$/);
      if (m) {
        if (!parsedPostal) parsedPostal = m[1];
        if (!parsedCity) parsedCity = m[2];
      } else if (!parsedCity) {
        parsedCity = addressCityPostalValue;
      }
    }
    if (columns.has('address')) {
      push('address', address || addrMerged || null);
    }
    if (columns.has('address_street')) {
      const fallbackStreet = streetValue || (addrMerged ? addrMerged.split(',')[0].trim() : null);
      push('address_street', fallbackStreet || null);
    }
    if (columns.has('address_postal_code')) push('address_postal_code', parsedPostal || null);
    if (columns.has('address_city')) push('address_city', parsedCity || null);
    if (columns.has('address_city_postal')) push('address_city_postal', addressCityPostalValue || [parsedPostal, parsedCity].filter(Boolean).join(' ') || null);

    if (columns.has('directions')) push('directions', directions || null);
    if (columns.has('is_urgent')) push('is_urgent', (is_urgent === true || String(is_urgent||'').toLowerCase() === 'true'));
    if (columns.has('device_type')) push('device_type', device_type || null);
    const normalizedDeviceBrand = device_brand ? String(device_brand).trim() : null;
    const normalizedDeviceModel = device_model ? String(device_model).trim() : null;
    let normalizedBrandModel = brand_model ? String(brand_model).trim() : null;
    if (!normalizedBrandModel && normalizedDeviceBrand && normalizedDeviceModel) {
      normalizedBrandModel = `${normalizedDeviceBrand} ${normalizedDeviceModel}`.trim();
    }
    if (!normalizedBrandModel && normalizedDeviceModel) {
      normalizedBrandModel = normalizedDeviceModel;
    }
    if (columns.has('device_brand')) push('device_brand', normalizedDeviceBrand || null);
    if (columns.has('device_model')) push('device_model', normalizedDeviceModel || null);
    if (columns.has('brand_model')) push('brand_model', normalizedBrandModel || null);
    if (columns.has('is_existing_client')) {
      const boolVal = (is_existing_client === true || String(is_existing_client).toLowerCase() === 'true')
      push('is_existing_client', boolVal);
    }
    if (columns.has('description')) push('description', description || null);
    if (columns.has('client_id')) push('client_id', clientId || null);

    // status + updated_at jeśli dostępne w schemacie
    const normalizedCategoryId = (() => {
      const numeric = Number(service_category_id)
      return Number.isInteger(numeric) && numeric > 0 ? numeric : null
    })()

    if (columns.has('status')) { push('status', 'pending') }
    if (columns.has('updated_at')) { push('updated_at', new Date()) }
    if (columns.has('service_category_id')) { push('service_category_id', normalizedCategoryId) }

    const sql = `INSERT INTO service_requests (${cols.join(',')}) VALUES (${params.join(',')})`;
    await db.query(sql, values);

    return res.status(201).json({ success: true, reference_number: ref });
  } catch (error) {
    console.error('❌ service-requests error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/service-requests - lista ostatnich zgłoszeń
router.get('/', async (_req, res) => {
  try {
    await ensureServiceRequestsTable();
    const columns = await getServiceRequestsColumns();
    const r = await db.query(`SELECT * FROM service_requests ORDER BY id DESC LIMIT 100`);
    const items = (r.rows || []).map(row => {
      // Ujednolicenie pól dla UI desktop
      const out = {
        id: row.id,
        reference_number: row.reference_number,
        type: row.type || row.request_type || null,
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        device_type: row.device_type || row.request_type || null,
        device_brand: row.device_brand || null,
        device_model: row.device_model || null,
        brand_model: row.brand_model || null,
        is_existing_client: (row.is_existing_client === true || String(row.is_existing_client||'').toLowerCase() === 'true') || null,
        description: row.description || null,
        created_at: row.created_at || row.submitted_at || null,
        status: row.status || 'pending'
      };
      // Imię i nazwisko / kontakt
      out.contact_name = row.contact_name || row.name || null
      out.client_type = row.client_type || null;
      out.first_name = row.first_name || null;
      out.last_name = row.last_name || null;
      out.company_name = row.company_name || null;
      out.service_category_id = row.service_category_id || null;
      out.address_postal_code = row.address_postal_code || null;
      out.address_city = row.address_city || null;
      // Pilne
      out.is_urgent = (row.is_urgent === true || String(row.is_urgent||'').toLowerCase() === 'true')
      // Adres – z kolumny lub składany z części
      if (row.address) {
        out.address = row.address;
      } else {
        const postal = row.address_postal_code || null;
        const city = row.address_city || null;
        const street = row.address_street || null;
        const cityPostal = row.address_city_postal || [postal, city].filter(Boolean).join(' ');
        const addr = [street, cityPostal].filter(Boolean).join(', ').trim();
        out.address = addr || null;
      }
      return out;
    });
    return res.json({ success: true, items });
  } catch (e) {
    console.error('❌ service-requests list error:', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// PUT /api/service-requests/:id_or_ref/status  { status: 'converted'|'archived'|'pending' }
router.put('/:key/status', async (req, res) => {
  try {
    await ensureServiceRequestsTable();
    const key = String(req.params.key || '').trim();
    let q, params;
    if (/^\d+$/.test(key)) { // numeric id
      q = `UPDATE service_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
      params = [String(req.body?.status || '').toLowerCase() || 'pending', Number(key)];
    } else {
      q = `UPDATE service_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE reference_number = $2`;
      params = [String(req.body?.status || '').toLowerCase() || 'pending', key];
    }
    const r = await db.query(q, params);
    return res.json({ success: true, updated: r.rowCount || 0 });
  } catch (e) {
    console.error('❌ service-requests status error:', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE by numeric id
router.delete('/:id', async (req, res) => {
  try {
    await ensureServiceRequestsTable();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: 'Invalid id' });
    const r = await db.query('DELETE FROM service_requests WHERE id = $1', [id]);
    return res.json({ success: true, deleted: r.rowCount || 0 });
  } catch (e) {
    console.error('❌ service-requests delete error:', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE by reference number
router.delete('/by-ref/:ref', async (req, res) => {
  try {
    await ensureServiceRequestsTable();
    const ref = String(req.params.ref || '').trim();
    if (!ref) return res.status(400).json({ success: false, error: 'Missing reference' });
    const r = await db.query('DELETE FROM service_requests WHERE reference_number = $1', [ref]);
    return res.json({ success: true, deleted: r.rowCount || 0 });
  } catch (e) {
    console.error('❌ service-requests delete by ref error:', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;


