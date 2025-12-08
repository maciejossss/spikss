const express = require('express')
const router = express.Router()
const db = require('../database/connection')

const ensureFetch = async () => {
  if (typeof fetch === 'function') return fetch
  const mod = await import('node-fetch')
  return mod.default
}
// Ensure table exists
const ensureTable = (async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT,
      nip TEXT,
      regon TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      location_lat REAL,
      location_lng REAL,
      logo_base64 TEXT,
      logo_mime TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`)
    await db.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo_base64 TEXT').catch(() => {})
    await db.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo_mime TEXT').catch(() => {})
    await db.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS location_lat REAL').catch(() => {})
    await db.query('ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS location_lng REAL').catch(() => {})
  } catch (e) {
    console.error('❌ company_profile ensure table error:', e?.message)
  }
})()

router.get('/', async (_req, res) => {
  await ensureTable
  try {
    const result = await db.query('SELECT * FROM company_profile WHERE id = 1 LIMIT 1')
    if (result.rows && result.rows.length) {
      return res.json({ success: true, data: result.rows[0] })
    }
    return res.json({ success: true, data: null })
  } catch (e) {
    console.error('❌ company_profile get error:', e)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
})

router.put('/', async (req, res) => {
  await ensureTable
  try {
    const body = req.body || {}

    const toStringOrNull = (value) => {
      if (value == null) return null
      const str = String(value).trim()
      return str.length ? str : null
    }

    const toNumberOrNull = (value) => {
      if (value == null) return null
      if (typeof value === 'string') {
        const normalized = value.replace(',', '.').trim()
        if (!normalized.length) return null
        const num = Number(normalized)
        return Number.isFinite(num) ? num : null
      }
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    const prepared = {
      name: toStringOrNull(body.name),
      nip: toStringOrNull(body.nip),
      regon: toStringOrNull(body.regon),
      address: toStringOrNull(body.address),
      email: toStringOrNull(body.email),
      phone: toStringOrNull(body.phone),
      website: toStringOrNull(body.website),
      location_lat: toNumberOrNull(body.location_lat),
      location_lng: toNumberOrNull(body.location_lng),
      logo_base64: toStringOrNull(body.logo_base64),
      logo_mime: toStringOrNull(body.logo_mime)
    }

    const values = [
      prepared.name,
      prepared.nip,
      prepared.regon,
      prepared.address,
      prepared.email,
      prepared.phone,
      prepared.website,
      prepared.location_lat,
      prepared.location_lng,
      prepared.logo_base64,
      prepared.logo_mime,
      new Date().toISOString()
    ]

    await db.query(
      `INSERT INTO company_profile (id, name, nip, regon, address, email, phone, website, location_lat, location_lng, logo_base64, logo_mime, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         nip = EXCLUDED.nip,
         regon = EXCLUDED.regon,
         address = EXCLUDED.address,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         website = EXCLUDED.website,
         location_lat = EXCLUDED.location_lat,
         location_lng = EXCLUDED.location_lng,
         logo_base64 = EXCLUDED.logo_base64,
         logo_mime = EXCLUDED.logo_mime,
         updated_at = EXCLUDED.updated_at`,
      values
    )

    try {
      const base = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.replace(/\/$/, '') : ''
      const notifyUrl = base ? `${base}/api/notify` : 'http://127.0.0.1:5174/api/notify'
      const fetchImpl = await ensureFetch()
      await fetchImpl(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'company.updated', data: null })
      }).catch(() => {})
    } catch (_) {}

    return res.json({ success: true })
  } catch (e) {
    console.error('❌ company_profile put error:', e)
    return res.status(500).json({ success: false, error: 'Database error' })
  }
})

module.exports = router

