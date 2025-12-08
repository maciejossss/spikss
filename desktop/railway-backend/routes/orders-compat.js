const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// GET /api/orders/by-number/:orderNumber - diagnostyka: pokaż najnowszy rekord i joina klient/urządzenie
router.get('/by-number/:orderNumber', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim()
    if (!orderNumber) return res.status(400).json({ success: false, error: 'Invalid orderNumber' })
    const q = `
      WITH ranked AS (
        SELECT o.*, ROW_NUMBER() OVER (
          PARTITION BY o.order_number
          ORDER BY o.updated_at DESC NULLS LAST, o.id DESC
        ) AS rn
        FROM service_orders o
        WHERE o.order_number = $1
      )
      SELECT r.*,
             c.id AS client__id, c.email AS client__email, c.phone AS client__phone,
             COALESCE(NULLIF(c.company_name,''), NULLIF(TRIM(COALESCE(c.first_name,'')||' '||COALESCE(c.last_name,'')),'')) AS client__name,
             d.id AS device__id, d.serial_number AS device__serial, d.brand AS device__brand, d.model AS device__model
        FROM ranked r
        LEFT JOIN clients c ON r.client_id = c.id
        LEFT JOIN devices d ON r.device_id = d.id
       WHERE r.rn = 1
       LIMIT 1`
    const r = await db.query(q, [orderNumber])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true, data: r.rows[0] })
  } catch (e) {
    console.error('GET /api/orders/by-number/:orderNumber error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// DELETE /api/orders/by-number/:orderNumber - bezpieczne usuwanie konkretnego zlecenia
router.delete('/by-number/:orderNumber', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim()
    if (!orderNumber) return res.status(400).json({ success: false, error: 'Invalid orderNumber' })
    const pick = await db.query(`SELECT id FROM service_orders WHERE order_number = $1 ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1`, [orderNumber])
    if (!pick.rows || pick.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    await db.query('DELETE FROM service_orders WHERE id = $1', [pick.rows[0].id])
    return res.json({ success: true, deleted: pick.rows[0].id, order_number: orderNumber })
  } catch (e) {
    console.error('DELETE /api/orders/by-number/:orderNumber error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/orders/:id - pojedyncze zlecenie dla desktop importu
router.get('/:orderId', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const q = `
      SELECT o.*,
             COALESCE(NULLIF(c.company_name,''), NULLIF(TRIM(COALESCE(c.first_name,'')||' '||COALESCE(c.last_name,'')),''), NULLIF(c.email,'')) as client_name
        FROM service_orders o
        LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1
    `
    const r = await db.query(q, [id])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true, order: r.rows[0] })
  } catch (e) {
    console.error('GET /api/orders/:id error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/orders/:id/deletable — zwróć, czy zlecenie można bezpiecznie usunąć w mobilce
// Reguła: deletable, gdy status = 'completed'. Zwracamy 200 zawsze, aby UI nie traktował 404 jak błędu.
router.get('/:orderId/deletable', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId)
    if (!id) return res.json({ success: false, deletable: false, reason: 'Invalid id' })
    const r = await db.query('SELECT status FROM service_orders WHERE id = $1 LIMIT 1', [id])
    if (!r.rows || r.rows.length === 0) return res.json({ success: false, deletable: false, reason: 'Not found' })
    const status = String(r.rows[0].status || '').toLowerCase()
    const deletable = (status === 'completed')
    return res.json({ success: true, deletable, status })
  } catch (e) {
    console.error('GET /api/orders/:id/deletable error', e)
    return res.json({ success: false, deletable: false, reason: 'Server error' })
  }
})

// GET /api/orders/pending-import — lista zleceń oczekujących na import (stub compat)
router.get('/pending-import', async (_req, res) => {
  try {
    // Kompatybilny kształt odpowiedzi oczekiwany przez desktop auto-importer
    // W przyszłości można tu dodać realną logikę kolejkowania importów
    return res.json({ success: true, data: [] })
  } catch (e) {
    return res.json({ success: true, data: [] })
  }
})

// POST /api/orders/bulk-status - zwraca statusy wielu zleceń
router.post('/bulk-status', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Number.isFinite) : []
    if (ids.length === 0) return res.json({ success: true, items: [] })
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const q = `SELECT id, status, completed_at FROM service_orders WHERE id IN (${placeholders})`
    const r = await db.query(q, ids)
    return res.json({ success: true, items: r.rows || [] })
  } catch (e) {
    console.error('POST /api/orders/bulk-status error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/orders/:id/pull — zwróć pełny payload zlecenia do importu (compat z desktop)
router.post('/:orderId/pull', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    // Pobierz pełne zlecenie (bez agresywnego joinowania; desktop oczekuje pól z service_orders)
    const r = await db.query('SELECT * FROM service_orders WHERE id = $1 LIMIT 1', [id])
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }

    const order = r.rows[0]

    // Opcjonalnie oznacz jako "imported" przez aktualizację updated_at (soft handshake)
    const markImported = !!req.body?.markImported
    if (markImported) {
      try { await db.query('UPDATE service_orders SET updated_at = NOW() WHERE id = $1', [id]) } catch (_) {}
    }

    return res.json({ success: true, order })
  } catch (e) {
    console.error('POST /api/orders/:id/pull error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/orders/:id/send-to-desktop - zgodność, brak operacji
router.post('/:orderId/send-to-desktop', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    // Ensure tracking columns exist
    try { await db.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS desktop_sync_status VARCHAR(32)`)} catch (_) {}
    try { await db.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS desktop_synced_at TIMESTAMP NULL`)} catch (_) {}
    // If order not completed yet, mark as completed with timestamp (defensive fix)
    try {
      const cur = await db.query('SELECT status, completed_at FROM service_orders WHERE id = $1 LIMIT 1', [id])
      const st = String((cur.rows && cur.rows[0] && cur.rows[0].status) || '').toLowerCase()
      if (st !== 'completed') {
        await db.query(`UPDATE service_orders SET status='completed', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $1`, [id])
      }
    } catch (_) {}

    // If mobile sent completion details with this request, persist them immediately
    try {
      const raw = req.body || {}
      const completedCategories = (raw.completedCategories ?? raw.completed_categories ?? raw.completed)
      const workPhotos = (raw.work_photos ?? raw.workPhotos)
      const completionNotes = (raw.completion_notes ?? raw.notes ?? null)
      const partsUsed = (raw.partsUsed ?? raw.parts_used ?? null)
      const actualHours = (raw.actual_hours ?? raw.hoursWorked)
      const updates = []
      const vals = [id]
      let n = 1
      const push = (frag, val) => { updates.push(frag.replace('$N', `$${++n}`)); vals.push(val) }
      if (completedCategories != null) {
        const cc = Array.isArray(completedCategories) ? JSON.stringify(completedCategories) : String(completedCategories)
        push('completed_categories = $N', cc)
      }
      if (workPhotos != null) {
        const wp = Array.isArray(workPhotos) ? JSON.stringify(workPhotos) : String(workPhotos)
        push('work_photos = $N', wp)
      }
      if (completionNotes != null && String(completionNotes).trim() !== '') {
        push('completion_notes = $N', String(completionNotes))
      }
      if (partsUsed != null && String(partsUsed).trim() !== '') {
        push('parts_used = $N', String(partsUsed))
      }
      if (actualHours != null && !isNaN(Number(actualHours))) {
        push('actual_hours = $N', Number(actualHours))
      }
      if (updates.length > 0) {
        updates.push('updated_at = NOW()')
        await db.query(`UPDATE service_orders SET ${updates.join(', ')} WHERE id = $1`, vals)
      }
    } catch (_) { /* soft-fail – nie blokuj wysyłki */ }
    // Mark as sent
    await db.query(`UPDATE service_orders SET desktop_sync_status = 'sent', desktop_synced_at = NOW(), updated_at = NOW() WHERE id = $1`, [id])
    return res.json({ success: true, marked: 'sent', id })
  } catch (_) {
    return res.json({ success: true })
  }
})

// POST /api/orders/:id/mark-imported - handshake po imporcie
router.post('/:orderId/mark-imported', async (req, res) => {
  try {
    const id = parseInt(req.params.orderId)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    await db.query('UPDATE service_orders SET updated_at = NOW() WHERE id = $1', [id])
    return res.json({ success: true })
  } catch (e) {
    return res.json({ success: true })
  }
})

module.exports = router


