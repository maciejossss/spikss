const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
let electronApp = null;
try {
  const { app } = require('electron');
  electronApp = app;
} catch (_) {
  electronApp = null;
}
// Ujednolicone źródło bazowego API Railway – preferuj ENV, fallback do URL z ENV RAILWAY_URL, ostatecznie stały
const isDevRuntime =
  !process.env.RAILWAY_API_BASE &&
  (process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL != null);

const RAILWAY_API_BASE = (
  (process.env.RAILWAY_API_BASE && process.env.RAILWAY_API_BASE.replace(/\/$/, '')) ||
  (process.env.RAILWAY_URL && `${process.env.RAILWAY_URL.replace(/\/$/, '')}/api`) ||
  (isDevRuntime ? 'http://127.0.0.1:5174/api' : 'https://web-production-fc58d.up.railway.app/api')
);

const DEFAULT_WEBSITE_CONTENT = (() => {
  try {
    const filePath = path.resolve(__dirname, '../../../website/content/landing-default.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[api-server] Unable to read default website content:', error?.message || error);
    return {
      hero: {},
      highlights: [],
      services: [],
      form: {}
    };
  }
})();

const ensureInventoriesDirectory = () => {
  try {
    const base =
      electronApp && typeof electronApp.getPath === 'function'
        ? electronApp.getPath('userData')
        : path.join(__dirname, '..', '..');
    const dir = path.join(base, 'inventories');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (error) {
    console.error('❌ [inventory] ensure directory failed:', error?.message || error);
    return null;
  }
};

const loadFonts = () => {
  const fonts = { regular: null, bold: null };
  try {
    if (process.platform === 'win32' && process.env.WINDIR) {
      const fontsDir = path.join(process.env.WINDIR, 'Fonts');
      const regularCandidates = ['arial.ttf', 'segoeui.ttf', 'calibri.ttf'].map(name => path.join(fontsDir, name));
      const boldCandidates = ['arialbd.ttf', 'segoeuib.ttf', 'calibrib.ttf'].map(name => path.join(fontsDir, name));
      fonts.regular = regularCandidates.find(candidate => fs.existsSync(candidate)) || null;
      fonts.bold = boldCandidates.find(candidate => fs.existsSync(candidate)) || fonts.regular;
    }
  } catch (err) {
    console.warn('⚠️ [inventory] font detection failed:', err?.message || err);
  }
  return fonts;
};

const sanitizeInventoryFileName = raw => {
  if (!raw) return '';
  const text = String(raw).trim();
  if (!text) return '';
  const withoutExtension = text.replace(/\\.pdf$/i, '');
  const normalized = withoutExtension.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!normalized) return '';
  return `${normalized}.pdf`;
};

class APIServer {
  constructor(databaseService) {
    this.app = express();
    this.db = databaseService;
    this.server = null;
    this.activeOrders = new Map(); // Przechowuje aktywne zlecenia z timerami
    this.installationId = (typeof databaseService.getInstallationId === 'function'
      ? databaseService.getInstallationId()
      : 'inst-local-fallback');
    this.initialExportsScheduled = false;
    this.pendingOrderRetry = new Map();
    this.pendingOrderRetryMaxAttempts = 8;
    this.pendingOrderRetryBaseDelay = 4000;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  getServerPort() {
    try {
      const info = this.server?.address?.()
      if (typeof info === 'object' && info && info.port) {
        return info.port
      }
    } catch (_) {}
    return 5174
  }

  enqueueOrderRetry(orderId, reason = 'unknown', delayMs) {
    const id = Number(orderId)
    if (!Number.isFinite(id) || id <= 0) return
    const existing = this.pendingOrderRetry.get(id) || { attempts: 0, history: [] }
    if (existing.attempts >= this.pendingOrderRetryMaxAttempts) {
      if (!existing.exceededLogged) {
        try { console.warn('[import-order] retry limit reached for order', id, existing.history) } catch (_) {}
        existing.exceededLogged = true
      }
      this.pendingOrderRetry.set(id, existing)
      return
    }
    existing.attempts += 1
    const timestamp = new Date().toISOString()
    existing.history = [...(existing.history || []), `${timestamp}:${reason}`]
    const delay = delayMs != null ? delayMs : Math.min(this.pendingOrderRetryBaseDelay * existing.attempts, 20000)
    if (existing.timer) clearTimeout(existing.timer)
    existing.timer = setTimeout(() => {
      this.runOrderRetry(id).catch(err => {
        try { console.warn('[import-order] retry error for order', id, err?.message || err) } catch (_) {}
      })
    }, delay)
    this.pendingOrderRetry.set(id, existing)
    try { console.log(`[import-order] scheduled retry #${existing.attempts} for order ${id} (reason: ${reason}, delay=${delay}ms)`) } catch (_) {}
  }

  async runOrderRetry(orderId) {
    const entry = this.pendingOrderRetry.get(orderId)
    if (!entry) return
    const port = this.getServerPort()
    let success = false
    try {
      const endpoint = `http://127.0.0.1:${port}/api/railway/import-order/${orderId}?detailsOnly=1`
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markImported: false, detailsOnly: true })
      }).catch(() => null)
      const row = await this.db.get('SELECT client_id, device_id FROM service_orders WHERE id = ?', [orderId]).catch(() => null)
      if (row && row.client_id != null && row.device_id != null) {
        success = true
      }
    } catch (err) {
      try { console.warn('[import-order] retry fetch failed for order', orderId, err?.message || err) } catch (_) {}
    }
    if (success) {
      this.pendingOrderRetry.delete(orderId)
      try { console.log('[import-order] retry completed successfully for order', orderId) } catch (_) {}
      return
    }
    if (entry.attempts >= this.pendingOrderRetryMaxAttempts) {
      this.pendingOrderRetry.delete(orderId)
      try { console.warn('[import-order] retries exhausted for order', orderId) } catch (_) {}
      return
    }
    this.enqueueOrderRetry(orderId, 'retry')
  }

  async seedPendingOrderRelinks() {
    try {
      const rows = await this.db.all(`
        SELECT id FROM service_orders
        WHERE (client_id IS NULL OR device_id IS NULL)
          AND (status IS NULL OR LOWER(status) <> 'deleted')
        ORDER BY updated_at DESC
        LIMIT 50
      `)
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && row.id) this.enqueueOrderRetry(row.id, 'startup')
        }
      }
    } catch (err) {
      try { console.warn('[import-order] seedPendingOrderRelinks failed', err?.message || err) } catch (_) {}
    }
  }

  setupMiddleware() {
    // CORS z bardziej szczegółową konfiguracją dla aplikacji mobilnej
    this.app.use(cors({
      origin: true, // odbij dowolny Origin w ACAO
      credentials: true,
      preflightContinue: true, // nie zakańczaj preflight – pozwól naszemu middleware dodać PNA
      optionsSuccessStatus: 204,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'Origin', 'Accept', 'Access-Control-Request-Private-Network']
    }));
    
    // Dodatkowe nagłówki dla kompatybilności mobilnej
    this.app.use((req, res, next) => {
      const origin = req.get('Origin') || '*'
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Origin, Accept, Access-Control-Request-Private-Network');
      // Zezwól na Private Network Access (HTTPS -> localhost)
      res.header('Access-Control-Allow-Private-Network', 'true');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Szczegółowe logowanie dla debugowania
      const timestamp = new Date().toLocaleTimeString('pl-PL');
      console.log(`📱 [${timestamp}] ${req.method} ${req.path}`);
      console.log(`   └─ IP: ${req.ip} | User-Agent: ${req.get('User-Agent')}`);
      console.log(`   └─ Origin: ${req.get('Origin')} | Referer: ${req.get('Referer')}`);
      
      next();
    });
    
    this.app.use(express.json());
    
    // Serwowanie aplikacji mobilnej
    const mobileAppPath = path.join(__dirname, '../../mobile-app');
    this.app.use('/mobile-app', express.static(mobileAppPath));
    this.app.use('/', express.static(mobileAppPath)); // Główny routing dla PWA
    
    // Fallback dla SPA routing
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(mobileAppPath, 'index.html'));
    });
  }

  // Dodaj kolumny sync jeśli brakuje
  async ensureOrderSyncColumns() {
    try {
      const cols = await this.db.all("PRAGMA table_info('service_orders')")
      const names = new Set((cols || []).map(c => c.name || c.Name || c[1]))
      const toAdd = []
      if (!names.has('desktop_sync_status')) toAdd.push("ALTER TABLE service_orders ADD COLUMN desktop_sync_status TEXT")
      if (!names.has('desktop_synced_at')) toAdd.push("ALTER TABLE service_orders ADD COLUMN desktop_synced_at TEXT")
      if (!names.has('travel_cost')) toAdd.push("ALTER TABLE service_orders ADD COLUMN travel_cost REAL DEFAULT 0")
      for (const sql of toAdd) {
        try { await this.db.run(sql) } catch (_) {}
      }
      // Re-check
      const cols2 = await this.db.all("PRAGMA table_info('service_orders')")
      const names2 = new Set((cols2 || []).map(c => c.name || c.Name || c[1]))
      return names2.has('desktop_sync_status') && names2.has('desktop_synced_at') && names2.has('travel_cost')
    } catch (_) { return false }
  }

  setupRoutes() {
    const SUPPLIERS_ENABLED = String(process.env.SUPPLIERS_ENABLED || '1') !== '0'

    const normalizeText = (value, { upperCase = false } = {}) => {
      if (value === undefined || value === null) return null
      const trimmed = String(value).trim()
      if (!trimmed) return null
      return upperCase ? trimmed.toUpperCase() : trimmed
    }

    const normalizeCurrency = (value) => normalizeText(value, { upperCase: true }) || 'PLN'

    const toNumber = (value, fallback = 0) => {
      if (value === null || value === undefined || value === '') return fallback
      const num = Number(
        typeof value === 'string' ? value.replace(',', '.').trim() : value
      )
      return Number.isFinite(num) ? num : fallback
    }

    const clampDecimals = (value, digits = 2) => {
      const num = toNumber(value, 0)
      return Number.isFinite(num) ? Number(num.toFixed(digits)) : 0
    }

    const generateMagazineCode = async () => {
      let attempts = 0
      while (attempts < 8) {
        const candidate = `MAG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        try {
          const existing = await this.db.get('SELECT id FROM spare_parts WHERE magazine_code = ?', [candidate])
          if (!existing) return candidate
        } catch (err) {
          console.warn('[inventory] unable to verify magazine_code uniqueness', err?.message || err)
          return candidate
        }
        attempts += 1
      }
      return `MAG-${Date.now()}`
    }

    const sanitizePartPayload = async (raw = {}) => {
      const payload = {}
      payload.name = normalizeText(raw.name)
      payload.part_number = normalizeText(raw.part_number)
      payload.manufacturer = normalizeText(raw.manufacturer)
      payload.brand = normalizeText(raw.brand)
      payload.manufacturer_code = normalizeText(raw.manufacturer_code)
      payload.assembly_group = normalizeText(raw.assembly_group)
      payload.barcode = normalizeText(raw.barcode)
      payload.category = normalizeText(raw.category)
      payload.magazine_code = normalizeText(raw.magazine_code, { upperCase: true }) || await generateMagazineCode()
      payload.net_price = clampDecimals(raw.net_price, 2)
      const explicitGross = raw.gross_price != null ? raw.gross_price : raw.price
      payload.gross_price = clampDecimals(explicitGross, 2)
      payload.vat_rate = clampDecimals(raw.vat_rate == null ? 23 : raw.vat_rate, 2)
      if (payload.gross_price === 0 && payload.net_price > 0) {
        payload.gross_price = clampDecimals(payload.net_price * (1 + payload.vat_rate / 100), 2)
      }
      if (payload.net_price === 0 && payload.gross_price > 0) {
        const divisor = 1 + payload.vat_rate / 100
        payload.net_price = divisor === 0 ? payload.gross_price : clampDecimals(payload.gross_price / divisor, 2)
      }
      payload.currency = normalizeCurrency(raw.currency)
      payload.price = payload.gross_price
      payload.stock_quantity = clampDecimals(raw.stock_quantity, 0)
      payload.min_stock_level = clampDecimals(raw.min_stock_level, 0)
      payload.weight = clampDecimals(raw.weight, 4)
      payload.unit = normalizeText(raw.unit, { upperCase: false })
      payload.package_size = normalizeText(raw.package_size)
      payload.description = normalizeText(raw.description)
      payload.model_compatibility = normalizeText(raw.model_compatibility)
      payload.location = normalizeText(raw.location)
      payload.supplier = normalizeText(raw.supplier)
      payload.supplier_part_number = normalizeText(raw.supplier_part_number)
      payload.lead_time_days = clampDecimals(raw.lead_time_days, 0)
      const lastOrder = normalizeText(raw.last_order_date)
      payload.last_order_date = lastOrder && lastOrder.length >= 8 ? lastOrder : null
      payload.notes = normalizeText(raw.notes)
      payload.supplier_id = raw.supplier_id != null && raw.supplier_id !== '' ? Number(raw.supplier_id) : null
      payload.device_id = raw.device_id != null && raw.device_id !== '' ? Number(raw.device_id) : null
      payload.synced_at = null
      payload.updated_by = normalizeText(raw.updated_by)
      return payload
    }


    // ===== SUPPLIERS API (additive, gated) =====
    // List suppliers
    this.app.get('/api/desktop/suppliers', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.json([])
      try {
        const q = String(req.query.query || '').trim().toLowerCase()
        const activeOnly = String(req.query.active || '1') !== '0'
        const rows = await this.db.all('SELECT id, name, nip, email, phone, address_street, address_city, address_postal_code, address_country, is_active FROM suppliers')
        const filtered = rows.filter(r => (
          (!activeOnly || Number(r.is_active) === 1) && (
            !q ||
            String(r.name||'').toLowerCase().includes(q) ||
            String(r.nip||'').toLowerCase().includes(q) ||
            String(r.email||'').toLowerCase().includes(q) ||
            String(r.phone||'').toLowerCase().includes(q) ||
            String(r.address_street||'').toLowerCase().includes(q) ||
            String(r.address_city||'').toLowerCase().includes(q) ||
            String(r.address_postal_code||'').toLowerCase().includes(q) ||
            String(r.address_country||'').toLowerCase().includes(q)
          )
        ))
        return res.json(filtered)
      } catch (e) {
        console.error('❌ Suppliers list error:', e)
        return res.status(500).json({ error: 'Database error' })
      }
    })

    // Create supplier
    this.app.post('/api/desktop/suppliers', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const b = req.body || {}
        const name = String(b.name || '').trim()
        if (!name) return res.status(400).json({ error: 'name required' })
        await this.db.run(
          `INSERT INTO suppliers (name, nip, regon, krs, email, phone, address_street, address_city, address_postal_code, address_country, is_active)
           VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
          [name, b.nip||null, b.regon||null, b.krs||null, b.email||null, b.phone||null, b.address_street||null, b.address_city||null, b.address_postal_code||null, b.address_country||'Polska']
        )
        const row = await this.db.get('SELECT id FROM suppliers WHERE name = ? ORDER BY id DESC LIMIT 1', [name])
        return res.json({ success: true, id: row?.id })
      } catch (e) {
        console.error('❌ Supplier create error:', e)
        return res.status(500).json({ error: 'Database error' })
      }
    })

    // Update supplier
    this.app.put('/api/desktop/suppliers/:id', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const id = parseInt(req.params.id)
        const b = req.body || {}
        const row = await this.db.get('SELECT id FROM suppliers WHERE id = ?', [id])
        if (!row) return res.status(404).json({ error: 'not found' })
        await this.db.run(
          `UPDATE suppliers SET name=COALESCE(?,name), nip=COALESCE(?,nip), regon=COALESCE(?,regon), krs=COALESCE(?,krs),
            email=COALESCE(?,email), phone=COALESCE(?,phone), address_street=COALESCE(?,address_street), address_city=COALESCE(?,address_city),
            address_postal_code=COALESCE(?,address_postal_code), address_country=COALESCE(?,address_country), is_active=COALESCE(?,is_active), updated_at=CURRENT_TIMESTAMP
           WHERE id = ?`,
          [b.name||null, b.nip||null, b.regon||null, b.krs||null, b.email||null, b.phone||null, b.address_street||null, b.address_city||null, b.address_postal_code||null, b.address_country||null, (typeof b.is_active === 'number' ? b.is_active : null), id]
        )
        return res.json({ success: true })
      } catch (e) {
        console.error('❌ Supplier update error:', e)
        return res.status(500).json({ error: 'Database error' })
      }
    })

    // Contacts (minimal): list & add
    this.app.get('/api/desktop/suppliers/:id/contacts', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.json([])
      try {
        const id = parseInt(req.params.id)
        const items = await this.db.all('SELECT id, full_name, email, phone, role FROM supplier_contacts WHERE supplier_id = ?', [id])
        return res.json(items)
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })
    this.app.post('/api/desktop/suppliers/:id/contacts', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const id = parseInt(req.params.id)
        const b = req.body || {}
        await this.db.run('INSERT INTO supplier_contacts (supplier_id, full_name, email, phone, role) VALUES (?,?,?,?,?)', [id, b.full_name||null, b.email||null, b.phone||null, b.role||null])
        return res.json({ success: true })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // Update contact
    this.app.put('/api/desktop/suppliers/:id/contacts/:contactId', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const contactId = parseInt(req.params.contactId)
        const b = req.body || {}
        await this.db.run(
          'UPDATE supplier_contacts SET full_name=COALESCE(?,full_name), email=COALESCE(?,email), phone=COALESCE(?,phone), role=COALESCE(?,role) WHERE id = ?',
          [b.full_name||null, b.email||null, b.phone||null, b.role||null, contactId]
        )
        return res.json({ success: true })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // Delete contact
    this.app.delete('/api/desktop/suppliers/:id/contacts/:contactId', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const contactId = parseInt(req.params.contactId)
        await this.db.run('DELETE FROM supplier_contacts WHERE id = ?', [contactId])
        return res.json({ success: true })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // Toggle active
    this.app.put('/api/desktop/suppliers/:id/active', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const id = parseInt(req.params.id)
        const isActive = Number(req.body?.is_active)
        if (![0,1].includes(isActive)) return res.status(400).json({ error: 'is_active must be 0 or 1' })
        await this.db.run('UPDATE suppliers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive, id])
        return res.json({ success: true })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // Usage count
    this.app.get('/api/desktop/suppliers/:id/usage', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.json({ parts: 0 })
      try {
        const id = parseInt(req.params.id)
        const row = await this.db.get('SELECT COUNT(1) AS cnt FROM spare_parts WHERE supplier_id = ?', [id])
        return res.json({ parts: Number(row?.cnt || 0) })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // Reassign parts to another supplier
    this.app.post('/api/desktop/suppliers/:id/reassign', async (req, res) => {
      if (!SUPPLIERS_ENABLED) return res.status(403).json({ error: 'suppliers disabled' })
      try {
        const sourceId = parseInt(req.params.id)
        const targetId = parseInt(req.body?.targetSupplierId)
        if (!targetId || targetId === sourceId) return res.status(400).json({ error: 'invalid targetSupplierId' })
        await this.db.run('UPDATE spare_parts SET supplier_id = ? WHERE supplier_id = ?', [targetId, sourceId])
        return res.json({ success: true })
      } catch (e) { return res.status(500).json({ error: 'Database error' }) }
    })

    // ===== TOMBSTONES (blokada reimportu) =====
    const ensureTombstonesTable = async () => {
      try {
        await this.db.run("CREATE TABLE IF NOT EXISTS deleted_tombstones (order_number TEXT PRIMARY KEY, deleted_at DATETIME, needs_remote_cleanup INTEGER DEFAULT 1)")
      } catch (_) {}
    }
    const addTombstones = async (numbers = []) => {
      if (!Array.isArray(numbers) || numbers.length === 0) return
      await ensureTombstonesTable()
      for (const num of numbers) {
        try { await this.db.run("INSERT OR IGNORE INTO deleted_tombstones (order_number, deleted_at, needs_remote_cleanup) VALUES (?, CURRENT_TIMESTAMP, 1)", [String(num)]) } catch (_) {}
      }
    }

    // Seed tombstonów wyłączony – testowe numery nie powinny wpływać na nowe zlecenia
    // addTombstones(['SRV-2025-696644','SRV-2025-019953','SRV-2025-829491','SRV-2025-433065','SO-2025-001']).catch(()=>{})

    // ===== BEZPIECZEŃSTWO =====
    // Middleware do walidacji żądań
    const validateRequest = (req, res, next) => {
      // Sprawdź User-Agent dla podstawowej ochrony - ale pozwól na przeglądarki mobilne
      const userAgent = req.get('User-Agent');
      const pathStr = String(req.path || '');
      const isSyncPath = pathStr.startsWith('/api/railway/');
      if (!userAgent) {
        console.warn('🚨 Brak User-Agent z:', req.ip);
      } else {
        // Pozwól na znane przeglądarki mobilne i desktop
        const allowedAgents = ['Mobile', 'Safari', 'Chrome', 'Firefox', 'Edge', 'Opera', 'node-fetch', 'curl', 'WindowsPowerShell'];
        const isAllowed = allowedAgents.some(agent => userAgent.includes(agent));
        
        if (!isAllowed) {
          console.warn('🚨 Podejrzany User-Agent z:', req.ip, 'User-Agent:', userAgent);
        }
      }
      
      // Rate limiting – omiń dla ścieżek sync (dużo żądań podczas uploadu)
      if (isSyncPath) {
        return next();
      }
      // Rate limiting - max 100 żądań na minutę per IP
      if (!this.rateLimits) this.rateLimits = new Map();
      const clientIP = req.ip;
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const key = `${clientIP}-${minute}`;
      
      this.rateLimits.set(key, (this.rateLimits.get(key) || 0) + 1);
      if (this.rateLimits.get(key) > 200) { // Zwiększam limit z 100 do 200
        console.warn('🚫 Rate limit exceeded:', clientIP);
        return res.status(429).json({ error: 'Too many requests' });
      }
      
      next();
    };

    this.app.use(validateRequest);
    // Ręczne czyszczenie Railway po numerach oraz dopisanie tombstone
    this.app.post('/api/railway/cleanup-by-numbers', async (req, res) => {
      try {
        const list = Array.isArray(req.body?.order_numbers) ? req.body.order_numbers.map(String).filter(Boolean) : []
        if (!list.length) return res.status(400).json({ success: false, error: 'order_numbers required' })
        await addTombstones(list)
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        let deleted = 0, marked = 0
        for (const num of list) {
          try {
            const r = await fetch(`${base}/sync/orders/by-number/${encodeURIComponent(num)}`, { method: 'DELETE' })
            if (r && r.ok) { deleted++; continue }
          } catch (_) {}
          try {
            const r2 = await fetch(`${base}/sync/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: num, status: 'deleted' }]) })
            if (r2 && r2.ok) marked++
          } catch (_) {}
        }
        // Zaznacz jako posprzątane
        try { await this.db.run(`UPDATE deleted_tombstones SET needs_remote_cleanup = 0, deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP) WHERE order_number IN (${list.map(()=> '?').join(',')})`, list) } catch(_){}
        return res.json({ success: true, deleted, marked })
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // ===== ENDPOINTS DLA MOBILNEJ APLIKACJI =====
    
    // Pobierz aktywne zlecenia z timerami (tylko dla admina) - MUSI BYĆ PRZED :userId
    this.app.get('/api/desktop/orders/active-timers', async (req, res) => {
      try {
        const activeTimers = [];
        
        for (const [orderId, timer] of this.activeOrders.entries()) {
          const order = await this.db.get(`
            SELECT o.*, 
                   CASE 
                     WHEN c.company_name IS NOT NULL AND c.company_name != '' 
                     THEN c.company_name 
                     ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
                   END as client_name,
                   u.full_name as technician_name
            FROM service_orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN users u ON o.assigned_user_id = u.id
            WHERE o.id = ?
          `, [orderId]);

          if (order) {
            activeTimers.push({
              ...order,
              elapsed_time: this.getElapsedTime(orderId),
              timer_started: timer.startTime
            });
          }
        }

        res.json(activeTimers);
      } catch (error) {
        console.error('❌ Błąd pobierania timerów:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Generator kodów magazynowych
    this.app.get('/api/desktop/spare-parts/generate-code', async (_req, res) => {
      try {
        const code = await generateMagazineCode()
        res.json({ success: true, code })
      } catch (error) {
        console.error('❌ Błąd generowania kodu magazynowego:', error)
        res.status(500).json({ success: false, error: 'Code generation failed' })
      }
    })

    this.app.get('/api/part-categories', async (_req, res) => {
      try {
        const rows = await this.db.all(`
          SELECT
            id,
            name,
            description,
            sort_order,
            is_active,
            parent_id,
            created_at,
            updated_at
          FROM part_categories
          ORDER BY COALESCE(sort_order, 0) ASC, name ASC
        `)
        res.json({ success: true, data: rows })
      } catch (error) {
        console.error('❌ Błąd pobierania kategorii części:', error)
        res.status(500).json({ success: false, error: 'Database error' })
      }
    })
    // Import masowy części (JSON: { items: [] })
    this.app.post('/api/desktop/spare-parts/bulk', async (req, res) => {
      const items = Array.isArray(req.body?.items) ? req.body.items : []
      if (!items.length) {
        return res.status(400).json({ success: false, error: 'Brak danych do importu.' })
      }

      const summary = { inserted: 0, updated: 0, errors: [] }
      let inTransaction = false
      try {
        await this.db.run('BEGIN TRANSACTION')
        inTransaction = true
        for (let index = 0; index < items.length; index += 1) {
          const raw = items[index] || {}
          try {
            const sanitized = await sanitizePartPayload(raw)

            if (!sanitized.name || !sanitized.part_number || !sanitized.manufacturer) {
              summary.errors.push({ index, message: 'Brak wymaganych pól (nazwa, numer katalogowy, producent).' })
              continue
            }

            sanitized.updated_by = sanitized.updated_by || 'bulk-import'
            sanitized.synced_at = null
            sanitized.price = sanitized.gross_price
            sanitized.updated_at = new Date().toISOString()

            let existing = await this.db.get('SELECT id FROM spare_parts WHERE magazine_code = ?', [sanitized.magazine_code])
            if (!existing && sanitized.part_number) {
              existing = await this.db.get(
                'SELECT id FROM spare_parts WHERE part_number = ? AND COALESCE(manufacturer, "") = COALESCE(?, "")',
                [sanitized.part_number, sanitized.manufacturer]
              )
            }

            const updateColumns = [
              'magazine_code',
              'name',
              'category',
              'part_number',
              'manufacturer',
              'manufacturer_code',
              'brand',
              'assembly_group',
              'barcode',
              'net_price',
              'gross_price',
              'vat_rate',
              'currency',
              'price',
              'stock_quantity',
              'min_stock_level',
              'weight',
              'unit',
              'package_size',
              'description',
              'model_compatibility',
              'location',
              'supplier',
              'supplier_part_number',
              'lead_time_days',
              'last_order_date',
              'notes',
              'supplier_id',
              'device_id',
              'synced_at',
              'updated_by',
              'updated_at'
            ]

            if (existing && existing.id) {
              const updateSql = `
                UPDATE spare_parts
                SET ${updateColumns.map(col => `${col} = ?`).join(', ')}
                WHERE id = ?
              `
              const updateValues = updateColumns.map(col => sanitized[col] ?? null)
              updateValues.push(existing.id)
              await this.db.run(updateSql, updateValues)
              summary.updated += 1
            } else {
              const timestamp = sanitized.updated_at
              const insertColumns = [...updateColumns, 'created_at']
              const insertSql = `
                INSERT INTO spare_parts (${insertColumns.join(', ')})
                VALUES (${insertColumns.map(() => '?').join(', ')})
              `
              const insertValues = insertColumns.map(col => {
                if (col === 'created_at') return timestamp
                return sanitized[col] ?? null
              })
              await this.db.run(insertSql, insertValues)
              summary.inserted += 1
            }
          } catch (err) {
            console.error('❌ Błąd importu części:', err)
            summary.errors.push({ index, message: err?.message || 'Nieznany błąd' })
          }
        }
        await this.db.run('COMMIT')
        inTransaction = false
        res.json({ success: true, summary })
      } catch (error) {
        if (inTransaction) {
          try { await this.db.run('ROLLBACK') } catch (_) {}
        }
        console.error('❌ Błąd importu masowego części:', error)
        res.status(500).json({ success: false, error: 'Import failed', summary })
      }
    })
    // Eksport części do CSV
    this.app.get('/api/desktop/spare-parts/export', async (_req, res) => {
      try {
        const rows = await this.db.all(`
          SELECT
            magazine_code,
            name,
            category,
            part_number,
            manufacturer,
            manufacturer_code,
            brand,
            assembly_group,
            barcode,
            net_price,
            gross_price,
            vat_rate,
            currency,
            stock_quantity,
            min_stock_level,
            weight,
            unit,
            package_size,
            description,
            model_compatibility,
            location,
            supplier,
            supplier_part_number,
            lead_time_days,
            last_order_date,
            notes,
            supplier_id,
            device_id
          FROM spare_parts
          ORDER BY name
        `)

        const headers = [
          'magazine_code',
          'name',
          'category',
          'part_number',
          'manufacturer',
          'manufacturer_code',
          'brand',
          'assembly_group',
          'barcode',
          'net_price',
          'gross_price',
          'vat_rate',
          'currency',
          'stock_quantity',
          'min_stock_level',
          'weight',
          'unit',
          'package_size',
          'description',
          'model_compatibility',
          'location',
          'supplier',
          'supplier_part_number',
          'lead_time_days',
          'last_order_date',
          'notes',
          'supplier_id',
          'device_id'
        ]

        const escapeValue = (value) => {
          if (value === null || value === undefined) return ''
          const stringValue = String(value).replace(/\r?\n/g, ' ').replace(/;/g, ',')
          return stringValue
        }

        let csv = headers.join(';') + '\n'
        for (const row of rows || []) {
          const line = headers.map(header => escapeValue(row[header])).join(';')
          csv += `${line}\n`
        }

        const filename = `spare_parts_${new Date().toISOString().slice(0, 10)}.csv`
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.send(`\ufeff${csv}`)
      } catch (error) {
        console.error('❌ Błąd eksportu części:', error)
        res.status(500).json({ success: false, error: 'Export failed' })
      }
    })

    this.app.get('/api/desktop/inventory', async (_req, res) => {
      try {
        const snapshots = await this.db.all(`
          SELECT
            id,
            name,
            status,
            metadata,
            created_at,
            updated_at,
            (
              SELECT COUNT(*)
              FROM inventory_items ii
              WHERE ii.snapshot_id = inventory_snapshots.id
            ) AS items_count
          FROM inventory_snapshots
          ORDER BY updated_at DESC
        `)
        return res.json({ success: true, data: snapshots || [] })
      } catch (error) {
        console.error('❌ [inventory] list snapshots failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się pobrać listy inwentur.' })
      }
    })

    this.app.get('/api/desktop/inventory/:id', async (req, res) => {
      try {
        const snapshotId = parseInt(req.params.id, 10)
        if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
          return res.status(400).json({ success: false, error: 'Niepoprawny identyfikator inwentury.' })
        }

        const snapshot = await this.db.get(`
          SELECT id, name, status, metadata, created_at, updated_at
          FROM inventory_snapshots
          WHERE id = ?
        `, [snapshotId])

        if (!snapshot) {
          return res.status(404).json({ success: false, error: 'Inwentura nie istnieje.' })
        }

        const items = await this.db.all(`
          SELECT
            id,
            manufacturer_code,
            magazine_code,
            name,
            qty_stock,
            qty_counted,
            net_price,
            vat_rate,
            created_at
          FROM inventory_items
          WHERE snapshot_id = ?
          ORDER BY id ASC
        `, [snapshotId])

        return res.json({ success: true, data: { snapshot, items: items || [] } })
      } catch (error) {
        console.error('❌ [inventory] get snapshot failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się pobrać szczegółów inwentury.' })
      }
    })

    this.app.post('/api/desktop/inventory', async (req, res) => {
      try {
        const payload = req.body || {}
        const name = String(payload.name || '').trim()
        const status = payload.status ? String(payload.status).trim() : 'draft'
        const metadata = payload.metadata != null ? JSON.stringify(payload.metadata) : null
        const items = Array.isArray(payload.items) ? payload.items : []

        if (!name) {
          return res.status(400).json({ success: false, error: 'Nazwa inwentury jest wymagana.' })
        }

        await this.db.run('BEGIN TRANSACTION')
        const insertSnapshot = await this.db.run(
          `INSERT INTO inventory_snapshots (name, status, metadata) VALUES (?, ?, ?)`,
          [name, status, metadata]
        )
        const snapshotId = insertSnapshot.id

        for (const row of items) {
          await this.db.run(
            `INSERT INTO inventory_items (
              snapshot_id,
              manufacturer_code,
              magazine_code,
              name,
              qty_stock,
              qty_counted,
              net_price,
              vat_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              snapshotId,
              row.manufacturerCode || null,
              row.magazineCode || null,
              row.name || null,
              Number(row.qtyStock) || 0,
              Number(row.qtyCounted) || 0,
              Number(row.netPrice) || 0,
              Number(row.vatRate) || 0
            ]
          )
        }

        await this.db.run('COMMIT')
        console.log(`[inventory] snapshot created id=${snapshotId} items=${items.length}`)
        return res.status(201).json({ success: true, id: snapshotId })
      } catch (error) {
        try { await this.db.run('ROLLBACK') } catch (_) {}
        console.error('❌ [inventory] create snapshot failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się zapisać inwentury.' })
      }
    })

    this.app.put('/api/desktop/inventory/:id', async (req, res) => {
      let inTransaction = false
      try {
        const snapshotId = parseInt(req.params.id, 10)
        if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
          return res.status(400).json({ success: false, error: 'Niepoprawny identyfikator inwentury.' })
        }

        const payload = req.body || {}
        const name = payload.name != null ? String(payload.name).trim() : null
        const status = payload.status != null ? String(payload.status).trim() : null
        const metadata = payload.metadata != null ? JSON.stringify(payload.metadata) : null
        const items = Array.isArray(payload.items) ? payload.items : null

        await this.db.run('BEGIN TRANSACTION')
        inTransaction = true

        const snapshot = await this.db.get(`SELECT id FROM inventory_snapshots WHERE id = ?`, [snapshotId])
        if (!snapshot) {
          await this.db.run('ROLLBACK')
          return res.status(404).json({ success: false, error: 'Inwentura nie istnieje.' })
        }

        if (name || status || payload.metadata != null) {
          const fields = []
          const values = []
          if (name) { fields.push('name = ?'); values.push(name) }
          if (status) { fields.push('status = ?'); values.push(status) }
          if (payload.metadata != null) { fields.push('metadata = ?'); values.push(metadata) }
          fields.push('updated_at = CURRENT_TIMESTAMP')
          values.push(snapshotId)
          await this.db.run(`UPDATE inventory_snapshots SET ${fields.join(', ')} WHERE id = ?`, values)
        }

        if (items) {
          await this.db.run(`DELETE FROM inventory_items WHERE snapshot_id = ?`, [snapshotId])
          for (const row of items) {
            await this.db.run(
              `INSERT INTO inventory_items (
                snapshot_id,
                manufacturer_code,
                magazine_code,
                name,
                qty_stock,
                qty_counted,
                net_price,
                vat_rate
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                snapshotId,
                row.manufacturerCode || null,
                row.magazineCode || null,
                row.name || null,
                Number(row.qtyStock) || 0,
                Number(row.qtyCounted) || 0,
                Number(row.netPrice) || 0,
                Number(row.vatRate) || 0
              ]
            )
          }
        }

        await this.db.run('COMMIT')
        inTransaction = false
        console.log(`[inventory] snapshot updated id=${snapshotId} items=${Array.isArray(items) ? items.length : 'no-change'}`)
        return res.json({ success: true })
      } catch (error) {
        if (inTransaction) {
          try { await this.db.run('ROLLBACK') } catch (_) {}
        }
        console.error('❌ [inventory] update snapshot failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się zaktualizować inwentury.' })
      }
    })

    this.app.delete('/api/desktop/inventory/:id', async (req, res) => {
      try {
        const snapshotId = parseInt(req.params.id, 10)
        if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
          return res.status(400).json({ success: false, error: 'Niepoprawny identyfikator inwentury.' })
        }

        const result = await this.db.run('DELETE FROM inventory_snapshots WHERE id = ?', [snapshotId])
        if (!result.changes) {
          return res.status(404).json({ success: false, error: 'Inwentura nie istnieje.' })
        }
        console.log(`[inventory] snapshot deleted id=${snapshotId}`)
        return res.json({ success: true })
      } catch (error) {
        console.error('❌ [inventory] delete snapshot failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się usunąć inwentury.' })
      }
    })

    this.app.post('/api/desktop/inventory-report', async (req, res) => {
      try {
        const payload = req.body || {}
        const sanitizedName = sanitizeInventoryFileName(payload.fileName)
        if (!sanitizedName) {
          return res.status(400).json({ success: false, error: 'Niepoprawna nazwa pliku.' })
        }

        let items = Array.isArray(payload.items) ? payload.items : []
        const summary = payload.summary || {}
        const metadata = payload.metadata || {}
        const snapshotId = metadata?.snapshotId
        if (!items.length && snapshotId) {
          const dbItems = await this.db.all(`
            SELECT
              manufacturer_code,
              magazine_code,
              name,
              qty_stock,
              qty_counted,
              net_price,
              vat_rate
            FROM inventory_items
            WHERE snapshot_id = ?
            ORDER BY id ASC
          `, [snapshotId]).catch(() => [])
          if (Array.isArray(dbItems) && dbItems.length) {
            items = dbItems.map(row => ({
              manufacturerCode: row.manufacturer_code,
              magazineCode: row.magazine_code,
              name: row.name,
              qtyStock: row.qty_stock,
              qtyCounted: row.qty_counted,
              netPrice: row.net_price,
              vatRate: row.vat_rate
            }))
          }
        }

        if (!items.length) {
          return res.status(400).json({ success: false, error: 'Brak pozycji do wygenerowania raportu.' })
        }

        const targetDir = ensureInventoriesDirectory()
        if (!targetDir) {
          return res.status(500).json({ success: false, error: 'Nie można utworzyć katalogu na raporty.' })
        }

        const filePath = path.join(targetDir, sanitizedName)
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 })
        const stream = fs.createWriteStream(filePath)
        doc.pipe(stream)

        const fonts = loadFonts()
        let regularFontName = 'Helvetica'
        let boldFontName = 'Helvetica-Bold'
        if (fonts.regular && fs.existsSync(fonts.regular)) {
          try {
            doc.registerFont('Inventory-Regular', fonts.regular)
            regularFontName = 'Inventory-Regular'
          } catch (_) {}
        }
        if (fonts.bold && fs.existsSync(fonts.bold)) {
          try {
            doc.registerFont('Inventory-Bold', fonts.bold)
            boldFontName = 'Inventory-Bold'
          } catch (_) {}
        } else if (regularFontName !== 'Helvetica') {
          boldFontName = regularFontName
        }
        doc.font(regularFontName)

        const formatNumberValue = value => {
          const num = Number(value)
          if (!Number.isFinite(num)) return '0,00'
          return num.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        }

        const formatNumberSigned = value => {
          const num = Number(value)
          if (!Number.isFinite(num)) return '0,00'
          const formatted = formatNumberValue(num)
          if (num > 0) return `+${formatted}`
          return formatted
        }

        const formatCurrencyValue = value => {
          const num = Number(value)
          if (!Number.isFinite(num)) return '0,00 PLN'
          return `${num.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`
        }

        const formatCurrencySigned = value => {
          const num = Number(value)
          if (!Number.isFinite(num)) return '0,00 PLN'
          const formatted = formatCurrencyValue(num)
          if (num > 0) return `+${formatted}`
          return formatted
        }

        const normalizeItem = (item, index) => {
          const qtyStock = Number(item.qtyStock) || 0
          const qtyCounted = Number(item.qtyCounted) || 0
          const netPrice = Number(item.netPrice) || 0
          const vatRate = Number(item.vatRate) || 0
          const vatMultiplier = 1 + (vatRate / 100)

          const netStock = qtyStock * netPrice
          const netCounted = qtyCounted * netPrice
          const qtyDiff = qtyCounted - qtyStock
          const netDiff = qtyDiff * netPrice
          const grossCounted = netCounted * vatMultiplier
          const grossDiff = netDiff * vatMultiplier

          return {
            lp: index + 1,
            manufacturerCode: String(item.manufacturerCode || '').trim(),
            magazineCode: String(item.magazineCode || '').trim(),
            name: String(item.name || '').trim(),
            qtyStock,
            qtyCounted,
            qtyDiff,
            netUnit: netPrice,
            grossUnit: netPrice * vatMultiplier,
            netCounted,
            netDiff,
            grossDiff
          }
        }

        const generatedAt = metadata.generatedAt
          ? new Date(metadata.generatedAt).toLocaleString('pl-PL')
          : new Date().toLocaleString('pl-PL')

        doc.font(boldFontName).fontSize(18).fillColor('#111827').text('Raport inwentury')
        doc.moveDown(0.3)
        doc.font(regularFontName).fontSize(10).fillColor('#4B5563')
          .text(`Data wygenerowania: ${generatedAt}`)
          .text(`Plik: ${sanitizedName}`)
        if (metadata.snapshotName) {
          doc.text(`Inwentura: ${metadata.snapshotName}`)
        }
        if (snapshotId) {
          doc.text(`ID zapisu: ${snapshotId}`)
        }
        doc.moveDown(0.8)
        doc.font(boldFontName).fontSize(12).fillColor('#111827').text('Pozycje')
        doc.moveDown(0.3)
        doc.font(regularFontName).fontSize(8).fillColor('#1F2937')

        const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
        const startX = doc.page.margins.left
        const startY = doc.y
        let tableY = startY
        const bottomLimit = () => doc.page.height - doc.page.margins.bottom

        const columnDefs = [
          { key: 'lp', label: 'LP', weight: 35, align: 'center', formatter: value => String(value ?? '') },
          { key: 'manufacturerCode', label: 'Kod prod.', weight: 120, align: 'left', formatter: value => value || '—' },
          { key: 'magazineCode', label: 'Kod magaz.', weight: 120, align: 'left', formatter: value => value || '—' },
          { key: 'name', label: 'Nazwa', weight: 240, align: 'left', formatter: value => value || '—' },
          { key: 'qtyStock', label: 'Ilość ewid.', weight: 80, align: 'right', formatter: formatNumberValue },
          { key: 'qtyCounted', label: 'Ilość policz.', weight: 80, align: 'right', formatter: formatNumberValue },
          { key: 'qtyDiff', label: 'Różnica', weight: 80, align: 'right', formatter: formatNumberSigned },
          { key: 'netUnit', label: 'Cena netto', weight: 100, align: 'right', formatter: formatCurrencyValue },
          { key: 'grossUnit', label: 'Cena brutto', weight: 100, align: 'right', formatter: formatCurrencyValue },
          { key: 'netCounted', label: 'Netto policz.', weight: 120, align: 'right', formatter: formatCurrencyValue },
          { key: 'netDiff', label: 'Różnica netto', weight: 120, align: 'right', formatter: formatCurrencySigned },
          { key: 'grossDiff', label: 'Różnica brutto', weight: 120, align: 'right', formatter: formatCurrencySigned }
        ]

        const totalWeight = columnDefs.reduce((sum, col) => sum + col.weight, 0)
        const columns = columnDefs.map(col => ({
          ...col,
          width: Math.floor((availableWidth * col.weight) / totalWeight)
        }))
        const widthSum = columns.reduce((sum, col) => sum + col.width, 0)
        columns[columns.length - 1].width += availableWidth - widthSum

        const columnXPositions = []
        columns.reduce((acc, col) => {
          columnXPositions.push(acc)
          return acc + col.width
        }, startX)

        const calculateRowHeight = (values, isHeader) => {
          doc.font(isHeader ? boldFontName : regularFontName).fontSize(isHeader ? 9 : 8)
          let maxHeight = 0
          values.forEach((value, idx) => {
            const width = columns[idx].width - 8
            const height = doc.heightOfString(value || ' ', { width, align: columns[idx].align || 'left' })
            if (height > maxHeight) maxHeight = height
          })
          return Math.max(isHeader ? 24 : 18, maxHeight + 8)
        }

        const drawHeader = () => {
          const headerValues = columns.map(col => col.label)
          const headerHeight = calculateRowHeight(headerValues, true)
          if (tableY + headerHeight > bottomLimit()) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
          doc.font(boldFontName).fontSize(12).fillColor('#111827').text('Pozycje (kontynuacja)')
            doc.moveDown(0.3)
            doc.font(regularFontName).fontSize(8).fillColor('#1F2937')
            tableY = doc.y
          }
          doc.save()
          doc.rect(startX, tableY, availableWidth, headerHeight).fill('#e5e7eb')
          doc.restore()
          doc.lineWidth(0.5).rect(startX, tableY, availableWidth, headerHeight).stroke()
          columns.forEach((col, idx) => {
            const x = columnXPositions[idx]
            if (idx > 0) {
              doc.moveTo(x, tableY).lineTo(x, tableY + headerHeight).stroke()
            }
            doc.font(boldFontName).fontSize(9).fillColor('#111827')
              .text(col.label, x + 4, tableY + 4, { width: col.width - 8, align: col.align || 'left' })
          })
          tableY += headerHeight
        }

        const drawRow = row => {
          const values = columns.map(col => {
            const rawValue = row[col.key]
            if (col.formatter) return col.formatter(rawValue)
            if (rawValue === null || rawValue === undefined || rawValue === '') return '—'
            return String(rawValue)
          })
          const rowHeight = calculateRowHeight(values, false)
          if (tableY + rowHeight > bottomLimit()) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
            doc.font(boldFontName).fontSize(12).fillColor('#111827').text('Pozycje (kontynuacja)')
            doc.moveDown(0.3)
            doc.font(regularFontName).fontSize(8).fillColor('#1F2937')
            tableY = doc.y
            drawHeader()
          }
          if (tableY + rowHeight > bottomLimit()) {
            // w wyjątkowych przypadkach (bardzo wysoka komórka) wymuś nową stronę
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
            doc.font(boldFontName).fontSize(12).fillColor('#111827').text('Pozycje (kontynuacja)')
            doc.moveDown(0.3)
            doc.font(regularFontName).fontSize(8).fillColor('#1F2937')
            tableY = doc.y
            drawHeader()
          }
          doc.lineWidth(0.5).rect(startX, tableY, availableWidth, rowHeight).stroke()
          columns.forEach((col, idx) => {
            const x = columnXPositions[idx]
            if (idx > 0) {
              doc.moveTo(x, tableY).lineTo(x, tableY + rowHeight).stroke()
            }
            doc.font(regularFontName).fontSize(8).fillColor('#1F2937')
              .text(values[idx], x + 4, tableY + 4, { width: col.width - 8, align: col.align || 'left' })
          })
          tableY += rowHeight
        }

        const normalizedItems = items.map((item, index) => normalizeItem(item, index))
        drawHeader()
        normalizedItems.forEach(drawRow)
        doc.y = tableY + 12

        if (doc.y + 140 > bottomLimit()) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 })
          doc.font(regularFontName).fontSize(8).fillColor('#1F2937')
        }

        doc.moveDown(0.8)
        doc.font(boldFontName).fontSize(12).fillColor('#111827').text('Podsumowanie')
        doc.moveDown(0.4)

        doc.font(regularFontName).fontSize(10).fillColor('#1F2937')
          .text(`Łącznie pozycji: ${summary.totalItems ?? items.length}`)
          .text(`Niedobory (pozycji): ${summary.missingCount ?? ''}`)
          .text(`Nadwyżki (pozycji): ${summary.surplusCount ?? ''}`)
          .moveDown(0.6)
        doc.text(`Wartość netto wg ewidencji: ${formatCurrencyValue(summary.netStockValue)}`)
          .text(`Wartość netto policzona: ${formatCurrencyValue(summary.netCountedValue)}`)
          .text(`Różnica netto: ${formatCurrencyValue(summary.netDifference)}`)
          .moveDown(0.6)
        doc.text(`Wartość brutto policzona: ${formatCurrencyValue(summary.grossCountedValue)}`)
          .text(`Różnica brutto: ${formatCurrencyValue(summary.grossDifference)}`)
        doc.moveDown(1.5)
        doc.fillColor('#6B7280').font(regularFontName).fontSize(9)
          .text('Raport wygenerowany automatycznie przez moduł Inwentury. Dokument nie wpływa na stany magazynowe systemu.')

        doc.end()

        await new Promise((resolve, reject) => {
          stream.on('finish', resolve)
          stream.on('error', reject)
        })

        console.log('📄 [inventory] report generated:', filePath)
        return res.json({ success: true, path: filePath, message: `Raport zapisano w ${filePath}` })
      } catch (error) {
        console.error('❌ [inventory] report generation failed:', error?.message || error)
        return res.status(500).json({ success: false, error: 'Nie udało się wygenerować raportu PDF.' })
      }
    })

    // Kompatybilny endpoint zakończenia pracy – deleguje do /status
    this.app.put('/api/desktop/orders/:orderId/complete', async (req, res) => {
      try {
        req.body = Object.assign({}, req.body || {}, { status: 'completed' })
        const layer = this.app._router.stack.find(l => l.route && l.route.path === '/api/desktop/orders/:orderId/status' && l.route.methods.put)
        if (layer && typeof layer.handle === 'function') {
          const originalJson = res.json.bind(res)
          res.json = (payload) => {
            try {
              const orderId = parseInt(req.params.orderId)
              if (Number.isFinite(orderId) && orderId > 0) {
                setTimeout(() => {
                  try {
                    const endpoint = `http://127.0.0.1:${this.getServerPort()}/api/railway/export-order/${orderId}`
                    fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({})
                    }).catch(()=>{})
                  } catch (_) {}
                }, 800)
              }
            } catch (_) {}
            return originalJson(payload)
          }
          return layer.handle(req, res)
        }
        return res.status(400).json({ error: 'Status handler not found' })
      } catch (e) {
        console.error('❌ /complete error:', e)
        res.status(500).json({ error: 'Internal error' })
      }
    })
    // Pobierz zlecenia przypisane do technika
    this.app.get('/api/desktop/orders/:userId', async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        // Walidacja
        if (!userId || userId < 1) {
          return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Pobierz zlecenia przypisane do technika z pełnymi danymi
        const orders = await this.db.all(`
          SELECT 
            o.*,
            -- Informacje o kliencie
            COALESCE(
              CASE 
                WHEN c.company_name IS NOT NULL AND c.company_name != '' 
                THEN c.company_name 
                ELSE NULL
              END,
              TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')),
              o.client_name,
              'Klient bez nazwy'
            ) as client_name,
            COALESCE(c.phone, o.client_phone) as client_phone,
            COALESCE(c.email, o.client_email) as client_email,
            c.address_street,
            c.address_city,
            c.address_postal_code,
            c.address_country,
            COALESCE(
              c.address_street || ', ' || c.address_postal_code || ' ' || c.address_city || ', ' || c.address_country,
              c.address,
              o.address,
              'Brak adresu'
            ) as address,
            -- Informacje o urządzeniu
            d.name as device_name,
            d.full_name as device_full_name,
            d.model as device_model,
            d.manufacturer as device_brand,
            d.serial_number as device_serial,
            d.warranty_end_date as device_warranty,
            d.last_service_date as device_last_service,
            -- Informacje o techniku
            u.full_name as technician_name
          FROM service_orders o
          LEFT JOIN clients c ON o.client_id = c.id
          LEFT JOIN devices d ON o.device_id = d.id
          LEFT JOIN users u ON o.assigned_user_id = u.id
          WHERE o.assigned_user_id = ?
        `, [userId]);

        console.log(`📱 Pobrano ${orders.length} zleceń dla technika ${userId}`);
        console.log('🔍 DEBUG - Przykładowe zlecenie:', orders.length > 0 ? JSON.stringify(orders[0], null, 2) : 'Brak zleceń');
        res.json(orders);
      } catch (error) {
        console.error('❌ Błąd pobierania zleceń:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Upload zdjęć do zlecenia (z PWA) – zapis referencji w polu work_photos
    this.app.post('/api/desktop/orders/:orderId/photos', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        // Prosty bufor: oczekujemy multipart; jeśli środowisko nie ma uploadu plików,
        // przyjmujemy metadane zdjęć w formie JSON (front tak wysyła obecnie)
        let files = []
        try {
          if (req.files && Array.isArray(req.files)) {
            files = req.files.map(f => ({ path: f.path, name: f.originalname }))
          }
        } catch (_) {}
        if ((!files || files.length === 0) && req.body) {
          // fallback: nic nie zapisujemy fizycznie, ale nie blokujemy przepływu
          files = []
        }
        // Po prostu potwierdź odbiór – zdjęcia są dołączane do completion payload w następnym kroku
        return res.json({ success: true, files })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== Railway helpers: delete preview/commit (proxy) =====
    this.app.post('/api/railway/delete/preview', async (req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const headers = { 'Content-Type': 'application/json' }
        if (process.env.DELETE_ADMIN_SECRET) headers['X-Admin-Secret'] = process.env.DELETE_ADMIN_SECRET
        const r = await fetch(`${base}/delete/preview`, {
          method: 'POST', headers, body: JSON.stringify(req.body || {})
        })
        const j = await r.json().catch(() => ({}))
        return res.status(r.status).json(j)
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    this.app.post('/api/railway/delete/commit', async (req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const headers = { 'Content-Type': 'application/json' }
        if (process.env.DELETE_ADMIN_SECRET) headers['X-Admin-Secret'] = process.env.DELETE_ADMIN_SECRET
        const body = Object.assign({}, req.body || {}, { confirm: !!(req.body && req.body.confirm) })
        const r = await fetch(`${base}/delete/commit`, {
          method: 'POST', headers, body: JSON.stringify(body)
        })
        const j = await r.json().catch(() => ({}))
        return res.status(r.status).json(j)
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // Aktualizuj status zlecenia - NAPRAWIONY z natychmiastowym sync do Railway
    this.app.put('/api/desktop/orders/:orderId/status', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const _raw = req.body || {};
        // Normalizacja pól z PWA – wspieraj camelCase i snake_case
        const status = _raw.status || _raw.new_status || _raw.state;
        const completedCategories = (_raw.completedCategories ?? _raw.completed_categories ?? _raw.completed) || [];
        const photos = (_raw.photos ?? _raw.work_photos ?? _raw.workPhotos) || [];
        const completionNotes = (_raw.completion_notes ?? _raw.completionNotes) || '';
        const notes = (typeof _raw.notes === 'string') ? _raw.notes : '';
        const actualHoursFromBody = (_raw.actual_hours ?? _raw.actualHours);
        const partsUsedText = (_raw.partsUsed ?? _raw.parts_used ?? null);

        // Walidacja
        if (!orderId || !status) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['new', 'in_progress', 'completed', 'rejected'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        const now = new Date().toISOString();

        // Pobierz aktualne zlecenie
        const currentOrder = await this.db.get('SELECT * FROM service_orders WHERE id = ?', [orderId]);
        if (!currentOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }

        let updateData = { status, updated_at: now };

        // === ROZPOCZĘCIE PRACY ===
        if (status === 'in_progress' && currentOrder.status !== 'in_progress') {
          updateData.actual_start_date = now;
          
          // Rozpocznij licznik czasu
          this.startWorkTimer(orderId);
          
          console.log(`🚀 [STATUS] Rozpoczęto pracę nad zleceniem ${orderId}`);
        }

        // === UKOŃCZENIE PRACY ===
        if (status === 'completed') {
          updateData.actual_end_date = now;
          updateData.completed_categories = JSON.stringify(completedCategories || []);
          updateData.work_photos = JSON.stringify(photos || []);
          updateData.completion_notes = completionNotes || '';
          if (notes && String(notes).trim() !== '') {
            updateData.notes = String(notes).trim()
          }
          if (partsUsedText != null && String(partsUsedText).trim() !== '') {
            updateData.parts_used = String(partsUsedText)
          }

          // Zatrzymaj licznik czasu
          this.stopWorkTimer(orderId);

          // Oblicz rzeczywiste godziny pracy
          const startDate = new Date(currentOrder.actual_start_date || now);
          const endDate = new Date(now);
          const actualHours = Math.round((endDate - startDate) / (1000 * 60 * 60) * 10) / 10;
          updateData.actual_hours = actualHours;
          // Jeśli przychodzi jawna liczba godzin z payloadu – preferuj ją
          if (actualHoursFromBody != null && !isNaN(Number(actualHoursFromBody))) {
            updateData.actual_hours = Number(actualHoursFromBody)
          }

          console.log(`✅ [STATUS] Ukończono zlecenie ${orderId}, czas pracy: ${actualHours}h`);
        }

        // === ZLECENIE ODRZUCONE/NIE ZREALIZOWANE ===
        if (status === 'rejected') {
          updateData.actual_end_date = now;
          updateData.completion_notes = completionNotes || '';
          if (notes && String(notes).trim() !== '') {
            updateData.notes = String(notes).trim()
          }
          if (partsUsedText != null && String(partsUsedText).trim() !== '') {
            updateData.parts_used = String(partsUsedText)
          }
          
          console.log(`❌ [STATUS] Zlecenie ${orderId} oznaczone jako odrzucone/nie zrealizowane`);
        }

        // Aktualizuj w bazie danych
        const updateFields = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
        const updateValues = Object.values(updateData);
        
        await this.db.run(
          `UPDATE service_orders SET ${updateFields} WHERE id = ?`,
          [...updateValues, orderId]
        );

        // Synchronizuj status z Railway (fire-and-forget, ale zapisuj pełne dane)
        try {
          const base = RAILWAY_API_BASE.replace(/\/$/, '');
          const remotePayload = { status };
          if (Array.isArray(completedCategories) && completedCategories.length) {
            remotePayload.completedCategories = completedCategories;
            remotePayload.completed_categories = completedCategories;
          }
          if (Array.isArray(photos) && photos.length) {
            remotePayload.photos = photos;
            remotePayload.work_photos = photos;
          }
          if (completionNotes && String(completionNotes).trim() !== '') {
            remotePayload.completion_notes = String(completionNotes).trim();
          }
          if (technicianNotes && String(technicianNotes).trim() !== '') {
            remotePayload.notes = String(technicianNotes).trim();
          }
          if (partsUsedText && String(partsUsedText).trim() !== '') {
            remotePayload.parts_used = String(partsUsedText).trim();
          }
          if (updateData.actual_hours != null) {
            remotePayload.actual_hours = updateData.actual_hours;
          } else if (actualHoursFromBody != null && !Number.isNaN(Number(actualHoursFromBody))) {
            remotePayload.actual_hours = Number(actualHoursFromBody);
          }

          fetch(`${base}/desktop/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(remotePayload)
          }).catch(() => {});
        } catch (syncErr) {
          console.warn('⚠️ [STATUS] Railway sync failed:', syncErr?.message || syncErr);
        }

        // Powiadom główną aplikację o zmianie (przez IPC jeśli potrzeba)
        this.notifyOrderUpdate(orderId, updateData);

        // Dalsza pełna synchronizacja (payload) następuje przy przycisku "Wyślij do firmy"

        res.json({ success: true, orderId, status, timestamp: now });

        // Natychmiastowy, bezpieczny import detali z Railway po zakończeniu – fire-and-forget
        try {
          if (String(status).toLowerCase() === 'completed') {
            const port = process.env.PORT || 5174
            fetch(`http://127.0.0.1:${port}/api/railway/import-order/${orderId}?detailsOnly=1`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ markImported: false, detailsOnly: true })
            }).catch(()=>{})
          }
        } catch (_) {}
      } catch (error) {
        console.error('❌ Błąd aktualizacji zlecenia:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Stabilny endpoint: zakończenie zlecenia (PUT/POST), zapisuje pola z PWA
    const completeHandler = async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        const _raw = req.body || {}
        let completedCategories = (_raw.completedCategories ?? _raw.completed_categories ?? _raw.completed) || []
        const photos = (_raw.photos ?? _raw.work_photos ?? _raw.workPhotos) || []
        const completionNotesRaw = _raw.completion_notes ?? _raw.completionNotes ?? _raw.workDescription ?? _raw.description ?? ''
        const technicianNotesRaw = _raw.notes ?? _raw.technician_notes ?? _raw.technicianNotes ?? ''
        const actualHoursFromBody = (_raw.actual_hours ?? _raw.actualHours)

        if (typeof completedCategories === 'string') {
          const trimmed = completedCategories.trim()
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try { completedCategories = JSON.parse(trimmed) } catch (_) {}
          } else if (trimmed.length) {
            completedCategories = trimmed.split(',').map(s => s.trim()).filter(Boolean)
          }
        }
        if (!Array.isArray(completedCategories)) completedCategories = []

        const toStringSafe = (value) => {
          if (value == null) return ''
          return typeof value === 'string' ? value : String(value)
        }
        const completionNotes = toStringSafe(completionNotesRaw)
        const technicianNotes = toStringSafe(technicianNotesRaw)

        if (!orderId) return res.status(400).json({ error: 'Missing orderId' })

        const now = new Date().toISOString()
        const currentOrder = await this.db.get('SELECT * FROM service_orders WHERE id = ?', [orderId])
        if (!currentOrder) return res.status(404).json({ error: 'Order not found' })

        // Przygotuj listę zdjęć – jeżeli przyszły data:URL, zapisz do device_files i podmień na lokalny URL
        let processedPhotos = Array.isArray(photos) ? [...photos] : []
        try {
          // Pobierz device_id z bieżącego zlecenia
          const deviceId = currentOrder?.device_id || null
          // Szybka funkcja zapisu dataURL → plik → device_files → zwrot lokalnego URL
          const saveDataUrlAsDeviceFile = async (dataUrl, suggestedName) => {
            try {
              const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/)
              if (!m) return null
              const mime = m[1]
              const base64 = m[2]
              const buf = Buffer.from(base64, 'base64')
              const path = require('path')
              const fs = require('fs')
              let app = null
              try { const em = require('electron'); app = em && em.app ? em.app : null } catch(_) { app = null }
              const baseDir = (app && app.getPath ? app.getPath('userData') : path.join(__dirname, '..', '..'))
              const devDirName = deviceId ? `device-${deviceId}` : 'device-unknown'
              const deviceDir = path.join(baseDir, 'device-files', devDirName)
              try { fs.mkdirSync(deviceDir, { recursive: true }) } catch(_) {}
              const ext = (() => { const mt = (mime||'').toLowerCase(); if (mt.includes('png')) return '.png'; if (mt.includes('webp')) return '.webp'; if (mt.includes('gif')) return '.gif'; if (mt.includes('bmp')) return '.bmp'; return '.jpg' })()
              const safeBase = (suggestedName || `photo-${Date.now()}` ).replace(/[^a-zA-Z0-9_.\-]/g, '_')
              const filePath = path.join(deviceDir, `${Date.now()}-${safeBase}${ext}`)
              try { fs.writeFileSync(filePath, buf) } catch (_) { return null }
              // Zapis do bazy device_files
              try {
                await this.ensureDeviceFilesTable?.()
                await this.db.run(
                  'INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, mime_type, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [deviceId || null, path.basename(filePath), filePath, 'image', buf.length, mime || null, `Foto zlecenia ${orderId}`]
                )
                const row = deviceId
                  ? await this.db.get('SELECT id FROM device_files WHERE device_id = ? AND file_path = ? ORDER BY id DESC LIMIT 1', [deviceId, filePath])
                  : await this.db.get('SELECT id FROM device_files WHERE file_path = ? ORDER BY id DESC LIMIT 1', [filePath])
                if (row && row.id) return { local: `/api/desktop/files/${row.id}` }
              } catch (_) { return null }
              return null
            } catch (_) { return null }
          }

          const out = []
          for (const ph of processedPhotos) {
            try {
              if (ph && typeof ph === 'object') {
                const dataUrl = ph.local && String(ph.local).startsWith('data:') ? ph.local : (ph.data && String(ph.data).startsWith('data:') ? ph.data : null)
                if (dataUrl) {
                  const saved = await saveDataUrlAsDeviceFile(dataUrl, ph.name || ph.filename || null)
                  if (saved) { out.push(saved); continue }
                }
                out.push(ph)
              } else if (typeof ph === 'string') {
                if (ph.startsWith('data:')) {
                  const saved = await saveDataUrlAsDeviceFile(ph, null)
                  if (saved) { out.push(saved); continue }
                }
                out.push(ph)
              }
            } catch (_) { out.push(ph) }
          }
          processedPhotos = out
        } catch (_) { /* leave photos as-is on error */ }

        const updateData = {
          status: 'completed',
          updated_at: now,
          actual_end_date: now,
          completed_categories: JSON.stringify(completedCategories || []),
          work_photos: JSON.stringify(processedPhotos || []),
          completion_notes: completionNotes
        }

        // Zapisz osobne pole z uwagami technika, jeżeli przyszło w payloadzie
        const cleanNotes = technicianNotes.trim()
        if (cleanNotes) {
          updateData.notes = cleanNotes
        }

        // Oblicz godziny z czasu startu, ale preferuj podane w payloadzie
        const startDate = new Date(currentOrder.actual_start_date || now)
        const endDate = new Date(now)
        let actualHours = Math.round((endDate - startDate) / (1000 * 60 * 60) * 10) / 10
        if (actualHoursFromBody != null && !isNaN(Number(actualHoursFromBody))) {
          actualHours = Number(actualHoursFromBody)
        }
        updateData.actual_hours = actualHours

        const setSql = Object.keys(updateData).map(k => `${k} = ?`).join(', ')
        const setVals = Object.values(updateData)
        await this.db.run(`UPDATE service_orders SET ${setSql} WHERE id = ?`, [...setVals, orderId])

        this.stopWorkTimer(orderId)
        this.notifyOrderUpdate(orderId, updateData)
        res.json({ success: true, orderId, status: 'completed', timestamp: now })

        // Natychmiastowy import detali z Railway (asynchronicznie)
        try {
          const port = process.env.PORT || 5174
          fetch(`http://127.0.0.1:${port}/api/railway/import-order/${orderId}?detailsOnly=1`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ markImported: false, detailsOnly: true })
          }).catch(()=>{})
        } catch (_) {}
      } catch (e) {
        console.error('❌ complete error:', e)
        return res.status(500).json({ error: 'Database error' })
      }
    }
    this.app.put('/api/desktop/orders/:orderId/complete', completeHandler)
    this.app.post('/api/desktop/orders/:orderId/complete', completeHandler)
    // Wyślij nowe zlecenie do technika - NAPRAWIONY z walidacją i natychmiastowym sync
    this.app.post('/api/desktop/orders/:orderId/assign', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const { technicianId, priority } = req.body;

        // Walidacja - orderId jest wymagane, technicianId może być null (odznaczenie)
        if (!orderId) {
          return res.status(400).json({ error: 'Missing orderId' });
        }

        const now = new Date().toISOString();
        
        // Jeśli technicianId jest null/undefined, odznacz technika
        if (!technicianId) {
          await this.db.run(`
            UPDATE service_orders 
            SET assigned_user_id = NULL, updated_at = ?
            WHERE id = ?
          `, [now, orderId]);
          
          console.log(`📤 [ASSIGN] Odznaczono technika ze zlecenia ${orderId}`);
          
          // Sync do Railway - odznaczenie
          const order = await this.db.get('SELECT order_number FROM service_orders WHERE id = ?', [orderId]);
          if (order && order.order_number) {
            fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/assign`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_number: order.order_number,
                technicianId: null,
                status: 'new'
              })
            }).then(r => {
              if (r && r.ok) console.log(`✅ [ASSIGN] Zsynchronizowano odznaczenie technika w Railway`);
            }).catch(e => console.warn(`⚠️ [ASSIGN] Błąd sync odznaczenia:`, e.message));
          }
          
          return res.json({ success: true, orderId, technicianId: null });
        }
        
        // ===== WALIDACJA TECHNIKA =====
        const technician = await this.db.get('SELECT id, username, full_name, role, is_active FROM users WHERE id = ?', [technicianId]);
        
        if (!technician) {
          console.error(`❌ [ASSIGN] Technik ID ${technicianId} nie istnieje!`);
          return res.status(404).json({ error: 'Technician not found', technicianId });
        }
        
        if (technician.is_active !== 1) {
          console.error(`❌ [ASSIGN] Technik ${technician.username} jest nieaktywny!`);
          return res.status(400).json({ error: 'Technician is not active', technicianId });
        }
        
        if (!['technician', 'installer', 'admin'].includes(technician.role)) {
          console.error(`❌ [ASSIGN] Użytkownik ${technician.username} nie ma roli technika (rola: ${technician.role})!`);
          return res.status(400).json({ error: 'User is not a technician', technicianId, role: technician.role });
        }
        
        console.log(`✅ [ASSIGN] Walidacja technika ${technician.username} OK`);
        
        // Przypisz technika
        await this.db.run(`
          UPDATE service_orders 
          SET assigned_user_id = ?, priority = ?, status = 'assigned', updated_at = ?, desktop_sync_status = NULL
          WHERE id = ?
        `, [technicianId, priority || 'medium', now, orderId]);

        console.log(`📤 [ASSIGN] Wysłano zlecenie ${orderId} do technika ${technicianId} (${technician.username})`);
        
        // ===== NATYCHMIASTOWY SYNC DO RAILWAY =====
        console.log(`🔄 [ASSIGN] Natychmiastowy sync przypisania do Railway...`);
        
        // 1. Najpierw zsynchronizuj technika do Railway (jeśli jeszcze nie istnieje)
        const users = await this.db.all('SELECT id, username, full_name, email, role, is_active, phone, mobile_pin_hash FROM users WHERE id = ?', [technicianId]);
        if (users && users.length > 0) {
          fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
          }).then(r => {
            if (r && r.ok) console.log(`✅ [ASSIGN] Zsynchronizowano technika ${technicianId} do Railway`);
          }).catch(e => console.warn(`⚠️ [ASSIGN] Błąd sync technika:`, e.message));
        }
        
        // 2. Pobierz pełne dane zlecenia i wyślij do Railway
        const fullOrder = await this.db.get(`
          SELECT 
            o.*,
            c.email as client_email,
            c.external_id as client_external_id,
            d.serial_number as device_serial,
            d.external_id as device_external_id
          FROM service_orders o
          LEFT JOIN clients c ON o.client_id = c.id
          LEFT JOIN devices d ON o.device_id = d.id
          WHERE o.id = ?
        `, [orderId]);
        
        if (fullOrder) {
          const orderPayload = [{
            id: fullOrder.id,
            order_number: fullOrder.order_number,
            title: fullOrder.title || fullOrder.description || `Zlecenie ${fullOrder.order_number || fullOrder.id}`,
            client_id: fullOrder.client_id || null,
            device_id: fullOrder.device_id || null,
            client_email: fullOrder.client_email || null,
            external_client_id: fullOrder.client_external_id || (fullOrder.client_id ? `${this.installationId}:client:${fullOrder.client_id}` : null),
            client_external_id: fullOrder.client_external_id || (fullOrder.client_id ? `${this.installationId}:client:${fullOrder.client_id}` : null),
            device_serial: fullOrder.device_serial || null,
            external_device_id: fullOrder.device_external_id || (fullOrder.device_id ? `${this.installationId}:device:${fullOrder.device_id}` : null),
            device_external_id: fullOrder.device_external_id || (fullOrder.device_id ? `${this.installationId}:device:${fullOrder.device_id}` : null),
            assigned_user_id: technicianId,
            priority: priority || 'medium',
            status: 'assigned',
            description: fullOrder.description || null,
            scheduled_date: fullOrder.scheduled_date || null,
            scheduled_datetime: fullOrder.scheduled_datetime || null,
            service_categories: fullOrder.service_categories || null,
            created_at: fullOrder.created_at || null,
            updated_at: now
          }];
          
          // Wyślij zlecenie
          fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
          }).then(resp => {
            if (resp && resp.ok) {
              console.log(`✅ [ASSIGN] Natychmiastowy sync zlecenia ${orderId} do Railway: OK`);
              
              // Wyślij przypisanie
              return fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_number: fullOrder.order_number,
                  technicianId: technicianId,
                  status: 'assigned',
                  assignedAt: now
                })
              });
            } else {
              console.warn(`⚠️ [ASSIGN] Sync zlecenia do Railway: FAILED (HTTP ${resp?.status})`);
              return null;
            }
          }).then(assignResp => {
            if (assignResp && assignResp.ok) {
              console.log(`✅ [ASSIGN] Natychmiastowy sync przypisania do Railway: OK`);
              // Oznacz jako zsynchronizowane
              this.db.run('UPDATE service_orders SET desktop_sync_status = ?, desktop_synced_at = CURRENT_TIMESTAMP WHERE id = ?', ['sent', orderId]).catch(() => {});
            }
          }).catch(err => {
            console.error(`❌ [ASSIGN] Błąd natychmiastowego sync:`, err.message);
          });
        }
        
        res.json({ success: true, orderId, technicianId, technician: technician.username });
      } catch (error) {
        console.error('❌ Błąd wysyłania zlecenia:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
      }
    });

    // Endpoint do pobierania listy techników dla aplikacji mobilnej
    this.app.get('/api/technicians', async (req, res) => {
      try {
        const technicians = await this.db.all(`
          SELECT id, username, full_name, email, role
          FROM users 
          WHERE role IN ('technician', 'installer') 
          AND is_active = 1
          ORDER BY full_name ASC
        `);
        
        console.log(`📱 Pobrano ${technicians.length} techników:`, technicians.map(t => ({id: t.id, name: t.full_name})));
        
        res.json(technicians);
      } catch (error) {
        console.error('❌ Błąd pobierania techników:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do pobierania urządzeń
    this.app.get('/api/desktop/devices', async (req, res) => {
      try {
        const devices = await this.db.all(`
          SELECT 
            id,
            name,
            manufacturer as brand,
            model,
            serial_number,
            fuel_type,
            installation_date,
            last_service_date,
            next_service_date,
            warranty_end_date,
            client_id,
            is_active,
            created_at,
            updated_at
          FROM devices 
          WHERE is_active = 1
          ORDER BY name ASC
        `);
        
        console.log(`📱 Pobrano ${devices.length} urządzeń`);
        res.json(devices);
      } catch (error) {
        console.error('❌ Błąd pobierania urządzeń:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Healthcheck
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        active_orders: this.activeOrders.size 
      });
    });
    // ===== Railway → Desktop: import pojedynczego zlecenia (używane przez "Sprawdź zdjęcia") =====
    this.app.post('/api/railway/import-order/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })

        const baseUrl = RAILWAY_API_BASE.replace(/\/$/, '')
        const detailsOnly = (String(req.query?.detailsOnly || '') === '1') || (!!req.body && !!req.body.detailsOnly)
        const markImportedFlag = (() => {
          const raw = req.body?.markImported ?? req.query?.markImported
          if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true
          return false
        })()

        const fetchJson = async (url, options = {}) => {
          try {
            const response = await fetch(url, options)
            const text = await response.text()
            let json
            if (!text) {
              json = {}
            } else {
              try {
                json = JSON.parse(text)
              } catch (_) {
                json = { raw: text }
              }
            }
            return { ok: response.ok, status: response.status, json }
          } catch (error) {
            return { ok: false, status: 0, error }
          }
        }

        const normalizeArrayJson = (val) => {
          try {
            if (Array.isArray(val)) return JSON.stringify(val)
            if (val == null) return '[]'
            const raw = typeof val === 'string' ? val.trim() : JSON.stringify(val)
            if (!raw) return '[]'
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) return JSON.stringify(parsed)
            if (typeof parsed === 'string') {
              const again = JSON.parse(parsed)
              return JSON.stringify(Array.isArray(again) ? again : [])
            }
            return '[]'
          } catch (_) {
            return '[]'
          }
        }

        const sanitizeText = (val) => {
          if (val === undefined || val === null) return null
          const text = String(val).trim()
          return text.length ? text : null
        }

        const sanitizeDate = (val) => {
          if (!val) return null
          const str = String(val).trim()
          return str.length ? str : null
        }

        const parseNumber = (val) => {
          if (val === undefined || val === null || val === '') return null
          const num = Number(val)
          return Number.isFinite(num) ? num : null
        }

        const sanitizePartsUsed = (val) => {
          if (val === undefined || val === null) return null
          if (Array.isArray(val)) {
            const flat = val.map(v => sanitizeText(v)).filter(Boolean)
            return flat.length ? flat.join(', ') : null
          }
          if (typeof val === 'object') {
            const flat = Object.values(val).map(v => sanitizeText(v)).filter(Boolean)
            return flat.length ? flat.join(', ') : null
          }
          const text = String(val).trim()
          return text.length ? text : null
        }

        const unpackOrder = (payload) => {
          if (!payload) return null
          if (payload.order) return payload.order
          if (payload.data && !Array.isArray(payload.data)) return payload.data
          return payload
        }

        const attempts = []
        const mismatchedCandidates = []
        const remember = (source, result) => {
          if (!result) return
          attempts.push({ source, status: result.status ?? 0, ok: !!result.ok })
        }

        const localSnapshot = await this.db.get('SELECT order_number, assigned_user_id FROM service_orders WHERE id = ?', [orderId]).catch(() => null)
        let orderNumber = localSnapshot?.order_number ? String(localSnapshot.order_number).trim() : null

        let remote = null
        let remoteId = orderId
        const adoptRemote = async (payload, sourceLabel) => {
          const candidate = unpackOrder(payload)
          if (!candidate || typeof candidate !== 'object') return false
          const candidateNumber = candidate.order_number || candidate.orderNumber || null
          const localNumber = orderNumber || null
          if (localNumber && candidateNumber && localNumber !== candidateNumber) {
            const canReconcile = /^REQ-/i.test(localNumber) && /^SRV-/i.test(candidateNumber)
            if (canReconcile) {
              try {
                await this.db.run('UPDATE service_orders SET order_number = ? WHERE order_number = ?', [candidateNumber, localNumber])
                orderNumber = candidateNumber
                remote = { ...candidate }
                if (candidate.id) remoteId = candidate.id
                try {
                  console.warn('[import-order] reconciled order_number', localNumber, '->', candidateNumber, '(order', orderId, ')')
                } catch (_) {}
                return true
              } catch (err) {
                const errMsg = err?.message ? String(err.message) : ''
                const isUniqueConstraint = /SQLITE_CONSTRAINT/i.test(errMsg)
                if (isUniqueConstraint) {
                  try {
                    const existingTarget = await this.db.get('SELECT id FROM service_orders WHERE order_number = ? LIMIT 1', [candidateNumber]).catch(() => null)
                    if (existingTarget && existingTarget.id != null) {
                      const dedupeNumber = `DUP-${Date.now()}-${localNumber}`
                      await this.db.run(
                        `UPDATE service_orders
                           SET status = 'deleted',
                               order_number = ?,
                               updated_at = CURRENT_TIMESTAMP
                         WHERE order_number = ?`,
                        [dedupeNumber, localNumber]
                      ).catch(() => {})
                      orderNumber = candidateNumber
                      remote = { ...candidate }
                      if (candidate.id) remoteId = candidate.id
                      try {
                        console.warn('[import-order] reconciled order_number via dedupe', localNumber, '->', candidateNumber, '(order', orderId, ')')
                      } catch (_) {}
                      return true
                    }
                  } catch (dedupeErr) {
                    try {
                      console.warn('[import-order] reconcile dedupe failed', dedupeErr?.message || dedupeErr)
                    } catch (_) {}
                  }
                }
                try {
                  console.warn('[import-order] reconcile order_number failed', err?.message || err)
                } catch (_) {}
              }
            }
            mismatchedCandidates.push({ source: sourceLabel || 'unknown', number: candidateNumber, id: candidate.id || null })
            return false
          }
          remote = { ...candidate }
          if (candidate.id) remoteId = candidate.id
          return true
        }

        let resp = await fetchJson(`${baseUrl}/desktop/orders/by-id/${orderId}`)
        remember('desktop-by-id', resp)
        if (resp.ok) await adoptRemote(resp.json, 'desktop-by-id')

        if (!remote) {
          resp = await fetchJson(`${baseUrl}/orders/${orderId}`)
          remember('orders-id', resp)
          if (resp.ok) await adoptRemote(resp.json, 'orders-id')
        }

        if (!remote && orderNumber) {
          resp = await fetchJson(`${baseUrl}/desktop/orders/by-number/${encodeURIComponent(orderNumber)}`)
          remember('desktop-by-number', resp)
          if (resp.ok) await adoptRemote(resp.json, 'desktop-by-number')
        }

        if (!remote && localSnapshot?.assigned_user_id) {
          resp = await fetchJson(`${baseUrl}/desktop/orders/${localSnapshot.assigned_user_id}`)
          remember('desktop-by-technician', resp)
          if (resp.ok && Array.isArray(resp.json)) {
            const match = resp.json.find(o => o && (o.id === orderId || (orderNumber && o.order_number === orderNumber)))
            if (match) await adoptRemote(match, 'desktop-by-technician')
          }
        }

        if (!remote && orderNumber) {
          resp = await fetchJson(`${baseUrl}/orders`)
          remember('orders-list', resp)
          if (resp.ok) {
            const list = Array.isArray(resp.json) ? resp.json : (Array.isArray(resp.json?.data) ? resp.json.data : [])
            const match = list.find(o => o && o.order_number === orderNumber)
            if (match) await adoptRemote(match, 'orders-list')
          }
        }

        if (remoteId) {
          const pull = await fetchJson(`${baseUrl}/orders/${remoteId}/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markImported: markImportedFlag })
          })
          remember('orders-pull', pull)
          if (pull.ok) await adoptRemote(pull.json, 'orders-pull')
        }

        if (!remote || !remoteId) {
          if (!remote && mismatchedCandidates.length) {
            try {
              console.warn('[import-order] skipped mismatched candidates during fetch', { requestedId: orderId, orderNumber, mismatchedCandidates })
            } catch (_) {}
          }
          try {
            console.warn('[import-order] Unable to resolve remote order', {
              requestedId: orderId,
              orderNumber,
              attempts
            })
          } catch (_) {}
          const lastStatus = [...attempts].reverse().find(a => a && a.status) || { status: 0 }
          return res.status(502).json({ success: false, error: 'Railway fetch failed', status: lastStatus.status || 0 })
        }

        if ((!remote.work_photos || remote.work_photos === null) && remoteId) {
          const enrich = await fetchJson(`${baseUrl}/desktop/orders/by-id/${remoteId}`)
          remember('desktop-by-id-enrich', enrich)
          if (enrich.ok && enrich.json?.order) {
            remote = { ...enrich.json.order, ...remote }
            if (remote.id) remoteId = remote.id
          }
        }

        const remoteOrderNumber = remote.order_number || remote.orderNumber || orderNumber || String(remoteId)
        const remoteActualStart = sanitizeDate(remote.actual_start_date ?? remote.actualStartDate ?? remote.started_at)
        const remoteActualEnd = sanitizeDate(remote.actual_end_date ?? remote.actualEndDate ?? remote.completed_at)
        const remoteStartedAt = sanitizeDate(remote.started_at ?? remoteActualStart)
        const remoteCompletedAt = sanitizeDate(remote.completed_at ?? remoteActualEnd)

        const remoteClientExternal = remote.client_external_id || remote.external_client_id || remote.clientExternalId || null
        const remoteDeviceExternal = remote.device_external_id || remote.external_device_id || remote.deviceExternalId || null
        let mappedClientId = null
        if (remoteClientExternal && typeof remoteClientExternal === 'string') {
          const row = await this.db.get('SELECT id FROM clients WHERE external_id = ?', [remoteClientExternal]).catch(() => null)
          try {
            console.log('[import-order] map client by external', remoteClientExternal, '->', row?.id ?? null)
          } catch (_) {}
          if (row && row.id) {
            mappedClientId = row.id
          }
        }
        if (mappedClientId == null && remote.client_id != null) {
          const row = await this.db.get('SELECT id, external_id FROM clients WHERE id = ?', [remote.client_id]).catch(() => null)
          try {
            console.log('[import-order] map client by id', remote.client_id, '->', row?.id ?? null)
          } catch (_) {}
          if (row && row.id) {
            mappedClientId = row.id
            if ((!row.external_id || row.external_id.trim() === '') && remoteClientExternal) {
              await this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [remoteClientExternal, row.id]).catch(() => {})
            }
          }
        }

        let mappedDeviceId = null
        if (remoteDeviceExternal && typeof remoteDeviceExternal === 'string') {
          const row = await this.db.get('SELECT id FROM devices WHERE external_id = ?', [remoteDeviceExternal]).catch(() => null)
          try {
            console.log('[import-order] map device by external', remoteDeviceExternal, '->', row?.id ?? null)
          } catch (_) {}
          if (row && row.id) {
            mappedDeviceId = row.id
          }
        }
        if (mappedDeviceId == null && remote.device_id != null) {
          const row = await this.db.get('SELECT id, external_id FROM devices WHERE id = ?', [remote.device_id]).catch(() => null)
          try {
            console.log('[import-order] map device by id', remote.device_id, '->', row?.id ?? null)
          } catch (_) {}
          if (row && row.id) {
            mappedDeviceId = row.id
            if ((!row.external_id || row.external_id.trim() === '') && remoteDeviceExternal) {
              await this.db.run('UPDATE devices SET external_id = ? WHERE id = ?', [remoteDeviceExternal, row.id]).catch(() => {})
            }
          }
        }

        const ensureClientImported = async () => {
          if (mappedClientId != null) return mappedClientId
          const candidatePaths = []
          if (remoteClientExternal) candidatePaths.push(`/clients/external/${encodeURIComponent(remoteClientExternal)}`)
          if (remote.client_id) candidatePaths.push(`/clients/${remote.client_id}`)
          for (const path of candidatePaths) {
            const result = await fetchRailwayJson(path)
            if (!result.ok) continue
            const c = result.json?.client
            if (!c || typeof c !== 'object') continue
            const externalId = (c.external_id && String(c.external_id).trim() !== '')
              ? String(c.external_id).trim()
              : (remoteClientExternal && String(remoteClientExternal).trim() !== '' ? String(remoteClientExternal).trim() : (c.id ? `${this.installationId}:client:${c.id}` : null))
            let targetRow = null
            if (externalId) {
              targetRow = await this.db.get('SELECT id FROM clients WHERE external_id = ?', [externalId]).catch(() => null)
            }
            if (!targetRow && c.id) {
              targetRow = await this.db.get('SELECT id FROM clients WHERE id = ?', [c.id]).catch(() => null)
            }
            const nowIso = new Date().toISOString()
            const payload = {
              first_name: c.first_name || null,
              last_name: c.last_name || null,
              company_name: c.company_name || null,
              type: c.type || null,
              phone: c.phone || null,
              email: c.email || null,
              address: c.address || null,
              address_street: c.address_street || null,
              address_city: c.address_city || null,
              address_postal_code: c.address_postal_code || null,
              address_country: c.address_country || null,
              nip: c.nip || null,
              regon: c.regon || null,
              contact_person: c.contact_person || null,
              notes: c.notes || null,
              is_active: c.is_active == null ? null : (c.is_active ? 1 : 0),
              external_id: externalId,
              updated_at: c.updated_at || nowIso,
              created_at: c.created_at || nowIso
            }
            payload.company_name = payload.company_name || ((payload.first_name || '') + ' ' + (payload.last_name || '')).trim() || null
            payload.type = payload.type || 'individual'
            try {
              if (targetRow && targetRow.id) {
                await this.db.run(
                  `UPDATE clients SET
                     first_name = ?,
                     last_name = ?,
                     company_name = ?,
                     type = ?,
                     phone = ?,
                     email = ?,
                     address = ?,
                     address_street = ?,
                     address_city = ?,
                     address_postal_code = ?,
                     address_country = ?,
                     nip = ?,
                     regon = ?,
                     contact_person = ?,
                     notes = ?,
                     is_active = CASE WHEN ? IS NULL THEN is_active ELSE ? END,
                     external_id = COALESCE(?, external_id),
                     updated_at = ?
                   WHERE id = ?`,
                  [
                    payload.first_name,
                    payload.last_name,
                    payload.company_name,
                    payload.type,
                    payload.phone,
                    payload.email,
                    payload.address,
                    payload.address_street,
                    payload.address_city,
                    payload.address_postal_code,
                    payload.address_country,
                    payload.nip,
                    payload.regon,
                    payload.contact_person,
                    payload.notes,
                    payload.is_active,
                    payload.is_active,
                    payload.external_id,
                    payload.updated_at,
                    targetRow.id
                  ]
                )
                mappedClientId = targetRow.id
                try { console.log('[import-order] ensureClientImported updated existing client', mappedClientId) } catch (_) {}
              } else {
                const insertId = c.id || undefined
                await this.db.run(
                  `INSERT INTO clients (
                     id, first_name, last_name, company_name, type, phone, email, address,
                     address_street, address_city, address_postal_code, address_country,
                     nip, regon, contact_person, notes, is_active, external_id, created_at, updated_at
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                  [
                    insertId,
                    payload.first_name,
                    payload.last_name,
                    payload.company_name,
                    payload.type,
                    payload.phone,
                    payload.email,
                    payload.address,
                    payload.address_street,
                    payload.address_city,
                    payload.address_postal_code,
                    payload.address_country,
                    payload.nip,
                    payload.regon,
                    payload.contact_person,
                    payload.notes,
                    payload.is_active == null ? 1 : payload.is_active,
                    payload.external_id,
                    payload.created_at,
                    payload.updated_at
                  ]
                )
                const assignedId = insertId || (await this.db.get('SELECT id FROM clients WHERE external_id = ? ORDER BY id DESC LIMIT 1', [payload.external_id]).catch(()=>null))?.id || null
                if (assignedId != null) mappedClientId = assignedId
                try { console.log('[import-order] ensureClientImported inserted client', assignedId) } catch (_) {}
              }
            } catch (err) {
              try { console.warn('[import-order] ensureClientImported failed', err?.message || err) } catch (_) {}
            }
            if (mappedClientId != null) break
          }
          return mappedClientId
        }

        const ensureDeviceImported = async () => {
          if (mappedDeviceId != null) return mappedDeviceId
          const candidatePaths = []
          if (remoteDeviceExternal) candidatePaths.push(`/devices/external/${encodeURIComponent(remoteDeviceExternal)}`)
          if (remote.device_id) candidatePaths.push(`/devices/${remote.device_id}`)
          for (const path of candidatePaths) {
            const result = await fetchRailwayJson(path)
            if (!result.ok) continue
            const d = result.json?.device
            if (!d || typeof d !== 'object') continue
            const externalId = (d.external_id && String(d.external_id).trim() !== '')
              ? String(d.external_id).trim()
              : (remoteDeviceExternal && String(remoteDeviceExternal).trim() !== '' ? String(remoteDeviceExternal).trim() : (d.id ? `${this.installationId}:device:${d.id}` : null))
            let targetRow = null
            if (externalId) {
              targetRow = await this.db.get('SELECT id FROM devices WHERE external_id = ?', [externalId]).catch(() => null)
            }
            if (!targetRow && d.id) {
              targetRow = await this.db.get('SELECT id FROM devices WHERE id = ?', [d.id]).catch(() => null)
            }
            const payload = {
              manufacturer: d.manufacturer || d.brand || null,
              brand: d.brand || d.manufacturer || null,
              model: d.model || null,
              serial_number: d.serial_number || null,
              fuel_type: d.fuel_type || null,
              installation_date: d.installation_date || null,
              warranty_end_date: d.warranty_end_date || null,
              last_service_date: d.last_service_date || null,
              next_service_date: d.next_service_date || null,
              name: d.name || null,
              notes: d.notes || null,
              client_id: mappedClientId ?? null,
              external_id: externalId,
              updated_at: d.updated_at || new Date().toISOString(),
              created_at: d.created_at || new Date().toISOString()
            }
            try {
              if (targetRow && targetRow.id) {
                await this.db.run(
                  `UPDATE devices SET
                     manufacturer = ?,
                     brand = ?,
                     model = ?,
                     serial_number = ?,
                     fuel_type = ?,
                     installation_date = ?,
                     warranty_end_date = ?,
                     last_service_date = ?,
                     next_service_date = ?,
                     name = ?,
                     notes = ?,
                     client_id = COALESCE(?, client_id),
                     external_id = COALESCE(?, external_id),
                     updated_at = ?
                   WHERE id = ?`,
                  [
                    payload.manufacturer,
                    payload.brand,
                    payload.model,
                    payload.serial_number,
                    payload.fuel_type,
                    payload.installation_date,
                    payload.warranty_end_date,
                    payload.last_service_date,
                    payload.next_service_date,
                    payload.name,
                    payload.notes,
                    payload.client_id,
                    payload.external_id,
                    payload.updated_at,
                    targetRow.id
                  ]
                )
                mappedDeviceId = targetRow.id
                try { console.log('[import-order] ensureDeviceImported updated existing device', mappedDeviceId) } catch (_) {}
              } else {
                const insertId = d.id || undefined
                await this.db.run(
                  `INSERT INTO devices (
                     id, manufacturer, brand, model, serial_number, fuel_type,
                     installation_date, warranty_end_date, last_service_date, next_service_date,
                     name, notes, client_id, external_id, created_at, updated_at
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                  [
                    insertId,
                    payload.manufacturer,
                    payload.brand,
                    payload.model,
                    payload.serial_number,
                    payload.fuel_type,
                    payload.installation_date,
                    payload.warranty_end_date,
                    payload.last_service_date,
                    payload.next_service_date,
                    payload.name,
                    payload.notes,
                    payload.client_id,
                    payload.external_id,
                    payload.created_at,
                    payload.updated_at
                  ]
                )
                const assignedId = insertId || (await this.db.get('SELECT id FROM devices WHERE external_id = ? ORDER BY id DESC LIMIT 1', [payload.external_id]).catch(()=>null))?.id || null
                if (assignedId != null) mappedDeviceId = assignedId
                try { console.log('[import-order] ensureDeviceImported inserted device', assignedId) } catch (_) {}
              }
            } catch (err) {
              try { console.warn('[import-order] ensureDeviceImported failed', err?.message || err) } catch (_) {}
            }
            if (mappedDeviceId != null) break
          }
          return mappedDeviceId
        }
        const createClientPlaceholderFromOrder = async () => {
          const normalize = (val) => {
            if (val == null) return null
            const str = String(val).trim()
            return str.length ? str : null
          }

          const externalId = normalize(remoteClientExternal || remote.client_external_id)
          const remoteClientId = Number.isFinite(Number(remote.client_id)) ? Number(remote.client_id) : null
          if (!externalId && remoteClientId == null) return null

          const findExistingId = async () => {
            if (externalId) {
              const byExternal = await this.db.get('SELECT id FROM clients WHERE external_id = ? LIMIT 1', [externalId]).catch(() => null)
              if (byExternal && byExternal.id != null) return byExternal.id
            }
            if (remoteClientId != null) {
              const byId = await this.db.get('SELECT id FROM clients WHERE id = ? LIMIT 1', [remoteClientId]).catch(() => null)
              if (byId && byId.id != null) return byId.id
            }
            return null
          }

          const existing = await findExistingId()
          if (existing != null) return existing

          const nowIso = new Date().toISOString()
          const rawName = normalize(remote.client_name) || normalize(remote.client_display_name)
          let firstName = null
          let lastName = null
          if (rawName) {
            const parts = rawName.split(/\s+/)
            if (parts.length === 1) {
              lastName = parts[0]
            } else {
              firstName = parts.shift()
              lastName = parts.join(' ')
            }
          }
          const companyName = rawName || null
          const email = normalize(remote.client_email)
          const type = companyName ? 'business' : 'individual'

          try {
            await this.db.run(
              `INSERT INTO clients (
                 first_name, last_name, company_name, type, phone, email, address,
                 address_street, address_city, address_postal_code, address_country,
                 nip, regon, contact_person, notes, is_active, external_id, railway_id, created_at, updated_at
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                firstName,
                lastName,
                companyName,
                type,
                null,
                email,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                1,
                externalId,
                remoteClientId,
                nowIso,
                nowIso
              ]
            )
            try { console.warn('[import-order] created placeholder client', externalId || remoteClientId, 'for order', remoteOrderNumber) } catch (_) {}
          } catch (err) {
            try { console.warn('[import-order] placeholder client insert failed', err?.message || err) } catch (_) {}
          }

          const finalId = await findExistingId()
          return finalId != null ? finalId : null
        }
        const createDevicePlaceholderFromOrder = async (clientIdHint) => {
          const normalize = (val) => {
            if (val == null) return null
            const str = String(val).trim()
            return str.length ? str : null
          }

          const externalId = normalize(remoteDeviceExternal || remote.device_external_id)
          const remoteDeviceId = Number.isFinite(Number(remote.device_id)) ? Number(remote.device_id) : null
          if (!externalId && remoteDeviceId == null && !normalize(remote.device_name)) return null

          const findExistingId = async () => {
            if (externalId) {
              const byExternal = await this.db.get('SELECT id FROM devices WHERE external_id = ? LIMIT 1', [externalId]).catch(() => null)
              if (byExternal && byExternal.id != null) return byExternal.id
            }
            if (remoteDeviceId != null) {
              const byId = await this.db.get('SELECT id FROM devices WHERE id = ? LIMIT 1', [remoteDeviceId]).catch(() => null)
              if (byId && byId.id != null) return byId.id
            }
            return null
          }

          const existing = await findExistingId()
          if (existing != null) return existing

          const nowIso = new Date().toISOString()
          const deviceName = normalize(remote.device_name) || normalize(remote.device_model) || normalize(remote.device_serial) || 'Urządzenie serwisowe'
          const serialNumber = normalize(remote.device_serial)
          const model = normalize(remote.device_model)
          const manufacturer = normalize(remote.device_manufacturer || remote.device_brand || remote.device_name) || null

          try {
            await this.db.run(
              `INSERT INTO devices (
                 client_id, name, manufacturer, model, serial_number,
                 notes, is_active, external_id, railway_id, created_at, updated_at, brand
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                clientIdHint != null ? clientIdHint : null,
                deviceName,
                manufacturer,
                model,
                serialNumber,
                null,
                1,
                externalId,
                remoteDeviceId,
                nowIso,
                nowIso,
                manufacturer
              ]
            )
            try { console.warn('[import-order] created placeholder device', externalId || remoteDeviceId, 'for order', remoteOrderNumber) } catch (_) {}
          } catch (err) {
            try { console.warn('[import-order] placeholder device insert failed', err?.message || err) } catch (_) {}
          }

          const finalId = await findExistingId()
          return finalId != null ? finalId : null
        }

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

        mappedClientId = await ensureClientImported()
        mappedDeviceId = await ensureDeviceImported()

        const shouldRetryMapping = () => {
          const expectClient = remoteClientExternal || remote.client_id
          const expectDevice = remoteDeviceExternal || remote.device_id
          return (
            (expectClient && (mappedClientId == null)) ||
            (expectDevice && (mappedDeviceId == null))
          )
        }
        let retry = 0
        const maxRetries = 2
        while (shouldRetryMapping() && retry < maxRetries) {
          retry += 1
          try { console.warn('[import-order] remap retry', retry, 'for order', remoteOrderNumber) } catch (_) {}
          await delay(400 * retry) // stopniowo wydłużamy oczekiwanie
          if (mappedClientId == null) {
            mappedClientId = await ensureClientImported()
          }
          if (mappedDeviceId == null) {
            mappedDeviceId = await ensureDeviceImported()
          }
        }

        if (mappedClientId == null) {
          mappedClientId = await createClientPlaceholderFromOrder()
        }
        if (mappedDeviceId == null) {
          mappedDeviceId = await createDevicePlaceholderFromOrder(mappedClientId)
        }

        try { console.log('[import-order] mappedClientId after ensure', mappedClientId, 'device', mappedDeviceId, 'order', remoteOrderNumber) } catch (_) {}

        if (mappedClientId == null && remote.client_id != null) {
          const row = await this.db.get('SELECT id FROM clients WHERE id = ?', [remote.client_id]).catch(() => null)
          if (row && row.id) {
            mappedClientId = row.id
          }
        }
        if (mappedDeviceId == null && remote.device_id != null) {
          const row = await this.db.get('SELECT id FROM devices WHERE id = ?', [remote.device_id]).catch(() => null)
          if (row && row.id) {
            mappedDeviceId = row.id
          }
        }

        if (mappedClientId == null && remoteClientExternal) {
          try { console.warn('[import-order] Failed to map client via external_id', remoteClientExternal, 'for order', remoteOrderNumber) } catch (_) {}
        }
        if (mappedDeviceId == null && remoteDeviceExternal) {
          try { console.warn('[import-order] Failed to map device via external_id', remoteDeviceExternal, 'for order', remoteOrderNumber) } catch (_) {}
        }

        const fields = {
          status: remote.status || null,
          title: sanitizeText(remote.title),
          description: sanitizeText(remote.description),
          client_id: mappedClientId,
          device_id: mappedDeviceId,
          assigned_user_id: remote.assigned_user_id ?? null,
          priority: sanitizeText(remote.priority),
          service_categories: Array.isArray(remote.service_categories)
            ? JSON.stringify(remote.service_categories)
            : (remote.service_categories != null
                ? String(remote.service_categories)
                : (remote.serviceCategories != null ? String(remote.serviceCategories) : null)),
          completed_categories: normalizeArrayJson(remote.completed_categories ?? remote.completedCategories ?? '[]'),
          scheduled_date: sanitizeDate(remote.scheduled_date ?? remote.scheduled_date_time ?? remote.scheduledDate),
          started_at: remoteStartedAt,
          completed_at: remoteCompletedAt,
          actual_start_date: remoteActualStart,
          actual_end_date: remoteActualEnd,
          estimated_hours: parseNumber(remote.estimated_hours ?? remote.estimatedHours),
          actual_hours: parseNumber(remote.actual_hours ?? remote.actualHours),
          parts_cost: parseNumber(remote.parts_cost ?? remote.partsCost),
          labor_cost: parseNumber(remote.labor_cost ?? remote.laborCost),
          total_cost: parseNumber(remote.total_cost ?? remote.totalCost),
          travel_cost: parseNumber(remote.travel_cost ?? remote.travelCost),
          notes: sanitizeText(remote.notes),
          completion_notes: sanitizeText(remote.completion_notes ?? remote.completionNotes),
          parts_used: sanitizePartsUsed(remote.parts_used ?? remote.partsUsed),
          work_photos: normalizeArrayJson(remote.work_photos ?? remote.workPhotos ?? '[]'),
          estimated_cost_note: sanitizeText(remote.estimated_cost_note ?? remote.estimatedCostNote),
          updated_at: sanitizeDate(remote.updated_at) || new Date().toISOString()
        }

        try {
          const photosCount = (() => { try { const a = JSON.parse(fields.work_photos || '[]'); return Array.isArray(a) ? a.length : 0 } catch { return 0 } })()
          const noteLen = (fields.completion_notes || '').length
          console.log(`[Import][Debug] id=${remoteId} status=${fields.status} hours=${fields.actual_hours} noteLen=${noteLen} photos=${photosCount}`)
        } catch (_) {}

        const existingRow = await this.db.get(
          `SELECT id, status, started_at, updated_at, scheduled_date, description,
                  client_id, device_id, completion_notes, completed_categories,
                  work_photos, actual_hours, parts_used, notes,
                  completed_at, actual_end_date, actual_start_date
             FROM service_orders
            WHERE id = ? OR order_number = ?`,
          [remoteId, remoteOrderNumber]
        )

        let remoteIsOlder = false
        try {
          const remoteUpdatedAt = remote && remote.updated_at ? Date.parse(remote.updated_at) : NaN
          const localUpdatedAt = existingRow && existingRow.updated_at ? Date.parse(existingRow.updated_at) : NaN
          remoteIsOlder = isFinite(remoteUpdatedAt) && isFinite(localUpdatedAt) && remoteUpdatedAt < localUpdatedAt
          const isRemoteEmptyDesc = !remote || !remote.description || String(remote.description).trim().length === 0
          if (remoteIsOlder || isRemoteEmptyDesc) {
            fields.description = existingRow?.description ?? fields.description
          }
          const rSched = fields.scheduled_date
          const hasTime = typeof rSched === 'string' && /T\d{2}:\d{2}/.test(rSched)
          if (!hasTime && existingRow && existingRow.scheduled_date) {
            fields.scheduled_date = existingRow.scheduled_date
          }
        } catch (_) { /* soft merge */ }

        if (existingRow && existingRow.id) {
          const normalizeArrayString = (value) => {
            if (value == null) return null
            if (Array.isArray(value)) return JSON.stringify(value)
            const str = String(value).trim()
            return str.length ? str : null
          }
          const arrayHasEntries = (value) => {
            const normalized = normalizeArrayString(value)
            if (!normalized) return false
            try {
              const parsed = JSON.parse(normalized)
              return Array.isArray(parsed) && parsed.length > 0
            } catch (_) {
              return false
            }
          }
          const pickArrayString = (incoming, current, preferExisting) => {
            const normalizedIncoming = normalizeArrayString(incoming)
            const normalizedCurrent = normalizeArrayString(current)
            if (preferExisting && arrayHasEntries(normalizedCurrent)) {
              return normalizedCurrent ?? '[]'
            }
            if (arrayHasEntries(normalizedIncoming)) return normalizedIncoming
            if (arrayHasEntries(normalizedCurrent)) return normalizedCurrent
            if (normalizedCurrent != null && normalizedCurrent.length) return normalizedCurrent
            if (normalizedIncoming != null && normalizedIncoming.length) return normalizedIncoming
            return normalizedCurrent ?? normalizedIncoming ?? '[]'
          }
          const pickTextValue = (incoming, current, preferExisting) => {
            const currentTrim = current != null ? String(current).trim() : ''
            if (preferExisting && currentTrim.length) {
              return currentTrim
            }
            if (incoming == null) {
              return currentTrim.length ? currentTrim : null
            }
            const trimmed = String(incoming).trim()
            if (!trimmed.length) {
              return currentTrim.length ? currentTrim : null
            }
            return trimmed
          }
          const pickNumericValue = (incoming, current, preferExisting) => {
            const incomingDefined = incoming !== undefined && incoming !== null && incoming !== ''
            const currentDefined = current !== undefined && current !== null && current !== ''
            const incomingNum = incomingDefined ? Number(incoming) : null
            const currentNum = currentDefined ? Number(current) : null

            if (preferExisting && currentNum != null && Number.isFinite(currentNum) && currentNum > 0) {
              return currentNum
            }

            if (incomingNum != null && Number.isFinite(incomingNum)) {
              if (incomingNum <= 0 && currentNum != null && Number.isFinite(currentNum) && currentNum > 0) {
                return currentNum
              }
              return incomingNum
            }

            if (currentNum != null && Number.isFinite(currentNum)) {
              return currentNum
            }

            return null
          }
          const pickDateValue = (incoming, current) => incoming || current || null

          fields.client_id = fields.client_id ?? existingRow.client_id ?? null
          fields.device_id = fields.device_id ?? existingRow.device_id ?? null
          fields.completion_notes = pickTextValue(fields.completion_notes, existingRow.completion_notes, remoteIsOlder)
          fields.notes = pickTextValue(fields.notes, existingRow.notes, remoteIsOlder)
          fields.parts_used = pickTextValue(fields.parts_used, existingRow.parts_used, remoteIsOlder)
          fields.completed_categories = pickArrayString(fields.completed_categories, existingRow.completed_categories, remoteIsOlder)
          fields.work_photos = pickArrayString(fields.work_photos, existingRow.work_photos, remoteIsOlder)
          fields.actual_hours = pickNumericValue(fields.actual_hours, existingRow.actual_hours, remoteIsOlder)
          fields.completed_at = pickDateValue(fields.completed_at, existingRow.completed_at)
          fields.actual_end_date = pickDateValue(fields.actual_end_date, existingRow.actual_end_date)
          fields.actual_start_date = pickDateValue(fields.actual_start_date, existingRow.actual_start_date)
          fields.started_at = pickDateValue(fields.started_at, existingRow.started_at)

          if (detailsOnly) {
            await this.db.run(
              `UPDATE service_orders SET 
                 client_id = ?,
                 device_id = ?,
                 completed_categories = ?,
                 work_photos = ?,
                 completion_notes = ?,
                 actual_hours = ?,
                 parts_used = ?,
                 completed_at = ?,
                 actual_end_date = ?,
                 actual_start_date = ?,
                 started_at = ?,
                 notes = ?,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [
                fields.client_id,
                fields.device_id,
                fields.completed_categories,
                fields.work_photos,
                fields.completion_notes,
                fields.actual_hours,
                fields.parts_used,
                fields.completed_at,
                fields.actual_end_date,
                fields.actual_start_date,
                fields.started_at,
                fields.notes,
                existingRow.id
              ]
            )
          } else {
            const setSql = Object.keys(fields).map(k => `${k} = ?`).join(', ')
            const setVals = Object.values(fields)
            await this.db.run(`UPDATE service_orders SET ${setSql} WHERE id = ?`, [...setVals, existingRow.id])
            try { console.log(`[Import][SQLite] updated id=${existingRow.id}`) } catch (_) {}
          }
        } else {
          await this.db.run(
            `INSERT INTO service_orders (
              id, order_number, status, title, description, client_id, device_id, assigned_user_id,
              priority, service_categories, completed_categories,
              scheduled_date, started_at, completed_at, actual_start_date, actual_end_date,
              estimated_hours, actual_hours, parts_cost, labor_cost, total_cost, travel_cost,
              notes, completion_notes, parts_used, work_photos, estimated_cost_note,
              created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              remoteId,
              remoteOrderNumber,
              fields.status,
              fields.title,
              fields.description,
              fields.client_id,
              fields.device_id,
              fields.assigned_user_id,
              fields.priority,
              fields.service_categories,
              fields.completed_categories,
              fields.scheduled_date,
              fields.started_at,
              fields.completed_at,
              fields.actual_start_date,
              fields.actual_end_date,
              fields.estimated_hours,
              fields.actual_hours,
              fields.parts_cost,
              fields.labor_cost,
              fields.total_cost,
              fields.travel_cost,
              fields.notes,
              fields.completion_notes,
              fields.parts_used,
              fields.work_photos,
              fields.estimated_cost_note,
              remote.created_at || new Date().toISOString(),
              fields.updated_at
            ]
          )
          try { console.log(`[Import][SQLite] inserted id=${remoteId}`) } catch (_) {}
        }

        try {
          const photos = (() => {
            try {
              if (Array.isArray(remote.work_photos)) return remote.work_photos
              if (Array.isArray(remote.workPhotos)) return remote.workPhotos
              const parsed = JSON.parse(remote.work_photos || remote.workPhotos || '[]')
              return Array.isArray(parsed) ? parsed : []
            } catch (_) {
              return []
            }
          })()

          if (fields.device_id && photos.length) {
            await this.ensureDeviceFilesTable?.()
            const fs = require('fs')
            const path = require('path')
            let baseDir = null
            try {
              const { app } = require('electron')
              baseDir = app && app.getPath ? app.getPath('userData') : null
            } catch (_) { baseDir = null }
            if (!baseDir) baseDir = path.join(__dirname, '..', '..', 'device-files')
            const deviceDir = path.join(baseDir, 'device-files', `device-${fields.device_id}`)
            try { fs.mkdirSync(deviceDir, { recursive: true }) } catch (_) {}
            const cachedUrls = []
            const saveOne = async (urlLike) => {
              try {
                const url = String(urlLike || '')
                if (!/^https?:\/\//.test(url)) return null
                const r = await fetch(url)
                if (!r.ok) return null
                const ct = (r.headers.get('content-type') || '').toLowerCase()
                const buf = Buffer.from(await r.arrayBuffer())
                const ext = ct.includes('png')
                  ? '.png'
                  : ct.includes('webp')
                    ? '.webp'
                    : (ct.includes('pdf')
                        ? '.pdf'
                        : (ct.includes('jpeg') || ct.includes('jpg'))
                          ? '.jpg'
                          : (url.toLowerCase().match(/\.(pdf|png|webp|jpe?g)$/)?.[0] || ''))
                const namePart = url.split('/')?.pop()?.split('?')[0] || `photo-${Date.now()}`
                const safeName = `${Date.now()}-${namePart}${ext && !namePart.toLowerCase().endsWith(ext) ? '' : ''}`.replace(/[^a-zA-Z0-9_.\-]/g, '_')
                const target = path.join(deviceDir, safeName)
                try { fs.writeFileSync(target, buf) } catch (_) { return null }
                let row = await this.db.get('SELECT id FROM device_files WHERE device_id = ? AND file_path = ?', [fields.device_id, target])
                if (!row) {
                  const fileType = ct.startsWith('image/') ? 'image' : (ct === 'application/pdf' ? 'document' : 'other')
                  const mimeType = ct || null
                  const size = buf.length
                  await this.db.run(
                    `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_category, file_size, mime_type, title, description, is_primary)
                     VALUES (?,?,?,?,?,?,?,?,?,?)`,
                    [fields.device_id, safeName, target, fileType, fileType === 'image' ? 'photo' : 'manual', size, mimeType, null, null, 0]
                  )
                  row = await this.db.get('SELECT id FROM device_files WHERE device_id = ? AND file_path = ? ORDER BY id DESC LIMIT 1', [fields.device_id, target])
                }
                if (row && row.id) cachedUrls.push(`/api/desktop/files/${row.id}`)
                return target
              } catch (_) { return null }
            }
            for (const p of photos) {
              const u = typeof p === 'string' ? p : (p?.path || p?.url || '')
              if (!u) continue
              await saveOne(u)
            }
            if (cachedUrls.length > 0) {
              const originals = []
              try {
                for (const p of (photos || [])) {
                  const u = typeof p === 'string' ? p : (p?.path || p?.url || '')
                  if (u) originals.push(u)
                }
              } catch (_) {}
              const combined = [...cachedUrls, ...originals]
              try {
                const targetId = existingRow ? existingRow.id : remoteId
                await this.db.run('UPDATE service_orders SET work_photos = ? WHERE id = ?', [JSON.stringify(combined), targetId])
              } catch (_) {}
            }
          }
        } catch (_) { /* soft-fail: caching not critical for import */ }

        if (mappedClientId == null || mappedDeviceId == null) {
          const reason = (mappedClientId == null && mappedDeviceId == null)
            ? 'missing-client-device'
            : (mappedClientId == null ? 'missing-client' : 'missing-device')
          this.enqueueOrderRetry(remoteId || orderId, reason)
        }

        return res.json({ success: true, orderId: remoteId, imported: true })
      } catch (e) {
        console.error('import-order error', e)
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // Import po numerze zlecenia (ułatwia ręczne wywołanie z listy)
    this.app.post('/api/railway/import-by-number/:orderNumber', async (req, res) => {
      try {
        const num = String(req.params.orderNumber || '').trim()
        if (!num) return res.status(400).json({ success: false, error: 'Invalid orderNumber' })
        const row = await this.db.get('SELECT id FROM service_orders WHERE order_number = ?', [num])
        if (!row || !row.id) return res.status(404).json({ success: false, error: 'Order not found locally' })
        const port = process.env.PORT || 5174
        const r = await fetch(`http://127.0.0.1:${port}/api/railway/import-order/${row.id}?detailsOnly=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markImported: false, detailsOnly: true }) })
        const j = await r.json().catch(()=>({}))
        return res.status(r.status).json(j)
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })
    // GET alias dla wygody
    this.app.get('/api/railway/import-by-number/:orderNumber', async (req, res) => {
      req.method = 'POST'
      return this.app._router.handle(req, res, () => {})
    })

    // GET alias dla łatwiejszego ręcznego uruchomienia w przeglądarce
    this.app.get('/api/railway/import-order/:orderId', async (req, res) => {
      try {
        const port = process.env.PORT || 5174
        // Przekierowanie wewnętrzne na POST handler (bez zmiany metody z perspektywy usera)
        const id = parseInt(req.params.orderId)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        const r = await fetch(`http://127.0.0.1:${port}/api/railway/import-order/${id}?detailsOnly=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markImported: false, detailsOnly: true }) })
        const j = await r.json().catch(() => ({}))
        return res.status(r.status).json(j)
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== DIAGNOSTYKA: odczyt lokalnego rekordu z SQLite =====
    this.app.get('/api/desktop/debug/orders/:orderId', async (req, res) => {
      try {
        const id = parseInt(req.params.orderId)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
        const row = await this.db.get(
          `SELECT id, order_number, status, completed_at, actual_hours, desktop_sync_status,
                  LENGTH(COALESCE(completion_notes,'')) AS note_len,
                  completion_notes,
                  work_photos,
                  updated_at
             FROM service_orders WHERE id = ?`,
          [id]
        )
        return res.json({ success: true, row: row || {} })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== DIAGNOSTYKA: odczyt rekordu z Railway =====
    this.app.get('/api/desktop/debug/railway-orders/:orderId', async (req, res) => {
      try {
        const id = parseInt(req.params.orderId)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
        const url = `${RAILWAY_API_BASE.replace(/\/$/, '')}/orders/${id}`
        const r = await fetch(url)
        const j = await r.json().catch(() => ({}))
        return res.status(r.status).json(j)
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== DIAGNOSTYKA: odczyt lokalnego rekordu po order_number =====
    this.app.get('/api/desktop/debug/orders/by-number/:orderNumber', async (req, res) => {
      try {
        const num = String(req.params.orderNumber || '').trim()
        if (!num) return res.status(400).json({ success: false, error: 'Invalid order_number' })
        const row = await this.db.get(
          `SELECT id, order_number, status, completed_at, actual_hours, desktop_sync_status,
                  LENGTH(COALESCE(completion_notes,'')) AS note_len,
                  completion_notes, work_photos, updated_at
             FROM service_orders WHERE order_number = ?`,
          [num]
        )
        return res.json({ success: true, row: row || {} })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== Background reconciler: dociągaj brakujące szczegóły zakończonych zleceń =====
    try {
      let _reconcileInFlight = false
      setInterval(async () => {
        if (_reconcileInFlight) return
        _reconcileInFlight = true
        try {
          // Szukaj tylko zleceń wysłanych do firmy (sent), które są completed, ale bez detali
          const rows = await this.db.all(
            `SELECT id FROM service_orders 
             WHERE status = 'completed' 
               AND (desktop_sync_status = 'sent' OR desktop_sync_status IS NULL)
               AND (
                 completion_notes IS NULL OR TRIM(COALESCE(completion_notes,'')) = ''
                 OR work_photos IS NULL OR TRIM(COALESCE(work_photos,'')) = '' OR work_photos = '[]'
               )
             ORDER BY updated_at DESC
             LIMIT 5`
          )
          for (const r of rows || []) {
            try {
              await fetch(`http://127.0.0.1:${port}/api/railway/import-order/${r.id}?detailsOnly=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markImported: false, detailsOnly: true })
              })
            } catch (_) {}
          }
        } catch (_) { /* ignore */ }
        finally { _reconcileInFlight = false }
      }, 15000) // co 15s lekko dociągamy brakujące detale
    } catch (_) { /* ignore scheduler errors */ }

    // ===== Device files for desktop (serve to PWA on localhost) =====
    // List files for a device
    this.app.get('/api/desktop/devices/:deviceId/files', async (req, res) => {
      try {
        const deviceId = parseInt(req.params.deviceId)
        if (!deviceId) return res.status(400).json({ success: false, error: 'Invalid deviceId' })
        await this.ensureDeviceFilesTable?.()
        const rows = await this.db.all(
          'SELECT id, device_id, file_name, file_path, mime_type, file_type, created_at FROM device_files WHERE device_id = ? ORDER BY created_at DESC',
          [deviceId]
        )
        const items = (rows || []).map(r => ({ id: r.id, file_name: r.file_name, url: `/api/desktop/files/${r.id}`, mime_type: r.mime_type, file_type: r.file_type }))
        return res.json({ success: true, items })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Cache photos for a single order: download remote /uploads to local device_files and update work_photos
    this.app.post('/api/desktop/orders/:orderId/cache-photos', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        const o = await this.db.get('SELECT id, device_id, work_photos FROM service_orders WHERE id = ?', [orderId])
        if (!o) return res.status(404).json({ success: false, error: 'Order not found' })
        let list = []
        try { list = Array.isArray(o.work_photos) ? o.work_photos : JSON.parse(o.work_photos || '[]') } catch (_) { list = [] }
        // Obsłuż przypadek podwójnie zserializowanego JSON-a (string w stringu)
        if (!Array.isArray(list) && typeof list === 'string') {
          try { const maybe = JSON.parse(list); if (Array.isArray(maybe)) list = maybe } catch (_) {}
        }
        // Spłaszcz zagnieżdżone tablice [[{...}]] → [{...}]
        const flattenDeep = (arr) => arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flattenDeep(val) : val), [])
        if (Array.isArray(list) && list.some(Array.isArray)) {
          try { list = flattenDeep(list) } catch (_) { /* ignore */ }
        }
        if (!Array.isArray(list) || list.length === 0) return res.json({ success: true, cached: 0, note: 'No photos' })

        const parseMaybeJson = (val) => {
          if (typeof val !== 'string') return val
          try {
            const obj = JSON.parse(val)
            return obj
          } catch (_) { return val }
        }
        const extractUrlLike = (str) => {
          try {
            const s = String(str || '').trim()
            // Usuń opakowanie nawiasami ( ... ) jeśli występuje
            const trimmed = (s.startsWith('(') && s.endsWith(')')) ? s.slice(1, -1).trim() : s
            // Spróbuj wyciągnąć najpierw absolutny URL http(s)
            const mHttp = trimmed.match(/https?:\/\/[^"')\s]+/i)
            if (mHttp && mHttp[0]) return mHttp[0]
            // Następnie ścieżkę /uploads/...
            const mUp = trimmed.match(/\/?uploads\/[A-Za-z0-9_\-\.]+/i)
            if (mUp && mUp[0]) return mUp[0].startsWith('/') ? mUp[0] : ('/' + mUp[0])
            return ''
          } catch (_) { return '' }
        }
        const toUrl = (raw) => {
          const ph = parseMaybeJson(raw)
          if (!ph) return ''
          if (typeof ph === 'string') return extractUrlLike(ph) || ph
          // Często przychodzi { "remote": "/uploads/..." }
          const candidate = ph.url || ph.path || ph.remote || ph.public_url || ''
          return candidate || extractUrlLike(JSON.stringify(ph))
        }

        const appMod = (() => { try { return require('electron') } catch (_) { return {} } })()
        const app = appMod && appMod.app ? appMod.app : null
        const path = require('path')
        const fs = require('fs')
        const baseDir = (app && app.getPath ? app.getPath('userData') : path.join(__dirname, '..', '..'))
        const deviceKey = o.device_id ? `device-${o.device_id}` : `order-${orderId}`
        const deviceDir = path.join(baseDir, 'device-files', deviceKey)
        try { fs.mkdirSync(deviceDir, { recursive: true }) } catch (_) {}

        const savedPairs = []
        let cached = 0
        for (const ph of list) {
          const remoteUrl = toUrl(ph)
          if (!remoteUrl) continue
          // Pobierz tylko jeśli to /uploads lub http/https
          let finalUrl = remoteUrl
          try {
            if (!/^https?:\/\//i.test(remoteUrl)) {
              // Zbuduj absolutny URL dla /uploads
              const hosts = [
                (process.env.RAILWAY_PUBLIC_URL || '').replace(/\/$/, ''),
                'https://web-production-fc58d.up.railway.app',
                'https://web-production-310c4.up.railway.app'
              ].filter(Boolean)
              if (remoteUrl.startsWith('/uploads') || remoteUrl.startsWith('uploads/')) {
                finalUrl = `${hosts[0] || 'https://web-production-fc58d.up.railway.app'}${remoteUrl.startsWith('/') ? '' : '/'}${remoteUrl}`
              }
            }
          } catch (_) {}

          try {
            let r = await fetch(finalUrl).catch(() => null)
            if (!r || !r.ok) {
              // Fallback: użyj lokalnego proxy (rozwiązuje CORS/TLS i alternatywne hosty)
              let proxyUrl = ''
              try {
                const port = process.env.PORT || 5174
                proxyUrl = `/api/desktop/files/proxy?u=${encodeURIComponent(finalUrl)}`
                r = await fetch(`http://127.0.0.1:${port}${proxyUrl}`).catch(() => null)
              } catch (_) { /* ignore */ }
              if (!r || !r.ok) { savedPairs.push({ local: proxyUrl || null, remote: remoteUrl }); continue }
            }
            const ct = (r.headers.get('content-type') || '').toLowerCase()
            const buf = Buffer.from(await r.arrayBuffer())
            const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : (ct.includes('jpeg') || ct.includes('jpg')) ? '.jpg' : ''
            const namePart = finalUrl.split('/')?.pop()?.split('?')[0] || `photo-${Date.now()}`
            const safeName = `${Date.now()}-${namePart}`.replace(/[^a-zA-Z0-9_.\-]/g, '_') + (ext && !namePart.toLowerCase().endsWith(ext) ? '' : '')
            const localTarget = path.join(deviceDir, safeName)
            try { fs.writeFileSync(localTarget, buf) } catch (_) { savedPairs.push({ remote: remoteUrl }); continue }

            // Zapis w device_files i budowa lokalnego URL
            let row = null
            if (o.device_id) {
              row = await this.db.get('SELECT id FROM device_files WHERE device_id = ? AND file_path = ? ORDER BY id DESC LIMIT 1', [o.device_id, localTarget])
            } else {
              row = await this.db.get('SELECT id FROM device_files WHERE file_path = ? ORDER BY id DESC LIMIT 1', [localTarget])
            }
            if (!row) {
              await this.db.run(
                'INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, mime_type, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [o.device_id || null, path.basename(localTarget), localTarget, 'image', buf.length, ct || null, `Foto zlecenia ${orderId}`]
              )
              if (o.device_id) {
                row = await this.db.get('SELECT id FROM device_files WHERE device_id = ? AND file_path = ? ORDER BY id DESC LIMIT 1', [o.device_id, localTarget])
              } else {
                row = await this.db.get('SELECT id FROM device_files WHERE file_path = ? ORDER BY id DESC LIMIT 1', [localTarget])
              }
            }
            if (row && row.id) {
              savedPairs.push({ local: `/api/desktop/files/${row.id}`, remote: remoteUrl })
              cached++
            } else {
              savedPairs.push({ remote: remoteUrl })
            }
          } catch (_) {
            savedPairs.push({ remote: remoteUrl })
          }
        }

        await this.db.run('UPDATE service_orders SET work_photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(savedPairs), orderId])
        return res.json({ success: true, cached, total: list.length })
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // GET alias: allow triggering cache-photos from browser address bar
    this.app.get('/api/desktop/orders/:orderId/cache-photos', (req, res) => {
      req.method = 'POST'
      return this.app._router.handle(req, res, () => {})
    })
    // Batch: cache photos for last N completed orders missing local files
    this.app.post('/api/desktop/orders/cache-photos', async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.body?.limit || '20'), 200)
        const rows = await this.db.all(`
          SELECT id FROM service_orders
          WHERE status = 'completed'
            AND work_photos IS NOT NULL AND TRIM(work_photos) <> '' AND work_photos <> '[]'
          ORDER BY updated_at DESC
          LIMIT ?
        `, [limit])
        let done = 0
        for (const r of rows || []) {
          try {
            await new Promise((resolve) => {
              // wezwij lokalnie endpoint cache-photos dla pojedynczego zlecenia
              const port = process.env.PORT || 5174
              fetch(`http://127.0.0.1:${port}/api/desktop/orders/${r.id}/cache-photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                .then(() => resolve())
                .catch(() => resolve())
            })
            done++
          } catch (_) {}
        }
        return res.json({ success: true, processed: rows.length, triggered: done })
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // Serve a file by id
    this.app.get('/api/desktop/files/:fileId', async (req, res) => {
      try {
        const fileId = parseInt(req.params.fileId)
        if (!fileId) return res.status(400).end()
        const row = await this.db.get('SELECT file_path, mime_type FROM device_files WHERE id = ?', [fileId])
        if (!row || !row.file_path) return res.status(404).end()
        const fs = require('fs')
        const path = require('path')
        const p = row.file_path
        const mime = row.mime_type || (String(p).toLowerCase().endsWith('.png') ? 'image/png' : String(p).toLowerCase().endsWith('.webp') ? 'image/webp' : String(p).toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'application/octet-stream')
        res.setHeader('Content-Type', mime)
        const stream = fs.createReadStream(p)
        stream.on('error', () => res.status(404).end())
        stream.pipe(res)
      } catch (e) { return res.status(500).end() }
    })
    // Proxy z whitelistą hostów, limitem rozmiaru i timeoutem
    this.app.get('/api/desktop/files/proxy', async (req, res) => {
      try {
        const raw = String(req.query.u || '').trim()
        if (!raw) return res.status(400).json({ error: 'missing u' })
        const input = (() => { try { return decodeURIComponent(raw) } catch (_) { return raw } })()

        const PREFERRED = (process.env.RAILWAY_PUBLIC_URL || '').replace(/\/$/, '')
        const WHITELIST = [
          PREFERRED,
          'https://web-production-fc58d.up.railway.app',
          'https://web-production-310c4.up.railway.app',
          'https://www.instalacjeserwis.pl'
        ].filter(Boolean)

        const isHttpsUrl = (s) => /^https:\/\//i.test(s)
        const isUploadsPath = (s) => /^\/?uploads\//i.test(s) || /^\/uploads\//i.test(s)
        const toAbs = (pathLike) => {
          const p = pathLike.startsWith('/') ? pathLike : `/${pathLike}`
          return WHITELIST[0] ? `${WHITELIST[0]}${p}` : null
        }

        let candidates = []
        if (isHttpsUrl(input)) {
          candidates.push(input)
          try {
            const u = new URL(input)
            if (/\/uploads\//.test(u.pathname)) {
              for (const host of WHITELIST) {
                try { const h = new URL(host); candidates.push(`${h.origin}${u.pathname}`) } catch (_) {}
              }
            }
          } catch (_) {}
        } else if (isUploadsPath(input)) {
          const abs = toAbs(input)
          if (abs) candidates.push(abs)
        }
        candidates = candidates.filter((v, i, a) => v && a.indexOf(v) === i && WHITELIST.some(h => v.startsWith(h)))
        if (!candidates.length) return res.status(400).json({ error: 'url not whitelisted or invalid' })

        const LIMIT = Math.min(parseInt(process.env.PROXY_MAX_BYTES || '15728640'), 50 * 1024 * 1024)
        const TIMEOUT_MS = Math.min(parseInt(process.env.PROXY_TIMEOUT_MS || '10000'), 60000)

        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
        let response = null
        for (const url of candidates) {
          try {
            const r = await fetch(url, { signal: controller.signal })
            if (!r || !r.ok) continue
            const len = parseInt(r.headers.get('content-length') || '0')
            if (len && len > LIMIT) { continue }
            response = r
            break
          } catch (_) {}
        }
        clearTimeout(t)
        if (!response) return res.status(404).json({ error: 'not found' })

        const ct = response.headers.get('content-type') || 'application/octet-stream'
        const cl = parseInt(response.headers.get('content-length') || '0')
        res.setHeader('Content-Type', ct)
        if (cl) res.setHeader('Content-Length', String(cl))
        res.setHeader('Cache-Control', 'public, max-age=600')

        let sent = 0
        for await (const chunk of response.body) {
          sent += chunk.length
          if (sent > LIMIT) { try { res.status(413).end() } catch(_) {} return }
          res.write(chunk)
        }
        return res.end()
      } catch (e) {
        return res.status(500).json({ error: 'proxy-failed' })
      }
    })

    // Ręczny eksport do Railway – natychmiast uruchamia pre-sync i wysyłkę oczekujących zleceń
    this.app.post('/api/railway/export-now', async (_req, res) => {
      try {
        // Ensure local SQLite has sync columns used below
        const hasSyncCols = await this.ensureOrderSyncColumns()
        let synced = { users: false, devices: false, clients: false, orders: 0, assigns: 0 }
        // Pre-sync users/devices/clients (best effort)
        try {
          const users = await this.db.all('SELECT id, username, full_name, email, role, is_active, phone, mobile_pin_hash FROM users')
          await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users || []) })
          synced.users = true
        } catch (_) {}
        try {
          const devices = await this.db.all('SELECT * FROM devices')
          await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/devices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(devices || []) })
          synced.devices = true
        } catch (_) {}
        try {
          const clients = await this.db.all('SELECT * FROM clients')
          await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clients || []) })
          synced.clients = true
        } catch (_) {}

        // Wyślij oczekujące zlecenia
        const pendingQuery = hasSyncCols
          ? `SELECT * FROM service_orders
             WHERE assigned_user_id IS NOT NULL
               AND (desktop_sync_status IS NULL OR desktop_sync_status <> 'sent')
             ORDER BY updated_at DESC
             LIMIT 50`
          : `SELECT * FROM service_orders
             WHERE assigned_user_id IS NOT NULL
             ORDER BY updated_at DESC
             LIMIT 50`
        const pending = await this.db.all(pendingQuery)
        for (const o of (pending || [])) {
          try {
            const clientRow = o.client_id
              ? await this.db.get('SELECT email, external_id FROM clients WHERE id = ?', [o.client_id])
              : null
            const deviceRow = o.device_id
              ? await this.db.get('SELECT serial_number, external_id FROM devices WHERE id = ?', [o.device_id])
              : null
            
            // Bezpieczna konwersja order_parts → parts_used (tylko jeśli parts_used jest NULL/puste LUB jest tylko cyfrą 1-2 znaki - prawdopodobnie ID części)
            let partsUsedText = o.parts_used || null
            const partsUsedTrimmed = partsUsedText ? String(partsUsedText).trim() : ''
            if (!partsUsedText || partsUsedTrimmed === '' || /^\d{1,2}$/.test(partsUsedTrimmed)) {
              try {
                const orderParts = await this.db.all(
                  `SELECT sp.name, sp.part_number, op.quantity 
                   FROM order_parts op 
                   JOIN spare_parts sp ON op.part_id = sp.id 
                   WHERE op.order_id = ? AND sp.name IS NOT NULL
                   ORDER BY sp.name`,
                  [o.id]
                )
                if (orderParts && orderParts.length > 0) {
                  partsUsedText = orderParts
                    .map(p => {
                      const name = p.name || ''
                      const partNumber = p.part_number ? ` ${p.part_number}` : ''
                      return `${name}${partNumber}`.trim()
                    })
                    .filter(Boolean)
                    .join(', ')
                }
              } catch (_) { 
                // Soft fail - zachowaj NULL jeśli błąd
                partsUsedText = null
              }
            }
            
            const orderPayload = [{
              id: o.id,
              order_number: o.order_number,
              title: o.title || o.description || `Zlecenie ${o.order_number || o.id}`,
              client_id: o.client_id || null,
              device_id: o.device_id || null,
              client_email: (clientRow && clientRow.email) || o.client_email || null,
              external_client_id: (clientRow && clientRow.external_id) || (o.client_id ? `${this.installationId}:client:${o.client_id}` : null),
              client_external_id: (clientRow && clientRow.external_id) || (o.client_id ? `${this.installationId}:client:${o.client_id}` : null),
              device_serial: (deviceRow && deviceRow.serial_number) || null,
              external_device_id: (deviceRow && deviceRow.external_id) || (o.device_id ? `${this.installationId}:device:${o.device_id}` : null),
              device_external_id: (deviceRow && deviceRow.external_id) || (o.device_id ? `${this.installationId}:device:${o.device_id}` : null),
              assigned_user_id: o.assigned_user_id || null,
              priority: o.priority || 'medium',
              status: o.status || 'new',
              description: o.description || null,
              notes: o.notes || null,
              scheduled_date: o.scheduled_date || null,
              completed_categories: o.completed_categories || null,
              completion_notes: o.completion_notes || null,
              actual_hours: o.actual_hours ?? null,
              actual_start_date: o.actual_start_date || o.started_at || null,
              actual_end_date: o.actual_end_date || o.completed_at || null,
              work_photos: o.work_photos || null,
              parts_used: partsUsedText,
              completed_at: o.completed_at || null,
              created_at: o.created_at || null,
              updated_at: o.updated_at || null
            }]
            const r = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) })
            if (!r.ok) continue
            synced.orders++
            if (o.assigned_user_id) {
              await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/assign`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber: o.order_number, technicianId: o.assigned_user_id, status: o.status || 'new', assignedAt: new Date().toISOString() }) }).catch(()=>{})
              synced.assigns++
            }
            if (hasSyncCols) {
              await this.db.run("UPDATE service_orders SET desktop_sync_status = 'sent', desktop_synced_at = CURRENT_TIMESTAMP WHERE id = ?", [o.id])
            }
          } catch (_) { /* skip */ }
        }
        return res.json({ success: true, synced })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Eksport pojedynczego zlecenia natychmiast (używane przy "Wyślij do aplikacji")
    this.app.post('/api/railway/export-order/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        const o = await this.db.get('SELECT * FROM service_orders WHERE id = ?', [orderId])
        if (!o) return res.status(404).json({ success: false, error: 'Order not found' })

        // Konwersja order_parts -> parts_used (tak samo jak w auto-synchronizacji)
        let partsUsedText = o.parts_used || null
        try {
          const segments = []
          const seen = new Set()
          const pushSegment = (text) => {
            const norm = String(text || '').replace(/\s+/g, ' ').trim()
            if (!norm) return
            const key = norm.toLowerCase()
            if (seen.has(key)) return
            seen.add(key)
            segments.push(norm)
          }

          // Istniejąca wartość – zachowaj kolejność
          if (o.parts_used) {
            String(o.parts_used)
              .split(/[,;\n]+/)
              .map(s => pushSegment(s))
          }

          const partsRows = await this.db.all(
            `SELECT 
               COALESCE(sp.name, '') AS name,
               COALESCE(sp.part_number, '') AS part_number
             FROM order_parts op
             LEFT JOIN spare_parts sp ON sp.id = op.part_id
             WHERE op.order_id = ?
             ORDER BY COALESCE(sp.name, '')`,
            [orderId]
          )
          if (partsRows && partsRows.length) {
            for (const row of partsRows) {
              const name = String(row.name || '').trim()
              const partNumber = String(row.part_number || '').trim()
              const display = `${name}${partNumber ? ` ${partNumber}` : ''}`
              pushSegment(display)
            }
          }

          partsUsedText = segments.length ? segments.join(', ') : null
        } catch (err) {
          console.warn('[EXPORT-ORDER] parts_used build failed:', err?.message)
          partsUsedText = partsUsedText || null
        }

        const payload = [{
          id: o.id,
          order_number: o.order_number,
          client_id: o.client_id || null,
          device_id: o.device_id || null,
          // Stabilne identyfikatory do bezpiecznego mapowania po stronie Railway
          client_email: (() => { try { return o.client_id ? (o.client_email || null) : null } catch (_) { return null } })(),
          device_serial: (() => { try { return o.device_id ? (o.device_serial || null) : null } catch (_) { return null } })(),
          type: o.type || null,
          service_categories: o.service_categories || null,
          completed_categories: o.completed_categories || null,
          status: o.status || 'new',
          priority: o.priority || 'medium',
          title: o.title || o.description || `Zlecenie ${o.order_number || o.id}`,
          description: o.description || null,
          scheduled_date: o.scheduled_date || null,
          estimated_hours: o.estimated_hours || null,
          actual_hours: o.actual_hours ?? null,
          actual_start_date: o.actual_start_date || o.started_at || null,
          actual_end_date: o.actual_end_date || o.completed_at || null,
          parts_cost: o.parts_cost || 0,
          labor_cost: o.labor_cost || 0,
          total_cost: o.total_cost || 0,
          estimated_cost_note: o.estimated_cost_note || null,
          notes: o.notes || null,
          completion_notes: o.completion_notes || null,
          work_photos: o.work_photos || null,
          assigned_user_id: o.assigned_user_id || null,
          parts_used: partsUsedText,
          completed_at: o.completed_at || null
        }]
        try { console.log('[EXPORT-ORDER] order=', o.id, 'parts_used=', partsUsedText); } catch (_) {}
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        let r = await fetch(`${base}/sync/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(()=>null)
        if (!r || !r.ok) {
          // Fallback: uruchom eksport zbiorczy (często pomaga gdy /sync/orders odrzuci pojedynczy payload)
          try {
            const rf = await fetch(`${base}/sync/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{
              order_number: o.order_number,
              client_id: o.client_id || null,
              device_id: o.device_id || null,
              status: o.status || 'new',
              priority: o.priority || 'medium',
              title: o.title || null,
              description: o.description || null,
              scheduled_date: o.scheduled_date || null,
              total_cost: o.total_cost || 0,
              estimated_cost_note: o.estimated_cost_note || null,
            }]) })
            if (!rf.ok) {
              // Ostateczny fallback: wywołaj lokalny eksport-now, który zsynchronizuje referencje i zamówienia
              await fetch('http://127.0.0.1:5174/api/railway/export-now', { method: 'POST' }).catch(()=>{})
            }
          } catch (_) {}
        } else {
          try {
            await this.db.run(
              "UPDATE service_orders SET parts_used = ?, desktop_sync_status = 'sent', desktop_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [partsUsedText, orderId]
            )
          } catch (err) {
            console.warn('[EXPORT-ORDER] local update failed:', err?.message)
          }
        }
        if (o.assigned_user_id) {
          await fetch(`${base}/sync/assign`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: o.order_number, technicianId: o.assigned_user_id, status: o.status || 'assigned' })
          }).catch(()=>{})
        }
        // Powiadom aplikację mobilną przez SSE (3 próby best-effort)
        try {
          for (let i=0;i<3;i++) {
            const n = await fetch(`${base}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'order.updated', data: { orderId } }) })
            if (n.ok) break
            await new Promise(r=>setTimeout(r, 300))
          }
        } catch (_) {}
        return res.json({ success: true })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Wygodny GET trigger dla kliknięcia w przeglądarce
    this.app.get('/api/railway/export-now', async (req, res) => {
      req.method = 'POST'
      return this.app._router.handle(req, res, () => {})
    })

    // Prosty endpoint testowy dla telefonu
    this.app.get('/api/test', (req, res) => {
      const response = {
        status: 'API działa!',
        timestamp: new Date().toISOString(),
        your_ip: req.ip,
        user_agent: req.get('User-Agent'),
        origin: req.get('Origin'),
        message: 'Połączenie z telefonem działa prawidłowo! 📱'
      };
      console.log('✅ Test endpoint wywołany:', response);
      res.json(response);
    });

    // CORS preflight dla wszystkich endpointów
    this.app.options('*', (req, res) => {
      const origin = req.get('Origin') || '*'
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Origin, Accept, Access-Control-Request-Private-Network');
      res.header('Access-Control-Allow-Private-Network', 'true');
      res.sendStatus(204);
    });

    // Debug endpoint - sprawdz tabele
    this.app.get('/api/debug/tables', async (req, res) => {
      try {
        const tables = {};
        
        // Sprawdź service_orders
        const orders = await this.db.all('SELECT COUNT(*) as count FROM service_orders');
        tables.service_orders = orders[0].count;
        
        // Sprawdź users
        try {
          const users = await this.db.all('SELECT COUNT(*) as count FROM users');
          tables.users = users[0].count;
        } catch (e) {
          tables.users = 'NOT_EXISTS';
        }
        
        // Sprawdź clients
        const clients = await this.db.all('SELECT COUNT(*) as count FROM clients');
        tables.clients = clients[0].count;
        
        // Sprawdź devices
        const devices = await this.db.all('SELECT COUNT(*) as count FROM devices');
        tables.devices = devices[0].count;
        
        // Pokaż przykładowe zlecenia
        const sampleOrders = await this.db.all('SELECT id, assigned_user_id, status FROM service_orders LIMIT 5');
        
        // Pokaż wszystkich użytkowników
        const allUsers = await this.db.all('SELECT id, username, full_name, role FROM users ORDER BY id');
        
        res.json({ 
          tables,
          sample_orders: sampleOrders,
          all_users: allUsers,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Debug: znajdź tabele referencjonujące zlecenia danego klienta (FK → service_orders)
    this.app.get('/api/debug/orders-references/:clientId', async (req, res) => {
      try {
        const clientId = parseInt(req.params.clientId)
        if (!clientId) return res.status(400).json({ success: false, error: 'Invalid clientId' })
        const orderRows = await this.db.all('SELECT id FROM service_orders WHERE client_id = ?', [clientId])
        const orderIds = (orderRows || []).map(r => r.id).filter(Boolean)
        if (!orderIds.length) return res.json({ success: true, orderIds: [], refs: [] })
        const placeholders = orderIds.map(() => '?').join(',')

        const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        const refs = []
        for (const t of (tables || [])) {
          const tn = t && (t.name || t.Name)
          if (!tn || typeof tn !== 'string') continue
          // Pomiń tabelę service_orders (to parent)
          if (tn === 'service_orders') continue
          try {
            const fks = await this.db.all(`PRAGMA foreign_key_list(${tn})`)
            const fkCols = (fks || []).filter(r => String(r.table).toLowerCase() === 'service_orders').map(r => r.from)
            if (!fkCols.length) continue
            // Zlicz odwołania w tej tabeli dla każdego kolumnowego FK
            let total = 0
            const columns = []
            for (const col of fkCols) {
              try {
                const r = await this.db.get(`SELECT COUNT(*) AS cnt FROM ${tn} WHERE ${col} IN (${placeholders})`, orderIds)
                const cnt = (r && (r.cnt || r.count)) || 0
                total += Number(cnt)
                if (cnt) columns.push({ column: col, count: Number(cnt) })
              } catch (_) { /* skip one column */ }
            }
            if (total) refs.push({ table: tn, total, columns })
          } catch (_) { /* skip this table */ }
        }
        refs.sort((a,b) => b.total - a.total)
        return res.json({ success: true, orderIds, refs })
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message })
      }
    })

    // Endpoint do pobierania użytkowników
    this.app.get('/api/desktop/users', async (req, res) => {
      try {
        const users = await this.db.all('SELECT id, username, full_name, role, email, is_active FROM users ORDER BY id');
        res.json(users);
      } catch (error) {
        console.error('❌ Błąd pobierania użytkowników:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do pobierania klientów
    this.app.get('/api/desktop/clients', async (req, res) => {
      try {
        // Sprawdź strukturę tabeli clients
        const tableInfo = await this.db.all("PRAGMA table_info(clients)");
        console.log('📋 Struktura tabeli clients:', tableInfo);
        
        const clients = await this.db.all('SELECT * FROM clients WHERE is_active IS NULL OR is_active = 1 ORDER BY company_name');
        console.log('📋 Wszystkie dane klientów:', clients);
        
        res.json(clients);
      } catch (error) {
        console.error('❌ Błąd pobierania klientów:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Podgląd kasowania: policz rekordy powiązane z klientem (lokalnie)
    this.app.get('/api/desktop/clients/:clientId/delete-preview', async (req, res) => {
      try {
        const clientId = parseInt(req.params.clientId)
        if (!clientId) return res.status(400).json({ success: false, error: 'Invalid clientId' })
        const one = async (sql, params=[]) => {
          try { const r = await this.db.get(sql, params); return Number(r && (r.cnt || r.count || 0)) } catch (_) { return 0 }
        }
        const devices = await one('SELECT COUNT(*) AS cnt FROM devices WHERE client_id = ?', [clientId])
        const orders = await one('SELECT COUNT(*) AS cnt FROM service_orders WHERE client_id = ?', [clientId])
        const timeEntries = await one('SELECT COUNT(*) AS cnt FROM time_entries WHERE order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        const orderParts = await one('SELECT COUNT(*) AS cnt FROM order_parts WHERE order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        const devFiles = await one('SELECT COUNT(*) AS cnt FROM device_files WHERE device_id IN (SELECT id FROM devices WHERE client_id = ?)', [clientId])
        const invoices = await one('SELECT COUNT(*) AS cnt FROM invoices WHERE client_id = ? OR order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId, clientId])
        const invItems = await one('SELECT COUNT(*) AS cnt FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = ? OR order_id IN (SELECT id FROM service_orders WHERE client_id = ?))', [clientId, clientId])
        const calClient = await one('SELECT COUNT(*) AS cnt FROM calendar_events WHERE client_id = ?', [clientId])
        const calRelated = await one('SELECT COUNT(*) AS cnt FROM calendar_events WHERE related_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        return res.json({ success: true, clientId, counts: { devices, orders, time_entries: timeEntries, order_parts: orderParts, device_files: devFiles, invoices, invoice_items: invItems, calendar_events_client: calClient, calendar_events_related: calRelated } })
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message })
      }
    })
    // Bezpieczne usuwanie klienta wraz z powiązanymi danymi (kaskadowo, transakcja)
    this.app.delete('/api/desktop/clients/:clientId', async (req, res) => {
      const clientId = parseInt(req.params.clientId)
      if (!clientId) return res.status(400).json({ success: false, error: 'Invalid clientId' })
      const flag = (req.query?.alsoRailway !== undefined ? req.query.alsoRailway : req.body?.alsoRailway)
      const alsoRailway = (flag === true) || (flag === 1) || (String(flag).toLowerCase() === '1') || (String(flag).toLowerCase() === 'true')
      // Wymagaj wyraźnego potwierdzenia, aby przypadkowe kliknięcia nie kasowały danych
      const confirmFlag = (req.query?.confirm !== undefined ? req.query.confirm : req.body?.confirm)
      const confirmed = (confirmFlag === true) || (confirmFlag === 1) || (String(confirmFlag).toLowerCase() === '1') || (String(confirmFlag).toLowerCase() === 'true')
      if (!confirmed) return res.status(400).json({ success: false, error: 'Confirmation required' })
      try {
        // Zbierz identyfikatory do zdalnego sprzątania (soft-clean) PRZED lokalnym kasowaniem
        let remoteSnapshot = { clientId, deviceIds: [], orderIds: [] }
        try {
          const dRows = await this.db.all('SELECT id FROM devices WHERE client_id = ?', [clientId])
          const oRows = await this.db.all('SELECT id, order_number FROM service_orders WHERE client_id = ?', [clientId])
          remoteSnapshot.deviceIds = (dRows || []).map(r => r.id).filter(Boolean)
          remoteSnapshot.orderIds = (oRows || []).map(r => ({ id: r.id, order_number: r.order_number })).filter(x => x && x.id)
        } catch (_) { /* ignore snapshot failures */ }

        // Opcjonalnie: spróbuj oczyścić dane na Railway, tylko gdy skonfigurowano sekret
        const remoteDeleteEnabled = !!String(process.env.DELETE_ADMIN_SECRET || '').trim()
        if (alsoRailway && remoteDeleteEnabled) {
          try {
            const base = RAILWAY_API_BASE.replace(/\/$/, '')
            const headers = { 'Content-Type': 'application/json' }
            if (process.env.DELETE_ADMIN_SECRET) headers['X-Admin-Secret'] = process.env.DELETE_ADMIN_SECRET
            const prev = await fetch(`${base}/delete/preview`, { method: 'POST', headers, body: JSON.stringify({ client: { id: clientId } }) })
            const prevJson = await prev.json().catch(()=>({}))
            if (!prev.ok || prevJson?.success === false || prevJson?.canDelete === false) {
              return res.status(502).json({ success: false, error: 'Railway preview failed', details: prevJson })
            }
            const commit = await fetch(`${base}/delete/commit`, { method: 'POST', headers, body: JSON.stringify({ client: { id: clientId }, confirm: true }) })
            const commitJson = await commit.json().catch(()=>({}))
            if (!commit.ok || commitJson?.success === false) {
              return res.status(502).json({ success: false, error: 'Railway delete failed', details: commitJson })
            }
          } catch (e) {
            return res.status(502).json({ success: false, error: 'Railway communication error', details: e?.message })
          }
        }
        // Jeśli alsoRailway=true, ale brak sekretu – informacyjnie zwróć 400 (źle skonfigurowane),
        // jednak pozwól UI zdecydować o kontynuacji lokalnie
        if (alsoRailway && !remoteDeleteEnabled) {
          // Brak sekretu – nie blokuj lokalnego kasowania. Zrobimy soft-clean poniżej po COMMIT.
          console.warn('Railway delete requested but not configured; will attempt soft-clean via /sync after local delete')
        }

        // Transakcja lokalna – usuń powiązane rekordy w bezpiecznej kolejności
        // Odporna na chwilowe blokady (database is locked)
        const beginTx = async () => {
          const stmts = ['BEGIN IMMEDIATE TRANSACTION', 'BEGIN TRANSACTION']
          for (let i=0;i<6;i++) {
            try { await this.db.run(stmts[i===0?0:1]); return }
            catch (e) {
              const msg = String(e?.message||'').toLowerCase()
              if (msg.includes('locked')) { await new Promise(r=>setTimeout(r, 80 + i*60)); continue }
              throw e
            }
          }
          // Ostatnia próba
          await this.db.run('BEGIN TRANSACTION')
        }
        await beginTx()
        const exec = async (label, sql, params=[]) => {
          try {
            await this.db.run(sql, params)
          } catch (e) {
            const msg = String(e?.message || '').toLowerCase()
            // Bezpiecznie pomiń brakujące tabele/kolumny (stare bazy)
            if (msg.includes('no such table') || msg.includes('no such column')) {
              console.warn('[delete-client]', label, 'Ignored non-fatal error:', e?.message)
              return
            }
            // Retry przy blokadzie bazy (SQLITE_BUSY)
            if (msg.includes('database is locked') || msg.includes('sqlite_busy')) {
              for (let i=0;i<5;i++) {
                await new Promise(r => setTimeout(r, 80 + i*40))
                try { await this.db.run(sql, params); return } catch (e2) {
                  const m2 = String(e2?.message || '').toLowerCase()
                  if (!(m2.includes('database is locked') || m2.includes('sqlite_busy'))) break
                }
              }
            }
            e.message = `[delete-client] step=${label} ${e.message}`
            throw e
          }
        }

        // invoice_items -> invoices -> time_entries -> order_parts -> calendar_events -> device_files -> service_orders -> devices -> clients
        await exec('invoice_items_by_client_or_order', 'DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = ? OR order_id IN (SELECT id FROM service_orders WHERE client_id = ?))', [clientId, clientId])
        await exec('invoice_items_by_order_only', 'DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id IN (SELECT id FROM service_orders WHERE client_id = ?))', [clientId])
        await exec('invoices', 'DELETE FROM invoices WHERE client_id = ? OR order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId, clientId])
        await exec('time_entries', 'DELETE FROM time_entries WHERE order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        await exec('order_parts', 'DELETE FROM order_parts WHERE order_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        await exec('calendar_events_client', 'DELETE FROM calendar_events WHERE client_id = ?', [clientId])
        await exec('calendar_events_related', 'DELETE FROM calendar_events WHERE related_id IN (SELECT id FROM service_orders WHERE client_id = ?)', [clientId])
        await exec('device_files', 'DELETE FROM device_files WHERE device_id IN (SELECT id FROM devices WHERE client_id = ?)', [clientId])

        // Best-effort: usuń rekordy z DOWOLNYCH tabel, które posiadają kolumnę order_id → wskazują na nasze zlecenia
        try {
          const orderIdRows = await this.db.all('SELECT id FROM service_orders WHERE client_id = ?', [clientId])
          const orderIds = (orderIdRows || []).map(r => r.id).filter(Boolean)
          if (orderIds.length) {
            const placeholders = orderIds.map(() => '?').join(',')
            const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            for (const t of (tables || [])) {
              const tn = t && (t.name || t.Name)
              if (!tn || typeof tn !== 'string') continue
              // Pomiń znane tabele, które już czyścimy
              if (['service_orders','order_parts','time_entries','invoices','invoice_items','calendar_events'].includes(tn)) continue
              try {
                const cols = await this.db.all(`PRAGMA table_info(${tn})`)
                const names = new Set((cols || []).map(c => c.name || c[1]))
                if (names.has('order_id')) {
                  await exec(`generic_${tn}`,
                    `DELETE FROM ${tn} WHERE order_id IN (${placeholders})`, orderIds)
                }
                if (names.has('service_order_id')) {
                  await exec(`generic_${tn}_service_order_id`,
                    `DELETE FROM ${tn} WHERE service_order_id IN (${placeholders})`, orderIds)
                }
              } catch (_) { /* ignore one table */ }
            }
            // Fallback: odłącz order_id tam, gdzie nie chcemy usuwać (np. faktury, jeśli pozostały)
            await exec('invoices_detach',
              `UPDATE invoices SET order_id = NULL WHERE order_id IN (${placeholders})`, orderIds)
          }
        } catch (_) { /* ignore dynamic sweep errors */ }

        await exec('service_orders', 'DELETE FROM service_orders WHERE client_id = ?', [clientId])
        await exec('service_request_links', 'DELETE FROM service_request_links WHERE linked_client_id = ? OR linked_device_id IN (SELECT id FROM devices WHERE client_id = ?)', [clientId, clientId])
        // Odpnij części od urządzeń klienta, ale nie usuwaj z katalogu (zachowaj dla innych klientów)
        await exec('spare_parts_detach', 'UPDATE spare_parts SET device_id = NULL WHERE device_id IN (SELECT id FROM devices WHERE client_id = ?)', [clientId])
        await exec('devices', 'DELETE FROM devices WHERE client_id = ?', [clientId])
        await exec('clients', 'DELETE FROM clients WHERE id = ?', [clientId])

        await this.db.run('COMMIT')

        // Best-effort SOFT-CLEAN on Railway, gdy nie mogliśmy użyć twardego delete (brak sekretu)
        if (alsoRailway && !remoteDeleteEnabled) {
          try {
            const base = RAILWAY_API_BASE.replace(/\/$/, '')
            // 1) Dezaktywuj klienta
            await fetch(`${base}/sync/clients`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{ id: clientId, is_active: 0 }])
            }).catch(()=>{})
            // 2) Dezaktywuj urządzenia
            if (remoteSnapshot.deviceIds.length) {
              const devPayload = remoteSnapshot.deviceIds.map(id => ({ id, is_active: 0 }))
              await fetch(`${base}/sync/devices`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(devPayload)
              }).catch(()=>{})
            }
            // 3) Oznacz zlecenia jako deleted/archived
            if (remoteSnapshot.orderIds.length) {
              const ordPayload = remoteSnapshot.orderIds.map(o => ({ id: o.id, order_number: o.order_number, status: 'deleted' }))
              await fetch(`${base}/sync/orders`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ordPayload)
              }).catch(()=>{})
            }
          } catch (_) { /* ignore soft-clean errors */ }
        }

        return res.json({ success: true, deleted: { clientId } })
      } catch (e) {
        try { await this.db.run('ROLLBACK') } catch (_) {}
        const msg = String(e?.message || '')
        const stepMatch = msg.match(/step=([^\s]+)/)
        const step = stepMatch ? stepMatch[1] : 'unknown'
        console.error('❌ Delete client failed at step:', step, e)
        return res.status(500).json({ success: false, error: 'Delete failed', step, details: msg })
      }
    })

    // Endpoint do pobierania urządzeń dla konkretnego klienta
    this.app.get('/api/desktop/clients/:clientId/devices', async (req, res) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const devices = await this.db.all('SELECT id, name, model, manufacturer as brand FROM devices WHERE client_id = ? ORDER BY name', [clientId]);
        res.json(devices);
      } catch (error) {
        console.error('❌ Błąd pobierania urządzeń klienta:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do pobierania zleceń
    this.app.get('/api/desktop/orders', async (req, res) => {
      try {
        const orders = await this.db.all('SELECT * FROM service_orders ORDER BY created_at DESC');
        res.json(orders);
      } catch (error) {
        console.error('❌ Błąd pobierania zleceń:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });
    // Lista części zamiennych z paginacją i filtrami
    this.app.get('/api/desktop/spare-parts', async (req, res) => {
      try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200)
        const offset = (page - 1) * limit
        const searchRaw = normalizeText(req.query.search)
        const category = normalizeText(req.query.category)
        const magCode = normalizeText(req.query.magCode)
        const stock = normalizeText(req.query.stock)
        const supplierId = req.query.supplierId != null && req.query.supplierId !== ''
          ? Number(req.query.supplierId)
          : null

        const filters = []
        const params = []

        if (searchRaw) {
          const like = `%${searchRaw.toLowerCase()}%`
          filters.push(`(
            LOWER(name) LIKE ? OR
            LOWER(part_number) LIKE ? OR
            LOWER(manufacturer) LIKE ? OR
            LOWER(brand) LIKE ? OR
            LOWER(barcode) LIKE ? OR
            LOWER(magazine_code) LIKE ?
          )`)
          params.push(like, like, like, like, like, like)
        }
        if (category) {
          filters.push('category = ?')
          params.push(category)
        }
        if (magCode) {
          filters.push('LOWER(magazine_code) LIKE ?')
          params.push(`%${magCode.toLowerCase()}%`)
        }
        if (supplierId != null && Number.isFinite(supplierId)) {
          filters.push('COALESCE(supplier_id, 0) = ?')
          params.push(supplierId)
        }
        if (stock) {
          if (stock === 'available') filters.push('stock_quantity > min_stock_level')
          if (stock === 'low') filters.push('stock_quantity > 0 AND stock_quantity <= min_stock_level')
          if (stock === 'out') filters.push('stock_quantity = 0')
        }

        const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
        const totalRow = await this.db.get(`SELECT COUNT(*) as total FROM spare_parts ${whereSql}`, params)
        const statsRow = await this.db.get(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN stock_quantity > min_stock_level THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= min_stock_level THEN 1 ELSE 0 END) AS low_stock,
            SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS out_stock
          FROM spare_parts
          ${whereSql}
        `, params)

        const listParams = [...params, limit, offset]
        const rows = await this.db.all(`
          SELECT
            id,
            magazine_code,
            name,
            category,
            part_number,
            manufacturer,
            manufacturer_code,
            brand,
            assembly_group,
            barcode,
            net_price,
            gross_price,
            vat_rate,
            currency,
            price,
            stock_quantity,
            min_stock_level,
            weight,
            unit,
            package_size,
            description,
            model_compatibility,
            location,
            supplier,
            supplier_part_number,
            lead_time_days,
            last_order_date,
            notes,
            supplier_id,
            device_id,
            synced_at,
            updated_by,
            created_at,
            updated_at
          FROM spare_parts
          ${whereSql}
          ORDER BY name
          LIMIT ? OFFSET ?
        `, listParams)

        const mapped = (rows || []).map(row => {
          const gross = toNumber(row.gross_price ?? row.price, 0)
          const vatRate = toNumber(row.vat_rate, 23)
          const net = row.net_price != null && row.net_price !== ''
            ? toNumber(row.net_price, 0)
            : (vatRate === 0 ? gross : gross / (1 + vatRate / 100))
          return {
            ...row,
            gross_price: Number(gross.toFixed(2)),
            price: Number(gross.toFixed(2)),
            net_price: Number(net.toFixed(2)),
            vat_rate: vatRate,
            stock_quantity: toNumber(row.stock_quantity, 0),
            min_stock_level: toNumber(row.min_stock_level, 0),
            weight: clampDecimals(row.weight, 4),
            lead_time_days: clampDecimals(row.lead_time_days, 0)
          }
        })

        const total = Number(totalRow?.total || 0)
        const totalPages = total > 0 ? Math.ceil(total / limit) : 1
        const stats = {
          total: Number(statsRow?.total || 0),
          available: Number(statsRow?.available || 0),
          lowStock: Number(statsRow?.low_stock || 0),
          outOfStock: Number(statsRow?.out_stock || 0)
        }

        res.json({
          success: true,
          data: mapped,
          pagination: {
            page,
            limit,
            total,
            totalPages
          },
          stats
        })
      } catch (error) {
        console.error('❌ Błąd pobierania części zamiennych:', error)
        res.status(500).json({ success: false, error: 'Database error' })
      }
    })

    const WEBSITE_CONTENT_SLUG = 'landing';

    const readLocalWebsiteContent = async () => {
      try {
        const row = await this.db.get(
          'SELECT payload_json AS payloadJson, updated_at AS updatedAt FROM website_content_blocks WHERE slug = ? LIMIT 1',
          [WEBSITE_CONTENT_SLUG]
        );
        if (!row) return null;
        let payload = {};
        try {
          payload = row.payloadJson ? JSON.parse(row.payloadJson) : {};
        } catch (_) {
          payload = {};
        }
        return { content: payload, updatedAt: row.updatedAt || null };
      } catch (error) {
        console.warn('[website-content] read local failed:', error?.message || error);
        return null;
      }
    };

    const writeLocalWebsiteContent = async (payload) => {
      try {
        await this.db.run(
          `INSERT INTO website_content_blocks (slug, payload_json, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(slug) DO UPDATE SET
             payload_json = excluded.payload_json,
             updated_at = excluded.updated_at`,
          [WEBSITE_CONTENT_SLUG, JSON.stringify(payload || {})]
        );
      } catch (error) {
        console.warn('[website-content] write local failed:', error?.message || error);
      }
    };

    const fetchWebsiteContentFromRailway = async () => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '');
        const resp = await fetch(`${base}/website/content`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json().catch(() => ({}));
        if (json?.success && json?.data?.content) {
          return {
            content: json.data.content,
            updatedAt: json.data.updatedAt || new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn('[website-content] Railway fetch failed:', error?.message || error);
      }
      return null;
    };

    const pushWebsiteContentToRailway = async (payload) => {
      const base = RAILWAY_API_BASE.replace(/\/$/, '');
      const target = `${base}/website/content/${WEBSITE_CONTENT_SLUG}`;
      const response = await fetch(target, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload })
      });
      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(raw || `HTTP ${response.status}`);
      }
      const json = await response.json().catch(() => ({}));
      return {
        content: json?.data?.content || payload,
        updatedAt: json?.data?.updatedAt || new Date().toISOString()
      };
    };

    this.app.get('/api/website/content', async (_req, res) => {
      try {
        const remote = await fetchWebsiteContentFromRailway();
        if (remote && remote.content) {
          await writeLocalWebsiteContent(remote.content);
          return res.json({ success: true, data: { slug: WEBSITE_CONTENT_SLUG, ...remote, source: 'railway' } });
        }
        const local = await readLocalWebsiteContent();
        if (local && local.content) {
          return res.json({ success: true, data: { slug: WEBSITE_CONTENT_SLUG, ...local, source: 'desktop-cache' } });
        }
        return res.json({ success: true, data: { slug: WEBSITE_CONTENT_SLUG, content: DEFAULT_WEBSITE_CONTENT, updatedAt: null, source: 'default' } });
      } catch (error) {
        console.error('[website-content] fetch failed:', error);
        return res.status(500).json({ success: false, error: 'website-content-fetch-failed' });
      }
    });

    this.app.put('/api/website/content/:slug?', async (req, res) => {
      const payload = req.body?.content || req.body?.payload;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'invalid-payload' });
      }
      try {
        const remote = await pushWebsiteContentToRailway(payload);
        await writeLocalWebsiteContent(remote.content);
        return res.json({ success: true, data: { slug: WEBSITE_CONTENT_SLUG, ...remote } });
      } catch (error) {
        console.error('[website-content] update failed:', error);
        await writeLocalWebsiteContent(payload);
        return res.status(502).json({ success: false, error: 'website-content-sync-failed', details: error?.message || error });
      }
    });

    const pushServiceCategoriesToRailway = async (items = []) => {
      if (!Array.isArray(items) || !items.length) return
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const resp = await fetch(`${base}/service-categories/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')
          console.warn('[service-categories] Railway sync failed', resp.status, text)
        }
      } catch (error) {
        console.warn('[service-categories] Unable to sync with Railway:', error?.message || error)
      }
    }

    const mapServiceCategoryRow = (row) => {
      if (!row) return null
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? null,
        parent_id: row.parent_id ?? null,
        sort_order: row.sort_order ?? 0,
        is_active: row.is_active === null || row.is_active === undefined ? true : !!Number(row.is_active),
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null
      }
    }

    const syncSingleServiceCategory = async (categoryId) => {
      try {
        const row = await this.db.get(
          `SELECT id, code, name, description, parent_id, sort_order, is_active, created_at, updated_at
           FROM service_categories WHERE id = ?`,
          [categoryId]
        )
        const payload = mapServiceCategoryRow(row)
        if (payload) {
          await pushServiceCategoriesToRailway([payload])
        }
      } catch (error) {
        console.warn('[service-categories] Unable to sync category', categoryId, error?.message || error)
      }
    }

    const deleteRemoteServiceCategory = async (categoryId) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const resp = await fetch(`${base}/service-categories/${categoryId}`, { method: 'DELETE' })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')
          console.warn('[service-categories] Railway delete failed', resp.status, text)
        }
      } catch (error) {
        console.warn('[service-categories] Unable to delete category on Railway:', error?.message || error)
      }
    }

    // Endpoint do pobierania kategorii usług
    this.app.get('/api/desktop/service-categories', async (req, res) => {
      try {
        const categories = await this.db.all(`
          SELECT 
            id, code, name, description, parent_id, sort_order, is_active,
            (SELECT COUNT(*) FROM service_categories WHERE parent_id = sc.id) as subcategories_count
          FROM service_categories sc 
          ORDER BY sort_order, name
        `);
        res.json(categories);
      } catch (error) {
        console.error('❌ Błąd pobierania kategorii usług:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do dodawania kategorii usług
    this.app.post('/api/desktop/service-categories', async (req, res) => {
      try {
        const { code, name, description, parent_id, sort_order } = req.body;
        
        const result = await this.db.run(`
          INSERT INTO service_categories (code, name, description, parent_id, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [code, name, description, parent_id || null, sort_order || 0]);
        
        res.json({
          success: true, 
          id: result.lastID,
          message: 'Kategoria usług została dodana'
        });
        await syncSingleServiceCategory(result.lastID).catch(() => {})
      } catch (error) {
        console.error('❌ Błąd dodawania kategorii usług:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do aktualizacji kategorii usług
    this.app.put('/api/desktop/service-categories/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { code, name, description, parent_id, sort_order, is_active } = req.body;
        
        console.log('🔧 Aktualizacja kategorii usług:', { id, code, name, description, parent_id, sort_order, is_active });
        
        // Sprawdź czy kategoria istnieje
        const existingCategory = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);
        if (!existingCategory) {
          return res.status(404).json({ error: 'Kategoria nie została znaleziona' });
        }
        
        // Sprawdź czy nie próbujemy ustawić kategorii jako podkategorię samej siebie
        if (parent_id && parseInt(parent_id) === parseInt(id)) {
          return res.status(400).json({ error: 'Kategoria nie może być podkategorią samej siebie' });
        }
        
        // Sprawdź czy parent_id istnieje (jeśli jest podane)
        if (parent_id) {
          const parentExists = await this.db.get('SELECT id FROM service_categories WHERE id = ?', [parent_id]);
          if (!parentExists) {
            return res.status(400).json({ error: 'Kategoria nadrzędna nie istnieje' });
          }
        }
        
        await this.db.run(`
          UPDATE service_categories 
          SET code = ?, name = ?, description = ?, parent_id = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [code, name, description, parent_id || null, sort_order || 0, is_active, id]);
        
        console.log('✅ Kategoria usług została zaktualizowana');
        res.json({
          success: true, 
          message: 'Kategoria usług została zaktualizowana'
        });
        await syncSingleServiceCategory(id).catch(() => {})
      } catch (error) {
        console.error('❌ Błąd aktualizacji kategorii usług:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
      }
    });

    // Endpoint do usuwania kategorii usług
    this.app.delete('/api/desktop/service-categories/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        // Sprawdź czy kategoria ma podkategorie
        const subcategories = await this.db.get('SELECT COUNT(*) as count FROM service_categories WHERE parent_id = ?', [id]);
        if (subcategories.count > 0) {
          return res.status(400).json({ 
            error: 'Nie można usunąć kategorii, która ma podkategorie' 
          });
        }
        
        await this.db.run('DELETE FROM service_categories WHERE id = ?', [id]);
        
        res.json({ 
          success: true, 
          message: 'Kategoria usług została usunięta'
        });
        await deleteRemoteServiceCategory(id).catch(() => {})
      } catch (error) {
        console.error('❌ Błąd usuwania kategorii usług:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Best-effort initial sync of service categories with Railway after startup
    setTimeout(async () => {
      try {
        const rows = await this.db.all(`
          SELECT id, code, name, description, parent_id, sort_order, is_active, created_at, updated_at
          FROM service_categories
          ORDER BY sort_order, name
        `)
        const items = Array.isArray(rows) ? rows.map(mapServiceCategoryRow).filter(Boolean) : []
        if (items.length) {
          await pushServiceCategoriesToRailway(items)
        }
      } catch (error) {
        console.warn('[service-categories] Initial Railway sync skipped:', error?.message || error)
      }
    }, 4000)

    // Endpoint do pobierania szczegółów zlecenia
    this.app.get('/api/desktop/orders/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const order = await this.db.get(`
          SELECT o.*, 
                 c.contact_person as client_name,
                 c.phone as client_phone,
                 c.email as client_email,
                 d.name as device_name,
                 d.model as device_model,
                 u.full_name as technician_name
          FROM service_orders o
          LEFT JOIN clients c ON o.client_id = c.id
          LEFT JOIN devices d ON o.device_id = d.id
          LEFT JOIN users u ON o.assigned_user_id = u.id
          WHERE o.id = ?
        `, [orderId]);
        
        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
      } catch (error) {
        console.error('❌ Błąd pobierania szczegółów zlecenia:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Endpoint do aktualizacji zlecenia (dla aplikacji mobilnej)
    this.app.put('/api/desktop/orders/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const updateData = req.body;
        
        // Lista dozwolonych pól do aktualizacji
        const allowedFields = [
          'status', 'actual_start_date', 'actual_end_date', 
          'completed_categories', 'work_photos', 'completion_notes',
          'actual_hours', 'completion_notes'
        ];
        
        const updateFields = [];
        const updateValues = [];
        
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updateData[field]);
          }
        }
        
        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(orderId);
        
        await this.db.run(`
          UPDATE service_orders 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);
        
        // Best-effort: wyślij aktualizację do Railway (opis/status), bez blokowania odpowiedzi
        try {
          const base = RAILWAY_API_BASE.replace(/\/$/, '');
          const row = await this.db.get(`
            SELECT o.order_number, o.description, o.status, o.priority, o.type,
                   c.email as client_email, d.serial_number as device_serial
            FROM service_orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN devices d ON o.device_id = d.id
            WHERE o.id = ?
          `, [orderId]);
          if (row && row.order_number) {
            const payload = [{
              order_number: row.order_number,
              description: row.description || null,
              status: row.status || 'new',
              priority: row.priority || 'medium',
              type: row.type || 'maintenance',
              client_email: row.client_email || null,
              device_serial: row.device_serial || null
            }];
            fetch(`${base}/sync/orders`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            }).catch(()=>{});
          }
        } catch (_) { /* silent */ }
        
        console.log(`✅ Zaktualizowano zlecenie ${orderId}:`, updateData);
        res.json({ success: true, orderId, updatedFields: Object.keys(updateData) });
      } catch (error) {
        console.error('❌ Błąd aktualizacji zlecenia:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // === Soft delete (trash) — przenieś do kosza i zsynchronizuj jako deleted do Railway ===
    this.app.put('/api/desktop/orders/:orderId/trash', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        // Ensure deleted_at column exists (older DBs may miss it)
        try {
          const cols = await this.db.all("PRAGMA table_info('service_orders')")
          const names = new Set((cols || []).map(c => c.name || c.Name || (Array.isArray(c) ? c[1] : null)))
          if (!names.has('deleted_at')) {
            await this.db.run('ALTER TABLE service_orders ADD COLUMN deleted_at DATETIME NULL')
          }
          if (!names.has('prev_status')) {
            await this.db.run("ALTER TABLE service_orders ADD COLUMN prev_status TEXT NULL")
          }
        } catch (_) { /* ignore if already exists */ }

        // Oznacz lokalnie jako usunięte (bez kasowania rekordów zależnych)
        // Zachowaj poprzedni status
        try {
          await this.db.run(`UPDATE service_orders SET prev_status = status WHERE id = ?`, [orderId])
        } catch (_) {}
        await this.db.run(`UPDATE service_orders SET status='deleted', deleted_at=COALESCE(deleted_at,CURRENT_TIMESTAMP), desktop_sync_status='sent', updated_at=CURRENT_TIMESTAMP WHERE id = ?`, [orderId])

        // Best-effort: sync do Railway po order_number
        try {
          const row = await this.db.get('SELECT order_number FROM service_orders WHERE id = ?', [orderId])
          if (row && row.order_number) {
            const payload = [{ order_number: row.order_number, status: 'deleted' }]
            await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            }).catch(()=>{})
          }
        } catch (_) { /* silent */ }

        return res.json({ success: true, orderId, trashed: true })
      } catch (e) {
        console.error('❌ Soft delete failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // === Batch trash by order_numbers ===
    this.app.post('/api/desktop/orders/trash-by-numbers', async (req, res) => {
      try {
        const list = Array.isArray(req.body?.order_numbers) ? req.body.order_numbers.filter(x => typeof x === 'string') : []
        if (!list.length) return res.status(400).json({ success: false, error: 'order_numbers required' })
        let updated = 0
        // Ensure deleted_at column exists once
        try {
          const cols = await this.db.all("PRAGMA table_info('service_orders')")
          const names = new Set((cols || []).map(c => c.name || c.Name || (Array.isArray(c) ? c[1] : null)))
          if (!names.has('deleted_at')) {
            await this.db.run('ALTER TABLE service_orders ADD COLUMN deleted_at DATETIME NULL')
          }
          if (!names.has('prev_status')) {
            await this.db.run("ALTER TABLE service_orders ADD COLUMN prev_status TEXT NULL")
          }
        } catch (_) {}
        for (const num of list) {
          try {
            const row = await this.db.get('SELECT id FROM service_orders WHERE order_number = ?', [num])
            if (!row || !row.id) continue
            await this.db.run(`UPDATE service_orders SET prev_status = COALESCE(prev_status, status) WHERE id = ?`, [row.id])
            await this.db.run(`UPDATE service_orders SET status='deleted', deleted_at=COALESCE(deleted_at,CURRENT_TIMESTAMP), desktop_sync_status='sent', updated_at=CURRENT_TIMESTAMP WHERE id = ?`, [row.id])
            // sync Railway best-effort
            try {
              await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: num, status: 'deleted' }])
              }).catch(()=>{})
            } catch (_) {}
            updated++
          } catch (_) { /* skip one */ }
        }
        return res.json({ success: true, trashed: updated })
      } catch (e) {
        console.error('❌ Batch trash failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })
    // === Restore from trash ===
    this.app.put('/api/desktop/orders/:orderId/restore', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        try {
          const cols = await this.db.all("PRAGMA table_info('service_orders')")
          const names = new Set((cols || []).map(c => c.name || c.Name || (Array.isArray(c) ? c[1] : null)))
          if (!names.has('prev_status')) {
            await this.db.run("ALTER TABLE service_orders ADD COLUMN prev_status TEXT NULL")
          }
        } catch (_) {}
        const row = await this.db.get('SELECT prev_status, order_number FROM service_orders WHERE id = ?', [orderId])
        const target = row?.prev_status && row.prev_status !== 'deleted' ? row.prev_status : 'new'
        await this.db.run(`UPDATE service_orders SET status = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [target, orderId])
        // Best-effort: Railway
        try {
          if (row && row.order_number) {
            await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: row.order_number, status: target }])
            }).catch(()=>{})
          }
        } catch (_) {}
        return res.json({ success: true, restoredTo: target })
      } catch (e) {
        console.error('❌ Restore failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    this.app.post('/api/desktop/orders/restore-by-ids', async (req, res) => {
      try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(x => parseInt(x)).filter(Boolean) : []
        if (!ids.length) return res.status(400).json({ success: false, error: 'ids required' })
        const placeholders = ids.map(()=>'?').join(',')
        const rows = await this.db.all(`SELECT id, prev_status, order_number FROM service_orders WHERE id IN (${placeholders})`, ids)
        let ok = 0
        for (const r of (rows || [])) {
          const target = r?.prev_status && r.prev_status !== 'deleted' ? r.prev_status : 'new'
          try {
            await this.db.run(`UPDATE service_orders SET status = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [target, r.id])
            try {
              if (r && r.order_number) {
                await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: r.order_number, status: target }])
                }).catch(()=>{})
              }
            } catch (_) {}
            ok++
          } catch (_) {}
        }
        return res.json({ success: true, restored: ok })
      } catch (e) {
        console.error('❌ Restore batch failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // === Hard delete (permanent) single order ===
    this.app.delete('/api/desktop/orders/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId)
        const alsoRailway = String(req.query.alsoRailway || '0') === '1'
        const confirm = String(req.query.confirm || '0') === '1'
        if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
        if (!confirm) return res.status(400).json({ success: false, error: 'confirm=1 required' })

        // Read order_number before deletion
        const row = await this.db.get('SELECT order_number FROM service_orders WHERE id = ?', [orderId])
        if (!row) return res.status(404).json({ success: false, error: 'Not found' })

        // Best-effort: remote delete on Railway (admin if available), otherwise soft delete
        if (alsoRailway && row.order_number) {
          try {
            const base = RAILWAY_API_BASE.replace(/\/$/, '')
            const secret = String(process.env.DELETE_ADMIN_SECRET || '').trim()
            if (secret) {
              const headers = { 'X-Admin-Secret': secret }
              const r = await fetch(`${base}/sync/orders/by-number/${encodeURIComponent(row.order_number)}`, { method: 'DELETE', headers }).catch(()=>null)
              if (!r || !r.ok) {
                // Fallback: status=deleted (soft)
                await fetch(`${base}/sync/orders`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: row.order_number, status: 'deleted' }])
                }).catch(()=>{})
              }
            } else {
              // No admin secret – fallback to soft delete
              await fetch(`${base}/sync/orders`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: row.order_number, status: 'deleted' }])
              }).catch(()=>{})
            }
          } catch (_) { /* ignore */ }
        }

        // Robust, transactional hard delete to avoid FK errors
        try { await this.db.run('BEGIN') } catch (_) {}
        try {
          // Known dependencies first
          try { await this.db.run('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)', [orderId]) } catch (_) {}
          try { await this.db.run('DELETE FROM invoices WHERE order_id = ?', [orderId]) } catch (_) {}
          try { await this.db.run('DELETE FROM order_parts WHERE order_id = ?', [orderId]) } catch (_) {}
          try { await this.db.run('DELETE FROM time_entries WHERE order_id = ?', [orderId]) } catch (_) {}
          try { await this.db.run('DELETE FROM simple_invoices WHERE order_id = ?', [orderId]) } catch (_) {}
          // Some installations keep calendar events linked to orders
          try { await this.db.run('DELETE FROM calendar_events WHERE order_id = ?', [orderId]) } catch (_) {}

          // Discover any tables that reference service_orders via foreign keys and purge by mapped columns
          try {
            const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            for (const t of (tables || [])) {
              const tn = t && (t.name || t.Name)
              if (!tn || typeof tn !== 'string') continue
              if (tn === 'service_orders') continue
              try {
                const fks = await this.db.all(`PRAGMA foreign_key_list(${tn})`)
                const refs = (fks || []).filter(r => String(r.table || '').toLowerCase() === 'service_orders')
                for (const fk of refs) {
                  const fromCol = fk && (fk.from || fk.from_column || fk[3])
                  if (fromCol && typeof fromCol === 'string') {
                    try { await this.db.run(`DELETE FROM ${tn} WHERE ${fromCol} = ?`, [orderId]) } catch (_) {}
                  }
                }
              } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }

          // Finally remove the order row
          await this.db.run('DELETE FROM service_orders WHERE id = ?', [orderId])
          try { await this.db.run('COMMIT') } catch (_) {}
        } catch (e) {
          try { await this.db.run('ROLLBACK') } catch (_) {}
          throw e
        }
        return res.json({ success: true, deleted: 1 })
      } catch (e) {
        console.error('❌ Hard delete failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })
    // === Hard delete (permanent) batch by ids ===
    this.app.post('/api/desktop/orders/hard-delete-by-ids', async (req, res) => {
      try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(x => parseInt(x)).filter(Boolean) : []
        const alsoRailway = String(req.query.alsoRailway || '0') === '1'
        const confirm = String(req.query.confirm || '0') === '1'
        if (!ids.length) return res.status(400).json({ success: false, error: 'ids required' })
        if (!confirm) return res.status(400).json({ success: false, error: 'confirm=1 required' })

        // Collect order_numbers
        const placeholders = ids.map(() => '?').join(',')
        const rows = await this.db.all(`SELECT id, order_number FROM service_orders WHERE id IN (${placeholders})`, ids)
        const map = new Map((rows || []).map(r => [r.id, r.order_number]))

        if (alsoRailway) {
          const base = RAILWAY_API_BASE.replace(/\/$/, '')
          const secret = String(process.env.DELETE_ADMIN_SECRET || '').trim()
          const items = (rows || []).filter(r => r && r.order_number)
          if (items.length) {
            try {
              if (secret) {
                // Try admin hard delete per order_number; fall back to soft delete for any failures
                for (const r of items) {
                  try {
                    const headers = { 'X-Admin-Secret': secret }
                    const resp = await fetch(`${base}/sync/orders/by-number/${encodeURIComponent(r.order_number)}`, { method: 'DELETE', headers }).catch(()=>null)
                    if (!resp || !resp.ok) {
                      await fetch(`${base}/sync/orders`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: r.order_number, status: 'deleted' }])
                      }).catch(()=>{})
                    }
                  } catch (_) { /* skip one */ }
                }
              } else {
                // No admin secret – soft delete batch
                const payload = items.map(r => ({ order_number: r.order_number, status: 'deleted' }))
                await fetch(`${base}/sync/orders`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                }).catch(()=>{})
              }
            } catch (_) { /* ignore overall */ }
          }
        }

        // Insert tombstones to block future re-imports
        try {
          await this.db.run("CREATE TABLE IF NOT EXISTS deleted_tombstones (order_number TEXT PRIMARY KEY, deleted_at DATETIME, needs_remote_cleanup INTEGER DEFAULT 1)")
        } catch (_) {}
        for (const r of (rows || [])) {
          try {
            if (r && r.order_number) {
              await this.db.run("INSERT OR IGNORE INTO deleted_tombstones (order_number, deleted_at, needs_remote_cleanup) VALUES (?, CURRENT_TIMESTAMP, ?)",
                [String(r.order_number), alsoRailway ? 0 : 1])
            }
          } catch (_) {}
        }

        // Transaction per batch for safety
        try { await this.db.run('BEGIN') } catch (_) {}
        try {
          for (const id of ids) {
            // Known dependencies per id
            try { await this.db.run('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)', [id]) } catch (_) {}
            try { await this.db.run('DELETE FROM invoices WHERE order_id = ?', [id]) } catch (_) {}
            try { await this.db.run('DELETE FROM order_parts WHERE order_id = ?', [id]) } catch (_) {}
            try { await this.db.run('DELETE FROM time_entries WHERE order_id = ?', [id]) } catch (_) {}
            try { await this.db.run('DELETE FROM simple_invoices WHERE order_id = ?', [id]) } catch (_) {}
            try { await this.db.run('DELETE FROM calendar_events WHERE order_id = ?', [id]) } catch (_) {}

            // Generic FK-based purge
            try {
              const tables = await this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
              for (const t of (tables || [])) {
                const tn = t && (t.name || t.Name)
                if (!tn || typeof tn !== 'string' || tn === 'service_orders') continue
                try {
                  const fks = await this.db.all(`PRAGMA foreign_key_list(${tn})`)
                  const refs = (fks || []).filter(r => String(r.table || '').toLowerCase() === 'service_orders')
                  for (const fk of refs) {
                    const fromCol = fk && (fk.from || fk.from_column || fk[3])
                    if (fromCol && typeof fromCol === 'string') {
                      try { await this.db.run(`DELETE FROM ${tn} WHERE ${fromCol} = ?`, [id]) } catch (_) {}
                    }
                  }
                } catch (_) { /* ignore */ }
              }
            } catch (_) { /* ignore */ }

            try { await this.db.run('DELETE FROM service_orders WHERE id = ?', [id]) } catch (_) {}
          }
          try { await this.db.run('COMMIT') } catch (_) {}
        } catch (e) {
          try { await this.db.run('ROLLBACK') } catch (_) {}
          throw e
        }
        return res.json({ success: true, deleted: ids.length })
      } catch (e) {
        console.error('❌ Hard delete batch failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // === Hard delete (permanent) batch by order_numbers ===
    this.app.post('/api/desktop/orders/hard-delete-by-numbers', async (req, res) => {
      try {
        const numbers = Array.isArray(req.body?.order_numbers) ? req.body.order_numbers.map(x => String(x)).filter(Boolean) : []
        const alsoRailway = String(req.query.alsoRailway || '0') === '1'
        const confirm = String(req.query.confirm || '0') === '1'
        if (!numbers.length) return res.status(400).json({ success: false, error: 'order_numbers required' })
        if (!confirm) return res.status(400).json({ success: false, error: 'confirm=1 required' })

        // Remote delete first (admin if available), then local tombstone + purge
        if (alsoRailway) {
          const base = RAILWAY_API_BASE.replace(/\/$/, '')
          const secret = String(process.env.DELETE_ADMIN_SECRET || '').trim()
          try {
            for (const num of numbers) {
              try {
                if (secret) {
                  const headers = { 'X-Admin-Secret': secret }
                  const r = await fetch(`${base}/sync/orders/by-number/${encodeURIComponent(num)}`, { method: 'DELETE', headers }).catch(()=>null)
                  if (!r || !r.ok) {
                    await fetch(`${base}/sync/orders`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: num, status: 'deleted' }])
                    }).catch(()=>{})
                  }
                } else {
                  await fetch(`${base}/sync/orders`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ order_number: num, status: 'deleted' }])
                  }).catch(()=>{})
                }
              } catch (_) { /* skip */ }
            }
          } catch (_) { /* ignore */ }
        }

        // Ensure tombstones table
        try { await this.db.run("CREATE TABLE IF NOT EXISTS deleted_tombstones (order_number TEXT PRIMARY KEY, deleted_at DATETIME, needs_remote_cleanup INTEGER DEFAULT 1)") } catch (_) {}
        // Insert tombstones and delete local rows
        for (const num of numbers) {
          try { await this.db.run("INSERT OR IGNORE INTO deleted_tombstones (order_number, deleted_at, needs_remote_cleanup) VALUES (?, CURRENT_TIMESTAMP, ?)", [String(num), alsoRailway ? 0 : 1]) } catch (_) {}
          try { await this.db.run('DELETE FROM service_orders WHERE order_number = ?', [String(num)]) } catch (_) {}
        }
        return res.json({ success: true, deleted_numbers: numbers.length })
      } catch (e) {
        console.error('❌ Hard delete by numbers failed:', e)
        return res.status(500).json({ success: false, error: e?.message || 'Server error' })
      }
    })

    // ===== Pending changes proxy (Railway → Desktop operator approval) =====
    const fetchRailwayJson = async (path) => {
      const base = RAILWAY_API_BASE.replace(/\/$/, '')
      try {
        const resp = await fetch(`${base}${path}`)
        const text = await resp.text()
        let json
        if (!text) {
          json = {}
        } else {
          try { json = JSON.parse(text) } catch (_) { json = { raw: text } }
        }
        return { ok: resp.ok, status: resp.status, json }
      } catch (error) {
        return { ok: false, status: 0, json: { success: false, error: error?.message || 'fetch-failed' } }
      }
    }

    // List pending changes
    this.app.get('/api/railway/pending-changes', async (_req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/pending-changes`).catch(()=>null)
        const j = r && r.ok ? await r.json().catch(()=>({})) : null
        if (!j || j.success === false) return res.status(502).json({ success: false })
        return res.json({ success: true, items: j.items || [] })
      } catch (e) { return res.status(500).json({ success: false, error: e.message }) }
    })
    // Accept
    this.app.post('/api/railway/pending-changes/:id/accept', async (req, res) => {
      try {
        const id = parseInt(req.params.id)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/pending-changes/${id}/accept`, { method: 'POST' }).catch(()=>null)
        if (!r) {
          return res.status(502).json({ success: false, error: 'Failed to connect to Railway backend' })
        }
        const j = await r.json().catch(()=>({}))
        // Zachowaj oryginalny status i komunikat błędu z Railway
        if (!r.ok || !j.success) {
          return res.status(r.status || 502).json({ success: false, error: j.error || 'Unknown error', ...(j.entity ? { entity: j.entity, entity_id: j.entity_id } : {}) })
        }
        return res.json(j)
      } catch (e) { return res.status(500).json({ success: false, error: e.message }) }
    })
    // Reject
    this.app.post('/api/railway/pending-changes/:id/reject', async (req, res) => {
      try {
        const id = parseInt(req.params.id)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/pending-changes/${id}/reject`, { method: 'POST' }).catch(()=>null)
        const j = r && r.ok ? await r.json().catch(()=>({})) : null
        if (!j || j.success === false) return res.status(502).json({ success: false })
        return res.json(j)
      } catch (e) { return res.status(500).json({ success: false, error: e.message }) }
    })
    // Proxy: klient po ID lub external_id
    this.app.get('/api/railway/clients/:clientId', async (req, res) => {
      try {
        const clientId = String(req.params.clientId || '').trim()
        const externalId = req.query?.externalId ? String(req.query.externalId).trim() : ''
        if (!clientId) return res.status(400).json({ success: false, error: 'Invalid clientId' })
        let result = await fetchRailwayJson(`/clients/${encodeURIComponent(clientId)}`)
        if (!result.ok && externalId) {
          result = await fetchRailwayJson(`/clients/external/${encodeURIComponent(externalId)}`)
        }
        if (!result.ok) {
          return res.status(result.status || 502).json(result.json || { success: false })
        }
        return res.json(result.json || {})
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'client-proxy-failed' })
      }
    })
    this.app.get('/api/railway/clients/external/:externalId', async (req, res) => {
      try {
        const externalId = String(req.params.externalId || '').trim()
        if (!externalId) return res.status(400).json({ success: false, error: 'Invalid external id' })
        const result = await fetchRailwayJson(`/clients/external/${encodeURIComponent(externalId)}`)
        if (!result.ok) {
          return res.status(result.status || 502).json(result.json || { success: false })
        }
        return res.json(result.json || {})
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'client-external-proxy-failed' })
      }
    })

    // Proxy: urządzenie po ID lub external_id
    this.app.get('/api/railway/devices/:deviceId', async (req, res) => {
      try {
        const deviceId = String(req.params.deviceId || '').trim()
        const externalId = req.query?.externalId ? String(req.query.externalId).trim() : ''
        if (!deviceId) return res.status(400).json({ success: false, error: 'Invalid deviceId' })
        let result = await fetchRailwayJson(`/devices/${encodeURIComponent(deviceId)}`)
        if (!result.ok && externalId) {
          result = await fetchRailwayJson(`/devices/external/${encodeURIComponent(externalId)}`)
        }
        if (!result.ok) {
          return res.status(result.status || 502).json(result.json || { success: false })
        }
        return res.json(result.json || {})
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'device-proxy-failed' })
      }
    })

    this.app.get('/api/railway/devices/external/:externalId', async (req, res) => {
      try {
        const externalId = String(req.params.externalId || '').trim()
        if (!externalId) return res.status(400).json({ success: false, error: 'Invalid external id' })
        const result = await fetchRailwayJson(`/devices/external/${encodeURIComponent(externalId)}`)
        if (!result.ok) {
          return res.status(result.status || 502).json(result.json || { success: false })
        }
        return res.json(result.json || {})
      } catch (e) {
        return res.status(500).json({ success: false, error: e?.message || 'device-external-proxy-failed' })
      }
    })

    // Endpoint do wykonywania SQL (tylko dla debugowania)
    this.app.post('/api/debug/execute-sql', async (req, res) => {
      try {
        const { sql, params = [] } = req.body;
        
        if (!sql) {
          return res.status(400).json({ error: 'SQL query is required' });
        }
        
        console.log('🔧 Wykonuję SQL:', sql, 'z parametrami:', params);
        
        // Sprawdź czy to SELECT czy inne zapytanie
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
        
        let result;
        if (isSelect) {
          // Dla SELECT użyj all() aby zwrócić dane
          result = await this.db.all(sql, params);
        } else {
          // Dla innych zapytań użyj run()
          result = await this.db.run(sql, params);
        }
        
        console.log('✅ SQL wykonane pomyślnie:', result);
        res.json({ 
          success: true, 
          result,
          message: 'SQL executed successfully'
        });
        
      } catch (error) {
        console.error('❌ SQL execution error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Endpoint do inicjalizacji danych testowych
    this.app.post('/api/debug/init-test-data', async (req, res) => {
      try {
        // Dodaj technika testowego
        const technician = await this.db.run(`
          INSERT OR IGNORE INTO users (username, password_hash, full_name, role, email, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, ['technik1', '$2a$10$X8VcQUzK5v7QdD1CrO3A8uF8qW4nH2mT9jKpL6xR7sE9A1B3C4D5E6', 'Jan Technik', 'technician', 'technik1@serwis.pl', 1]);

        // Sprawdź ID technika
        const technicianRecord = await this.db.get('SELECT id FROM users WHERE username = ?', ['technik1']);
        const techId = technicianRecord ? technicianRecord.id : 2;

        // Przypisz zlecenia do technika
        await this.db.run('UPDATE service_orders SET assigned_user_id = ?, status = ? WHERE id IN (1, 2, 3)', [techId, 'new']);

        // Pokaż aktualne dane
        const updatedOrders = await this.db.all('SELECT id, assigned_user_id, status, order_number FROM service_orders');
        const users = await this.db.all('SELECT id, username, full_name, role FROM users');

        res.json({
          success: true,
          technician_id: techId,
          users: users,
          orders: updatedOrders,
          message: 'Dodano technika i przypisano zlecenia'
        });

      } catch (error) {
        console.error('❌ Init test data error:', error);
        res.status(500).json({ error: error.message });
      }
    });


    // Lista zleceń oczekujących na import z Railway (podgląd)
    this.app.get('/api/railway/pending-import', async (_req, res) => {
      try {
        const r = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/orders/pending-import`)
        const data = await r.json()
        if (!r.ok || !data.success) return res.status(502).json({ error: 'Railway fetch failed', details: data })
        res.json({ success: true, data: data.data || [] })
      } catch (error) {
        console.error('❌ Fetch pending-import failed:', error)
        res.status(500).json({ error: 'Fetch failed', details: error.message })
      }
    })

    // ===== Railway helpers: sync local spare_parts to Railway =====
    this.app.post('/api/railway/sync-parts', async (_req, res) => {
      try {
        const items = await this.db.all(`SELECT name, part_number, manufacturer, brand, price, description, model_compatibility, category FROM spare_parts ORDER BY name`)
        const payload = Array.isArray(items) ? items : []
        const resp = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload })
        })
        const json = await resp.json().catch(() => ({}))
        if (!resp.ok || !json.success) {
          return res.status(502).json({ success: false, error: 'Railway sync failed', details: json })
        }
        res.json({ success: true, upserts: json.upserts || 0 })
      } catch (error) {
        console.error('❌ Sync parts to Railway failed:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    })

    this.app.post('/api/railway/sync-service-categories', async (_req, res) => {
      try {
        const rows = await this.db.all(`
          SELECT id, code, name, description, parent_id, sort_order, is_active, created_at, updated_at
          FROM service_categories
          ORDER BY sort_order, name
        `)
        const items = Array.isArray(rows) ? rows.map(mapServiceCategoryRow).filter(Boolean) : []
        if (items.length) {
          await pushServiceCategoriesToRailway(items)
        }
        res.json({ success: true, upserts: items.length })
      } catch (error) {
        console.error('❌ Sync service categories to Railway failed:', error)
        res.status(500).json({ success: false, error: error.message })
      }
    })

    // ===== Railway helpers: export device to Railway =====
    this.app.post('/api/railway/export-device/:deviceId', async (req, res) => {
      try {
        const deviceId = parseInt(req.params.deviceId)
        if (!deviceId) return res.status(400).json({ success: false, error: 'Invalid deviceId' })
        const row = await this.db.get('SELECT * FROM devices WHERE id = ?', [deviceId])
        if (!row) return res.status(404).json({ success: false, error: 'Device not found' })
        const externalId = row.external_id && String(row.external_id).trim() !== ''
          ? row.external_id
          : `${this.installationId}:device:${row.id}`
        if (!row.external_id || String(row.external_id).trim() === '') {
          try {
            await this.db.run('UPDATE devices SET external_id = ? WHERE id = ?', [externalId, row.id])
          } catch (e) {
            console.log('[export-device] Unable to persist external_id for device', row.id, e?.message)
          }
        }
        let clientExternalId = null
        if (row.client_id) {
          try {
            const clientRow = await this.db.get('SELECT external_id FROM clients WHERE id = ?', [row.client_id])
            clientExternalId = clientRow && clientRow.external_id
              ? clientRow.external_id
              : `${this.installationId}:client:${row.client_id}`
            if (!clientRow || !clientRow.external_id) {
              try {
                await this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [clientExternalId, row.client_id])
              } catch (err) {
                console.log('[export-device] Unable to persist external_id for client', row.client_id, err?.message)
              }
            }
          } catch (err) {
            console.log('[export-device] Unable to read client external_id', err?.message)
            clientExternalId = `${this.installationId}:client:${row.client_id}`
          }
        }
        const payload = [{
          id: row.id,
          external_id: externalId,
          external_device_id: externalId,
          client_id: row.client_id || null,
          client_external_id: clientExternalId || null,
          external_client_id: clientExternalId || null,
          name: row.name || null,
          manufacturer: row.manufacturer || null,
          model: row.model || null,
          serial_number: row.serial_number || null,
          production_year: row.production_year || null,
          power_rating: row.power_rating || null,
          fuel_type: row.fuel_type || null,
          installation_date: row.installation_date || null,
          last_service_date: row.last_service_date || null,
          next_service_date: row.next_service_date || null,
          warranty_end_date: row.warranty_end_date || null,
          technical_data: row.technical_data || null,
          notes: row.notes || null,
          is_active: row.is_active == null ? 1 : row.is_active,
          updated_at: new Date().toISOString()
        }]
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/sync/devices`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || j.success === false) {
          return res.status(502).json({ success: false, error: 'Railway sync failed', details: j })
        }
        return res.json({ success: true, upserts: 1 })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // ===== Railway helpers: export local client(s) to Railway =====
    this.app.post('/api/railway/export-client/:clientId', async (req, res) => {
      try {
        const clientId = parseInt(req.params.clientId)
        if (!clientId) return res.status(400).json({ success: false, error: 'Invalid clientId' })
        const row = await this.db.get('SELECT * FROM clients WHERE id = ?', [clientId])
        if (!row) return res.status(404).json({ success: false, error: 'Client not found' })
        const externalId = row.external_id && String(row.external_id).trim() !== ''
          ? row.external_id
          : `${this.installationId}:client:${row.id}`
        if (!row.external_id || String(row.external_id).trim() === '') {
          try {
            await this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [externalId, row.id])
          } catch (e) {
            console.log('[export-client] Unable to persist external_id for client', row.id, e?.message)
          }
        }
        const payload = [{
          id: row.id,
          external_id: externalId,
          external_client_id: externalId,
          type: row.type || 'individual',
          first_name: row.first_name || null,
          last_name: row.last_name || null,
          company_name: row.company_name || null,
          email: row.email || null,
          phone: row.phone || null,
          address_street: row.address_street || null,
          address_city: row.address_city || null,
          address_postal_code: row.address_postal_code || null,
          address_country: row.address_country || 'PL',
          nip: row.nip || null,
          regon: row.regon || null,
          is_active: row.is_active == null ? 1 : row.is_active,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/sync/clients`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || j.success === false) {
          return res.status(502).json({ success: false, error: 'Railway sync failed', details: j })
        }
        return res.json({ success: true, upserts: 1 })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    this.app.post('/api/railway/export-clients', async (_req, res) => {
      try {
        const list = await this.db.all('SELECT * FROM clients WHERE is_active IS NULL OR is_active = 1')
        const payload = (list || []).map(row => {
          const externalId = (row.external_id && String(row.external_id).trim() !== '')
            ? row.external_id
            : `${this.installationId}:client:${row.id}`
          if (!row.external_id || String(row.external_id).trim() === '') {
            try {
              this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [externalId, row.id]).catch(()=>{})
            } catch (_) {}
          }
          return {
          id: row.id,
            external_id: externalId,
            external_client_id: externalId,
          type: row.type || 'individual',
          first_name: row.first_name || null,
          last_name: row.last_name || null,
          company_name: row.company_name || null,
          email: row.email || null,
          phone: row.phone || null,
          address_street: row.address_street || null,
          address_city: row.address_city || null,
          address_postal_code: row.address_postal_code || null,
          address_country: row.address_country || 'PL',
          nip: row.nip || null,
          regon: row.regon || null,
          is_active: row.is_active == null ? 1 : row.is_active,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
          }
        })
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/sync/clients`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || j.success === false) {
          return res.status(502).json({ success: false, error: 'Railway sync failed', details: j })
        }
        return res.json({ success: true, upserts: payload.length })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    this.app.post('/api/railway/export-devices', async (_req, res) => {
      try {
        const list = await this.db.all('SELECT * FROM devices WHERE is_active IS NULL OR is_active = 1')
        const payload = []
        const clientIds = new Set()
        for (const row of (list || [])) {
          if (row.client_id) clientIds.add(row.client_id)
        }
        const clientsMap = new Map()
        if (clientIds.size > 0) {
          const ids = Array.from(clientIds)
          const placeholders = ids.map(() => '?').join(',')
          try {
            const rows = await this.db.all(`SELECT id, external_id FROM clients WHERE id IN (${placeholders})`, ids)
            for (const r of (rows || [])) {
              if (!r) continue
              let ext = r.external_id && String(r.external_id).trim() !== '' ? r.external_id : `${this.installationId}:client:${r.id}`
              if (!r.external_id || String(r.external_id).trim() === '') {
                try { this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [ext, r.id]).catch(()=>{}) } catch (_) {}
              }
              clientsMap.set(r.id, ext)
            }
          } catch (err) {
            console.warn('[export-devices] Unable to prefetch client external IDs:', err?.message)
          }
        }
        for (const row of (list || [])) {
          const externalId = (row.external_id && String(row.external_id).trim() !== '')
            ? row.external_id
            : `${this.installationId}:device:${row.id}`
          if (!row.external_id || String(row.external_id).trim() === '') {
            try {
              this.db.run('UPDATE devices SET external_id = ? WHERE id = ?', [externalId, row.id]).catch(()=>{})
            } catch (_) {}
          }
          let clientExternalId = null
          if (row.client_id) {
            clientExternalId = clientsMap.get(row.client_id) || `${this.installationId}:client:${row.client_id}`
            if (!clientsMap.has(row.client_id)) {
              try {
                this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [clientExternalId, row.client_id]).catch(()=>{})
              } catch (_) {}
            }
          }
          payload.push({
            id: row.id,
            external_id: externalId,
            external_device_id: externalId,
            client_id: row.client_id || null,
            client_external_id: clientExternalId || null,
            external_client_id: clientExternalId || null,
            name: row.name || null,
            manufacturer: row.manufacturer || null,
            model: row.model || null,
            serial_number: row.serial_number || null,
            production_year: row.production_year || null,
            power_rating: row.power_rating || null,
            fuel_type: row.fuel_type || null,
            installation_date: row.installation_date || null,
            last_service_date: row.last_service_date || null,
            next_service_date: row.next_service_date || null,
            warranty_end_date: row.warranty_end_date || null,
            technical_data: row.technical_data || null,
            notes: row.notes || null,
            is_active: row.is_active == null ? 1 : row.is_active,
            updated_at: new Date().toISOString()
          })
        }
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/sync/devices`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || j.success === false) {
          return res.status(502).json({ success: false, error: 'Railway sync failed', details: j })
        }
        return res.json({ success: true, upserts: payload.length })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== Railway helpers: upload device file (forwarder) =====
    this.app.post('/api/railway/device-files/upload', async (req, res) => {
      try {
        const { deviceId, filePath, fileName, mimeType, fileType } = req.body || {}
        if (!deviceId || !filePath || !fileName) {
          return res.status(400).json({ success: false, error: 'Missing params' })
        }
        const fs = require('fs')
        let contentBase64 = ''
        try {
          const buf = fs.readFileSync(filePath)
          contentBase64 = buf.toString('base64')
        } catch (e) {
          return res.status(404).json({ success: false, error: 'File not found' })
        }
        const base = RAILWAY_API_BASE.replace(/\/$/, '')

        let remoteDeviceId = parseInt(deviceId)
        try {
          const localDevice = await this.db.get('SELECT external_id FROM devices WHERE id = ?', [parseInt(deviceId)])
          const externalId = localDevice && localDevice.external_id && String(localDevice.external_id).trim() !== ''
            ? String(localDevice.external_id).trim()
            : null
          if (externalId) {
            try {
              const lookup = await fetch(`${base}/devices/external/${encodeURIComponent(externalId)}`)
              if (lookup && lookup.ok) {
                const payload = await lookup.json().catch(() => ({}))
                const deviceRow = payload?.device || payload?.data || payload
                if (deviceRow && deviceRow.id) remoteDeviceId = Number(deviceRow.id)
              }
            } catch (err) {
              console.warn('[device-files] Unable to resolve remote device by external_id:', externalId, err?.message)
            }
          }
        } catch (lookupErr) {
          console.warn('[device-files] local device lookup failed:', lookupErr?.message)
        }

        if (!Number.isFinite(remoteDeviceId) || remoteDeviceId <= 0) {
          return res.status(400).json({ success: false, error: 'Unable to resolve remote device id' })
        }

        const r = await fetch(`${base}/devices/${remoteDeviceId}/files/upload-base64`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: fileName, mime_type: mimeType || null, content_base64: contentBase64, file_type: fileType || null })
        })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || j.success === false) {
          return res.status(502).json({ success: false, error: 'Railway upload failed', details: j })
        }
        return res.json({ success: true, id: j.id, public_url: j.public_url })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // Batch sync all device files of given device to Railway
    this.app.post('/api/railway/device-files/sync/:deviceId', async (req, res) => {
      try {
        const deviceId = parseInt(req.params.deviceId)
        if (!deviceId) return res.status(400).json({ success: false, error: 'Invalid deviceId' })
        const rows = await this.db.all('SELECT id, file_path, file_name, mime_type, file_type FROM device_files WHERE device_id = ?', [deviceId])
        let uploaded = 0
        for (const row of (rows || [])) {
          try {
            const fs = require('fs')
            const buf = fs.readFileSync(row.file_path)
            const contentBase64 = buf.toString('base64')
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/devices/${deviceId}/files/upload-base64`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_name: row.file_name, mime_type: row.mime_type || null, content_base64: contentBase64, file_type: row.file_type || null })
            })
            if (r.ok) uploaded++
          } catch (_) { /* skip one */ }
        }
        return res.json({ success: true, uploaded })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Proxy: pobierz zlecenia z Railway backend (dla monitora mobilnego)
    this.app.get('/api/railway/desktop/orders', async (_req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        console.log('🌐 Proxy /api/railway/desktop/orders →', base)
        // 1) Spróbuj endpointu zbiorczego
        try {
          const r = await fetch(`${base}/desktop/orders`)
          if (r.ok) {
            const data = await r.json().catch(() => [])
            // Lokalny filtr: usuń usunięte i numery z tombstone
            let filtered = Array.isArray(data) ? data.filter(o => String(o.status || '') !== 'deleted') : []
            try {
              const tombs = await this.db.all('SELECT order_number FROM deleted_tombstones')
              const block = new Set((tombs || []).map(t => String(t.order_number)))
              if (block.size) filtered = filtered.filter(o => !block.has(String(o.order_number)))
            } catch (_) {}
            return res.json(filtered)
          }
        } catch (_) { /* fallback */ }

        // 2) Fallback: pobierz techników i dla każdego weź jego zlecenia
        const techResp = await fetch(`${base}/technicians`).catch(() => null)
        const technicians = techResp && techResp.ok ? await techResp.json().catch(() => []) : []
        const list = []
        for (const t of (technicians || [])) {
          const id = t.id || t.user_id || t.technician_id
          if (!id) continue
          try {
            const r = await fetch(`${base}/desktop/orders/${id}`)
            if (!r.ok) continue
            const arr = await r.json().catch(() => [])
            if (Array.isArray(arr)) {
              let arr2 = arr.filter(o => String(o.status || '') !== 'deleted')
              try {
                const tombs = await this.db.all('SELECT order_number FROM deleted_tombstones')
                const block = new Set((tombs || []).map(t => String(t.order_number)))
                if (block.size) arr2 = arr2.filter(o => !block.has(String(o.order_number)))
              } catch (_) {}
              list.push(...arr2)
            }
          } catch (_) { /* ignore one tech fail */ }
        }
        if (list.length > 0) return res.json(list)

        // 3) Ostateczny fallback: globalna lista zleceń – ograniczamy do lokalnych techników
        try {
          const r = await fetch(`${base}/orders`)
          if (r.ok) {
            const all = await r.json().catch(() => [])
            const arr = Array.isArray(all) ? all : (all.data || [])
            // pobierz lokalnych techników (ID)
            let allowed = new Set()
            try {
              const rows = await this.db.all("SELECT id FROM users WHERE role IN ('technician','installer') AND is_active = 1")
              allowed = new Set((rows || []).map(r => r.id))
            } catch (_) {}
            const filtered = arr.filter(o => {
              const s = o && (o.status === 'in_progress' || o.status === 'W realizacji')
              const uid = o && (o.assigned_user_id || o.technician_id)
              const notDeleted = String(o.status || '') !== 'deleted'
              return notDeleted && s && (!allowed.size || allowed.has(uid))
            })
            try {
              const tombs = await this.db.all('SELECT order_number FROM deleted_tombstones')
              const block = new Set((tombs || []).map(t => String(t.order_number)))
              return res.json(filtered.filter(o => !block.has(String(o.order_number))))
            } catch (_) {
              return res.json(filtered)
            }
          }
        } catch (_) { /* ignore final fallback fail */ }

        return res.json([])
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Proxy: pojedyncze zlecenie wg ID (dla sprawdzania zdjęć)
    this.app.get('/api/railway/desktop/orders/by-id/:id', async (req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const id = parseInt(req.params.id)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
        let r = await fetch(`${base}/desktop/orders/by-id/${id}`)
        let data = await r.json().catch(() => ({}))
        if (r.ok && data && (data.success || data.order)) {
          return res.json(data)
        }

        // Fallback: ID różni się między desktop a Railway. Dopasuj po order_number i techniku.
        let local = null
        try {
          local = await this.db.get('SELECT order_number, assigned_user_id FROM service_orders WHERE id = ?', [id])
        } catch (_) { /* ignore */ }

        if (local && local.assigned_user_id) {
          try {
            const rr = await fetch(`${base}/desktop/orders/${local.assigned_user_id}`)
            const arr = await rr.json().catch(() => [])
            if (rr.ok && Array.isArray(arr)) {
              const match = arr.find(o => o && (o.order_number === local.order_number))
              if (match) {
                return res.json({ success: true, order: match })
              }
            }
          } catch (_) { /* ignore */ }
        }

        // Ostateczny fallback: globalna lista i dopasowanie po order_number
        if (local && local.order_number) {
          try {
            const rr = await fetch(`${base}/orders`)
            const all = await rr.json().catch(() => [])
            const list = Array.isArray(all) ? all : (all.data || [])
            const match = list.find(o => o && (o.order_number === local.order_number))
            if (match) {
              return res.json({ success: true, order: match })
            }
          } catch (_) { /* ignore */ }
        }

        // Jeśli nic nie znaleziono
        return res.status(404).json({ success: false, error: 'Not found' })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // Proxy (alias oczekiwany przez UI desktop): pojedyncze zlecenie wg ID
    // Utrzymuje zgodność z wywołaniami w OrdersList.vue: /api/desktop/orders/by-id/:id
    this.app.get('/api/desktop/orders/by-id/:id', async (req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const id = parseInt(req.params.id)
        if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

        // 1) Preferuj endpoint preferLatest (zwraca najnowszy rekord po order_number)
        let r = await fetch(`${base}/orders/${id}?preferLatest=true`).catch(() => null)
        let data = r ? await r.json().catch(() => ({})) : {}
        if (!(r && r.ok && data && (data.success || data.order))) {
          // 2) Fallback: by-id klasyczny
          r = await fetch(`${base}/desktop/orders/by-id/${id}`).catch(() => null)
          data = r ? await r.json().catch(() => ({})) : {}
        }

        // Porównaj z lokalnym mappingiem – jeśli numery się nie zgadzają, użyj fallbacku po order_number
        let local = null
        try {
          local = await this.db.get('SELECT order_number, assigned_user_id FROM service_orders WHERE id = ?', [id])
        } catch (_) { /* ignore */ }

        if (r && r.ok && data && (data.success || data.order)) {
          try {
            const remoteOrderNumber = data.order && data.order.order_number ? String(data.order.order_number) : null
            const localOrderNumber = local && local.order_number ? String(local.order_number) : null
            if (!localOrderNumber || (remoteOrderNumber && remoteOrderNumber === localOrderNumber)) {
              // Zwróć bezpiecznie, gdy ID jest zgodne lub nie mamy lokalnego numeru
              return res.json(data)
            }
            // W przeciwnym razie próbuj fallbacku po lokalnym numerze
          } catch (_) {
            return res.json(data)
          }
        }

        // Wykorzystaj tę samą logikę fallback co /api/railway/desktop/orders/by-id/:id
        if (local && local.assigned_user_id) {
          try {
            const rr = await fetch(`${base}/desktop/orders/${local.assigned_user_id}`)
            const arr = await rr.json().catch(() => [])
            if (rr.ok && Array.isArray(arr)) {
              const match = arr.find(o => o && (o.order_number === local.order_number))
              if (match) {
                return res.json({ success: true, order: match })
              }
            }
          } catch (_) { /* ignore */ }
        }

        if (local && local.order_number) {
          try {
            const rr = await fetch(`${base}/orders`)
            const all = await rr.json().catch(() => [])
            const list = Array.isArray(all) ? all : (all.data || [])
            const match = list.find(o => o && (o.order_number === local.order_number))
            if (match) {
              return res.json({ success: true, order: match })
            }
          } catch (_) { /* ignore */ }
        }

        return res.status(404).json({ success: false, error: 'Not found' })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // Proxy: pojedyncze zlecenie wg numeru (SRV-...)
    this.app.get('/api/railway/desktop/orders/by-number/:orderNumber', async (req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const num = String(req.params.orderNumber || '').trim()
        if (!num) return res.status(400).json({ success: false, error: 'Invalid order_number' })
        let r = await fetch(`${base}/desktop/orders/by-number/${encodeURIComponent(num)}`).catch(()=>null)
        let data = r ? await r.json().catch(() => ({})) : {}
        if (r && r.ok && data && (data.success || data.order)) {
          return res.json(data)
        }
        return res.status(404).json({ success: false, error: 'Not found' })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // Import pojedynczego urządzenia z Railway do lokalnej bazy
    this.app.post('/api/railway/import-device/:deviceId', async (req, res) => {
      try {
        const deviceIdRaw = String(req.params.deviceId || '').trim()
        if (!deviceIdRaw) return res.status(400).json({ success: false, error: 'Invalid deviceId' })
        const externalHint = req.query?.externalId ? String(req.query.externalId).trim() : ''
        let result = await fetchRailwayJson(`/devices/${encodeURIComponent(deviceIdRaw)}`)
        if (!result.ok && externalHint) {
          result = await fetchRailwayJson(`/devices/external/${encodeURIComponent(externalHint)}`)
        }
        if (!result.ok) {
          return res.status(result.status || 502).json({ success: false, error: 'Device not found on Railway', details: result.json || null })
        }
        const d = result.json?.device
        if (!d) {
          return res.status(502).json({ success: false, error: 'Invalid device payload' })
        }
        const externalId = d.external_id && String(d.external_id).trim() !== ''
          ? String(d.external_id).trim()
          : (d.id ? `${this.installationId}:device:${d.id}` : null)
        let targetRow = null
        if (externalId) {
          targetRow = await this.db.get('SELECT id FROM devices WHERE external_id = ?', [externalId])
        }
        if (!targetRow && d.id) {
          targetRow = await this.db.get('SELECT id FROM devices WHERE id = ?', [d.id])
        }
        const targetId = targetRow?.id
        const nowIso = new Date().toISOString()
        const clientExternal = d.client_external_id || d.external_client_id || null
        let mappedClientId = null
        if (clientExternal) {
          const clientRow = await this.db.get('SELECT id FROM clients WHERE external_id = ?', [clientExternal]).catch(()=>null)
          if (clientRow && clientRow.id) mappedClientId = clientRow.id
        }
        if (!mappedClientId && d.client_id) {
          const clById = await this.db.get('SELECT id FROM clients WHERE id = ?', [d.client_id]).catch(()=>null)
          if (clById && clById.id) mappedClientId = clById.id
        }
        const devicePayload = {
          manufacturer: d.manufacturer || d.brand || null,
          brand: d.brand || d.manufacturer || null,
          model: d.model || null,
          serial_number: d.serial_number || null,
          fuel_type: d.fuel_type || null,
          installation_date: d.installation_date || null,
          warranty_end_date: d.warranty_end_date || null,
          last_service_date: d.last_service_date || null,
          next_service_date: d.next_service_date || null,
          name: d.name || d.model || null,
          notes: d.notes || null,
          client_id: mappedClientId,
          external_id: externalId,
          updated_at: d.updated_at || nowIso,
          created_at: d.created_at || nowIso
        }
        if (targetId) {
          await this.db.run(
            `UPDATE devices SET
               manufacturer = ?,
               brand = ?,
               model = ?,
               serial_number = ?,
               fuel_type = ?,
               installation_date = ?,
               warranty_end_date = ?,
               last_service_date = ?,
               next_service_date = ?,
               name = ?,
               notes = ?,
               client_id = COALESCE(?, client_id),
               external_id = COALESCE(?, external_id),
               updated_at = ?
             WHERE id = ?`,
            [
              devicePayload.manufacturer,
              devicePayload.brand,
              devicePayload.model,
              devicePayload.serial_number,
              devicePayload.fuel_type,
              devicePayload.installation_date,
              devicePayload.warranty_end_date,
              devicePayload.last_service_date,
              devicePayload.next_service_date,
              devicePayload.name,
              devicePayload.notes,
              devicePayload.client_id,
              devicePayload.external_id,
              devicePayload.updated_at,
              targetId
            ]
          )
          return res.json({ success: true, id: targetId, mapped: true })
        } else {
          const insertId = d.id || undefined
          await this.db.run(
            `INSERT INTO devices (
               id, manufacturer, brand, model, serial_number, fuel_type,
               installation_date, warranty_end_date, last_service_date, next_service_date,
               name, notes, client_id, external_id, created_at, updated_at
             ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              insertId,
              devicePayload.manufacturer,
              devicePayload.brand,
              devicePayload.model,
              devicePayload.serial_number,
              devicePayload.fuel_type,
              devicePayload.installation_date,
              devicePayload.warranty_end_date,
              devicePayload.last_service_date,
              devicePayload.next_service_date,
              devicePayload.name,
              devicePayload.notes,
              devicePayload.client_id,
              devicePayload.external_id,
              devicePayload.created_at,
              devicePayload.updated_at
            ]
          )
          return res.json({ success: true, id: insertId || null, inserted: true })
        }
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })
    // ===== Import klienta/klientów z Railway do lokalnej bazy =====
    this.app.post('/api/railway/import-client/:clientId', async (req, res) => {
      try {
        const clientIdRaw = String(req.params.clientId || '').trim()
        if (!clientIdRaw) return res.status(400).json({ success: false, error: 'Invalid clientId' })
        const externalHint = req.query?.externalId ? String(req.query.externalId).trim() : ''
        let result = await fetchRailwayJson(`/clients/${encodeURIComponent(clientIdRaw)}`)
        if (!result.ok && externalHint) {
          result = await fetchRailwayJson(`/clients/external/${encodeURIComponent(externalHint)}`)
        }
        if (!result.ok) {
          return res.status(result.status || 502).json({ success: false, error: 'Railway fetch failed', details: result.json || null })
        }
        const c = result.json?.client
        if (!c) {
          return res.status(502).json({ success: false, error: 'Invalid client payload' })
        }
        const externalId = c.external_id && String(c.external_id).trim() !== ''
          ? String(c.external_id).trim()
          : (c.id ? `${this.installationId}:client:${c.id}` : null)
        let targetRow = null
        if (externalId) {
          targetRow = await this.db.get('SELECT id FROM clients WHERE external_id = ?', [externalId])
        }
        if (!targetRow && c.id) {
          targetRow = await this.db.get('SELECT id FROM clients WHERE id = ?', [c.id])
        }
        const targetId = targetRow?.id
        const nowIso = new Date().toISOString()
        const payload = {
          first_name: c.first_name || null,
          last_name: c.last_name || null,
          company_name: c.company_name || null,
          type: c.type || null,
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
          address_street: c.address_street || null,
          address_city: c.address_city || null,
          address_postal_code: c.address_postal_code || null,
          address_country: c.address_country || null,
          nip: c.nip || null,
          regon: c.regon || null,
          contact_person: c.contact_person || null,
          notes: c.notes || null,
          is_active: c.is_active == null ? null : (c.is_active ? 1 : 0),
          external_id: externalId,
          updated_at: c.updated_at || nowIso,
          created_at: c.created_at || nowIso
        }
        payload.company_name = payload.company_name || ((payload.first_name || '') + ' ' + (payload.last_name || '')).trim() || null
        payload.type = payload.type || 'individual'

        if (targetId) {
          await this.db.run(
            `UPDATE clients SET
               first_name = ?,
               last_name = ?,
               company_name = ?,
               type = ?,
               phone = ?,
               email = ?,
               address = ?,
               address_street = ?,
               address_city = ?,
               address_postal_code = ?,
               address_country = ?,
               nip = ?,
               regon = ?,
               contact_person = ?,
               notes = ?,
               is_active = CASE WHEN ? IS NULL THEN is_active ELSE ? END,
               external_id = COALESCE(?, external_id),
               updated_at = ?
             WHERE id = ?`,
            [
              payload.first_name,
              payload.last_name,
              payload.company_name,
              payload.type,
              payload.phone,
              payload.email,
              payload.address,
              payload.address_street,
              payload.address_city,
              payload.address_postal_code,
              payload.address_country,
              payload.nip,
              payload.regon,
              payload.contact_person,
              payload.notes,
              payload.is_active,
              payload.is_active,
              payload.external_id,
              payload.updated_at,
              targetId
            ]
          )
          return res.json({ success: true, id: targetId, mapped: true })
        } else {
          const insertId = c.id || undefined
          await this.db.run(
            `INSERT INTO clients (
               id, first_name, last_name, company_name, type, phone, email, address,
               address_street, address_city, address_postal_code, address_country,
               nip, regon, contact_person, notes, is_active, external_id, created_at, updated_at
             ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              insertId,
              payload.first_name,
              payload.last_name,
              payload.company_name || (payload.first_name || payload.last_name ? `${payload.first_name || ''} ${payload.last_name || ''}`.trim() : null),
              payload.type,
              payload.phone,
              payload.email,
              payload.address,
              payload.address_street,
              payload.address_city,
              payload.address_postal_code,
              payload.address_country,
              payload.nip,
              payload.regon,
              payload.contact_person,
              payload.notes,
              payload.is_active == null ? 1 : payload.is_active,
              payload.external_id,
              payload.created_at,
              payload.updated_at
            ]
          )
          return res.json({ success: true, id: insertId || null, inserted: true })
        }
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    this.app.post('/api/railway/import-clients', async (_req, res) => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const r = await fetch(`${base}/clients`)
        const j = await r.json().catch(()=>({}))
        if (!r.ok || !j.success || !Array.isArray(j.items)) {
          return res.status(502).json({ success: false, error: 'Railway fetch failed', details: j })
        }
        let upserts = 0
        for (const c of j.items) {
          try {
            const existing = await this.db.get('SELECT id FROM clients WHERE id = ?', [c.id])
            if (existing) {
              await this.db.run('UPDATE clients SET phone = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [c.phone || null, c.email || null, c.address || null, c.id])
            } else {
              await this.db.run('INSERT INTO clients (id, phone, email, address, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [c.id, c.phone || null, c.email || null, c.address || null])
            }
            upserts++
          } catch (_) { /* skip one */ }
        }
        return res.json({ success: true, upserts })
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
      }
    })

    // ===== SERVICE PROTOCOLS API =====
    const DEFAULT_ACCEPTANCE_CLAUSE = [
      '„Niniejszy protokół uważa się za zaakceptowany i wiążący dla stron, jeżeli w terminie 3 dni roboczych od daty jego doręczenia klient nie zgłosi pisemnych zastrzeżeń co do treści lub zakresu wykonanych czynności serwisowych.',
      '',
      'Brak zgłoszenia zastrzeżeń w tym terminie jest równoznaczny z potwierdzeniem wykonania usługi oraz akceptacją treści protokołu.',
      '',
      'Podstawa prawna: art. 60 i 61 Kodeksu cywilnego.”'
    ].join('\n')

    const DEFAULT_CHECK_ITEMS = [
      { id: 'air_flue', label: 'Kontrola przewodu powietrzno-spalinowego', checked: false },
      { id: 'gas_tightness', label: 'Kontrola szczelności instalacji gazowej', checked: false },
      { id: 'safety_valve', label: 'Sprawdzenie zadziałania zaworu bezpieczeństwa', checked: false },
      { id: 'akp_boiler', label: 'Sprawdzenie zadziałania AKP i A kotła', checked: false },
      { id: 'expansion_pressure', label: 'Pomiar ciśnienia w naczyniu przeponowym', checked: false },
      { id: 'burner_safety', label: 'Sprawdzenie zadziałania zabezpieczeń palnika', checked: false },
      { id: 'oil_tightness', label: 'Kontrola szczelności instalacji olejowej', checked: false },
      { id: 'cleaning', label: 'Czyszczenie wymiennika ciepła i palnika', checked: false }
    ]

    const parseSnapshotValue = (value) => {
      if (value == null) return null
      if (typeof value === 'object') return value
      try { return JSON.parse(value) } catch (err) {
        return { raw: String(value) }
      }
    }

    const boolFromAny = (value) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'string') return value === 'true' || value === '1'
      return false
    }

    const DIRECT_REMOVE_PROTOCOLS = String(process.env.DIRECT_REMOVE_PROTOCOLS || '0') === '1'

    const mapProtocolRow = (row) => {
      if (!row) return null
      return {
        ...row,
        pdf_uploaded: boolFromAny(row.pdf_uploaded),
        service_company_snapshot: parseSnapshotValue(row.service_company_snapshot),
        client_snapshot: parseSnapshotValue(row.client_snapshot),
        device_snapshot: parseSnapshotValue(row.device_snapshot),
        technician_snapshot: parseSnapshotValue(row.technician_snapshot),
        checks_snapshot: parseSnapshotValue(row.checks_snapshot),
        steps_snapshot: parseSnapshotValue(row.steps_snapshot),
        parts_snapshot: parseSnapshotValue(row.parts_snapshot)
      }
    }

    this.app.delete('/api/protocols/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        if (!id) return res.status(400).json({ success: false, error: 'invalid-id' })

        if (DIRECT_REMOVE_PROTOCOLS) {
          const result = await this.db.run('DELETE FROM service_protocols WHERE id = ?', [id])
          return res.json({ success: true, deleted: result?.changes || 0 })
        }

        await this.db.run(`UPDATE service_protocols
                            SET desktop_sync_status = 'archived',
                                updated_at = CURRENT_TIMESTAMP
                          WHERE id = ?`, [id])
        return res.json({ success: true, archived: 1 })
      } catch (error) {
        console.error('❌ Protocol delete error:', error)
        res.status(500).json({ success: false, error: 'protocol-delete-failed' })
      }
    })

    const fetchProtocolRow = async (protocolId) => {
      const row = await this.db.get(`
        SELECT sp.*, so.order_number, so.title AS order_title, so.completed_at, so.started_at,
               c.company_name AS client_company_name, c.first_name AS client_first_name, c.last_name AS client_last_name,
               d.name AS device_name
        FROM service_protocols sp
        LEFT JOIN service_orders so ON so.id = sp.order_id
        LEFT JOIN clients c ON c.id = sp.client_id
        LEFT JOIN devices d ON d.id = sp.device_id
        WHERE sp.id = ?
      `, [protocolId])
      return mapProtocolRow(row)
    }

    const fetchCompanyProfile = async () => {
      try {
        const base = RAILWAY_API_BASE.replace(/\/$/, '')
        const resp = await fetch(`${base}/company`, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        const json = await resp.json().catch(() => ({}))
        if (resp.ok && json && json.success && json.data) {
          return json.data
        }
      } catch (error) {
        console.warn('[protocols] company profile fetch failed:', error?.message || error)
      }
      return {
        name: '',
        nip: '',
        regon: '',
        address: '',
        email: '',
        phone: '',
        website: '',
        logo_base64: null,
        logo_mime: null
      }
    }

    const deriveCityFromAddress = (address) => {
      if (!address) return 'Czarnków'
      try {
        const parts = String(address).split(',').map(p => p.trim()).filter(Boolean)
        const candidate = parts.length ? parts[parts.length - 1] : address
        const match = candidate.match(/[A-Za-zĄĆĘŁŃÓŚŹŻ\-\s]+$/i)
        if (match && match[0]) {
          return match[0].trim()
        }
      } catch (_) {}
      return 'Czarnków'
    }

    const getClientDisplayName = (order) => {
      const pieces = []
      if (order.client_company_name) pieces.push(order.client_company_name)
      const person = [order.client_first_name, order.client_last_name].filter(Boolean).join(' ')
      if (person) pieces.push(person)
      return pieces.join(' – ').trim() || null
    }

    const gatherOrderContext = async (orderId) => {
      const order = await this.db.get(`
        SELECT so.*, 
               c.first_name AS client_first_name, c.last_name AS client_last_name, c.company_name AS client_company_name,
               c.type AS client_type, c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
               c.address_street AS client_address_street, c.address_city AS client_address_city,
               c.address_postal_code AS client_address_postal_code, c.address_country AS client_address_country,
               c.nip AS client_nip, c.regon AS client_regon, c.contact_person AS client_contact,
               d.name AS device_name, d.manufacturer AS device_manufacturer, d.model AS device_model,
               d.serial_number AS device_serial_number, d.production_year AS device_production_year,
               d.fuel_type AS device_fuel_type, d.power_rating AS device_power_rating,
               d.installation_date AS device_installation_date,
               u.full_name AS technician_full_name, u.email AS technician_email, u.phone AS technician_phone
        FROM service_orders so
        LEFT JOIN clients c ON c.id = so.client_id
        LEFT JOIN devices d ON d.id = so.device_id
        LEFT JOIN users u ON u.id = so.assigned_user_id
        WHERE so.id = ?
      `, [orderId])
      if (!order) return null

      const companyProfile = await fetchCompanyProfile()
      const companySnapshot = {
        name: companyProfile?.name || '',
        nip: companyProfile?.nip || '',
        regon: companyProfile?.regon || '',
        address: companyProfile?.address || '',
        email: companyProfile?.email || '',
        phone: companyProfile?.phone || '',
        website: companyProfile?.website || '',
        city: deriveCityFromAddress(companyProfile?.address || ''),
        logo_base64: companyProfile?.logo_base64 || null,
        logo_mime: companyProfile?.logo_mime || null
      }

      const clientSnapshot = order.client_id ? {
        id: order.client_id,
        display_name: getClientDisplayName(order),
        first_name: order.client_first_name || '',
        last_name: order.client_last_name || '',
        company_name: order.client_company_name || '',
        type: order.client_type || 'individual',
        email: order.client_email || '',
        phone: order.client_phone || '',
        address: order.client_address || '',
        address_street: order.client_address_street || '',
        address_city: order.client_address_city || '',
        address_postal_code: order.client_address_postal_code || '',
        address_country: order.client_address_country || '',
        nip: order.client_nip || '',
        regon: order.client_regon || '',
        contact_person: order.client_contact || ''
      } : null

      const deviceSnapshot = order.device_id ? {
        id: order.device_id,
        name: order.device_name || '',
        manufacturer: order.device_manufacturer || '',
        model: order.device_model || '',
        serial_number: order.device_serial_number || '',
        production_year: order.device_production_year || '',
        fuel_type: order.device_fuel_type || '',
        power_rating: order.device_power_rating || '',
        installation_date: order.device_installation_date || null
      } : null

      const technicianSnapshot = order.assigned_user_id ? {
        id: order.assigned_user_id,
        full_name: order.technician_full_name || '',
        email: order.technician_email || '',
        phone: order.technician_phone || ''
      } : null

      const partsRows = await this.db.all(`
        SELECT op.id, op.quantity, op.unit_price, op.total_price,
               COALESCE(sp.name, 'Nieznana część') AS name,
               COALESCE(sp.part_number, '') AS part_number,
               sp.manufacturer, sp.brand
        FROM order_parts op
        LEFT JOIN spare_parts sp ON sp.id = op.part_id
        WHERE op.order_id = ?
        ORDER BY COALESCE(sp.name, 'Nieznana część')
      `, [orderId])

      const partsSnapshot = (partsRows || []).map(row => ({
        id: row.id,
        name: row.name,
        part_number: row.part_number,
        manufacturer: row.manufacturer || '',
        brand: row.brand || '',
        quantity: row.quantity || 0,
        unit_price: row.unit_price || 0,
        total_price: row.total_price || (row.unit_price ? row.unit_price * (row.quantity || 0) : 0)
      }))

      const partsText = (() => {
        const segments = []
        const seen = new Set()
        const push = (text) => {
          const norm = String(text || '').replace(/\s+/g, ' ').trim()
          if (!norm) return
          const key = norm.toLowerCase()
          if (seen.has(key)) return
          seen.add(key)
          segments.push(norm)
        }
        if (order.parts_used) {
          String(order.parts_used).split(/[,;\n]+/).forEach(push)
        }
        for (const part of partsSnapshot) {
          const display = `${part.name || ''}${part.part_number ? ` ${part.part_number}` : ''}`.trim()
          push(display)
        }
        return segments.length ? segments.join(', ') : ''
      })()

      return {
        order,
        companySnapshot,
        clientSnapshot,
        deviceSnapshot,
        technicianSnapshot,
        partsSnapshot,
        partsText
      }
    }

    this.app.get('/api/protocols', async (req, res) => {
       try {
         const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
         const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
         const orderIdFilter = req.query.orderId ? parseInt(req.query.orderId, 10) : null
         const sql = `
           SELECT sp.*, so.order_number, so.title AS order_title, so.completed_at,
                  c.company_name AS client_company_name, c.first_name AS client_first_name, c.last_name AS client_last_name,
                  d.name AS device_name
           FROM service_protocols sp
           LEFT JOIN service_orders so ON so.id = sp.order_id
           LEFT JOIN clients c ON c.id = sp.client_id
           LEFT JOIN devices d ON d.id = sp.device_id
           ${orderIdFilter ? 'WHERE sp.order_id = ?' : ''}
           ORDER BY datetime(sp.created_at) DESC, sp.id DESC
           LIMIT ? OFFSET ?
         `
         const rows = orderIdFilter
           ? await this.db.all(sql, [orderIdFilter, limit, offset])
           : await this.db.all(sql, [limit, offset])
         const data = (rows || []).map(mapProtocolRow)
         res.json({ success: true, data, pagination: { limit, offset, count: data.length } })
       } catch (error) {
         console.error('❌ Protocols list error:', error)
         res.status(500).json({ success: false, error: 'protocols-list-failed' })
       }
     })

    this.app.get('/api/protocols/defaults', (req, res) => {
      try {
        console.log('[protocols] defaults requested')
        res.json({
          success: true,
          defaults: {
            checks: DEFAULT_CHECK_ITEMS.map(item => ({ ...item })),
            acceptanceClause: DEFAULT_ACCEPTANCE_CLAUSE
          }
        })
      } catch (error) {
        res.status(500).json({ success: false, error: 'defaults-failed' })
      }
    })

    this.app.get('/api/protocols/context/:orderId', async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId, 10)
        if (!orderId) return res.status(400).json({ success: false, error: 'invalid-id' })
        const context = await gatherOrderContext(orderId)
        if (!context) return res.status(404).json({ success: false, error: 'order-not-found' })
        res.json({
          success: true,
          context: {
            order: context.order,
            company: context.companySnapshot,
            client: context.clientSnapshot,
            device: context.deviceSnapshot,
            technician: context.technicianSnapshot,
            parts: context.partsSnapshot,
            partsText: context.partsText,
            defaultChecks: DEFAULT_CHECK_ITEMS.map(item => ({ ...item }))
          }
        })
      } catch (error) {
        console.error('❌ Protocol context error:', error)
        res.status(500).json({ success: false, error: 'context-failed' })
      }
    })

    this.app.get('/api/protocols/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        if (!id) return res.status(400).json({ success: false, error: 'invalid-id' })
        const protocol = await fetchProtocolRow(id)
        if (!protocol) return res.status(404).json({ success: false, error: 'not-found' })
        res.json({ success: true, protocol })
      } catch (error) {
        console.error('❌ Protocol get error:', error)
        res.status(500).json({ success: false, error: 'protocol-get-failed' })
      }
    })
    this.app.post('/api/protocols', async (req, res) => {
      try {
        const body = req.body || {}
        const orderId = parseInt(body.orderId, 10)
        if (!orderId) return res.status(400).json({ success: false, error: 'orderId-required' })

        const context = await gatherOrderContext(orderId)
        if (!context) return res.status(404).json({ success: false, error: 'order-not-found' })

        const nowIso = new Date().toISOString()
        const issuedAt = body.issuedAt ? new Date(body.issuedAt).toISOString() : (context.order.completed_at || nowIso)
        const templateName = String(body.templateName || 'Standardowy protokół')
        const templateVersion = parseInt(body.templateVersion, 10) || 1
        const summaryText = typeof body.summaryText === 'string' ? body.summaryText : ''
        const notes = body.notes != null ? String(body.notes) : (context.order.notes || '')
        const acceptanceClause = body.acceptanceClause ? String(body.acceptanceClause) : DEFAULT_ACCEPTANCE_CLAUSE

        const incomingChecks = body.checks_snapshot || body.checks || body.checklist || null
        const checksItems = Array.isArray(incomingChecks?.items)
          ? incomingChecks.items
          : Array.isArray(incomingChecks)
            ? incomingChecks
            : DEFAULT_CHECK_ITEMS.map(item => ({ ...item }))
        const installationMeta = incomingChecks?.installation || body.installation || {
          fuelType: body.installationFuel || 'gaz',
          sealed: body.installationSealed !== undefined ? !!body.installationSealed : true
        }
        const extra = incomingChecks?.extra || body.extra || null
        const checksSnapshot = { installation: installationMeta, items: checksItems, extra }

        const stepsSnapshot = body.steps_snapshot || body.steps || body.customSteps || []

        const insertResult = await this.db.run(`
          INSERT INTO service_protocols (
            order_id, technician_id, client_id, device_id,
            template_name, template_version, issued_at, created_at, updated_at,
            desktop_sync_status,
            service_company_snapshot, client_snapshot, device_snapshot, technician_snapshot,
            checks_snapshot, steps_snapshot, parts_snapshot,
            summary_text, notes, acceptance_clause,
            pdf_filename, local_pdf_path, pdf_uploaded
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
          context.order.id,
          context.order.assigned_user_id || null,
          context.order.client_id || null,
          context.order.device_id || null,
          templateName,
          templateVersion,
          issuedAt,
          nowIso,
          nowIso,
          'pending',
          JSON.stringify(context.companySnapshot),
          context.clientSnapshot ? JSON.stringify(context.clientSnapshot) : null,
          context.deviceSnapshot ? JSON.stringify(context.deviceSnapshot) : null,
          context.technicianSnapshot ? JSON.stringify(context.technicianSnapshot) : null,
          JSON.stringify(checksSnapshot),
          stepsSnapshot ? JSON.stringify(stepsSnapshot) : null,
          JSON.stringify({ parts: context.partsSnapshot, partsText: context.partsText }),
          summaryText,
          notes,
          acceptanceClause,
          null,
          null
        ])

        const protocolId = insertResult?.id
        const protocol = protocolId ? await fetchProtocolRow(protocolId) : null
        res.json({ success: true, protocolId, protocol })
      } catch (error) {
        console.error('❌ Protocol create error:', error)
        res.status(500).json({ success: false, error: 'protocol-create-failed' })
      }
    })
    this.app.put('/api/protocols/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        if (!id) return res.status(400).json({ success: false, error: 'invalid-id' })
        const exists = await this.db.get('SELECT id FROM service_protocols WHERE id = ?', [id])
        if (!exists) return res.status(404).json({ success: false, error: 'not-found' })

        const body = req.body || {}
        const sets = []
        const values = []
        const pushJson = (column, value) => {
          if (value === undefined) return
          sets.push(`${column} = ?`)
          values.push(value == null ? null : JSON.stringify(value))
        }

        if (body.templateName !== undefined) {
          sets.push('template_name = ?')
          values.push(String(body.templateName))
        }
        if (body.templateVersion !== undefined) {
          sets.push('template_version = ?')
          values.push(parseInt(body.templateVersion, 10) || 1)
        }
        if (body.issuedAt !== undefined) {
          sets.push('issued_at = ?')
          values.push(body.issuedAt ? new Date(body.issuedAt).toISOString() : null)
        }
        if (body.summaryText !== undefined) {
          sets.push('summary_text = ?')
          values.push(String(body.summaryText || ''))
        }
        if (body.notes !== undefined) {
          sets.push('notes = ?')
          values.push(String(body.notes || ''))
        }
        if (body.acceptanceClause !== undefined) {
          sets.push('acceptance_clause = ?')
          values.push(String(body.acceptanceClause || ''))
        }
        if (body.pdfFilename !== undefined) {
          sets.push('pdf_filename = ?')
          values.push(body.pdfFilename || null)
        }
        if (body.localPdfPath !== undefined) {
          sets.push('local_pdf_path = ?')
          values.push(body.localPdfPath || null)
        }
        if (body.pdfUploaded !== undefined) {
          sets.push('pdf_uploaded = ?')
          values.push(boolFromAny(body.pdfUploaded) ? 1 : 0)
        }
        if (body.desktopSyncStatus !== undefined) {
          sets.push('desktop_sync_status = ?')
          values.push(String(body.desktopSyncStatus || 'pending'))
        }

        if (body.serviceCompanySnapshot !== undefined) {
          pushJson('service_company_snapshot', body.serviceCompanySnapshot)
        }
        if (body.clientSnapshot !== undefined) {
          pushJson('client_snapshot', body.clientSnapshot)
        }
        if (body.deviceSnapshot !== undefined) {
          pushJson('device_snapshot', body.deviceSnapshot)
        }
        if (body.technicianSnapshot !== undefined) {
          pushJson('technician_snapshot', body.technicianSnapshot)
        }
        if (body.checksSnapshot !== undefined || body.checks !== undefined || body.checklist !== undefined) {
          pushJson('checks_snapshot', body.checksSnapshot || body.checks || body.checklist || null)
        }
        if (body.stepsSnapshot !== undefined || body.steps !== undefined || body.customSteps !== undefined) {
          pushJson('steps_snapshot', body.stepsSnapshot || body.steps || body.customSteps || null)
        }
        if (body.partsSnapshot !== undefined) {
          pushJson('parts_snapshot', body.partsSnapshot)
        }

        const resetSync = body.touchSync === false ? false : true
        if (resetSync && body.desktopSyncStatus === undefined) {
          sets.push(`desktop_sync_status = 'pending'`)
        }

        if (!sets.length) {
          return res.json({ success: true, updated: false })
        }

        sets.push('updated_at = ?')
        values.push(new Date().toISOString())
        values.push(id)

        await this.db.run(`UPDATE service_protocols SET ${sets.join(', ')} WHERE id = ?`, values)
        const protocol = await fetchProtocolRow(id)
        res.json({ success: true, updated: true, protocol })
      } catch (error) {
        console.error('❌ Protocol update error:', error)
        res.status(500).json({ success: false, error: 'protocol-update-failed' })
      }
    })

    this.app.post('/api/railway/export-protocol/:protocolId', async (req, res) => {
       try {
         const protocolId = parseInt(req.params.protocolId, 10)
         if (!protocolId) return res.status(400).json({ success: false, error: 'invalid-id' })
         const protocol = await fetchProtocolRow(protocolId)
         if (!protocol) return res.status(404).json({ success: false, error: 'not-found' })
 
         let pdfBase64 = null
         if (protocol.local_pdf_path) {
           try {
             const buffer = await require('fs/promises').readFile(protocol.local_pdf_path)
             pdfBase64 = buffer.toString('base64')
           } catch (err) {
             console.warn('[protocol-export] pdf read failed:', err?.message || err)
           }
         }
 
         const payload = {
           protocol: {
             id: protocol.id,
             order_id: protocol.order_id,
             technician_id: protocol.technician_id,
             client_id: protocol.client_id,
             device_id: protocol.device_id,
             template_name: protocol.template_name,
             template_version: protocol.template_version,
             issued_at: protocol.issued_at,
             created_at: protocol.created_at,
             updated_at: protocol.updated_at,
             acceptance_clause: protocol.acceptance_clause,
             summary_text: protocol.summary_text,
             notes: protocol.notes,
             parts_snapshot: protocol.parts_snapshot || null,
             checks_snapshot: protocol.checks_snapshot || null,
             steps_snapshot: protocol.steps_snapshot || null,
             service_company_snapshot: protocol.service_company_snapshot || null,
             client_snapshot: protocol.client_snapshot || null,
             device_snapshot: protocol.device_snapshot || null,
             technician_snapshot: protocol.technician_snapshot || null
           },
           pdf: pdfBase64 ? {
             filename: protocol.pdf_filename || `protokol_${protocol.order_id || protocol.id}.pdf`,
             base64: pdfBase64
           } : null
         }
 
         const base = RAILWAY_API_BASE.replace(/\/$/, '')
         const response = await fetch(`${base}/protocols`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
         })
         const json = await response.json().catch(() => ({}))
         if (!response.ok || !json || json.success !== true) {
           throw new Error(json?.error || `Remote error (${response.status})`)
         }
 
         const remoteId = json?.data?.id || null
         const remoteUrl = json?.data?.url || null
         const pdfStored = json?.data?.pdfStored === true
 
         await this.db.run(
           `UPDATE service_protocols SET desktop_sync_status = 'sent', remote_id = COALESCE(?, remote_id), remote_url = COALESCE(?, remote_url), pdf_uploaded = CASE WHEN ? THEN 1 ELSE pdf_uploaded END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
           [remoteId, remoteUrl, pdfStored, protocolId]
         )
 
         res.json({ success: true, data: json?.data || null })
       } catch (error) {
         console.error('❌ Protocol export error:', error)
         res.status(500).json({ success: false, error: error?.message || 'protocol-export-failed' })
       }
     })

    // Koniec setupRoutes
  }

  // ===== ZARZĄDZANIE TIMERAMI PRACY =====
  
  startWorkTimer(orderId) {
    const startTime = Date.now();
    this.activeOrders.set(orderId, {
      startTime,
      timer: setInterval(() => {
        // Timer tick - można wykorzystać do real-time updates
      }, 60000) // Co minutę
    });
  }

  stopWorkTimer(orderId) {
    const timer = this.activeOrders.get(orderId);
    if (timer) {
      clearInterval(timer.timer);
      this.activeOrders.delete(orderId);
    }
  }

  getElapsedTime(orderId) {
    const timer = this.activeOrders.get(orderId);
    if (!timer) return 0;
    
    return Math.floor((Date.now() - timer.startTime) / 1000); // w sekundach
  }

  // Powiadomienie o zmianie zlecenia
  notifyOrderUpdate(orderId, updateData) {
    // Można dodać WebSocket lub Server-Sent Events dla real-time updates
    console.log(`🔄 Aktualizacja zlecenia ${orderId}:`, updateData);
    // Best-effort: powiadom Railway PWA przez SSE notify
    try {
      const base = RAILWAY_API_BASE.replace(/\/$/, '')
      fetch(`${base}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'order.updated', data: { orderId, update: updateData } }) }).catch(()=>{})
    } catch (_) {}
  }

  async dedupeClientsByExternalId() {
    try {
      const rows = await this.db.all(`SELECT external_id, GROUP_CONCAT(id) AS ids
                                      FROM clients
                                     WHERE external_id IS NOT NULL
                                       AND TRIM(external_id) <> ''
                                     GROUP BY external_id
                                    HAVING COUNT(*) > 1`)
      if (!Array.isArray(rows) || rows.length === 0) return
      for (const row of rows) {
        const ids = String(row.ids || '')
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter(Boolean)
          .sort((a, b) => a - b)
        if (!ids.length) continue
        const keep = ids.shift()
        if (!keep) continue
        try { await this.db.run('BEGIN TRANSACTION') } catch (_) {}
        try {
          for (const dupId of ids) {
            await this.db.run('UPDATE service_orders SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE devices SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE simple_invoices SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE invoices SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE calendar_events SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE service_protocols SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE client_history SET client_id = ? WHERE client_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('DELETE FROM clients WHERE id = ?', [dupId]).catch(()=>{})
          }
          await this.db.run('COMMIT')
          console.log(`[dedupe] scalono klienta external_id=${row.external_id} -> ID ${keep} (usunięto ${ids.length})`)
        } catch (err) {
          await this.db.run('ROLLBACK').catch(()=>{})
          console.warn(`[dedupe] błąd scalania klientów external_id=${row.external_id}:`, err?.message || err)
        }
      }
    } catch (err) {
      console.warn('[dedupe] clients error:', err?.message || err)
    }
  }

  async dedupeDevicesByExternalId() {
    try {
      const rows = await this.db.all(`SELECT external_id, GROUP_CONCAT(id) AS ids
                                      FROM devices
                                     WHERE external_id IS NOT NULL
                                       AND TRIM(external_id) <> ''
                                     GROUP BY external_id
                                    HAVING COUNT(*) > 1`)
      if (!Array.isArray(rows) || rows.length === 0) return
      for (const row of rows) {
        const ids = String(row.ids || '')
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter(Boolean)
          .sort((a, b) => a - b)
        if (!ids.length) continue
        const keep = ids.shift()
        if (!keep) continue
        try { await this.db.run('BEGIN TRANSACTION') } catch (_) {}
        try {
          for (const dupId of ids) {
            await this.db.run('UPDATE service_orders SET device_id = ? WHERE device_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE device_files SET device_id = ? WHERE device_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('UPDATE service_protocols SET device_id = ? WHERE device_id = ?', [keep, dupId]).catch(()=>{})
            await this.db.run('DELETE FROM devices WHERE id = ?', [dupId]).catch(()=>{})
          }
          await this.db.run('COMMIT')
          console.log(`[dedupe] scalono urządzenie external_id=${row.external_id} -> ID ${keep} (usunięto ${ids.length})`)
        } catch (err) {
          await this.db.run('ROLLBACK').catch(()=>{})
          console.warn(`[dedupe] błąd scalania urządzeń external_id=${row.external_id}:`, err?.message || err)
        }
      }
    } catch (err) {
      console.warn('[dedupe] devices error:', err?.message || err)
    }
  }

  async dedupeExternalEntityConflicts() {
    await this.dedupeClientsByExternalId()
    await this.dedupeDevicesByExternalId()
  }

  // ===== ZARZĄDZANIE SERVEREM =====

  scheduleInitialExports(port) {
    if (this.initialExportsScheduled) return;
    this.initialExportsScheduled = true;
    setTimeout(() => {
      const base = `http://127.0.0.1:${port}`;
      const makeOpts = () => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      fetch(`${base}/api/railway/export-clients`, makeOpts()).then(res => {
        if (res?.ok) {
          console.log('✅ Initial client export scheduled');
        } else {
          console.warn('⚠️ Initial client export failed', res?.status);
        }
      }).catch(e => console.warn('⚠️ Initial client export error:', e?.message));
      fetch(`${base}/api/railway/export-devices`, makeOpts()).then(res => {
        if (res?.ok) {
          console.log('✅ Initial device export scheduled');
        } else {
          console.warn('⚠️ Initial device export failed', res?.status);
        }
      }).catch(e => console.warn('⚠️ Initial device export error:', e?.message));
    }, 2000);
  }
  
  start(port = 5174) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, '0.0.0.0', (error) => {
          if (error) {
            console.error('❌ Błąd uruchamiania API servera:', error)
            reject(error)
            return
          }
          console.log(`✅ API server uruchomiony na porcie ${port}`)
          this.dedupeExternalEntityConflicts().catch(err => {
            console.warn('[dedupe] init failed:', err?.message || err)
          })
          this.scheduleInitialExports(port)
          this.seedPendingOrderRelinks()

          // Auto-import zleceń z Railway (co 30s), aby zdjęcia trafiały do galerii w desktopie - NAPRAWIONY
          const autoImporter = async () => {
            try {
              const r = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/orders/pending-import`)
              if (!r.ok) {
                console.warn(`⚠️ [IMPORT] Railway pending-import HTTP ${r.status}`)
                return
              }
              const data = await r.json().catch(()=>({}))
              const list = Array.isArray(data?.data) ? data.data : []
              
              if (list.length === 0) return // Brak zleceń do importu
              
              console.log(`🔄 [IMPORT] Railway→Desktop: ${list.length} zleceń do importu`)
              
              let successCount = 0
              let failCount = 0
              
              for (const o of list) {
                const id = o.id || o.order_id
                if (!id) continue
                
                try {
                  const importResp = await fetch(`http://127.0.0.1:${port}/api/railway/import-order/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markImported: true })
                  })
                  
                  if (importResp && importResp.ok) {
                    successCount++
                    console.log(`✅ [IMPORT] Zaimportowano zlecenie ID ${id} (${successCount}/${list.length})`)
                  } else {
                    failCount++
                    console.warn(`⚠️ [IMPORT] Błąd importu zlecenia ID ${id}: HTTP ${importResp?.status || 'unknown'}`)
                  }
                } catch (e) {
                  failCount++
                  console.warn(`❌ [IMPORT] Błąd importu zlecenia ID ${id}:`, e?.message)
                }
              }
              
              if (successCount > 0 || failCount > 0) {
                console.log(`🎯 [IMPORT] Zakończono: ${successCount} sukces, ${failCount} błędów`)
              }
            } catch (e) {
              console.error('❌ [IMPORT] Krytyczny błąd autoImporter:', e?.message)
            }
          }
          // Domyślnie WŁĄCZ auto-import z Railway; ustaw AUTO_IMPORT_ENABLED=0 aby wyłączyć
          if (String(process.env.AUTO_IMPORT_ENABLED ?? '1') === '1') {
            setInterval(autoImporter, 30000) // Co 30 sekund
            setTimeout(autoImporter, 5000)   // Start po 5 sekundach
          } else {
            console.log('⏸️  [IMPORT] Auto-import z Railway wyłączony (ustaw AUTO_IMPORT_ENABLED=1 aby włączyć)')
          }

          // Okresowy sync danych referencyjnych (users/devices/clients) → Railway,
          // aby zmiany z desktopu były widoczne w mobilnej aplikacji także bez pending orders
          const autoSyncReferenceData = async () => {
            try {
              const base = RAILWAY_API_BASE.replace(/\/$/, '')
              try {
                const users = await this.db.all('SELECT id, username, full_name, email, role, is_active, phone, mobile_pin_hash FROM users')
                await fetch(`${base}/sync/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users || []) })
              } catch (_) {}
              try {
                const devices = await this.db.all('SELECT * FROM devices')
                await fetch(`${base}/sync/devices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(devices || []) })
              } catch (_) {}
              try {
                const clients = await this.db.all('SELECT * FROM clients')
                await fetch(`${base}/sync/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clients || []) })
              } catch (_) {}
            } catch (_) { /* silent */ }
          }
          setInterval(autoSyncReferenceData, 120000)
          setTimeout(autoSyncReferenceData, 7000)

          // Auto-export lokalnych zleceń (assigned) do Railway – NAPRAWIONY z retry i logowaniem
          const autoExporter = async () => {
            try {
              // Pobierz zlecenia oczekujące na wysyłkę
              const pending = await this.db.all(`
                SELECT *
                FROM service_orders
                WHERE assigned_user_id IS NOT NULL
                  AND (desktop_sync_status IS NULL OR desktop_sync_status <> 'sent')
                ORDER BY updated_at DESC
                LIMIT 20
              `)
              if (!Array.isArray(pending) || pending.length === 0) return

              console.log(`🔄 [SYNC] Desktop→Railway: ${pending.length} zleceń do synchronizacji`)

              // Dla stabilności – zsynchronizuj użytkowników, urządzenia i klientów (best-effort)
              try {
                const users = await this.db.all('SELECT id, username, full_name, email, role, is_active, phone, mobile_pin_hash FROM users')
                const userResp = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/users`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users || [])
                }).catch(()=> null)
                if (userResp && userResp.ok) console.log(`✅ [SYNC] Zsynchronizowano ${users.length} użytkowników`)
              } catch (e) { console.warn('⚠️ [SYNC] Błąd sync użytkowników:', e.message) }
              
              try {
                const devices = await this.db.all('SELECT * FROM devices')
                const devResp = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/devices`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(devices || [])
                }).catch(()=> null)
                if (devResp && devResp.ok) console.log(`✅ [SYNC] Zsynchronizowano ${devices.length} urządzeń`)
              } catch (e) { console.warn('⚠️ [SYNC] Błąd sync urządzeń:', e.message) }
              
              try {
                const clients = await this.db.all('SELECT * FROM clients')
                const cliResp = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/clients`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clients || [])
                }).catch(()=> null)
                if (cliResp && cliResp.ok) console.log(`✅ [SYNC] Zsynchronizowano ${clients.length} klientów`)
              } catch (e) { console.warn('⚠️ [SYNC] Błąd sync klientów:', e.message) }

              // Synchronizuj zlecenia z retry
              let successCount = 0
              let failCount = 0
              
              for (const o of pending) {
                try {
                  // NAPRAWIONE: Pobierz dane klienta i urządzenia z bazy
                  let clientEmail = null
                  let clientExternalId = null
                  let deviceSerial = null
                  let deviceExternalId = null
                  
                  if (o.client_id) {
                    try {
                      const clientRow = await this.db.get('SELECT email, external_id FROM clients WHERE id = ?', [o.client_id])
                      if (clientRow) {
                        clientEmail = clientRow.email || null
                        clientExternalId = clientRow.external_id && String(clientRow.external_id).trim() !== ''
                          ? clientRow.external_id
                          : `${this.installationId}:client:${o.client_id}`
                        if (!clientRow.external_id || String(clientRow.external_id).trim() === '') {
                          try { await this.db.run('UPDATE clients SET external_id = ? WHERE id = ?', [clientExternalId, o.client_id]) } catch (_) {}
                        }
                      }
                    } catch (_) {}
                  }
                  
                  if (o.device_id) {
                    try {
                      const deviceRow = await this.db.get('SELECT serial_number, external_id FROM devices WHERE id = ?', [o.device_id])
                      if (deviceRow) {
                        deviceSerial = deviceRow.serial_number || null
                        deviceExternalId = deviceRow.external_id && String(deviceRow.external_id).trim() !== ''
                          ? deviceRow.external_id
                          : `${this.installationId}:device:${o.device_id}`
                        if (!deviceRow.external_id || String(deviceRow.external_id).trim() === '') {
                          try { await this.db.run('UPDATE devices SET external_id = ? WHERE id = ?', [deviceExternalId, o.device_id]) } catch (_) {}
                        }
                      }
                    } catch (_) {}
                  }

                  // Pełny payload z wszystkimi danymi
                  const orderPayload = [{
                    id: o.id,
                    order_number: o.order_number,
                    title: o.title || o.description || `Zlecenie ${o.order_number || o.id}`,
                    client_id: o.client_id || null,
                    device_id: o.device_id || null,
                    client_email: clientEmail || o.client_email || null,
                    external_client_id: clientExternalId || (o.client_id ? `${this.installationId}:client:${o.client_id}` : null),
                    client_external_id: clientExternalId || (o.client_id ? `${this.installationId}:client:${o.client_id}` : null),
                    device_serial: deviceSerial || null,
                    external_device_id: deviceExternalId || (o.device_id ? `${this.installationId}:device:${o.device_id}` : null),
                    device_external_id: deviceExternalId || (o.device_id ? `${this.installationId}:device:${o.device_id}` : null),
                    assigned_user_id: o.assigned_user_id || null,
                    priority: o.priority || 'medium',
                    status: o.status || 'new',
                    description: o.description || null,
                    scheduled_date: o.scheduled_date || null,
                    scheduled_datetime: o.scheduled_datetime || null,
                    actual_start_date: o.actual_start_date || null,
                    actual_end_date: o.actual_end_date || null,
                    completed_categories: o.completed_categories || null,
                    work_photos: o.work_photos || null,
                    completion_notes: o.completion_notes || null,
                    actual_hours: o.actual_hours || null,
                    service_categories: o.service_categories || null,
                    created_at: o.created_at || null,
                    updated_at: o.updated_at || null
                  }]
                  
                  // Retry logic: 3 próby
                  let syncSuccess = false
                  for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                      const syncOrderResp = await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/orders`, {
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(orderPayload)
                      })
                      
                      if (syncOrderResp && syncOrderResp.ok) {
                        syncSuccess = true
                        break
                      } else if (attempt < 3) {
                        console.warn(`⚠️ [SYNC] Próba ${attempt}/3 nie powiodła się dla zlecenia ${o.order_number}, retry...`)
                        await new Promise(r => setTimeout(r, 1000 * attempt)) // Exponential backoff
                      }
                    } catch (e) {
                      if (attempt < 3) {
                        console.warn(`⚠️ [SYNC] Błąd próby ${attempt}/3 dla ${o.order_number}:`, e.message)
                        await new Promise(r => setTimeout(r, 1000 * attempt))
                      }
                    }
                  }
                  
                  if (!syncSuccess) {
                    console.error(`❌ [SYNC] Nie udało się zsynchronizować zlecenia ${o.order_number} po 3 próbach`)
                    failCount++
                    continue
                  }
                  
                  // Wyślij przypisanie (jeśli zlecenie ma technika)
                  if (o.assigned_user_id) {
                    await fetch(`${RAILWAY_API_BASE.replace(/\/$/, '')}/sync/assign`, {
                      method: 'PUT', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({
                        order_number: o.order_number,
                        technicianId: o.assigned_user_id,
                        status: o.status || 'assigned',
                        assignedAt: new Date().toISOString()
                      })
                    }).catch((e) => console.warn('⚠️ [SYNC] Błąd przypisania:', e.message))
                  }
                  
                  // Oznacz jako wysłane
                  await this.db.run('UPDATE service_orders SET desktop_sync_status = ?, desktop_synced_at = CURRENT_TIMESTAMP WHERE id = ?', ['sent', o.id])
                  successCount++
                  console.log(`✅ [SYNC] Wysłano zlecenie ${o.order_number} (${successCount}/${pending.length})`)
                  
                } catch (e) { 
                  console.error(`❌ [SYNC] Błąd zlecenia ${o.order_number}:`, e.message)
                  failCount++
                }
              }
              
              console.log(`🎯 [SYNC] Zakończono: ${successCount} sukces, ${failCount} błędów`)
              
            } catch (e) {
              console.error('❌ [SYNC] Krytyczny błąd autoExporter:', e.message)
            }
          }
          setInterval(autoExporter, 60000) // Co 60 sekund
          setTimeout(autoExporter, 8000) // Start po 8 sekundach

          resolve()
        })
      } catch (error) {
        console.error('❌ Błąd startu API servera:', error)
        reject(error)
      }
    })
  }

  stop() {
    if (this.server) {
      // Zatrzymaj wszystkie timery
      for (const timer of this.activeOrders.values()) {
        clearInterval(timer.timer);
      }
      this.activeOrders.clear();
      
      this.server.close();
      console.log('🛑 API Server zatrzymany');
    }
  }
}

module.exports = APIServer; 