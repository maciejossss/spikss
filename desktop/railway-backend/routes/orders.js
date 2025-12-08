const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
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
    console.error('ensure order columns failed', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Multer in-memory storage for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

// GET /api/desktop/orders - Pobrane zbiorcze (używane przez desktop do odświeżenia)
router.get('/', async (req, res) => {
  try {
    const q = `
      SELECT 
        o.id, o.order_number, o.status, o.title, o.description,
        o.client_id, o.device_id, o.assigned_user_id, o.priority,
        o.created_at, o.started_at, o.completed_at, o.updated_at,
        COALESCE(
          CASE WHEN o.scheduled_time IS NOT NULL AND o.scheduled_date IS NOT NULL
               THEN to_char(o.scheduled_date, 'YYYY-MM-DD') || 'T' || o.scheduled_time
               ELSE NULL END,
          to_char(o.scheduled_date, 'YYYY-MM-DD')
        ) AS scheduled_date,
        o.total_cost, o.estimated_cost_note,
        o.completed_categories, o.completion_notes, o.parts_used,
        o.work_photos, o.actual_hours, o.actual_start_date, o.actual_end_date,
        COALESCE(
          NULLIF(c.company_name, ''),
          NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
          NULLIF(c.email, ''),
          'Klient #' || COALESCE(c.id::text, 'brak')
        ) AS client_name,
        d.name AS device_name,
        c.external_id AS client_external_id,
        c.email AS client_email,
        d.external_id AS device_external_id,
        d.serial_number AS device_serial
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      WHERE o.status <> 'deleted'
      ORDER BY o.updated_at DESC NULLS LAST, o.id DESC
      LIMIT 200
    `;
    const r = await db.query(q);
    // Zwracaj surową tablicę – desktop oczekuje Array, nie obiektu wrapper
    return res.json(r.rows || []);
  } catch (e) {
    console.error('desktop orders list error', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/desktop/orders/by-id/:id — pojedyncze zlecenie dla kompatybilności desktop
router.get('/by-id/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });

    const q = `
      SELECT 
        o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
        o.status, o.priority, o.type, o.title, o.description,
        o.completed_categories, o.completion_notes, o.parts_used, o.work_photos,
        COALESCE(
          CASE WHEN o.scheduled_time IS NOT NULL AND o.scheduled_date IS NOT NULL
               THEN to_char(o.scheduled_date, 'YYYY-MM-DD') || 'T' || o.scheduled_time
               ELSE NULL END,
          to_char(o.scheduled_date, 'YYYY-MM-DD')
        ) AS scheduled_date,
        o.started_at, o.completed_at, o.estimated_hours, o.actual_hours,
        o.parts_cost, o.labor_cost, o.total_cost, o.estimated_cost_note,
        o.notes, o.created_at, o.updated_at,
        COALESCE(
          NULLIF(c.company_name, ''),
          NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
          NULLIF(c.email, ''),
          'Klient #' || COALESCE(c.id::text, 'brak')
        ) AS client_name,
        d.name AS device_name,
        c.external_id AS client_external_id,
        c.email AS client_email,
        d.external_id AS device_external_id,
        d.serial_number AS device_serial
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      WHERE o.id = $1
      LIMIT 1
    `;
    const r = await db.query(q, [id]);
    try { console.log('[BY-ID]', id, 'scheduled_date=', r.rows && r.rows[0] && r.rows[0].scheduled_date); } catch (_) {}
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.json({ success: true, order: r.rows[0] });
  } catch (error) {
    console.error('desktop orders by-id error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/desktop/orders/by-number/:orderNumber — pojedyncze zlecenie po numerze (SRV-...)
router.get('/by-number/:orderNumber', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    if (!orderNumber) return res.status(400).json({ success: false, error: 'Invalid order_number' });

    const q = `
      SELECT 
        o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
        o.status, o.priority, o.type, o.title, o.description,
        o.completed_categories, o.completion_notes, o.parts_used, o.work_photos,
        COALESCE(
          CASE WHEN o.scheduled_time IS NOT NULL AND o.scheduled_date IS NOT NULL
               THEN to_char(o.scheduled_date, 'YYYY-MM-DD') || 'T' || o.scheduled_time
               ELSE NULL END,
          to_char(o.scheduled_date, 'YYYY-MM-DD')
        ) AS scheduled_date,
        o.started_at, o.completed_at, o.estimated_hours, o.actual_hours,
        o.parts_cost, o.labor_cost, o.total_cost, o.estimated_cost_note,
        o.notes, o.created_at, o.updated_at,
        COALESCE(
          NULLIF(c.company_name, ''),
          NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''),
          NULLIF(c.email, ''),
          'Klient #' || COALESCE(c.id::text, 'brak')
        ) AS client_name,
        d.name AS device_name,
        c.external_id AS client_external_id,
        c.email AS client_email,
        d.external_id AS device_external_id,
        d.serial_number AS device_serial
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      WHERE o.order_number = $1
      LIMIT 1
    `;
    const r = await db.query(q, [orderNumber]);
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.json({ success: true, order: r.rows[0] });
  } catch (error) {
    console.error('desktop orders by-number error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/desktop/orders/:technicianId - Pobierz zlecenia dla technika (match local API)
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    console.log(`📱 Pobieranie zleceń dla technika ${userId}`);
    
    // Sprawdź i dodaj kolumnę brand jeśli nie istnieje
    try {
      const checkResult = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'brand'
      `);
      
      if (checkResult.rows.length === 0) {
        console.log('🔧 Dodaję kolumnę brand do tabeli devices...');
        await db.query('ALTER TABLE devices ADD COLUMN brand VARCHAR(255)');
        console.log('✅ Kolumna brand została dodana');
      } else {
        console.log('ℹ️ Kolumna brand już istnieje');
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania/dodawania kolumny brand:', error.message);
      // Kontynuuj bez kolumny brand
    }
    
    // Rozszerzony query z pełnymi informacjami o kliencie i urządzeniu
    // Zwracamy tylko najnowszy rekord per order_number (eliminuje duplikaty ze starym klientem)
    const query = `
      WITH ranked AS (
        SELECT o.*, ROW_NUMBER() OVER (
          PARTITION BY o.order_number
          ORDER BY o.updated_at DESC NULLS LAST, o.id DESC
        ) AS rn
        FROM service_orders o
        WHERE o.assigned_user_id = $1 AND o.status IN ('new','in_progress','assigned','completed')
      )
      SELECT 
        r.*, 
        COALESCE(
          CASE WHEN r.scheduled_time IS NOT NULL AND r.scheduled_date IS NOT NULL
               THEN to_char(r.scheduled_date, 'YYYY-MM-DD') || 'T' || r.scheduled_time
               ELSE NULL END,
          to_char(r.scheduled_date, 'YYYY-MM-DD')
        ) AS scheduled_datetime,
        -- Informacje o kliencie
        CASE 
          WHEN c.company_name IS NOT NULL AND c.company_name <> '' THEN c.company_name
          ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
        END AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        c.external_id AS client_external_id,
        c.address_street,
        c.address_city,
        c.address_postal_code,
        c.address_country,
        COALESCE(
          c.address_street || ', ' || c.address_postal_code || ' ' || c.address_city || ', ' || c.address_country,
          c.address,
          'Brak adresu'
        ) AS address,
        -- Informacje o urządzeniu
        d.name AS device_name,
        d.full_name AS device_full_name,
        d.model AS device_model,
        d.brand AS device_brand,
        d.serial_number AS device_serial,
        d.external_id AS device_external_id,
        d.warranty_status AS device_warranty,
        -- Informacje o techniku
        u.full_name AS technician_name
      FROM ranked r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN devices d ON r.device_id = d.id
      LEFT JOIN users u ON r.assigned_user_id = u.id
      WHERE r.rn = 1
    `;
    
    const result = await db.query(query, [userId]);
    
    console.log(`📱 Pobrano ${result.rows.length} zleceń dla technika ${userId}`);
    console.log('🔍 DEBUG - Przykładowe zlecenie:', result.rows.length > 0 ? JSON.stringify(result.rows[0], null, 2) : 'Brak zleceń');
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Błąd pobierania zleceń:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas pobierania zleceń',
      details: error.message
    });
  }
});

// PUT /api/desktop/orders/:orderId/status - Aktualizuj status zlecenia (match local API)
router.put('/:orderId/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const raw = req.body || {}
    const status = raw.status || raw.new_status || raw.state
    const completedCategories = (raw.completedCategories ?? raw.completed_categories ?? raw.completed) || []
    const photos = (raw.photos ?? raw.work_photos ?? raw.workPhotos) || []
    const notes = (raw.notes ?? raw.completion_notes ?? raw.completionNotes) || ''
    const actualHoursFromBody = (raw.actual_hours ?? raw.actualHours)

    // Walidacja
    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['new', 'in_progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();

    // Pobierz aktualne zlecenie
    const currentOrder = await db.query('SELECT * FROM service_orders WHERE id = $1', [orderId]);
    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const current = currentOrder.rows[0];
    let updateData = { status, updated_at: now };

    // === ROZPOCZĘCIE PRACY ===
    if (status === 'in_progress' && current.status !== 'in_progress') {
      updateData.started_at = current.started_at || now;
      console.log(`🚀 Rozpoczęto pracę nad zleceniem ${orderId}`);
    }

    // === UKOŃCZENIE PRACY ===
    if (status === 'completed') {
      const ensuredStart = current.started_at || updateData.started_at || now;
      if (!current.started_at && !updateData.started_at) {
        updateData.started_at = ensuredStart;
      }
      updateData.completed_at = now;
      updateData.completed_categories = JSON.stringify(completedCategories || []);
      updateData.work_photos = JSON.stringify(photos || []);
      // Bezpieczny fallback dla completion_notes: obsłuż różne nazwy pól z PWA
      try {
        const cn = (raw && (raw.completion_notes ?? raw.completionNotes ?? raw.workDescription ?? (raw.historyData && raw.historyData.description))) || ''
        updateData.completion_notes = (typeof cn === 'string') ? cn : String(cn || '')
      } catch (_) { updateData.completion_notes = '' }
      if (req.body && typeof req.body.notes === 'string' && req.body.notes.trim() !== '') {
        updateData.notes = req.body.notes.trim();
      }
      // Zapisz uwagi technika osobno (pole "Uwagi" z formularza)
      if (raw && typeof raw.notes === 'string' && raw.notes.trim() !== '') {
        updateData.notes = raw.notes.trim();
      }

      // Oblicz rzeczywiste godziny pracy
      const startDate = new Date(ensuredStart);
      const endDate = new Date(now);
      let actualHours = Math.round((endDate - startDate) / (1000 * 60 * 60) * 10) / 10;
      if (actualHoursFromBody != null && !isNaN(Number(actualHoursFromBody))) {
        actualHours = Number(actualHoursFromBody)
      }
      updateData.actual_hours = actualHours;

      console.log(`✅ Ukończono zlecenie ${orderId}, czas pracy: ${actualHours}h`);
    }

    // === ZLECENIE NIE ZREALIZOWANE ===
    if (status === 'rejected') {
      updateData.completed_at = now;
      updateData.completion_notes = notes || '';
      if (raw && typeof raw.notes === 'string' && raw.notes.trim() !== '') {
        updateData.notes = raw.notes.trim();
      }

      console.log(`❌ Zlecenie ${orderId} oznaczone jako nie zrealizowane`);
    }

    // Aktualizuj w bazie danych
    const updateFields = Object.keys(updateData).map((field, index) => `${field} = $${index + 2}`).join(', ');
    const updateValues = Object.values(updateData);
    
    await db.query(
      `UPDATE service_orders SET ${updateFields} WHERE id = $1`,
      [orderId, ...updateValues]
    );

    res.json({ success: true, orderId, status, timestamp: now });

    // Powiadom wszystkich subskrybentów SSE o zmianie (fire-and-forget)
    try {
      const base = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.replace(/\/$/, '') : ''
      const notifyUrl = base ? `${base}/api/notify` : 'http://127.0.0.1:5174/api/notify'
      const payload = {
        type: 'order.updated',
        data: {
          orderId,
          status,
          started_at: updateData.started_at || current.started_at || null,
          completed_at: updateData.completed_at || current.completed_at || null,
          timestamp: now
        }
      }
      fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    } catch (_) { /* ignore notify errors */ }
  } catch (error) {
    console.error('❌ Błąd aktualizacji zlecenia:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT/POST /api/desktop/orders/:orderId/complete — kompatybilny skrót
const completeCompat = async (req, res) => {
  try {
    req.body = Object.assign({}, req.body || {}, { status: 'completed' })
    // deleguj do handlera /status
    const layer = router.stack.find(l => l.route && l.route.path === '/:orderId/status' && l.route.methods.put)
    if (layer && typeof layer.handle === 'function') return layer.handle(req, res)
    return res.status(400).json({ error: 'Status handler not found' })
  } catch (e) {
    console.error('❌ complete compat error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
}

router.put('/:orderId/complete', completeCompat)
router.post('/:orderId/complete', completeCompat)

// === COMPAT: POST /:orderId/photos (legacy mobile flow) ===
// Nie przechowujemy plików na Railway – zdjęcia są przekazywane w kroku complete/status.
// Endpoint służy wyłącznie do potwierdzenia odbioru, aby nie blokować UI mobilnego.
router.post('/:orderId/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' });

    // Ensure uploads dir exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}

    // Determine device_id from order (if any)
    let deviceId = null;
    try {
      const r = await db.query('SELECT device_id FROM service_orders WHERE id = $1 LIMIT 1', [orderId]);
      deviceId = (r.rows && r.rows[0]) ? (r.rows[0].device_id || null) : null;
    } catch (_) { deviceId = null; }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.json({ success: true, files: [] });
    }

    // Save each uploaded file and register in device_files (if deviceId known)
    const saved = [];
    for (const f of files) {
      try {
        const orig = String(f.originalname || 'photo.jpg');
        const base = orig.replace(/[^A-Za-z0-9_.-]+/g, '_') || 'photo.jpg';
        const ext = base.includes('.') ? base.split('.').pop() : (f.mimetype && f.mimetype.split('/')[1]) || 'jpg';
        const unique = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const full = path.join(uploadsDir, unique);
        fs.writeFileSync(full, f.buffer);
        const publicUrl = `/uploads/${unique}`;

        // Insert DB row (if possible). device_id can be null; keep record anyway
        let fileId = null;
        try {
          const ins = await db.query(
            `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, upload_date)
             VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
            [deviceId, base, publicUrl, f.mimetype || null, f.size || (f.buffer ? f.buffer.length : null)]
          );
          fileId = (ins.rows && ins.rows[0]) ? ins.rows[0].id : null;
        } catch (e) {
          console.warn('device_files insert failed (will still return URL):', e.message);
        }

        saved.push({ id: fileId, path: publicUrl, file_name: base });
      } catch (e) {
        console.error('save photo failed:', e);
      }
    }

    // Append to service_orders.work_photos so desktop import widzi zdjęcia bez dodatkowych kroków
    try {
      const cur = await db.query('SELECT work_photos FROM service_orders WHERE id = $1', [orderId]);
      const existingTxt = (cur.rows && cur.rows[0] && cur.rows[0].work_photos) || '[]';
      let arr = [];
      try { arr = Array.isArray(existingTxt) ? existingTxt : JSON.parse(existingTxt || '[]'); } catch (_) { arr = []; }
      const appended = [
        ...arr,
        ...saved.map(s => s.path)
      ];
      await db.query('UPDATE service_orders SET work_photos = $2, updated_at = NOW() WHERE id = $1', [orderId, JSON.stringify(appended)]);
    } catch (e) {
      console.warn('append work_photos failed:', e.message);
    }

    return res.json({ success: true, files: saved });
  } catch (error) {
    console.error('photos compat error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// === COMPAT: POST /:orderId/complete (legacy mobile flow) ===
// Alias do PUT /:orderId/status z values status=completed oraz dodatkowymi polami
router.post('/:orderId/complete', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' });

    const {
      partsUsed,
      completedAt,
      technicianId,
      work_photos,
      historyData,
      notes,
      hoursWorked,
      completion_notes
    } = req.body || {};

    // Pobierz aktualne zlecenie
    const currentOrder = await db.query('SELECT * FROM service_orders WHERE id = $1', [orderId]);
    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const current = currentOrder.rows[0];

    const nowIso = new Date().toISOString();
    const completedAtIso = completedAt || nowIso;
    const photosJson = JSON.stringify(Array.isArray(work_photos) ? work_photos : []);
    const notesText = completion_notes || notes || (historyData && historyData.description) || '';
    const technicianNotes = notes || null; // zachowaj osobno uwagi technika

    // Oblicz rzeczywisty czas pracy
    const startDate = new Date(current.started_at || nowIso);
    const endDate = new Date(completedAtIso);
    const actualHoursComputed = Math.round(((endDate - startDate) / (1000 * 60 * 60)) * 10) / 10;
    const actualHours = Number(hoursWorked) > 0 ? Number(hoursWorked) : actualHoursComputed;

    const updateQ = `
      UPDATE service_orders
         SET status = 'completed',
             completed_at = $2,
             updated_at = $3,
             completion_notes = $4,
             parts_used = COALESCE($5, parts_used),
             work_photos = $6,
             actual_hours = $7,
             notes = COALESCE($8, notes)
       WHERE id = $1
       RETURNING id, status, completed_at, actual_hours
    `;
    const updateVals = [
      orderId,
      completedAtIso,
      nowIso,
      notesText,
      partsUsed || null,
      photosJson,
      actualHours,
      technicianNotes
    ];
    const r = await db.query(updateQ, updateVals);

    return res.json({ success: true, data: r.rows[0] });
  } catch (error) {
    console.error('complete compat error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/desktop/orders/:orderId/assign - Wyślij zlecenie do technika
router.post('/:orderId/assign', async (req, res) => {
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
      await db.query(`
        UPDATE service_orders 
        SET assigned_user_id = NULL, updated_at = $1
        WHERE id = $2
      `, [now, orderId]);
      
      console.log(`📤 Odznaczono technika ze zlecenia ${orderId}`);
      res.json({ success: true, orderId, technicianId: null });
    } else {
      // Przypisz technika
      await db.query(`
        UPDATE service_orders 
        SET assigned_user_id = $1, priority = $2, status = CASE WHEN status = 'in_progress' THEN 'in_progress' ELSE 'assigned' END, updated_at = $3
        WHERE id = $4
      `, [technicianId, priority || 'medium', now, orderId]);

      console.log(`📤 Wysłano zlecenie ${orderId} do technika ${technicianId}`);
      res.json({ success: true, orderId, technicianId });
    }
  } catch (error) {
    console.error('❌ Błąd wysyłania zlecenia:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// (uwaga) Endpoints dla ścieżki /api/orders są zdefiniowane w routes/orders-compat.js i montowane pod /api/orders

// GET /api/desktop/orders/active-timers - Pobierz aktywne zlecenia z timerami
router.get('/active-timers', async (req, res) => {
  try {
    // Pobierz wszystkie zlecenia w trakcie realizacji
    const query = `
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
      WHERE o.status = 'in_progress'
        AND o.started_at IS NOT NULL
      ORDER BY o.started_at DESC
    `;
    
    const result = await db.query(query);
    
    // Oblicz elapsed time dla każdego zlecenia
    const activeTimers = result.rows.map(order => {
      const startTime = new Date(order.started_at);
      const now = new Date();
      const elapsedMs = now - startTime;
      const elapsedHours = Math.round(elapsedMs / (1000 * 60 * 60) * 10) / 10;
      
      return {
        ...order,
        elapsed_time: elapsedHours,
        timer_started: order.started_at
      };
    });

    res.json(activeTimers);
  } catch (error) {
    console.error('❌ Błąd pobierania timerów:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router; 