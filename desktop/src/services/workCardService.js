const toDateString = (value) => {
  if (!value) return null
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch (_) {
    return null
  }
}

export const fetchTechnicians = async () => {
  if (!window?.electronAPI?.database) return []
  try {
    const rows = await window.electronAPI.database.query(
      `
        SELECT id, full_name, role
        FROM users
        WHERE full_name IS NOT NULL AND TRIM(full_name) <> ''
        ORDER BY UPPER(full_name)
      `
    )
    return Array.isArray(rows) ? rows : []
  } catch (error) {
    console.error('[workCardService] fetchTechnicians failed:', error)
    return []
  }
}

const buildRange = ({ from, to }) => {
  const today = new Date()
  const defaultTo = toDateString(today)
  const defaultFrom = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6))
  return {
    start: toDateString(from) || defaultFrom,
    end: toDateString(to) || defaultTo
  }
}

export const fetchWorkLogs = async ({ technicianId = null, fromDate = null, toDate = null } = {}) => {
  if (!window?.electronAPI?.database) return []
  const range = buildRange({ from: fromDate, to: toDate })
  const params = []
  const filters = [`LOWER(status) = 'completed'`]

  if (technicianId) {
    filters.push('assigned_user_id = ?')
    params.push(Number(technicianId))
  }

  if (range.start) {
    filters.push(`date(COALESCE(so.actual_end_date, so.completed_at, so.updated_at)) >= date(?)`)
    params.push(range.start)
  }
  if (range.end) {
    filters.push(`date(COALESCE(so.actual_end_date, so.completed_at, so.updated_at)) <= date(?)`)
    params.push(range.end)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  try {
    const orders = await window.electronAPI.database.query(
      `
        SELECT
          so.id,
          so.order_number,
          so.title,
          so.assigned_user_id,
          so.actual_start_date,
          so.actual_end_date,
          so.actual_hours,
          so.completion_notes,
          so.notes,
          so.completed_categories,
          so.parts_used,
          so.work_photos,
          so.updated_at,
          so.completed_at,
          c.company_name,
          c.first_name,
          c.last_name,
          c.phone AS client_phone,
          c.email AS client_email,
          TRIM(COALESCE(
            c.address,
            c.address_street || ' ' || c.address_city
          )) AS client_address,
          so.client_name AS order_client_name,
          so.client_phone AS order_client_phone,
          so.client_email AS order_client_email,
          TRIM(COALESCE(so.address, '')) AS order_client_address,
          d.name AS device_name,
          d.model AS device_model,
          d.serial_number AS device_serial,
          u.full_name AS technician_name
        FROM service_orders so
        LEFT JOIN clients c ON c.id = so.client_id
        LEFT JOIN devices d ON d.id = so.device_id
        LEFT JOIN users u ON u.id = so.assigned_user_id
        ${whereClause}
        ORDER BY COALESCE(so.actual_end_date, so.completed_at, so.updated_at) DESC
      `,
      params
    )

    const orderList = Array.isArray(orders) ? orders : []
    if (!orderList.length) return []

    // Pobierz mapę kategorii (id -> kod) do późniejszego fallbacku
    let serviceCategoryIdToCode = new Map()
    try {
      const categoryRows = await window.electronAPI.database.query('SELECT id, code FROM service_categories')
      if (Array.isArray(categoryRows)) {
        serviceCategoryIdToCode = new Map(
          categoryRows
            .filter(row => row && row.id != null && row.code)
            .map(row => [Number(row.id), String(row.code)])
        )
      }
    } catch (categoryError) {
      console.warn('[workCardService] fetchWorkLogs categories query failed:', categoryError)
      serviceCategoryIdToCode = new Map()
    }

    const parseCategoryList = (raw) => {
      try {
        if (!raw) return []
        if (Array.isArray(raw)) return raw.map(v => String(v).trim()).filter(Boolean)
        const text = String(raw).trim()
        if (!text) return []
        if (text.startsWith('[')) {
          const parsed = JSON.parse(text)
          return Array.isArray(parsed) ? parsed.map(v => String(v).trim()).filter(Boolean) : []
        }
        return text.split(',').map(v => String(v).trim()).filter(Boolean)
      } catch (_) {
        return []
      }
    }

    const orderIds = orderList.map(o => o.id).filter(id => id != null)
    let partsByOrder = {}
    let invoicesByOrder = {}
    let protocolsByOrder = {}
    try {
      const placeholders = orderIds.map(() => '?').join(',')
      const parts = await window.electronAPI.database.query(
        `
          SELECT
            op.order_id,
            op.quantity,
            op.unit_price,
            COALESCE(sp.name, 'Nieznana część') AS name,
            COALESCE(sp.part_number, '') AS part_number
          FROM order_parts op
          LEFT JOIN spare_parts sp ON sp.id = op.part_id
          WHERE op.order_id IN (${placeholders})
          ORDER BY op.order_id, name
        `,
        orderIds
      )
      if (Array.isArray(parts)) {
        partsByOrder = parts.reduce((acc, part) => {
          acc[part.order_id] = acc[part.order_id] || []
          acc[part.order_id].push(part)
          return acc
        }, {})
      }
    } catch (partsError) {
      console.warn('[workCardService] fetchWorkLogs parts query failed:', partsError)
    }

    // Faktury
    try {
      if (orderIds.length) {
        const placeholders = orderIds.map(() => '?').join(',')
        const invoiceRows = await window.electronAPI.database.query(
          `
            SELECT DISTINCT order_id
            FROM simple_invoices
            WHERE order_id IN (${placeholders})
          `,
          orderIds
        )
        if (Array.isArray(invoiceRows)) {
          invoicesByOrder = invoiceRows.reduce((acc, row) => {
            if (row && row.order_id != null) acc[row.order_id] = true
            return acc
          }, {})
        }
      }
    } catch (invoiceError) {
      console.warn('[workCardService] fetchWorkLogs invoices query failed:', invoiceError)
    }

    // Protokoły
    try {
      if (orderIds.length) {
        const placeholders = orderIds.map(() => '?').join(',')
        let hasArchivedAt = false

        try {
          const columns = await window.electronAPI.database.query('PRAGMA table_info(service_protocols)')
          if (Array.isArray(columns)) {
            hasArchivedAt = columns.some(col => {
              const name = col?.name ?? col?.Name
              return typeof name === 'string' && name.toLowerCase() === 'archived_at'
            })
          }
        } catch (schemaError) {
          console.warn('[workCardService] protocols schema check failed:', schemaError)
        }

        const protocolQuery = hasArchivedAt
          ? `
              SELECT order_id
              FROM service_protocols
              WHERE order_id IN (${placeholders})
                AND (archived_at IS NULL OR TRIM(archived_at) = '')
            `
          : `
              SELECT order_id
              FROM service_protocols
              WHERE order_id IN (${placeholders})
            `

        const protocolRows = await window.electronAPI.database.query(protocolQuery, orderIds)
        if (Array.isArray(protocolRows)) {
          protocolsByOrder = protocolRows.reduce((acc, row) => {
            if (row && row.order_id != null) acc[row.order_id] = true
            return acc
          }, {})
        }
      }
    } catch (protocolError) {
      console.warn('[workCardService] fetchWorkLogs protocols query failed:', protocolError)
    }

    const parsePartsUsedText = raw => {
      try {
        if (!raw) return []
        if (Array.isArray(raw)) {
          return raw
            .map(entry => {
              if (!entry) return null
              if (typeof entry === 'string') {
                return { name: entry.trim() }
              }
              if (typeof entry === 'object') {
                const item = { ...entry }
                if (item.name) item.name = String(item.name).trim()
                if (item.part_number) item.part_number = String(item.part_number).trim()
                if (item.quantity != null) {
                  const q = Number(item.quantity)
                  item.quantity = Number.isFinite(q) ? q : null
                }
                return item.name ? item : null
              }
              return null
            })
            .filter(Boolean)
        }

        const text = String(raw).replace(/\r/g, '').trim()
        if (!text) return []

        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            return parsed
              .map(item => {
                if (!item) return null
                if (typeof item === 'string') {
                  return { name: item.trim() }
                }
                if (typeof item === 'object') {
                  const obj = { ...item }
                  if (obj.name) obj.name = String(obj.name).trim()
                  if (obj.part_number) obj.part_number = String(obj.part_number).trim()
                  if (obj.quantity != null) {
                    const q = Number(obj.quantity)
                    obj.quantity = Number.isFinite(q) ? q : null
                  }
                  return obj.name ? obj : null
                }
                return null
              })
              .filter(Boolean)
          }
        } catch (_) {
          // ignore JSON parse errors, fallback to text parsing
        }

        return text
          .split(/[\n;]+/)
          .map(entry => entry.trim())
          .filter(Boolean)
          .map(entry => {
            const quantityMatch = entry.match(/[x×]\s*([\d.,]+)/i)
            const partNumberMatch = entry.match(/\(([^()]+)\)/)
            const quantity = quantityMatch
              ? Number(quantityMatch[1].replace(',', '.'))
              : null
            let name = entry
            if (quantityMatch) {
              name = name.replace(quantityMatch[0], '')
            }
            if (partNumberMatch) {
              name = name.replace(partNumberMatch[0], '')
            }
            name = name.replace(/\s{2,}/g, ' ').trim()
            return {
              name: name || entry,
              part_number: partNumberMatch ? partNumberMatch[1].trim() : null,
              quantity: Number.isFinite(quantity) ? quantity : null
            }
          })
      } catch (_) {
        return []
      }
    }

    return orderList.map(order => {
      const reportedHours = (() => {
        const raw = order.actual_hours
        if (raw === null || raw === undefined) return null
        const num = typeof raw === 'number' ? raw : Number(raw)
        return Number.isFinite(num) && num > 0 ? num : null
      })()

      const start = order.actual_start_date ? new Date(order.actual_start_date) : null
      const endDate = order.actual_end_date || order.completed_at || order.updated_at || null
      const end = endDate ? new Date(endDate) : null
      let calculatedSeconds = null
      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const diff = Math.max(0, end.getTime() - start.getTime())
        calculatedSeconds = diff > 0 ? Math.round(diff / 1000) : null
      }
      const calculatedHours = calculatedSeconds != null ? Math.round((calculatedSeconds / 3600) * 100) / 100 : null
      const actualHours = reportedHours != null ? reportedHours : (calculatedHours || 0)

      const rawNotes = order.notes != null ? String(order.notes) : ''
      const technicianNotes = normalizeTechnicianNotes(rawNotes, order.order_number)

      const completedCodes = parseCategoryList(order.completed_categories)
      const serviceCategoryCodes = parseCategoryList(order.service_categories)
        .map(code => {
          const trimmed = String(code).trim()
          const numeric = Number(trimmed)
          if (Number.isFinite(numeric) && serviceCategoryIdToCode.has(numeric)) {
            return serviceCategoryIdToCode.get(numeric)
          }
          return trimmed
        })
        .filter(Boolean)
      const resolvedCategoryCodes = completedCodes.length ? completedCodes : serviceCategoryCodes

      const namePiecesRaw = []
      const addPiece = (value) => {
        const trimmed = (value || '').toString().trim()
        if (!trimmed) return
        namePiecesRaw.push(trimmed)
      }
      addPiece(order.company_name)
      addPiece([order.first_name, order.last_name].filter(Boolean).join(' '))

      const seenPieces = new Set()
      const uniquePieces = namePiecesRaw.filter(piece => {
        const key = piece.toLowerCase()
        if (seenPieces.has(key)) return false
        seenPieces.add(key)
        return true
      })

      const primaryDisplay = uniquePieces.join(' – ').trim()

      const fallbackDisplay = (() => {
        const legacy = (order.order_client_name && String(order.order_client_name).trim()) || ''
        if (legacy) return legacy
        const email = (order.order_client_email && String(order.order_client_email).trim()) || ''
        if (email) return email
        return ''
      })()

      return {
        ...order,
        actual_hours: actualHours,
        reported_hours: reportedHours,
        calculated_hours: calculatedHours,
        calculated_seconds: calculatedSeconds,
        actual_start_date: order.actual_start_date || null,
        actual_end_date: endDate,
        technician_name: order.technician_name || '',
        technician_notes: technicianNotes,
        client_display_name: primaryDisplay || fallbackDisplay || 'Klient nieznany',
        completed_categories: order.completed_categories,
        categoryCodes: resolvedCategoryCodes,
        parts: (() => {
          const explicit = partsByOrder[order.id] || []
          if (explicit.length) return explicit
          return parsePartsUsedText(order.parts_used)
        })(),
        notes: rawNotes,
        client_phone: order.client_phone || order.order_client_phone || null,
        client_email: order.client_email || order.order_client_email || null,
        client_address: (order.client_address && order.client_address.trim())
          ? order.client_address.trim()
          : (order.order_client_address && order.order_client_address.trim()
              ? order.order_client_address.trim()
              : null),
        has_invoice: !!invoicesByOrder[order.id],
        has_protocol: !!protocolsByOrder[order.id]
      }
    })
  } catch (error) {
    console.error('[workCardService] fetchWorkLogs failed:', error)
    return []
  }
}

const normalizeTechnicianNotes = (value, orderNumber) => {
  const text = String(value || '').trim()
  if (!text) return ''
  const looksLikeSrv = /^SRV-\d{4}-\d+/.test(text)
  const looksLikeId = /^\d+$/.test(text)
  const equalsOrder = orderNumber && text === String(orderNumber)
  return (looksLikeSrv || looksLikeId || equalsOrder) ? '' : text
}

