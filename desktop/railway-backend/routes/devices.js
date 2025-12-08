const express = require('express')
const router = express.Router()
const db = require('../database/connection')
const fs = require('fs')
const path = require('path')

// GET /api/devices/external/:externalId — wyszukanie urządzenia po external_id
router.get('/external/:externalId', async (req, res) => {
  try {
    const externalId = String(req.params.externalId || '').trim()
    if (!externalId) return res.status(400).json({ success: false, error: 'Invalid externalId' })
    const q = `
      SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type
        FROM devices d
        LEFT JOIN clients c ON d.client_id = c.id
       WHERE d.external_id = $1
       LIMIT 1
    `
    const r = await db.query(q, [externalId])
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    return res.json({ success: true, device: r.rows[0], data: r.rows[0] })
  } catch (e) {
    console.error('devices/external error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/devices/:id — podstawowe informacje o urządzeniu
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const q = `
      SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type
      FROM devices d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = $1
    `
    const r = await db.query(q, [id])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    // Zwracaj w formacie kompatybilnym: { device } oraz { data }
    return res.json({ success: true, device: r.rows[0], data: r.rows[0] })
  } catch (e) {
    console.error('devices/:id error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/devices/:id/orders — historia zleceń urządzenia
router.get('/:id/orders', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const q = `
      SELECT id, order_number, status, title, description,
             completed_at, started_at, scheduled_date, created_at,
             parts_used, completed_categories, completion_notes, work_photos
        FROM service_orders
       WHERE device_id = $1
       ORDER BY COALESCE(completed_at, started_at, scheduled_date, created_at) DESC
       LIMIT 100
    `
    const r = await db.query(q, [id])
    return res.json({ success: true, items: r.rows || [] })
  } catch (e) {
    console.error('devices/:id/orders error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/devices/:id/files — zdjęcia/dokumenty urządzenia
router.get('/:id/files', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    // Fallback: jeśli tabela device_files nie istnieje, zwróć pustą listę zamiast 500
    let deviceFiles = []
    try {
      const filesQ = `
        SELECT id, file_name, file_path, file_type, file_size, upload_date, description
          FROM device_files
         WHERE device_id = $1
         ORDER BY upload_date DESC NULLS LAST, id DESC
      `
      const filesR = await db.query(filesQ, [id])
      // Walidacja: filtruj niepełne rekordy PRZED mapowaniem
      deviceFiles = (filesR.rows || [])
        .filter(f => f != null && f.id != null)
        .map(f => ({
          id: f.id,
          name: f.file_name,
          path: f.file_path,
          type: f.file_type,
          size: f.file_size,
          uploaded_at: f.upload_date,
          description: f.description
        }))
    } catch (e) {
      try {
        // Fallback for older schemas without upload_date column
        const filesQ2 = `
          SELECT id, file_name, file_path, file_type, file_size, description
            FROM device_files
           WHERE device_id = $1
           ORDER BY id DESC
        `
        const filesR2 = await db.query(filesQ2, [id])
        // Walidacja: filtruj niepełne rekordy PRZED mapowaniem (fallback)
        deviceFiles = (filesR2.rows || [])
          .filter(f => f != null && f.id != null)
          .map(f => ({
            id: f.id,
            name: f.file_name,
            path: f.file_path,
            type: f.file_type,
            size: f.file_size,
            uploaded_at: null,
            description: f.description
          }))
      } catch (_) {
        console.warn('device_files table missing or query failed, returning empty list')
        deviceFiles = []
      }
    }

    // Dociągnij zdjęcia z work_photos zleceń tego urządzenia
    const photosQ = `
      SELECT work_photos
        FROM service_orders
       WHERE device_id = $1
         AND work_photos IS NOT NULL
      ORDER BY COALESCE(completed_at, started_at, scheduled_date, created_at) DESC
      LIMIT 50
    `
    const photosR = await db.query(photosQ, [id])
    const photos = []
    for (const row of (photosR.rows || [])) {
      try {
        const list = typeof row.work_photos === 'string'
          ? JSON.parse(row.work_photos)
          : (Array.isArray(row.work_photos) ? row.work_photos : [])
        for (const ph of (list || [])) {
          const val = typeof ph === 'string' ? ph : (ph.path || ph.url || '')
          if (!val) continue
          photos.push({ path: val })
        }
      } catch (_) { /* ignore */ }
    }

    // Znormalizuj odpowiedź: preferuj pełne obiekty z publicznym URL-em, ale utrzymaj wsteczną kompatybilność
    const baseName = (p) => {
      try {
        const s = String(p||'')
        const idx1 = s.lastIndexOf('/')
        const idx2 = s.lastIndexOf('\\')
        const idx = Math.max(idx1, idx2)
        return idx >= 0 ? s.slice(idx+1) : s
      } catch(_) { return p }
    }
    const filesRaw = (deviceFiles || []).map(f => ({
      id: f.id,
      file_name: f.name,
      file_path: f.path,
      file_type: f.type,
      file_size: f.size,
      mime_type: f.type && f.type.includes('/') ? f.type : undefined,
      public_url: (() => {
        const raw = f.path || ''
        if (!raw) return null
        if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw
        // Akceptuj zarówno '/uploads/...' jak i 'uploads/...'
        if (raw.startsWith('/uploads/')) return raw
        if (raw.startsWith('uploads/')) return '/' + raw
        return null
      })(),
      // Debug: optionally report existence on disk when debug=1
      exists: (() => {
        try {
          // Weryfikuj istnienie tylko dla ścieżek /uploads/
          const p = f.path || ''
          const uploadsDir = path.join(__dirname, '..', 'uploads')
          const rel = (p.startsWith('/uploads/') ? p.replace(/^\/+uploads\/+/, '')
                    : (p.startsWith('uploads/') ? p.replace(/^uploads\/+/, '') : baseName(p)))
          const abs = path.join(uploadsDir, rel)
          if (p.startsWith('/uploads/') || p.startsWith('uploads/')) return fs.existsSync(abs)
          return undefined
        } catch (_) { return undefined }
      })()
    }))
    // Bezpieczne: nie filtruj po faktycznej obecności pliku na dysku (FS na Railway bywa efemeryczny)
    const files = filesRaw.filter(it => {
      // Walidacja: pomiń null/undefined
      if (it == null) return false
      try {
        const url = String(it.public_url || '')
        if (!url) return false
        // Jeśli wskazuje na /uploads/ i pliku nie ma – ukryj (unikaj pustych ramek)
        if (url.startsWith('/uploads/') && it.exists === false) return false
        return true
      } catch (_) { 
        // W razie błędu odfiltruj (nie dodawaj do wyniku)
        return false 
      }
    })
    // Dedup po nazwie pliku (preferuj logiczną nazwę file_name, potem basename URL)
    const dedupByBase = (arr) => {
      const out = []
      const seen = new Set()
      for (const it of (arr || [])) {
        // Walidacja: pomiń null/undefined
        if (it == null) continue
        try {
          const display = String(it.file_name || '').trim()
          const name = display || baseName(it.public_url || it.file_path || it.url || it.path || '')
          const key = String(name || '').toLowerCase()
          if (key && !seen.has(key)) { seen.add(key); out.push(it) }
        } catch (_) { 
          // W razie błędu pomiń element (nie dodawaj do wyniku)
        }
      }
      return out
    }
    const filesDedup = dedupByBase(files)
    // Walidacja: filtruj null/undefined photos PRZED mapowaniem
    const photosRaw = (photos || [])
      .filter(p => p != null && p.path)
      .map(p => ({
        path: p.path,
        public_url: (() => {
          const s = String(p.path||'')
          if (!s) return null
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s
          if (s.startsWith('/uploads/')) return s
          if (s.startsWith('uploads/')) return '/' + s
          return null
        })(),
        exists: (() => {
          try {
            // Weryfikuj istnienie tylko dla ścieżek /uploads/
            const uploadsDir = path.join(__dirname, '..', 'uploads')
            const pathStr = String(p.path||'')
            const rel = pathStr.startsWith('/uploads/') ? pathStr.replace(/^\/+uploads\/+/, '')
                      : (pathStr.startsWith('uploads/') ? pathStr.replace(/^uploads\/+/, '') : baseName(pathStr))
            const abs = path.join(uploadsDir, rel)
            if (pathStr.startsWith('/uploads/') || pathStr.startsWith('uploads/')) return fs.existsSync(abs)
            return undefined
          } catch (_) { return undefined }
        })()
      }))
    const normalizedPhotos = photosRaw.filter(it => {
      // Walidacja: pomiń null/undefined
      if (it == null) return false
      try {
        const url = String(it.public_url || '')
        if (!url) return false
        if (url.startsWith('/uploads/') && it.exists === false) return false
        return true
      } catch (_) { 
        // W razie błędu odfiltruj
        return false 
      }
    })
    const photosDedup = dedupByBase(normalizedPhotos)
    return res.json({ success: true, photos: photosDedup, files: filesDedup, items: filesDedup })
  } catch (e) {
    console.error('devices/:id/files error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/devices/:id/files/upload-base64 — zapis pliku do /uploads i rejestr w device_files
router.post('/:id/files/upload-base64', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid device id' })
    const { file_name, mime_type, content_base64, file_type, description } = req.body || {}
    if (!file_name || !content_base64) return res.status(400).json({ success: false, error: 'Missing params' })

    const uploadsDir = path.join(__dirname, '..', 'uploads')
    try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }) } catch (_) {}

    const safeName = String(file_name).replace(/[^A-Za-z0-9_.-]+/g, '_') || 'file.bin'
    const ext = safeName.includes('.') ? safeName.split('.').pop() : (mime_type && mime_type.split('/')[1]) || 'bin'
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
    const full = path.join(uploadsDir, unique)
    const buf = Buffer.from(content_base64, 'base64')
    fs.writeFileSync(full, buf)
    const publicUrl = `/uploads/${unique}`

    // Zapis w bazie z kompatybilnością wsteczną: jeśli kolumna upload_date nie istnieje – użyj krótszej wersji
    try {
      await db.query(
        `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, upload_date, description)
         VALUES ($1,$2,$3,$4,$5,NOW(),$6)`,
        [id, file_name, publicUrl, mime_type || file_type || null, buf.length, description || null]
      )
    } catch (insErr) {
      try {
        await db.query(
          `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, description)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, file_name, publicUrl, mime_type || file_type || null, buf.length, description || null]
        )
      } catch (insErr2) {
        console.error('device_files insert failed:', insErr2)
        throw insErr2
      }
    }

    return res.json({ success: true, public_url: publicUrl })
  } catch (e) {
    console.error('upload-base64 error', e)
    return res.status(500).json({ success: false, error: e.message })
  }
})

// GET /api/devices/external/:externalId — wyszukaj urządzenie po external_id
router.get('/external/:externalId', async (req, res) => {
  try {
    const externalId = String(req.params.externalId || '').trim()
    if (!externalId) return res.status(400).json({ success: false, error: 'Invalid external id' })
    const { rows } = await db.query('SELECT * FROM devices WHERE external_id = $1 LIMIT 1', [externalId])
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true, device: rows[0] })
  } catch (e) {
    console.error('devices external GET error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

module.exports = router



// ====== UPDATE (with propose mode) ======
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    const {
      manufacturer, // aka brand
      brand,
      model,
      serial_number,
      fuel_type,
      installation_date,
      last_service_date,
      next_service_date,
      warranty_end_date,
      notes,
      propose,
      proposed_by
    } = req.body || {}

    const desired = {
      manufacturer: manufacturer ?? brand,
      brand: brand ?? manufacturer,
      model,
      serial_number,
      fuel_type,
      installation_date,
      last_service_date,
      next_service_date,
      warranty_end_date,
      notes
    }

    const hasAny = Object.values(desired).some(v => v != null)
    if (!hasAny) return res.status(400).json({ success: false, error: 'No data to update' })

    if (propose) {
      // Zapisz propozycję do pending_changes
      // Pobierz external_id z bazy Railway, aby desktop mógł znaleźć lokalną encję
      const deviceCheck = await db.query('SELECT external_id FROM devices WHERE id = $1 LIMIT 1', [id])
      const externalId = deviceCheck.rows && deviceCheck.rows.length > 0 ? deviceCheck.rows[0].external_id : null
      if (!externalId || String(externalId).trim() === '') {
        console.warn(`[DEVICE UPDATE] Missing external_id for device ${id} – reject propose until sync`)
        return res.status(409).json({
          success: false,
          error: 'Missing external_id for device',
          code: 'missing_external_id',
          hint: 'Synchronize device before proposing changes'
        })
      }
      const payloadWithExternal = { ...desired, external_id: externalId }
      const fields = Object.keys(desired).filter(k => desired[k] != null).join(',')
      const q = `INSERT INTO pending_changes(entity, entity_id, payload, fields, proposed_by)
                 VALUES ($1, $2, $3::jsonb, $4, $5)
                 RETURNING id, created_at`
      const r = await db.query(q, ['device', id, JSON.stringify(payloadWithExternal), fields, proposed_by || null])
      // Powiadom przez SSE
      try {
        const candidates = []
        if (process.env.PUBLIC_BASE_URL) candidates.push(process.env.PUBLIC_BASE_URL.replace(/\/$/, ''))
        candidates.push(
          'https://web-production-fc58d.up.railway.app',
          'https://instalacjeserwis.pl',
          'https://www.instalacjeserwis.pl'
        )
        for (const base of candidates) {
          try {
            await fetch(`${base}/api/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'device.updated', data: { id, pending_change_id: r.rows?.[0]?.id } })
            })
            break
          } catch (_) { /* try next candidate */ }
        }
      } catch (_) {}
      return res.json({ success: true, pending: true, id, pending_change_id: r.rows?.[0]?.id })
    }

    // Natychmiastowa aktualizacja
    const updates = []
    const values = [id]
    let p = 1
    // Zapisz oba pola dla spójności
    if (desired.manufacturer != null) { updates.push(`manufacturer = $${++p}`); values.push(String(desired.manufacturer)) }
    if (desired.brand != null || desired.manufacturer != null) { updates.push(`brand = $${++p}`); values.push(String(desired.brand ?? desired.manufacturer)) }
    if (desired.model != null) { updates.push(`model = $${++p}`); values.push(String(desired.model)) }
    if (desired.serial_number != null) { updates.push(`serial_number = $${++p}`); values.push(String(desired.serial_number)) }
    if (desired.fuel_type != null) { updates.push(`fuel_type = $${++p}`); values.push(String(desired.fuel_type)) }
    if (desired.installation_date != null) { updates.push(`installation_date = $${++p}`); values.push(desired.installation_date) }
    if (desired.last_service_date != null) { updates.push(`last_service_date = $${++p}`); values.push(desired.last_service_date) }
    if (desired.next_service_date != null) { updates.push(`next_service_date = $${++p}`); values.push(desired.next_service_date) }
    if (desired.warranty_end_date != null) { updates.push(`warranty_end_date = $${++p}`); values.push(desired.warranty_end_date) }
    if (desired.notes != null) { updates.push(`notes = $${++p}`); values.push(String(desired.notes)) }
    updates.push('updated_at = CURRENT_TIMESTAMP')

    const sql = `UPDATE devices SET ${updates.join(', ')} WHERE id = $1 RETURNING id, manufacturer, brand, model, serial_number, fuel_type, installation_date, last_service_date, next_service_date, warranty_end_date, updated_at`
    const r2 = await db.query(sql, values)
    if (!r2.rows || r2.rows.length === 0) return res.status(404).json({ success: false, error: 'Device not found' })
    return res.json({ success: true, data: r2.rows[0] })
  } catch (e) {
    console.error('devices PUT error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})
