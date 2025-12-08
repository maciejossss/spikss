const express = require('express')
const router = express.Router()
const db = require('../database/connection')

const normalizeText = (value, { upperCase = false } = {}) => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return upperCase ? trimmed.toUpperCase() : trimmed
}

const optional = value => normalizeText(value)

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(
    typeof value === 'string' ? value.replace(',', '.').trim() : value
  )
  return Number.isFinite(num) ? num : fallback
}

const normalizeCurrency = value => normalizeText(value, { upperCase: true }) || 'PLN'

const normalizeParentId = value => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const randomMagazineCode = () =>
  `MAG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

const sanitizeInventoryPayload = raw => {
  const vatRate = toNumber(raw?.vat_rate, 23)
  const gross = toNumber(raw?.gross_price != null ? raw.gross_price : raw?.price, 0)
  const netCandidate = toNumber(raw?.net_price, 0)
  const net = netCandidate > 0
    ? netCandidate
    : (vatRate === 0 ? gross : gross / (1 + vatRate / 100))

  return {
    magazine_code: normalizeText(raw?.magazine_code, { upperCase: true }),
    name: optional(raw?.name),
    category: optional(raw?.category),
    part_number: optional(raw?.part_number),
    manufacturer: optional(raw?.manufacturer),
    manufacturer_code: optional(raw?.manufacturer_code),
    brand: optional(raw?.brand),
    assembly_group: optional(raw?.assembly_group),
    barcode: optional(raw?.barcode),
    description: optional(raw?.description),
    model_compatibility: optional(raw?.model_compatibility),
    supplier: optional(raw?.supplier),
    supplier_part_number: optional(raw?.supplier_part_number),
    notes: optional(raw?.notes),
    location: optional(raw?.location),
    currency: normalizeCurrency(raw?.currency),
    net_price: Number(net.toFixed(2)),
    gross_price: Number(gross.toFixed(2)),
    vat_rate: Number(vatRate.toFixed(2)),
    price: Number(gross.toFixed(2)),
    stock_quantity: toNumber(raw?.stock_quantity, 0),
    min_stock_level: toNumber(raw?.min_stock_level, 0),
    weight: toNumber(raw?.weight, 0),
    unit: optional(raw?.unit),
    package_size: optional(raw?.package_size),
    lead_time_days: toNumber(raw?.lead_time_days, 0),
    last_order_date: optional(raw?.last_order_date),
    supplier_id: raw?.supplier_id != null && raw?.supplier_id !== ''
      ? Number(raw.supplier_id)
      : null,
    synced_at: null,
    updated_by: optional(raw?.updated_by) || 'desktop-sync',
    updated_at: new Date().toISOString()
  }
}

const categoryExists = async ({ name, parentId, excludeId = null }) => {
  const sql = `
    SELECT id
    FROM part_categories
    WHERE name = $1
      AND COALESCE(parent_id, -1) = COALESCE($2::int, -1)
      ${excludeId ? 'AND id <> $3' : ''}
    LIMIT 1
  `
  const params = excludeId ? [name, parentId, excludeId] : [name, parentId]
  const result = await db.query(sql, params)
  return Array.isArray(result.rows) && result.rows.length > 0
}

const toBoolean = value => {
  if (value === undefined || value === null) return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'tak', 'on'].includes(normalized)
}

const toNullableInt = value => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const sanitizeText = value => {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  return str.length ? str : null
}

async function upsertServiceCategories(items = []) {
  if (!Array.isArray(items) || items.length === 0) return { inserted: 0, updated: 0 }
  let inserted = 0
  let updated = 0

  for (const raw of items) {
    if (!raw) continue
    const id = toNullableInt(raw.id)
    const code = sanitizeText(raw.code)
    const name = sanitizeText(raw.name)
    if (!code || !name) continue
    const description = sanitizeText(raw.description)
    const parentId = toNullableInt(raw.parent_id)
    const sortOrder = toNullableInt(raw.sort_order) ?? 0
    const isActive = toBoolean(raw.is_active)
    const createdAt = sanitizeText(raw.created_at)

    if (id != null) {
      await db.query(`
        INSERT INTO service_categories (id, code, name, description, parent_id, sort_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          parent_id = EXCLUDED.parent_id,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `, [id, code, name, description, parentId, sortOrder, isActive, createdAt])
      updated++
    } else {
      const result = await db.query(`
        INSERT INTO service_categories (code, name, description, parent_id, sort_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          parent_id = EXCLUDED.parent_id,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [code, name, description, parentId, sortOrder, isActive, createdAt])
      if (result.rows && result.rows.length) {
        updated++
      } else {
        inserted++
      }
    }
  }

  try {
    await db.query(`SELECT setval('service_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM service_categories))`)
  } catch (err) {
    console.warn('⚠️ Unable to reset service_categories sequence:', err.message)
  }

  return { inserted, updated }
}

// GET /api/service-categories
router.get('/service-categories', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        sc.id,
        sc.code,
        sc.name,
        sc.description,
        sc.parent_id,
        sc.sort_order,
        sc.is_active,
        sc.created_at,
        sc.updated_at,
        (SELECT COUNT(*) FROM service_categories WHERE parent_id = sc.id) AS subcategories_count
      FROM service_categories sc
      ORDER BY COALESCE(sc.sort_order, 0), sc.name
    `)
    return res.json({ success: true, data: rows || [] })
  } catch (e) {
    console.error('GET /service-categories failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

// POST /api/service-categories/sync
router.post('/service-categories/sync', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const stats = await upsertServiceCategories(items)
    return res.json({ success: true, ...stats })
  } catch (e) {
    console.error('POST /service-categories/sync failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

// POST /api/service-categories (single upsert)
router.post('/service-categories', async (req, res) => {
  try {
    const payload = req.body || {}
    const stats = await upsertServiceCategories([payload])
    return res.json({ success: true, ...stats })
  } catch (e) {
    console.error('POST /service-categories failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

// PUT /api/service-categories/:id
router.put('/service-categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'invalid id' })
    const stats = await upsertServiceCategories([{ ...(req.body || {}), id }])
    return res.json({ success: true, ...stats })
  } catch (e) {
    console.error('PUT /service-categories/:id failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

// DELETE /api/service-categories/:id
router.delete('/service-categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'invalid id' })
    const child = await db.query('SELECT COUNT(*) FROM service_categories WHERE parent_id = $1', [id])
    const hasChildren = child.rows && child.rows[0] && parseInt(child.rows[0].count, 10) > 0
    if (hasChildren) {
      return res.status(400).json({ success: false, error: 'category has children' })
    }
    await db.query('DELETE FROM service_categories WHERE id = $1', [id])
    return res.json({ success: true, deleted: 1 })
  } catch (e) {
    console.error('DELETE /service-categories/:id failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.get('/part-categories', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, sort_order, is_active, parent_id, created_at, updated_at
       FROM part_categories
       ORDER BY COALESCE(sort_order, 0) ASC, name ASC`
    )
    return res.json({ success: true, data: rows || [] })
  } catch (e) {
    console.error('GET /part-categories failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.post('/part-categories', async (req, res) => {
  try {
    const { name, description = null, sort_order = 0, is_active = true, parent_id = null } = req.body || {}
    const normalizedName = normalizeText(name)
    if (!normalizedName) {
      return res.status(400).json({ success: false, error: 'name required' })
    }

    const parentId = normalizeParentId(parent_id)
    if (await categoryExists({ name: normalizedName, parentId })) {
      return res.status(409).json({
        success: false,
        error: 'duplicate',
        message: 'Kategoria o tej nazwie już istnieje w wybranym poziomie.'
      })
    }

    const q = `INSERT INTO part_categories (name, description, sort_order, is_active, parent_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`
    const r = await db.query(q, [
      normalizedName,
      description,
      Number(sort_order) || 0,
      !!is_active,
      parentId
    ])
    return res.status(201).json({ success: true, id: r.rows?.[0]?.id || null })
  } catch (e) {
    console.error('POST /part-categories failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.put('/part-categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'invalid id' })
    const { name, description, sort_order, is_active, parent_id } = req.body || {}
    const updates = []
    const vals = []
    let n = 0
    const push = (frag, val) => { updates.push(frag.replace('$N', `$${++n}`)); vals.push(val) }

    let normalizedName = null
    if (name != null) {
      normalizedName = normalizeText(name)
      if (!normalizedName) {
        return res.status(400).json({ success: false, error: 'name required' })
      }
      push('name = $N', normalizedName)
    }

    if (description != null) push('description = $N', description)
    if (sort_order != null) push('sort_order = $N', Number(sort_order) || 0)
    if (is_active != null) push('is_active = $N', !!is_active)
    let parentId = undefined
    if (parent_id !== undefined) {
      parentId = normalizeParentId(parent_id)
      push('parent_id = $N', parentId)
    }
    updates.push('updated_at = CURRENT_TIMESTAMP')
    if (updates.length === 1) return res.json({ success: true })

    if (normalizedName !== null || parentId !== undefined) {
      const lookupName = normalizedName !== null ? normalizedName : await (async () => {
        const current = await db.query('SELECT name FROM part_categories WHERE id = $1', [id])
        return current.rows?.[0]?.name || ''
      })()
      const lookupParent = parentId !== undefined ? parentId : await (async () => {
        const current = await db.query('SELECT parent_id FROM part_categories WHERE id = $1', [id])
        return current.rows?.[0]?.parent_id ?? null
      })()
      if (await categoryExists({ name: lookupName, parentId: lookupParent, excludeId: id })) {
        return res.status(409).json({
          success: false,
          error: 'duplicate',
          message: 'Kategoria o tej nazwie już istnieje w wybranym poziomie.'
        })
      }
    }

    const q = `UPDATE part_categories SET ${updates.join(', ')} WHERE id = $${++n} RETURNING id`
    vals.push(id)
    const r = await db.query(q, vals)
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'not found' })
    return res.json({ success: true })
  } catch (e) {
    console.error('PUT /part-categories/:id failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.delete('/part-categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'invalid id' })
    const r = await db.query('DELETE FROM part_categories WHERE id = $1 RETURNING id', [id])
    if (!r.rows || r.rows.length === 0) return res.status(404).json({ success: false, error: 'not found' })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /part-categories/:id failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.get('/parts', async (_req, res) => {
  try {
    const { rows } = await db.query(`
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
        supplier,
        supplier_part_number,
        lead_time_days,
        last_order_date,
        notes,
        supplier_id,
        synced_at,
        updated_by,
        updated_at,
        created_at
      FROM spare_parts
      ORDER BY name ASC
    `)
    return res.json({ success: true, items: rows || [] })
  } catch (e) {
    console.error('GET /parts failed:', e.message)
    return res.status(500).json({ success: false, error: 'db error', message: e.message })
  }
})

router.post('/sync/parts', async (req, res) => {
  try {
    let items = req.body
    if (typeof items === 'string') {
      try { items = JSON.parse(items) } catch (_) { items = [] }
    }
    if (!Array.isArray(items)) items = []

    const columns = [
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
      'supplier',
      'supplier_part_number',
      'lead_time_days',
      'last_order_date',
      'notes',
      'supplier_id',
      'synced_at',
      'updated_by',
      'updated_at'
    ]

    let upserts = 0
    for (const raw of items) {
      const payload = sanitizeInventoryPayload(raw)
      if (!payload.name || !payload.manufacturer || !payload.part_number) {
        continue
      }
      if (!payload.magazine_code) {
        payload.magazine_code = randomMagazineCode()
      }

      payload.synced_at = new Date().toISOString()

      const values = columns.map(col => payload[col] ?? null)
      try {
        const conflictSql = `
          INSERT INTO spare_parts (${columns.join(', ')})
          VALUES (${columns.map((_, idx) => `$${idx + 1}`).join(', ')})
          ON CONFLICT (magazine_code) DO UPDATE SET
            ${columns.filter(col => col !== 'magazine_code').map(col => `${col} = EXCLUDED.${col}`).join(', ')}
          RETURNING id
        `
        const result = await db.query(conflictSql, values)
        if (result?.rows?.length) upserts += 1
      } catch (error) {
        console.error('[sync/parts] upsert failed:', error.message)
      }
    }

    return res.json({ success: true, upserts })
  } catch (e) {
    console.error('POST /sync/parts failed:', e.message)
    return res.status(200).json({ success: true, upserts: 0 })
  }
})

module.exports = router


