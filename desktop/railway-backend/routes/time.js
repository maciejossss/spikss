const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// Helper to coerce int safely
function asInt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? parseInt(n) : null
}

// POST /api/time/start — start a new work session; auto-pause other open sessions for the same technician
router.post('/start', express.json(), async (req, res) => {
  try {
    const orderId = asInt(req.body && req.body.orderId)
    const technicianIdRaw = req.body && (req.body.technicianId ?? req.body.userId)
    let technicianId = asInt(technicianIdRaw)
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })

    // Resolve technician by current order if not provided
    if (!technicianId) {
      try {
        const r = await db.query('SELECT assigned_user_id FROM service_orders WHERE id = $1', [orderId])
        technicianId = r.rows && r.rows[0] ? asInt(r.rows[0].assigned_user_id) : null
      } catch (_) {}
    }

    // Best-effort: ensure started_at is set on order (for backward compatibility)
    try { await db.query('UPDATE service_orders SET started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = $1', [orderId]) } catch (_) {}

    if (technicianId) {
      // Auto-pause other open sessions for this technician
      try {
        await db.query(
          `UPDATE work_sessions 
             SET end_at = NOW(), reason = COALESCE(reason, 'auto_pause_by_concurrent_start')
           WHERE technician_id = $1 AND end_at IS NULL AND order_id <> $2`,
          [technicianId, orderId]
        )
      } catch (_) {}
    }

    // If there is an open session for this order already, do not duplicate
    const open = await db.query('SELECT id FROM work_sessions WHERE order_id = $1 AND end_at IS NULL LIMIT 1', [orderId])
    if (!open.rows || open.rows.length === 0) {
      await db.query(
        `INSERT INTO work_sessions (order_id, technician_id, start_at, created_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [orderId, technicianId]
      )
    }

    return res.json({ success: true })
  } catch (e) {
    console.error('time/start error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/time/pause — close current open session for order (if any)
router.post('/pause', express.json(), async (req, res) => {
  try {
    const orderId = asInt(req.body && req.body.orderId)
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
    await db.query(
      `UPDATE work_sessions SET end_at = NOW(), reason = COALESCE(reason, 'pause')
         WHERE order_id = $1 AND end_at IS NULL`,
      [orderId]
    )
    return res.json({ success: true })
  } catch (e) {
    console.error('time/pause error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/time/resume — start (another) session for order; auto-pause other sessions for same technician
router.post('/resume', express.json(), async (req, res) => {
  try {
    const orderId = asInt(req.body && req.body.orderId)
    const technicianId = asInt(req.body && (req.body.technicianId ?? req.body.userId))
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })

    // If provided, auto-pause other sessions for this technician
    if (technicianId) {
      try {
        await db.query(
          `UPDATE work_sessions 
             SET end_at = NOW(), reason = COALESCE(reason, 'auto_pause_by_concurrent_start')
           WHERE technician_id = $1 AND end_at IS NULL AND order_id <> $2`,
          [technicianId, orderId]
        )
      } catch (_) {}
    }

    // Open new session if none open
    const open = await db.query('SELECT id FROM work_sessions WHERE order_id = $1 AND end_at IS NULL LIMIT 1', [orderId])
    if (!open.rows || open.rows.length === 0) {
      await db.query(
        `INSERT INTO work_sessions (order_id, technician_id, start_at, created_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [orderId, technicianId]
      )
    }

    return res.json({ success: true })
  } catch (e) {
    console.error('time/resume error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

module.exports = router

// GET /api/time/summary/:orderId — aggregate sessions for order (safe additive)
router.get('/summary/:orderId', async (req, res) => {
  try {
    const orderId = asInt(req.params.orderId)
    if (!orderId) return res.status(400).json({ success: false, error: 'Invalid orderId' })
    const r = await db.query('SELECT start_at, end_at FROM work_sessions WHERE order_id = $1 ORDER BY start_at ASC', [orderId])
    const sessions = (r.rows || []).map(row => {
      const s = row.start_at ? new Date(row.start_at) : null
      const e = row.end_at ? new Date(row.end_at) : null
      const durSec = s && e ? Math.max(0, Math.floor((e - s) / 1000)) : 0
      return { start_at: row.start_at, end_at: row.end_at, duration_seconds: durSec }
    })
    const total_seconds = sessions.reduce((a, b) => a + (b.duration_seconds || 0), 0)
    return res.json({ success: true, orderId, sessions_count: sessions.length, total_seconds, sessions })
  } catch (e) {
    console.error('time/summary error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/time/summary-by-number/:orderNumber — resolve by order_number then return summary
router.get('/summary-by-number/:orderNumber', async (req, res) => {
  try {
    const num = String(req.params.orderNumber || '').trim()
    if (!num) return res.status(400).json({ success: false, error: 'Invalid order_number' })
    const r = await db.query('SELECT id FROM service_orders WHERE order_number = $1 LIMIT 1', [num])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' })
    const id = r.rows[0].id
    const s = await db.query('SELECT start_at, end_at FROM work_sessions WHERE order_id = $1 ORDER BY start_at ASC', [id])
    const sessions = (s.rows || []).map(row => {
      const start = row.start_at ? new Date(row.start_at) : null
      const end = row.end_at ? new Date(row.end_at) : null
      const durSec = start && end ? Math.max(0, Math.floor((end - start) / 1000)) : 0
      return { start_at: row.start_at, end_at: row.end_at, duration_seconds: durSec }
    })
    const total_seconds = sessions.reduce((a, b) => a + (b.duration_seconds || 0), 0)
    return res.json({ success: true, orderId: id, sessions_count: sessions.length, total_seconds, sessions })
  } catch (e) {
    console.error('time/summary-by-number error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})


