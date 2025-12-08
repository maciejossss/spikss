const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// POST /api/clients/:id/history — dopisz zdarzenie do historii klienta (np. faktura, notatka)
router.post('/:id/history', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10)
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Invalid client id' })
    }

    const {
      device_id = null,
      service_type = 'invoice',
      description = '',
      technician_id = null,
      service_date = null,
      parts_used = null,
      hours_worked = null,
      notes = null
    } = req.body || {}

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Description is required' })
    }

    // Upewnij się, że klient istnieje
    const clientRows = await db.query('SELECT id FROM clients WHERE id = $1 LIMIT 1', [clientId])
    if (!clientRows.rows || clientRows.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' })
    }

    let deviceIdToUse = null
    if (device_id != null) {
      const deviceRows = await db.query('SELECT id FROM devices WHERE id = $1 LIMIT 1', [device_id])
      if (deviceRows.rows && deviceRows.rows.length > 0) {
        deviceIdToUse = deviceRows.rows[0].id
      }
    }

    const serviceDateValue = service_date
      ? new Date(service_date)
      : new Date()

    if (Number.isNaN(serviceDateValue.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid service_date' })
    }

    const insertQuery = `
      INSERT INTO client_history (
        client_id,
        device_id,
        service_date,
        service_type,
        description,
        technician_id,
        parts_used,
        hours_worked,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, service_date, service_type, description
    `

    const values = [
      clientId,
      deviceIdToUse,
      serviceDateValue.toISOString().slice(0, 10),
      String(service_type || 'invoice'),
      description,
      technician_id || null,
      parts_used || null,
      hours_worked != null ? Number(hours_worked) : null,
      notes || null
    ]

    const result = await db.query(insertQuery, values)
    return res.status(201).json({ success: true, entry: result.rows?.[0] || null })
  } catch (error) {
    console.error('clients POST history error', error)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PUT /api/clients/:id — aktualizacja podstawowych danych kontaktowych klienta
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    const { phone, email, address, propose, proposed_by } = req.body || {}
    console.log('🔍 [CLIENT UPDATE] Received:', { id, phone, email, address, propose, proposed_by })

    // Nic do zmiany
    if (phone == null && email == null && address == null) {
      console.log('❌ [CLIENT UPDATE] No data to update')
      return res.status(400).json({ success: false, error: 'No data to update' })
    }

    // Tryb propozycji – zapis do pending_changes zamiast natychmiastowej aktualizacji
    if (propose) {
      console.log('✅ [CLIENT UPDATE] PROPOSE MODE - saving to pending_changes')
      // Pobierz external_id z bazy Railway, aby desktop mógł znaleźć lokalną encję
      const clientCheck = await db.query('SELECT external_id FROM clients WHERE id = $1 LIMIT 1', [id])
      const externalId = clientCheck.rows && clientCheck.rows.length > 0 ? clientCheck.rows[0].external_id : null
      if (!externalId || String(externalId).trim() === '') {
        console.warn(`[CLIENT UPDATE] Missing external_id for client ${id} – reject propose until sync`)
        return res.status(409).json({
          success: false,
          error: 'Missing external_id for client',
          code: 'missing_external_id',
          hint: 'Synchronize client before proposing changes'
        })
      }
      const payload = { phone, email, address, external_id: externalId }
      const fields = Object.keys(payload).filter(k => payload[k] != null && k !== 'external_id').join(',')
      const q = `INSERT INTO pending_changes(entity, entity_id, payload, fields, proposed_by)
                 VALUES ($1, $2, $3::jsonb, $4, $5)
                 RETURNING id, created_at`
      const r = await db.query(q, ['client', id, JSON.stringify(payload), fields, proposed_by || null])
      console.log('✅ [CLIENT UPDATE] Saved to pending_changes:', r.rows?.[0])
      // Powiadom PWA (SSE) o nowej propozycji
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
              body: JSON.stringify({ type: 'client.updated', data: { id, pending_change_id: r.rows?.[0]?.id } })
            })
            break
          } catch (_) { /* try next candidate */ }
        }
      } catch (_) {}
      const response = { success: true, pending: true, id, pending_change_id: r.rows?.[0]?.id }
      console.log('✅ [CLIENT UPDATE] Returning response:', response)
      return res.json(response)
    }
    console.log('⚠️ [CLIENT UPDATE] Direct update mode (no propose)')

    // Natychmiastowa aktualizacja
    const updates = []
    const values = [id]
    let p = 1
    if (phone != null) { updates.push(`phone = $${++p}`); values.push(String(phone)) }
    if (email != null) { updates.push(`email = $${++p}`); values.push(String(email)) }
    if (address != null) { updates.push(`address = $${++p}`); values.push(String(address)) }
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = $1 RETURNING id, phone, email, address, updated_at`
    const r2 = await db.query(sql, values)
    if (!r2.rows || r2.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' })
    }
    return res.json({ success: true, data: r2.rows[0] })
  } catch (e) {
    console.error('clients PUT error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/clients/:id/devices — lista urządzeń klienta (do przypięcia w mobilce)
router.get('/:id/devices', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    const q = `
      SELECT id, name, model, manufacturer AS brand, serial_number
        FROM devices
       WHERE client_id = $1
       ORDER BY name ASC
    `
    const r = await db.query(q, [id])
    return res.json({ success: true, items: r.rows || [] })
  } catch (e) {
    console.error('clients/:id/devices error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/clients/external/:externalId — wyszukaj klienta po external_id
router.get('/external/:externalId', async (req, res) => {
  try {
    const externalId = String(req.params.externalId || '').trim()
    if (!externalId) {
      return res.status(400).json({ success: false, error: 'Invalid external id' })
    }
    const { rows } = await db.query('SELECT * FROM clients WHERE external_id = $1 LIMIT 1', [externalId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    return res.json({ success: true, client: rows[0] })
  } catch (e) {
    console.error('clients external GET error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// Opcjonalnie: GET /api/clients/:id — Szczegóły klienta (przydatne diagnostycznie)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })
    const r = await db.query('SELECT * FROM clients WHERE id = $1', [id])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true, client: r.rows[0] })
  } catch (e) {
    console.error('clients GET error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

module.exports = router


