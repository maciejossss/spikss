<template>
  <div class="flex h-full flex-col">
    <div class="px-6 pt-6 pb-4">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-secondary-900">Mapa klientów</h1>
          <p class="mt-1 text-sm text-secondary-600">
            Interaktywna mapa prezentująca klientów wraz z podglądem zleceń i statusem synchronizacji.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="rounded-lg border px-3 py-1.5 text-sm transition-colors"
            :class="filter === option.value
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'border-secondary-300 text-secondary-600 hover:bg-secondary-50'"
            @click="setFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </header>
    </div>

    <section class="relative flex-1 min-h-0">
      <div class="absolute inset-0 z-0">
        <div
          v-if="!mapEnabled"
          class="flex h-full w-full items-center justify-center bg-white/90 px-8 text-center backdrop-blur"
        >
          <div>
            <h2 class="mb-2 text-lg font-semibold text-secondary-900">
              Moduł mapy jest wyłączony w konfiguracji
            </h2>
            <p class="text-sm text-secondary-600">
              Skontaktuj się z administratorem w celu aktywacji modułu mapy (ustawienie <code>config.MAP.ENABLED</code>).
            </p>
          </div>
        </div>
        <div
          v-else
          ref="mapRef"
          class="h-full w-full"
        ></div>
      </div>
      <aside
        class="absolute inset-x-4 bottom-4 z-40 mx-auto flex max-h-[65vh] w-auto max-w-2xl flex-col overflow-hidden rounded-2xl border border-secondary-200 bg-white/95 shadow-xl md:inset-auto md:right-6 md:top-6 md:mx-0 md:max-h-[70vh] md:w-full md:max-w-xl lg:max-w-md"
      >
          <div class="space-y-3 border-b border-secondary-200 p-4">
            <div class="flex items-center justify-between text-sm text-secondary-600">
              <span>Klientów na mapie:</span>
              <span class="font-medium text-secondary-900">
                {{ locatedClients.length }} / {{ clients.length }}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm text-secondary-600">
              <span>Oczekujące geokodowanie:</span>
              <span class="font-medium text-secondary-900">{{ geocodeQueueSize }}</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model.trim="search"
                type="text"
                placeholder="Szukaj klienta lub adresu..."
                class="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
            </div>
            <p v-if="errorMessage" class="flex items-start gap-2 text-sm text-red-600">
              <i class="fas fa-exclamation-triangle mt-1"></i>
              <span>{{ errorMessage }}</span>
            </p>
            <div class="space-y-1 text-xs text-secondary-500">
              <p class="flex items-center gap-2">
                <span class="inline-flex h-3 w-3 rounded-full bg-primary-500"></span>
                <span>Klienci z aktywnymi zleceniami</span>
              </p>
              <p class="flex items-center gap-2">
                <span class="inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
                <span>Klienci z zleceniami do wysłania</span>
              </p>
              <p class="flex items-center gap-2">
                <span class="inline-flex h-3 w-3 rounded-full bg-secondary-400"></span>
                <span>Pozostali klienci</span>
              </p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-secondary-100">
            <div
              v-if="!filteredClients.length"
              class="px-4 py-6 text-center text-sm text-secondary-500"
            >
              Brak klientów spełniających podane kryteria.
            </div>

            <button
              v-for="item in filteredClients"
              :key="item.id"
              type="button"
              class="w-full px-4 py-3 text-left transition hover:bg-secondary-50"
              @click="focusClient(item)"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-secondary-900">{{ item.displayName }}</p>
                  <p class="mt-0.5 text-xs text-secondary-500">
                    {{ item.addressLabel || 'Brak adresu' }}
                  </p>
                </div>
                <div v-if="item.distanceKm != null" class="text-sm font-medium text-secondary-700">
                  {{ item.distanceKm.toFixed(1) }} km
                </div>
              </div>
              <div class="mt-2 flex items-center gap-3 text-xs text-secondary-500">
                <span class="inline-flex items-center gap-1">
                  <i class="fas fa-list"></i>
                  {{ item.stats.counts.total }}
                </span>
                <span
                  v-if="item.stats.counts.active"
                  class="inline-flex items-center gap-1 text-primary-600"
                >
                  <i class="fas fa-bolt"></i>
                  {{ item.stats.counts.active }} aktywne
                </span>
                <span
                  v-if="item.stats.counts.pendingSync"
                  class="inline-flex items-center gap-1 text-amber-600"
                >
                  <i class="fas fa-cloud-upload-alt"></i>
                  {{ item.stats.counts.pendingSync }} do wysłania
                </span>
              </div>
            </button>
          </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  getMapConfig,
  isMapEnabled,
  loadMapClients
} from '../services/mapService'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const LOCAL_LOCATION_KEY = 'serwis-company-location'
const LOCAL_COMPANY_KEY = 'serwis-company-profile'
const DEFAULT_HEADQUARTERS = { lat: 52.90235, lon: 16.57361 }
const DEFAULT_HEADQUARTERS_ADDRESS = 'ul. Sikorskiego 47, 64-700 Czarnków'
const INVALID_COORD_PAIRS = [
  { lat: 52.237049, lon: 21.017532 },
  { lat: 51.919438, lon: 19.145136 },
  { lat: 0, lon: 0 }
]
const INVALID_COORD_TOLERANCE = 1e-3

const isInvalidCoordinatePair = (lat, lon) =>
  INVALID_COORD_PAIRS.some(
    pair =>
      Math.abs(lat - pair.lat) < INVALID_COORD_TOLERANCE &&
      Math.abs(lon - pair.lon) < INVALID_COORD_TOLERANCE
  )

const loadStoredHeadquarters = () => {
  try {
    const raw = localStorage.getItem(LOCAL_LOCATION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const rawLat = parsed.lat
      const rawLng = parsed.lng
      const lat =
        rawLat == null
          ? null
          : typeof rawLat === 'string'
          ? rawLat.trim().length
            ? Number(rawLat)
            : null
          : Number(rawLat)
      const lon =
        rawLng == null
          ? null
          : typeof rawLng === 'string'
          ? rawLng.trim().length
            ? Number(rawLng)
            : null
          : Number(rawLng)
      if (lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
        if (isInvalidCoordinatePair(lat, lon)) {
          return { ...DEFAULT_HEADQUARTERS }
        }
        return { lat, lon }
      }
    }
    }
    const companyRaw = localStorage.getItem(LOCAL_COMPANY_KEY)
    if (companyRaw) {
      const companyParsed = JSON.parse(companyRaw)
      if (
        companyParsed &&
        typeof companyParsed === 'object' &&
        companyParsed.location_lat != null &&
        companyParsed.location_lng != null
      ) {
        const lat = Number(companyParsed.location_lat)
        const lon = Number(companyParsed.location_lng)
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          if (isInvalidCoordinatePair(lat, lon)) {
            return { ...DEFAULT_HEADQUARTERS }
          }
          return {
            lat,
            lon
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Map] loadStoredHeadquarters failed:', error)
  }
  return { ...DEFAULT_HEADQUARTERS }
}

const persistStoredHeadquarters = (lat, lon) => {
  try {
    if (
      lat == null ||
      lon == null ||
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      isInvalidCoordinatePair(lat, lon)
    ) {
      localStorage.removeItem(LOCAL_LOCATION_KEY)
      if (lat == null || lon == null) {
        return
      }
      lat = DEFAULT_HEADQUARTERS.lat
      lon = DEFAULT_HEADQUARTERS.lon
    }
    const storedAt = new Date().toISOString()
    localStorage.setItem(
      LOCAL_LOCATION_KEY,
      JSON.stringify({ lat, lng: lon, storedAt })
    )
    const existing = localStorage.getItem(LOCAL_COMPANY_KEY)
    if (existing) {
      try {
        const parsed = JSON.parse(existing) || {}
        parsed.location_lat = String(lat)
        parsed.location_lng = String(lon)
        parsed.storedAt = storedAt
        localStorage.setItem(LOCAL_COMPANY_KEY, JSON.stringify(parsed))
      } catch (_) {
        // ignore parse issues
      }
    }
  } catch (error) {
    console.warn('[Map] persistStoredHeadquarters failed:', error)
  }
}

const mapRef = ref(null)
const mapInstance = ref(null)
const markersLayer = ref(null)
const companyMarker = ref(null)

const clients = ref([])
const locatedClients = ref([])
const filter = ref('all')
const search = ref('')
const errorMessage = ref('')
const mapEnabled = isMapEnabled()
const mapConfig = getMapConfig()

const geocodeQueue = ref([])
const geocodeProcessing = ref(false)
const cacheVersion = mapConfig.CACHE_VERSION || 'v1'

let resizeFrame = null

const handleResize = () => {
  const map = mapInstance.value
  if (!map) return

  map.invalidateSize()

  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null
    if (!mapInstance.value || !mapInstance.value._loaded) return
    updateMarkers()
  })
}

const filterOptions = [
  { label: 'Wszyscy', value: 'all' },
  { label: 'Do wysłania', value: 'pendingSync' },
  { label: 'Aktywne zlecenia', value: 'active' }
]

const headquarters = ref(null)
const headquartersAddress = ref('')

const geocodeQueueSize = computed(() => geocodeQueue.value.length)

const filteredClients = computed(() => {
  const term = search.value.trim().toLowerCase()

  return locatedClients.value
    .filter(client => {
      if (filter.value === 'pendingSync') {
        return client.stats.counts.pendingSync > 0
      }
      if (filter.value === 'active') {
        return client.stats.counts.active > 0
      }
      return true
    })
    .filter(client => {
      if (!term) return true
      const haystack = [
        client.displayName,
        client.addressLabel,
        client.fullAddress
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    })
    .sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm
      }
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return a.displayName.localeCompare(b.displayName)
    })
})

function setFilter(value) {
  filter.value = value
}

function loadCache() {
  try {
    const stored = localStorage.getItem(`map-geocode-cache:${cacheVersion}`)
    if (!stored) return {}
    return JSON.parse(stored)
  } catch (error) {
    console.warn('[Map] cache read failed', error)
    return {}
  }
}

const cache = ref(loadCache())

function persistCache() {
  try {
    localStorage.setItem(
      `map-geocode-cache:${cacheVersion}`,
      JSON.stringify(cache.value)
    )
  } catch (error) {
    console.warn('[Map] cache persist failed', error)
  }
}

function makeCacheKey(prefix, address) {
  return `${prefix}:${(address || '').toLowerCase()}`
}

function getCachedCoords(prefix, address) {
  if (!address) return null
  const key = makeCacheKey(prefix, address)
  return cache.value[key] || null
}

function setCachedCoords(prefix, address, coords) {
  if (!address || !coords) return
  const key = makeCacheKey(prefix, address)
  cache.value[key] = coords
  persistCache()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeAddress(address) {
  if (!address) return null

  const url = new URL(mapConfig.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', address)
  url.searchParams.set('addressdetails', '0')

  const headers = {
    'User-Agent': 'SerwisDesktop/1.0 (map module)',
    'Accept-Language': 'pl'
  }

  if (mapConfig.GEOCODER_EMAIL) {
    headers['From'] = mapConfig.GEOCODER_EMAIL
  }

  const response = await fetch(url.toString(), {
    headers
  })

  if (!response.ok) {
    throw new Error(`Geocoder response ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data) || !data.length) {
    return null
  }

  const { lat, lon } = data[0]
  return {
    lat: Number(lat),
    lon: Number(lon)
  }
}

function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return null
  const toRad = value => (value * Math.PI) / 180

  const R = 6371
  const dLat = toRad(pointB.lat - pointA.lat)
  const dLon = toRad(pointB.lon - pointA.lon)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pointA.lat)) *
      Math.cos(toRad(pointB.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function processGeocodeQueue() {
  if (geocodeProcessing.value) return
  geocodeProcessing.value = true

  while (geocodeQueue.value.length) {
    const entry = geocodeQueue.value.shift()

    try {
      const coords = await geocodeAddress(entry.address)
      if (coords) {
        setCachedCoords(entry.cachePrefix, entry.address, coords)
        entry.onSuccess(coords)
      } else {
        entry.onFail?.()
      }
    } catch (error) {
      console.warn('[Map] geocode failed', entry.address, error)
      entry.onFail?.(error)
    }

    // zgodnie z zasadami Nominatim, 1 zapytanie na sekundę
    await sleep(1100)
  }

  geocodeProcessing.value = false
}

function queueGeocode({ cachePrefix, address, onSuccess, onFail }) {
  geocodeQueue.value.push({
    cachePrefix,
    address,
    onSuccess,
    onFail
  })
  processGeocodeQueue()
}

function assignDistance(client) {
  if (!client || !headquarters.value) return

  const dist = haversineDistanceKm(
    { lat: headquarters.value.lat, lon: headquarters.value.lon },
    { lat: client.latitude, lon: client.longitude }
  )
  client.distanceKm = dist != null ? Number(dist.toFixed(2)) : null
}

function updateMarkers() {
  const map = mapInstance.value
  const layerGroup = markersLayer.value
  if (!map || !layerGroup) return

  if (!map._loaded) {
    map.once('load', updateMarkers)
    return
  }

  layerGroup.clearLayers()

  const markers = []

  for (const client of filteredClients.value) {
    if (client.latitude == null || client.longitude == null) continue

    const hasPendingSync =
      client.stats?.state?.hasPendingSync ??
      (client.stats?.counts?.pendingSync > 0)
    const hasActiveSynced =
      client.stats?.state?.hasActiveSynced ??
      false

    const marker = L.circleMarker([client.latitude, client.longitude], {
      radius: 7,
      color: hasPendingSync
        ? '#f59e0b'
        : hasActiveSynced
        ? '#2563eb'
        : '#6b7280',
      fillColor: hasPendingSync
        ? '#f59e0b'
        : hasActiveSynced
        ? '#3b82f6'
        : '#9ca3af',
      fillOpacity: 0.9,
      weight: 2
    })

    const popupContent = `
      <div class="space-y-1">
        <p class="font-semibold text-base">${client.displayName}</p>
        <p class="text-sm text-gray-600">${client.addressLabel || 'Brak adresu'}</p>
        <p class="text-sm text-gray-600">
          Zleceń: ${client.stats.counts.total} |
          Aktywne: ${client.stats.counts.active} |
          Do wysłania: ${client.stats.counts.pendingSync}
        </p>
        ${
          client.distanceKm != null
            ? `<p class="text-sm text-gray-600">Odległość: ${client.distanceKm.toFixed(
                1
              )} km</p>`
            : ''
        }
      </div>
    `

    marker.bindPopup(popupContent)
    marker.bindTooltip(client.displayName, {
      permanent: false,
      direction: 'top'
    })

    marker.on('click', () => {
      marker.openPopup()
    })

    marker.addTo(layerGroup)
    markers.push(marker)
  }

  if (!markers.length) {
    if (headquarters.value) {
      map.setView(
        [headquarters.value.lat, headquarters.value.lon],
        mapConfig.DEFAULT_ZOOM || 6
      )
    } else if (mapConfig.GEO_FALLBACK_CENTER) {
      map.setView(
        mapConfig.GEO_FALLBACK_CENTER,
        mapConfig.DEFAULT_ZOOM || 6
      )
    }
    return
  }

  // pozostawiamy aktualny widok użytkownika – brak automatycznego fitBounds,
  // aby uniknąć konfliktu stanu markerów z animacją Leafleta
}

function focusClient(client) {
  if (!client || client.latitude == null || client.longitude == null) return
  const map = mapInstance.value
  const layerGroup = markersLayer.value
  if (!map || !layerGroup) return

  const locateMarker = () => {
    layerGroup.eachLayer(layer => {
      if (typeof layer.getLatLng !== 'function') return
      const { lat, lng } = layer.getLatLng()
      if (
        Math.abs(lat - client.latitude) < 0.0001 &&
        Math.abs(lng - client.longitude) < 0.0001 &&
        layer._map
      ) {
        try {
          if (typeof layer.openPopup === 'function') {
            layer.openPopup()
          }
          map.panTo(layer.getLatLng(), {
            animate: true,
            duration: 0.5
          })
        } catch (error) {
          console.warn('[Map] focusClient pan failed', error)
        }
      }
    })
  }

  if (!map._loaded) {
    map.once('load', locateMarker)
    return
  }

  locateMarker()
}

async function ensureHeadquartersLocation() {
  if (!window?.electronAPI?.settings) return
  try {
    const result = await window.electronAPI.settings.getCompany()
    if (result?.success && result.data) {
      const company = result.data
      const lat = Number(company.location_lat)
      const lon = Number(company.location_lng)

      const addressCandidate =
        company.address ||
        [
          company.address_street,
          company.address_postal_code,
          company.address_city
        ]
          .filter(Boolean)
          .join(', ')

      headquartersAddress.value =
        addressCandidate || DEFAULT_HEADQUARTERS_ADDRESS

      const hasValidCoords =
        !Number.isNaN(lat) &&
        !Number.isNaN(lon) &&
        !isInvalidCoordinatePair(lat, lon)

      if (hasValidCoords) {
        headquarters.value = { lat, lon }
        persistStoredHeadquarters(lat, lon)
        return
      }

      const stored = loadStoredHeadquarters()
      if (stored && !Number.isNaN(stored.lat) && !Number.isNaN(stored.lon)) {
        headquarters.value = stored
        return
      }

      if (!addressCandidate) {
        headquarters.value = { ...DEFAULT_HEADQUARTERS }
        persistStoredHeadquarters(
          DEFAULT_HEADQUARTERS.lat,
          DEFAULT_HEADQUARTERS.lon
        )
        return
      }

      const cached = getCachedCoords('company', addressCandidate)
      if (cached) {
        headquarters.value = cached
        return
      }

      queueGeocode({
        cachePrefix: 'company',
        address: addressCandidate,
        onSuccess: coords => {
          headquarters.value = coords
          assignDistances()
          placeHeadquartersMarker()
          persistStoredHeadquarters(coords.lat, coords.lon)
        },
        onFail: () => {
          headquarters.value = { ...DEFAULT_HEADQUARTERS }
          persistStoredHeadquarters(
            DEFAULT_HEADQUARTERS.lat,
            DEFAULT_HEADQUARTERS.lon
          )
        }
      })
    }
  } catch (error) {
    console.warn('[Map] company location failed', error)
    if (!headquarters.value) {
      headquarters.value = { ...DEFAULT_HEADQUARTERS }
    }
  }
}

function assignDistances() {
  if (!headquarters.value) return
  for (const client of locatedClients.value) {
    assignDistance(client)
  }
}

const placeHeadquartersMarker = () => {
  if (!mapInstance.value || !headquarters.value) return

  if (companyMarker.value) {
    companyMarker.value.remove()
  }

  const addressLabel = headquartersAddress.value || DEFAULT_HEADQUARTERS_ADDRESS
  const popupHtml = `
    <div class="text-sm">
      <strong>Siedziba firmy</strong><br>
      ${addressLabel}
    </div>
  `

  companyMarker.value = L.marker(
    [headquarters.value.lat, headquarters.value.lon],
    {
      title: 'Siedziba firmy'
    }
  )
    .bindTooltip('Siedziba firmy', {
      permanent: false,
      direction: 'top'
    })
    .bindPopup(popupHtml)

  companyMarker.value.addTo(mapInstance.value)
}

async function ensureClientLocations(items) {
  const resolved = []

  for (const client of items) {
    const lookupAddress = client.geocodeAddress || client.fullAddress
    if (!lookupAddress) continue

    const cached = getCachedCoords('client', lookupAddress)
    if (cached) {
      client.latitude = cached.lat
      client.longitude = cached.lon
      resolved.push(client)
      continue
    }

    queueGeocode({
      cachePrefix: 'client',
      address: lookupAddress,
      onSuccess: coords => {
        client.latitude = coords.lat
        client.longitude = coords.lon
        assignDistance(client)
        if (!locatedClients.value.includes(client)) {
          locatedClients.value.push(client)
        }
        updateMarkers()
      },
      onFail: () => {
        // pozostaw klienta bez współrzędnych
      }
    })
  }

  locatedClients.value.push(
    ...resolved.filter(client => !locatedClients.value.includes(client))
  )
}

async function initializeMap() {
  if (!mapEnabled || mapInstance.value || !mapRef.value) return

  mapInstance.value = L.map(mapRef.value, {
    center: mapConfig.GEO_FALLBACK_CENTER || [52.237049, 21.017532],
    zoom: mapConfig.DEFAULT_ZOOM || 6,
    minZoom: mapConfig.MIN_ZOOM || 4,
    maxZoom: mapConfig.MAX_ZOOM || 18
  })

  L.tileLayer(mapConfig.TILE_URL, {
    attribution: mapConfig.TILE_ATTRIBUTION,
    maxZoom: mapConfig.MAX_ZOOM || 18
  }).addTo(mapInstance.value)

  markersLayer.value = L.layerGroup().addTo(mapInstance.value)

  if (headquarters.value) {
    placeHeadquartersMarker()
  }
}

async function loadData() {
  try {
    clients.value = await loadMapClients()
    await ensureClientLocations(clients.value)
    assignDistances()
    updateMarkers()
  } catch (error) {
    console.error('[Map] loading clients failed', error)
    errorMessage.value =
      'Nie udało się załadować danych klientów. Sprawdź logi i spróbuj ponownie.'
  }
}

watch(
  filteredClients,
  () => {
    updateMarkers()
  },
  { deep: true }
)

watch(
  () => headquarters.value,
  () => {
    assignDistances()
    placeHeadquartersMarker()
    updateMarkers()
  }
)

onMounted(async () => {
  if (!mapEnabled) return
  window.addEventListener('resize', handleResize)
  await ensureHeadquartersLocation()
  await initializeMap()
  await loadData()
  placeHeadquartersMarker()
  updateMarkers()
  await nextTick()
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }
  if (mapInstance.value) {
    mapInstance.value.remove()
  }
})
</script>

