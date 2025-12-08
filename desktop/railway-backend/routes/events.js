const express = require('express')
const router = express.Router()
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

// Prosty broker SSE w pamięci
const clients = new Set()

// GET /api/events — kanał SSE dla PWA
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders && res.flushHeaders()

  // Wyślij ping, żeby natychmiast nawiązać strumień
  res.write(': connected\n\n')

  const client = { res }
  clients.add(client)

  // Keepalive
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch (_) {}
  }, 25000)

  req.on('close', () => {
    clearInterval(ping)
    clients.delete(client)
  })
})

// POST /api/notify — rozgłoś powiadomienie do wszystkich klientów SSE
router.post('/notify', express.json(), (req, res) => {
  try {
    const { type, data } = req.body || {}
    if (!type) return res.status(400).json({ success: false, error: 'type required' })
    const payload = JSON.stringify({ type, data: data || null, ts: Date.now() })
    for (const c of clients) {
      try { c.res.write(`data: ${payload}\n\n`) } catch (_) {}
    }
    return res.json({ success: true, delivered: clients.size })
  } catch (e) {
    return res.status(500).json({ success: false, error: 'notify failed' })
  }
})

module.exports = router

// Dodatkowe trasy pomocnicze dla pending_changes (list/accept/reject)
const db = require('../database/connection')
router.get('/pending-changes', async (_req, res) => {
  try {
    const r = await db.query('SELECT id, entity, entity_id, payload, fields, status, created_at, decided_at FROM pending_changes WHERE status = \'pending\' ORDER BY created_at DESC LIMIT 200')
    return res.json({ success: true, items: r.rows || [] })
  } catch (e) { return res.status(500).json({ success: false, error: 'Server error' }) }
})
const nullIfEmptyString = (value) => {
  if (value == null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

router.post('/pending-changes/:id/accept', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const { rows } = await db.query('SELECT * FROM pending_changes WHERE id = $1 AND status = \'pending\' LIMIT 1', [id])
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    const ch = rows[0]
    
    // Walidacja: sprawdź czy encja istnieje przed UPDATE
    let entityExists = false
    if (ch.entity === 'client') {
      const checkResult = await db.query('SELECT id FROM clients WHERE id = $1 LIMIT 1', [ch.entity_id])
      entityExists = checkResult.rows && checkResult.rows.length > 0
    } else if (ch.entity === 'device') {
      const checkResult = await db.query('SELECT id FROM devices WHERE id = $1 LIMIT 1', [ch.entity_id])
      entityExists = checkResult.rows && checkResult.rows.length > 0
    }
    
    if (!entityExists) {
      // Oznacz pending change jako rejected zamiast accepted, jeśli encja nie istnieje
      await db.query("UPDATE pending_changes SET status='rejected', decided_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
      return res.status(404).json({ success: false, error: 'Entity not found', entity: ch.entity, entity_id: ch.entity_id })
    }
    
    let updateSuccess = false
    if (ch.entity === 'client') {
      const p = ch.payload || {}
      const updates = []
      const vals = [ch.entity_id]
      let n = 1
      if (p.phone != null) { updates.push(`phone = $${++n}`); vals.push(String(p.phone)) }
      if (p.email != null) { updates.push(`email = $${++n}`); vals.push(String(p.email)) }
      if (p.address != null) { updates.push(`address = $${++n}`); vals.push(String(p.address)) }
      updates.push('updated_at = CURRENT_TIMESTAMP')
      if (updates.length > 0) {
        await db.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $1`, vals)
        updateSuccess = true // rowCount może być 0, gdy wartości się nie zmieniają
      } else {
        updateSuccess = true // Brak zmian do wprowadzenia, ale encja istnieje
      }
    } else if (ch.entity === 'device') {
      const p = ch.payload || {}
      // Znormalizuj brand/manufacturer – jeśli podany tylko jeden, ustaw oba
      try {
        if (p && (p.brand == null && p.manufacturer != null)) { p.brand = p.manufacturer }
        if (p && (p.manufacturer == null && p.brand != null)) { p.manufacturer = p.brand }
      } catch (_) {}
      const updates = []
      const vals = [ch.entity_id]
      let n = 1
      if (p.manufacturer != null) { updates.push(`manufacturer = $${++n}`); vals.push(String(p.manufacturer)) }
      if (p.brand != null) { updates.push(`brand = $${++n}`); vals.push(String(p.brand)) }
      if (p.model != null) { updates.push(`model = $${++n}`); vals.push(String(p.model)) }
      if (p.serial_number != null) { updates.push(`serial_number = $${++n}`); vals.push(String(p.serial_number)) }
      if (p.fuel_type != null) { updates.push(`fuel_type = $${++n}`); vals.push(String(p.fuel_type)) }
      if (p.installation_date !== undefined) { updates.push(`installation_date = $${++n}`); vals.push(nullIfEmptyString(p.installation_date)) }
      if (p.last_service_date !== undefined) { updates.push(`last_service_date = $${++n}`); vals.push(nullIfEmptyString(p.last_service_date)) }
      if (p.next_service_date !== undefined) { updates.push(`next_service_date = $${++n}`); vals.push(nullIfEmptyString(p.next_service_date)) }
      if (p.warranty_end_date !== undefined) { updates.push(`warranty_end_date = $${++n}`); vals.push(nullIfEmptyString(p.warranty_end_date)) }
      if (p.notes != null) { updates.push(`notes = $${++n}`); vals.push(String(p.notes)) }
      updates.push('updated_at = CURRENT_TIMESTAMP')
      if (updates.length > 0) {
        await db.query(`UPDATE devices SET ${updates.join(', ')} WHERE id = $1`, vals)
        updateSuccess = true // rowCount może być 0, gdy wartości się nie zmieniają
      } else {
        updateSuccess = true // Brak zmian do wprowadzenia, ale encja istnieje
      }
    }
    
    // Oznacz jako accepted tylko jeśli UPDATE rzeczywiście się powiódł
    if (updateSuccess) {
      await db.query("UPDATE pending_changes SET status='accepted', decided_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
      // Odrzuć pozostałe oczekujące propozycje dla tej samej encji, aby nie zostawały stare rekordy
      try {
        await db.query("UPDATE pending_changes SET status='rejected', decided_at = CURRENT_TIMESTAMP WHERE entity = $1 AND entity_id = $2 AND status = 'pending' AND id <> $3", [ch.entity, ch.entity_id, id])
      } catch (_) {}
      // Rozgłoś
      const type = ch.entity === 'device' ? 'device.updated' : 'client.updated'
      try { for (const c of clients) { c.res.write(`data: ${JSON.stringify({ type, data: { id: ch.entity_id } })}\n\n`) } } catch (_) {}
      return res.json({ success: true })
    } else {
      // UPDATE nie zmienił żadnych wierszy - oznacza to błąd
      return res.status(500).json({ success: false, error: 'Update failed - no rows affected' })
    }
  } catch (e) {
    console.error('[pending-changes/accept] Error:', e)
    return res.status(500).json({ success: false, error: 'Server error', detail: e?.message || String(e) })
  }
})
router.post('/pending-changes/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    await db.query("UPDATE pending_changes SET status='rejected', decided_at = CURRENT_TIMESTAMP WHERE id = $1", [id])
    return res.json({ success: true })
  } catch (e) { return res.status(500).json({ success: false, error: 'Server error' }) }
})


