import { config } from '../../env-config'

const ACTIVE_STATUSES = new Set(['assigned', 'in_progress', 'waiting_for_parts'])
const PENDING_SYNC_ALLOWED = new Set(['new', 'assigned', 'in_progress', 'waiting_for_parts'])

const DEFAULT_CLIENT_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'company_name',
  'type',
  'email',
  'phone',
  'address',
  'address_street',
  'address_city',
  'address_postal_code',
  'address_country',
  'notes',
  'is_active'
]

function toDisplayName(client) {
  if (!client) return 'Nieznany klient'

  const company = (client.company_name || '').trim()
  if (client.type === 'business' && company) {
    return company
  }

  const first = (client.first_name || '').trim()
  const last = (client.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full

  if (company) return company
  if (client.email) return client.email.split('@')[0]
  if (client.address_city) return client.address_city

  return `Klient #${client.id}`
}

function toAddressLabel(client) {
  if (!client) return ''
  const parts = []
  if (client.address_street) parts.push(client.address_street)

  if (client.address_postal_code || client.address_city) {
    parts.push(
      [client.address_postal_code, client.address_city]
        .filter(Boolean)
        .join(' ')
        .trim()
    )
  }

  if (client.address_country && client.address_country !== 'Polska') {
    parts.push(client.address_country)
  }

  if (!parts.length && client.address) return client.address
  return parts.filter(Boolean).join(', ')
}

export function buildFullAddress(client) {
  if (!client) return ''

  const clean = value =>
    value == null ? '' : String(value).replace(/\s+/g, ' ').trim()

  const parts = []
  const street = clean(client.address_street)
  if (street) parts.push(street)

  const cityLine = clean(
    [client.address_postal_code, client.address_city].filter(Boolean).join(' ')
  )
  if (cityLine) parts.push(cityLine)

  const country = clean(client.address_country || 'Polska')
  if (country) parts.push(country)

  if (parts.length) {
    return parts.join(', ')
  }

  const fallback = clean(client.address)
  if (fallback) {
    const deduped = Array.from(
      new Set(
        fallback
          .split(',')
          .map(clean)
          .filter(Boolean)
      )
    )
    if (deduped.length) {
      return deduped.join(', ')
    }
    return fallback
  }

  return ''
}

const STREET_PREFIX_REGEX =
  /^(ulica|ul\.?|al\.?|aleja|pl\.?|plac|os\.?|osiedle)\s+/i

function stripStreetPrefix(value) {
  if (!value) return ''
  return value.replace(STREET_PREFIX_REGEX, '').trim()
}

function toAscii(value) {
  if (!value) return ''
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function buildGeocodeAddress(client) {
  if (!client) return ''

  const clean = value =>
    value == null ? '' : String(value).replace(/\s+/g, ' ').trim()

  const street = stripStreetPrefix(clean(client.address_street))
  const postal = clean(client.address_postal_code)
  const city = clean(client.address_city)
  const country = clean(client.address_country) || 'Polska'

  const parts = []
  if (street) parts.push(street)
  if (postal || city) {
    parts.push([postal, city].filter(Boolean).join(' '))
  }
  if (country) parts.push(country)

  let composed = parts.filter(Boolean).join(', ')

  if (!composed) {
    const fallback = clean(client.address)
    if (fallback) {
      composed = fallback
    }
  }

  if (!composed) return ''

  return toAscii(composed)
}

function mapOrderSnapshot(order) {
  return {
    id: order.id,
    status: order.status,
    desktopSyncStatus: order.desktop_sync_status,
    updatedAt: order.updated_at,
    createdAt: order.created_at
  }
}

function aggregateOrders(orders) {
  const total = orders.length

  const counts = {
    total,
    active: 0,
    pendingSync: 0
  }

  const byStatus = {}
  const state = {
    hasActiveSynced: false,
    hasPendingSync: false
  }

  for (const order of orders) {
    const status = (order.status || '').toLowerCase()
    const syncStatus = (order.desktopSyncStatus || '').toLowerCase()
    const isSynced = syncStatus === 'sent'

    byStatus[status] = (byStatus[status] || 0) + 1

    if (ACTIVE_STATUSES.has(status)) {
      counts.active += 1
      if (isSynced) {
        state.hasActiveSynced = true
      }
    }

    if (
      PENDING_SYNC_ALLOWED.has(status) &&
      !isSynced
    ) {
      counts.pendingSync += 1
      state.hasPendingSync = true
    }
  }

  return {
    counts,
    byStatus,
    state
  }
}

export async function loadMapClients() {
  if (!window?.electronAPI?.database) return []

  const clientRows =
    (await window.electronAPI.database.query(
      `SELECT ${DEFAULT_CLIENT_FIELDS.join(', ')}
       FROM clients
       WHERE is_active IS NULL OR is_active <> 0`
    )) || []

  const orderRows =
    (await window.electronAPI.database.query(
      `SELECT id, client_id, status, desktop_sync_status, updated_at, created_at
       FROM service_orders
       WHERE client_id IS NOT NULL`
    )) || []

  const ordersByClient = new Map()
  for (const row of orderRows) {
    const key = row.client_id
    if (!ordersByClient.has(key)) {
      ordersByClient.set(key, [])
    }
    ordersByClient.get(key).push(mapOrderSnapshot(row))
  }

  return clientRows.map(rawClient => {
    const orders = ordersByClient.get(rawClient.id) || []
    const aggregated = aggregateOrders(orders)

    return {
      id: rawClient.id,
      displayName: toDisplayName(rawClient),
      addressLabel: toAddressLabel(rawClient),
      fullAddress: buildFullAddress(rawClient),
      geocodeAddress: buildGeocodeAddress(rawClient),
      raw: rawClient,
      orders,
      stats: aggregated,
      latitude: null,
      longitude: null,
      distanceKm: null
    }
  })
}

export function isMapEnabled() {
  return !!config.MAP?.ENABLED
}

export function getMapConfig() {
  return config.MAP || {}
}

