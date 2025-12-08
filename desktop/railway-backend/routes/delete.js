const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// Simple admin guard via header. In production set DELETE_ADMIN_SECRET env var.
function requireAdmin(req, res) {
  const expected = String(process.env.DELETE_ADMIN_SECRET || '').trim()
  if (!expected) return { ok: true } // if not configured, allow (for dev)
  const provided = String(req.get('x-admin-secret') || req.get('X-Admin-Secret') || '').trim()
  if (provided && provided === expected) return { ok: true }
  return { ok: false, status: 403, body: { success: false, error: 'Forbidden' } }
}

// Resolve helpers
async function resolveClientId(payload) {
  try {
    if (payload?.client?.id) return Number(payload.client.id) || null
    const email = String(payload?.client?.email || '').trim().toLowerCase()
    if (!email) return null
    const r = await db.query('SELECT id FROM clients WHERE lower(trim(email)) = $1 LIMIT 2', [email])
    if (r.rows && r.rows.length === 1) return r.rows[0].id
  } catch (_) {}
  return null
}

async function resolveDeviceIds(payload, clientId) {
  const ids = new Set()
  try {
    if (payload?.device?.id) {
      const id = Number(payload.device.id)
      if (Number.isInteger(id) && id > 0) ids.add(id)
    }
  } catch (_) {}
  try {
    const serial = String(payload?.device?.serial || '').trim().toLowerCase()
    if (serial) {
      const r = await db.query('SELECT id FROM devices WHERE lower(trim(serial_number)) = $1', [serial])
      for (const row of (r.rows || [])) ids.add(row.id)
    }
  } catch (_) {}
  try {
    if (clientId) {
      const r = await db.query('SELECT id FROM devices WHERE client_id = $1', [clientId])
      for (const row of (r.rows || [])) ids.add(row.id)
    }
  } catch (_) {}
  return Array.from(ids)
}

async function resolveOrderIds(payload, clientId, deviceIds) {
  const ids = new Set()
  try {
    const num = String(payload?.order?.order_number || '').trim()
    if (num) {
      const r = await db.query('SELECT id FROM service_orders WHERE order_number = $1', [num])
      for (const row of (r.rows || [])) ids.add(row.id)
    }
  } catch (_) {}
  try {
    if (Array.isArray(deviceIds) && deviceIds.length > 0) {
      const r = await db.query('SELECT id FROM service_orders WHERE device_id = ANY($1::int[])', [deviceIds])
      for (const row of (r.rows || [])) ids.add(row.id)
    }
  } catch (_) {}
  try {
    if (clientId) {
      const r = await db.query('SELECT id FROM service_orders WHERE client_id = $1', [clientId])
      for (const row of (r.rows || [])) ids.add(row.id)
    }
  } catch (_) {}
  return Array.from(ids)
}

async function summarizeFiles(deviceIds) {
  if (!deviceIds || deviceIds.length === 0) return { count: 0, total_bytes: 0, ids: [] }
  const r = await db.query('SELECT id, file_size FROM device_files WHERE device_id = ANY($1::int[])', [deviceIds])
  let total = 0
  const ids = []
  for (const row of (r.rows || [])) { ids.push(row.id); total += Number(row.file_size || 0) }
  return { count: ids.length, total_bytes: total, ids }
}

function buildPreviewResponse(scope, details) {
  return {
    success: true,
    committed: false,
    scope,
    counts: {
      clients: scope.client ? 1 : 0,
      devices: (scope.devices || []).length,
      orders: (scope.orders || []).length,
      files: details.files?.count || 0
    },
    files: { count: details.files?.count || 0, total_bytes: details.files?.total_bytes || 0 },
    warnings: ['Części i słowniki części nie są usuwane w tym procesie'],
    canDelete: true
  }
}

router.post('/preview', async (req, res) => {
  try {
    const guard = requireAdmin(req, res)
    if (!guard.ok) return res.status(guard.status).json(guard.body)

    const payload = req.body || {}
    const clientId = await resolveClientId(payload)
    // If client specified but ambiguous/missing, report NO-GO
    if (payload.client && !clientId) {
      return res.json({ success: true, committed: false, canDelete: false, error: 'Client not uniquely resolved' })
    }
    const deviceIds = await resolveDeviceIds(payload, clientId)
    if (payload.device && deviceIds.length === 0) {
      return res.json({ success: true, committed: false, canDelete: false, error: 'Device not found' })
    }
    const orderIds = await resolveOrderIds(payload, clientId, deviceIds)
    const files = await summarizeFiles(deviceIds)

    // Compose scope detail lists
    const scope = { client: null, devices: [], orders: [] }
    if (clientId) {
      const c = await db.query('SELECT id, email FROM clients WHERE id = $1', [clientId])
      if (c.rows && c.rows[0]) scope.client = { id: c.rows[0].id, email: c.rows[0].email || null }
    }
    if (deviceIds.length) {
      const d = await db.query('SELECT id, serial_number, name FROM devices WHERE id = ANY($1::int[])', [deviceIds])
      scope.devices = (d.rows || []).map(x => ({ id: x.id, serial: x.serial_number, name: x.name }))
    }
    if (orderIds.length) {
      const o = await db.query('SELECT id, order_number FROM service_orders WHERE id = ANY($1::int[])', [orderIds])
      scope.orders = (o.rows || []).map(x => ({ id: x.id, order_number: x.order_number }))
    }

    return res.json(buildPreviewResponse(scope, { files }))
  } catch (e) {
    console.error('DELETE /preview error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

router.post('/commit', async (req, res) => {
  const client = await db.beginTransaction().catch(() => null)
  try {
    const guard = requireAdmin(req, res)
    if (!guard.ok) return res.status(guard.status).json(guard.body)

    const payload = req.body || {}
    if (!payload || payload.confirm !== true) {
      return res.status(400).json({ success: false, error: 'confirm=true required' })
    }
    const clientId = await resolveClientId(payload)
    if (payload.client && !clientId) {
      return res.status(400).json({ success: false, error: 'Client not uniquely resolved' })
    }
    const deviceIds = await resolveDeviceIds(payload, clientId)
    if (payload.device && deviceIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Device not found' })
    }
    const orderIds = await resolveOrderIds(payload, clientId, deviceIds)

    // Delete dependencies in safe order before orders/devices/clients
    // 1) invoice_items -> invoices (powiązane ze zleceniami/klientem)
    try {
      if (orderIds.length) {
        await client.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ANY($1::int[]))', [orderIds])
        await client.query('DELETE FROM invoices WHERE order_id = ANY($1::int[])', [orderIds])
      }
      if (clientId) {
        await client.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1)', [clientId])
        await client.query('DELETE FROM invoices WHERE client_id = $1', [clientId])
      }
    } catch (_) { /* best-effort: tabele mogą nie istnieć w niektórych wdrożeniach */ }

    // 2) order_parts (zależne od service_orders)
    try {
      if (orderIds.length) {
        await client.query('DELETE FROM order_parts WHERE order_id = ANY($1::int[])', [orderIds])
      }
    } catch (_) {}

    // 2a) time_entries (zależne od service_orders)
    try {
      if (orderIds.length) {
        await client.query('DELETE FROM time_entries WHERE order_id = ANY($1::int[])', [orderIds])
      }
    } catch (_) {}

    // 3) calendar_events (mogą wskazywać na zlecenia/klienta)
    try {
      if (orderIds.length) {
        await client.query('DELETE FROM calendar_events WHERE order_id = ANY($1::int[])', [orderIds])
      }
      if (clientId) {
        await client.query('DELETE FROM calendar_events WHERE user_id IN (SELECT id FROM users) AND order_id IS NULL AND title LIKE $1', [`%${clientId}%`])
      }
    } catch (_) {}

    // 4) Teraz zlecenia
    if (orderIds.length) {
      await client.query('DELETE FROM service_orders WHERE id = ANY($1::int[])', [orderIds])
    }
    // Files first
    if (deviceIds.length) {
      await client.query('DELETE FROM device_files WHERE device_id = ANY($1::int[])', [deviceIds])
    }
    // Then devices
    if (deviceIds.length) {
      await client.query('DELETE FROM devices WHERE id = ANY($1::int[])', [deviceIds])
    }
    // Then client
    if (clientId) {
      await client.query('DELETE FROM clients WHERE id = $1', [clientId])
    }

    await db.commitTransaction(client)

    return res.json({ success: true, committed: true, counts: {
      clients: clientId ? 1 : 0,
      devices: deviceIds.length,
      orders: orderIds.length,
      // files count unknown post-delete without extra query; preview provides exact
    } })
  } catch (e) {
    try { if (client) await db.rollbackTransaction(client) } catch (_) {}
    console.error('DELETE /commit error', e)
    // Zwróć szczegóły dla diagnostyki (bezpieczne pola z obiektu błędu)
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: e && (e.message || String(e)),
      code: e && e.code,
      constraint: e && e.constraint,
      table: e && e.table,
      hint: e && e.hint
    })
  }
})

module.exports = router


