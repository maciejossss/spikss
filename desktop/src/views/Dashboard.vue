<template>
  <div class="p-6 h-full overflow-y-auto">
    <!-- Nagłówek z powitalną wiadomością -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-secondary-900 mb-2">
        Witaj, {{ user?.full_name || 'Użytkowniku' }}! 👋
      </h1>
      <p class="text-secondary-600">
        Oto przegląd Twojego systemu serwisowego na dzisiaj.
      </p>
    </div>

    <!-- Status systemu -->
    <section class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-8">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-secondary-900">Status systemu</h2>
        <button @click="checkStatuses" class="btn-secondary btn-sm" :disabled="checkingStatuses">
          <i v-if="checkingStatuses" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-sync-alt mr-2"></i>
          Sprawdź teraz
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="flex items-center space-x-3 p-3 rounded-lg border border-secondary-200">
          <i :class="[statusLocal.ok ? 'text-green-600 fa-check-circle' : 'text-red-600 fa-times-circle', 'fas']"></i>
          <div>
            <div class="font-medium text-sm">Lokalne API (desktop)</div>
            <div class="text-xs text-secondary-600">{{ statusLocal.message }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-3 p-3 rounded-lg border border-secondary-200">
          <i :class="[statusRailway.ok ? 'text-green-600 fa-check-circle' : 'text-red-600 fa-times-circle', 'fas']"></i>
          <div>
            <div class="font-medium text-sm">Railway API</div>
            <div class="text-xs text-secondary-600">{{ statusRailway.message }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-3 p-3 rounded-lg border border-secondary-200">
          <i :class="[statusPhotos.ok ? 'text-green-600 fa-check-circle' : 'text-yellow-600 fa-exclamation-circle', 'fas']"></i>
          <div>
            <div class="font-medium text-sm">Dokumentacja zdjęciowa</div>
            <div class="text-xs text-secondary-600">{{ statusPhotos.message }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-8">
      <h2 class="text-lg font-semibold text-secondary-900 mb-4">Do ogarnięcia</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          class="border border-secondary-200 rounded-lg p-4 text-left transition duration-150 hover:border-primary-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-200"
          @click="goToPendingOrders"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-secondary-800">Zlecenia do wysłania</span>
            <span class="text-primary-600 font-bold">{{ awaitingItems.toSend }}</span>
          </div>
          <p class="text-xs text-secondary-500">Brak potwierdzenia wysyłki na Railway.</p>
        </button>
        <div class="border border-secondary-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-secondary-800">Brak protokołu</span>
            <span class="text-primary-600 font-bold">{{ awaitingItems.protocols }}</span>
          </div>
          <p class="text-xs text-secondary-500">Zakończone zlecenia bez dokumentu serwisowego.</p>
        </div>
        <div class="border border-secondary-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-secondary-800">Brak faktury</span>
            <span class="text-primary-600 font-bold">{{ awaitingItems.invoices }}</span>
          </div>
          <p class="text-xs text-secondary-500">Zlecenia ukończone bez wystawionej faktury.</p>
        </div>
      </div>
    </section>

    <!-- Statystyki - kafelki z liczbami -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div 
        v-for="stat in stats" 
        :key="stat.key"
        class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary-600 text-sm font-medium">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-secondary-900 mt-1">{{ stat.value || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="stat.bgColor">
            <i :class="[stat.icon, 'text-xl', stat.iconColor]"></i>
          </div>
        </div>
      </div>
    </section>

    <!-- Statystyki czasu rzeczywistego (z bazy) -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
      <div 
        v-for="stat in statsRealtime" 
        :key="stat.key"
        class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-secondary-600 text-sm font-medium">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-secondary-900 mt-1">{{ stat.value || 0 }}</p>
          </div>
          <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="stat.bgColor">
            <i :class="[stat.icon, 'text-xl', stat.iconColor]"></i>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 class="text-lg font-semibold text-secondary-900 mb-4">Agenda – dziś</h2>
        <div v-if="agendaToday.length === 0" class="text-secondary-500 text-sm">Brak zaplanowanych wizyt.</div>
        <ul v-else class="space-y-2">
          <li v-for="item in agendaToday" :key="item.id" class="flex justify-between text-sm text-secondary-700">
            <div>
              <div class="font-medium">{{ item.title }}</div>
              <div class="text-xs text-secondary-500">{{ item.client }}</div>
            </div>
            <span class="text-xs text-secondary-500">{{ item.time }}</span>
          </li>
        </ul>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 class="text-lg font-semibold text-secondary-900 mb-4">Agenda – jutro</h2>
        <div v-if="agendaTomorrow.length === 0" class="text-secondary-500 text-sm">Brak zaplanowanych wizyt.</div>
        <ul v-else class="space-y-2">
          <li v-for="item in agendaTomorrow" :key="item.id" class="flex justify-between text-sm text-secondary-700">
            <div>
              <div class="font-medium">{{ item.title }}</div>
              <div class="text-xs text-secondary-500">{{ item.client }}</div>
            </div>
            <span class="text-xs text-secondary-500">{{ item.time }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-8">
      <h2 class="text-lg font-semibold text-secondary-900 mb-4">Ostatnie działania</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-secondary-800">Protokoły</h3>
            <router-link to="/protocols" class="text-primary-600 text-xs">Zobacz wszystkie →</router-link>
          </div>
          <ul class="space-y-2">
            <li
              v-for="protocol in recentProtocols"
              :key="protocol.id"
              class="text-sm text-secondary-700 cursor-pointer hover:text-primary-600 transition-colors"
              @click="$router.push('/protocols')"
            >
              <div class="font-medium">{{ protocol.order_number || ('#' + protocol.order_id) }}</div>
              <div class="text-xs text-secondary-500">{{ formatDate(protocol.created_at) }}</div>
            </li>
            <li v-if="recentProtocols.length === 0" class="text-xs text-secondary-500">Brak protokołów.</li>
          </ul>
        </div>
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-secondary-800">Faktury</h3>
            <router-link to="/invoices" class="text-primary-600 text-xs">Zobacz wszystkie →</router-link>
          </div>
          <ul class="space-y-2">
            <li
              v-for="invoice in recentInvoices"
              :key="invoice.id"
              class="text-sm text-secondary-700 cursor-pointer hover:text-primary-600 transition-colors"
              @click="$router.push('/invoices')"
            >
              <div class="font-medium">{{ invoice.invoice_number }}</div>
              <div class="text-xs text-secondary-500">{{ formatDate(invoice.created_at) }}</div>
            </li>
            <li v-if="recentInvoices.length === 0" class="text-xs text-secondary-500">Brak faktur.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Główne kafelki funkcji -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      <div
        v-for="tile in mainTiles"
        :key="tile.name"
        @click="$router.push(tile.path)"
        class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group"
      >
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" :class="tile.bgColor">
            <i :class="[tile.icon, 'text-2xl', tile.iconColor]"></i>
          </div>
          <h3 class="font-semibold text-secondary-900 mb-2">{{ tile.label }}</h3>
          <p class="text-sm text-secondary-600">{{ tile.description }}</p>
        </div>
      </div>
    </div>

    <!-- Szybkie akcje -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-8">
      <h2 class="text-lg font-semibold text-secondary-900 mb-4">Szybkie akcje</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          v-for="action in quickActions"
          :key="action.name"
          @click="action.action"
          class="flex items-center space-x-3 p-4 rounded-lg border-2 border-dashed border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
        >
          <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <i :class="action.icon" class="text-primary-600"></i>
          </div>
          <div class="text-left">
            <div class="font-medium text-secondary-900 text-sm">{{ action.label }}</div>
            <div class="text-xs text-secondary-600">{{ action.description }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Ostatnie zlecenia i przypomnienia -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Ostatnie zlecenia -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-secondary-900">Ostatnie zlecenia</h2>
          <router-link to="/orders" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Zobacz wszystkie →
          </router-link>
        </div>
        <div v-if="recentOrders.length === 0" class="text-center py-8 text-secondary-500">
          <i class="fas fa-clipboard-list text-4xl mb-3 opacity-50"></i>
          <p>Brak ostatnich zleceń</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="order in recentOrders.slice(0, 5)"
            :key="order.id"
            class="flex items-center justify-between p-3 rounded-lg hover:bg-secondary-50 cursor-pointer"
            @click="$router.push(`/orders/${order.id}`)"
          >
            <div class="flex-1">
              <div class="font-medium text-secondary-900 text-sm">{{ order.title }}</div>
              <div class="text-xs text-secondary-600">{{ order.client_name }}</div>
            </div>
            <div class="text-right">
              <div class="badge" :class="getStatusBadgeClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </div>
              <div class="text-xs text-secondary-500 mt-1">{{ formatDate(order.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Przypomnienia -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-secondary-900">Przypomnienia</h2>
          <router-link to="/calendar" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Kalendarz →
          </router-link>
        </div>
        <div v-if="reminders.length === 0" class="text-center py-8 text-secondary-500">
          <i class="fas fa-bell text-4xl mb-3 opacity-50"></i>
          <p>Brak przypomnień</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="reminder in reminders.slice(0, 5)"
            :key="reminder.id"
            class="flex items-start space-x-3 p-3 rounded-lg hover:bg-secondary-50"
          >
            <div class="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0"></div>
            <div class="flex-1">
              <div class="font-medium text-secondary-900 text-sm">{{ reminder.title }}</div>
              <div class="text-xs text-secondary-600">{{ reminder.description }}</div>
              <div class="text-xs text-yellow-600 mt-1">{{ formatDate(reminder.date) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { formatDate } from '../utils/date'
import config from '../../env-config.js'

const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

// ====== STATUSY SYSTEMU (read-only) ======
const checkingStatuses = ref(false)
const statusLocal = ref({ ok: false, message: 'Nie sprawdzono' })
const statusRailway = ref({ ok: false, message: 'Nie sprawdzono' })
const statusPhotos = ref({ ok: true, message: 'Pokażę przy otwarciu zlecenia' })
let statusTimer = null
const awaitingItems = ref({ toSend: 0, protocols: 0, invoices: 0 })
const agendaToday = ref([])
const agendaTomorrow = ref([])
const recentProtocols = ref([])
const recentInvoices = ref([])

// Klucze localStorage dla statusów
const STORAGE_KEY_STATUSES = 'dashboard_system_statuses'
const STORAGE_KEY_TIMESTAMP = 'dashboard_system_statuses_timestamp'
const STATUS_MAX_AGE_MS = 5 * 60 * 1000 // 5 minut ważności statusu

const fetchWithTimeout = (url, opts = {}, ms = 6000) => {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(t))
}

// Funkcja zapisująca statusy do localStorage
const saveStatusesToStorage = () => {
  try {
    const statuses = {
      local: statusLocal.value,
      railway: statusRailway.value,
      photos: statusPhotos.value
    }
    localStorage.setItem(STORAGE_KEY_STATUSES, JSON.stringify(statuses))
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString())
  } catch (e) {
    console.warn('Nie udało się zapisać statusów do localStorage:', e)
  }
}

// Funkcja odczytująca statusy z localStorage
const loadStatusesFromStorage = () => {
  try {
    const savedStatuses = localStorage.getItem(STORAGE_KEY_STATUSES)
    const savedTimestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP)
    
    if (!savedStatuses || !savedTimestamp) {
      return false // Brak zapisanych statusów
    }
    
    const timestamp = parseInt(savedTimestamp)
    const age = Date.now() - timestamp
    
    // Jeśli statusy są starsze niż 5 minut, nie używaj ich
    if (age > STATUS_MAX_AGE_MS) {
      return false
    }
    
    const statuses = JSON.parse(savedStatuses)
    statusLocal.value = statuses.local || statusLocal.value
    statusRailway.value = statuses.railway || statusRailway.value
    statusPhotos.value = statuses.photos || statusPhotos.value
    
    return true // Pomyślnie załadowano statusy
  } catch (e) {
    console.warn('Nie udało się odczytać statusów z localStorage:', e)
    return false
  }
}

const checkStatuses = async () => {
  try {
    checkingStatuses.value = true
    // Lokalny health
    try {
      const r = await fetchWithTimeout('http://localhost:5174/api/health')
      if (r.ok) {
        const j = await r.json().catch(() => ({}))
        statusLocal.value = { ok: true, message: `OK • ${new Date(j.timestamp || Date.now()).toLocaleTimeString('pl-PL')}` }
      } else {
        statusLocal.value = { ok: false, message: `Błąd ${r.status}` }
      }
    } catch (e) {
      statusLocal.value = { ok: false, message: 'Brak połączenia (localhost:5174)' }
    }

    // Railway health
    try {
      const base = String(config?.RAILWAY_API_BASE || '').replace(/\/$/, '')
      const r = await fetchWithTimeout(`${base}/health`)
      if (r.ok) {
        const j = await r.json().catch(() => ({}))
        statusRailway.value = { ok: true, message: `OK • ${new Date(j.timestamp || Date.now()).toLocaleTimeString('pl-PL')}` }
      } else {
        statusRailway.value = { ok: false, message: `Błąd ${r.status}` }
      }
    } catch (e) {
      statusRailway.value = { ok: false, message: 'Brak połączenia (Railway)' }
    }

    // Dokumentacja zdjęciowa – lekki sygnał (bez listowania plików)
    statusPhotos.value = {
      ok: statusRailway.value.ok,
      message: statusRailway.value.ok ? 'Dostępne (Railway działa)' : 'Niedostępne (Railway niedostępny)'
    }
    
    // Zapisz statusy do localStorage
    saveStatusesToStorage()
  } finally {
    checkingStatuses.value = false
  }
}
const stats = ref([
  {
    key: 'clients',
    label: 'Klienci',
    value: 0,
    icon: 'fas fa-users',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    key: 'orders',
    label: 'Zlecenia (wszystkie)',
    value: 0,
    icon: 'fas fa-clipboard-list',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    key: 'devices',
    label: 'Urządzenia',
    value: 0,
    icon: 'fas fa-tools',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    key: 'invoices',
    label: 'Faktury',
    value: 0,
    icon: 'fas fa-file-invoice',
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  }
])

// Dodatkowe kafelki: stan rzeczywisty
const statsRealtime = ref([
  {
    key: 'to_send',
    label: 'Do wysłania',
    value: 0,
    icon: 'fas fa-paper-plane',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  {
    key: 'active',
    label: 'Aktywne',
    value: 0,
    icon: 'fas fa-play-circle',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  }
])

// Główne kafelki funkcji
const mainTiles = [
  {
    name: 'clients',
    path: '/clients',
    label: 'Klienci',
    description: 'Zarządzaj bazą klientów',
    icon: 'fas fa-users',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    name: 'devices',
    path: '/devices',
    label: 'Urządzenia',
    description: 'Spis urządzeń serwisowych',
    icon: 'fas fa-tools',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    name: 'orders',
    path: '/orders',
    label: 'Zlecenia',
    description: 'Zarządzaj zleceniami serwisowymi',
    icon: 'fas fa-clipboard-list',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    name: 'invoices',
    path: '/invoices',
    label: 'Faktury',
    description: 'Faktury i płatności',
    icon: 'fas fa-file-invoice',
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    name: 'calendar',
    path: '/calendar',
    label: 'Kalendarz',
    description: 'Harmonogram wizyt',
    icon: 'fas fa-calendar',
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  {
    name: 'reports',
    path: '/reports',
    label: 'Raporty',
    description: 'Analizy i statystyki',
    icon: 'fas fa-chart-bar',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  }
]

// Szybkie akcje (aliasem dla mainTiles)
const quickActions = mainTiles

// Ostatnie zlecenia (początkowa pusta tablica)
const recentOrders = ref([])

// Przypomnienia (początkowa pusta tablica)
const reminders = ref([])

// Mapery statusów dla znaczników
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-blue-100 text-blue-700'
    case 'waiting_for_parts': return 'bg-yellow-100 text-yellow-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status) => {
  const map = {
    new: 'Nowe',
    in_progress: 'W realizacji',
    waiting_for_parts: 'Oczekuje na części',
    completed: 'Ukończone',
    cancelled: 'Anulowane'
  }
  return map[status] || status || '—'
}

const formatTime = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  } catch (_) {
    return ''
  }
}

const buildAgendaSubtitle = (orderNumber, clientName) => {
  const parts = []
  if (orderNumber) parts.push(orderNumber)
  if (clientName) parts.push(clientName)
  return parts.join(' • ') || 'Klient nieprzypisany'
}

const goToPendingOrders = () => {
  try {
    sessionStorage.setItem('orders.defaultTab', 'toSync')
  } catch (_) {}
  router.push({ name: 'OrdersList', query: { tab: 'toSync' } }).catch(() => {})
}

// Załaduj dane do panelu głównego
const loadDashboard = async () => {
  try {
    if (!window.electronAPI?.database) return

    // Zliczenia
    const clientsRow = await window.electronAPI.database.get('SELECT COUNT(*) AS count FROM clients WHERE is_active = 1', [])
    const devicesRow = await window.electronAPI.database.get('SELECT COUNT(*) AS count FROM devices WHERE is_active = 1', [])
    const ordersRow = await window.electronAPI.database.get('SELECT COUNT(*) AS count FROM service_orders', [])
    const toSendRow = await window.electronAPI.database.get(
      `SELECT COUNT(*) AS count
         FROM service_orders
        WHERE COALESCE(desktop_sync_status, '') <> 'sent'
          AND LOWER(COALESCE(status,'')) IN ('new','assigned','in_progress','completed')`,
      []
    )
    const activeRow = await window.electronAPI.database.get(
      `SELECT COUNT(*) AS count
         FROM service_orders
        WHERE LOWER(COALESCE(status,'')) IN ('new','assigned','in_progress')`,
      []
    )
    const awaitingProtocolRow = await window.electronAPI.database.get(
      `SELECT COUNT(*) AS count
         FROM service_orders so
        WHERE LOWER(COALESCE(so.status,'')) = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM service_protocols sp WHERE sp.order_id = so.id
          )`,
      []
    )
    const awaitingInvoiceRow = await window.electronAPI.database.get(
      `SELECT COUNT(*) AS count
         FROM service_orders so
        WHERE LOWER(COALESCE(so.status,'')) = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM simple_invoices si WHERE si.order_id = so.id
          )`,
      []
    )
    const issuedInvoicesRow = await window.electronAPI.database.get(
      'SELECT COUNT(*) AS count FROM simple_invoices',
      []
    )

    const setStat = (key, value) => {
      const idx = stats.value.findIndex(s => s.key === key)
      if (idx !== -1) stats.value[idx].value = value || 0
    }
    setStat('clients', clientsRow?.count)
    setStat('devices', devicesRow?.count)
    setStat('orders', ordersRow?.count)
    setStat('invoices', issuedInvoicesRow?.count)
    const idxSend = statsRealtime.value.findIndex(s => s.key === 'to_send')
    if (idxSend !== -1) statsRealtime.value[idxSend].value = toSendRow?.count || 0
    const idxActive = statsRealtime.value.findIndex(s => s.key === 'active')
    if (idxActive !== -1) statsRealtime.value[idxActive].value = activeRow?.count || 0
    awaitingItems.value = {
      protocols: awaitingProtocolRow?.count || 0,
      invoices: awaitingInvoiceRow?.count || 0,
      toSend: toSendRow?.count || 0
    }

    try {
      const todayAgendaRows = await window.electronAPI.database.query(
        `SELECT so.id,
                so.order_number,
                so.title,
                so.scheduled_date,
                COALESCE(c.company_name, TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS client_name
           FROM service_orders so
           LEFT JOIN clients c ON c.id = so.client_id
          WHERE date(scheduled_date) = date('now')
            AND LOWER(COALESCE(so.status,'')) IN ('new','assigned','in_progress')
          ORDER BY so.scheduled_date ASC
          LIMIT 10`
      )
      agendaToday.value = Array.isArray(todayAgendaRows)
        ? todayAgendaRows.map(row => ({
            id: row.id,
            title: row.title || row.order_number || `Zlecenie #${row.id}`,
            client: buildAgendaSubtitle(row.order_number, row.client_name),
            time: formatTime(row.scheduled_date)
          }))
        : []
    } catch (_) {
      agendaToday.value = []
    }

    try {
      const tomorrowAgendaRows = await window.electronAPI.database.query(
        `SELECT so.id,
                so.order_number,
                so.title,
                so.scheduled_date,
                COALESCE(c.company_name, TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS client_name
           FROM service_orders so
           LEFT JOIN clients c ON c.id = so.client_id
          WHERE date(scheduled_date) = date('now','+1 day')
            AND LOWER(COALESCE(so.status,'')) IN ('new','assigned','in_progress')
          ORDER BY so.scheduled_date ASC
          LIMIT 10`
      )
      agendaTomorrow.value = Array.isArray(tomorrowAgendaRows)
        ? tomorrowAgendaRows.map(row => ({
            id: row.id,
            title: row.title || row.order_number || `Zlecenie #${row.id}`,
            client: buildAgendaSubtitle(row.order_number, row.client_name),
            time: formatTime(row.scheduled_date)
          }))
        : []
    } catch (_) {
      agendaTomorrow.value = []
    }

    // Ostatnie zlecenia
    const recent = await window.electronAPI.database.query(
      `SELECT so.id, so.title, so.status, so.created_at,
              COALESCE(c.company_name, TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS client_name
       FROM service_orders so
       LEFT JOIN clients c ON so.client_id = c.id
       ORDER BY so.created_at DESC
       LIMIT 10`
    )
    recentOrders.value = Array.isArray(recent) ? recent : []

    // Najbliższe przypomnienia (kalendarz)
    try {
      const upcoming = await window.electronAPI.database.query(
        `SELECT id, title, description, start_date AS date
         FROM calendar_events
         WHERE date(start_date) >= date('now')
         ORDER BY start_date ASC
         LIMIT 10`
      )
      reminders.value = Array.isArray(upcoming) ? upcoming : []
    } catch (_) {
      reminders.value = []
    }

    try {
      const protocolRows = await window.electronAPI.database.query(
        `SELECT sp.id, sp.order_id, sp.order_number, sp.created_at,
                so.order_number AS order_number_fallback
           FROM service_protocols sp
           LEFT JOIN service_orders so ON so.id = sp.order_id
           ORDER BY sp.created_at DESC
           LIMIT 5`
      )
      recentProtocols.value = Array.isArray(protocolRows) ? protocolRows : []
    } catch (_) {
      recentProtocols.value = []
    }

    try {
      const invoiceRows = await window.electronAPI.database.query(
        `SELECT id, invoice_number, created_at
           FROM simple_invoices
           ORDER BY created_at DESC
           LIMIT 5`
      )
      recentInvoices.value = Array.isArray(invoiceRows) ? invoiceRows : []
    } catch (_) {
      recentInvoices.value = []
    }
  } catch (error) {
    console.error('Dashboard load error:', error)
  }
}

onMounted(() => {
  loadDashboard()
  
  // Wczytaj zapisane statusy z localStorage
  const loaded = loadStatusesFromStorage()
  
  // Jeśli nie ma zapisanych statusów lub są stare (starsze niż 5 minut),
  // automatycznie sprawdź statusy
  if (!loaded) {
    console.log('🔄 Brak zapisanych statusów lub są przestarzałe - sprawdzam automatycznie...')
    checkStatuses()
  }
  
  // Ustaw timer automatycznego sprawdzania statusów co 5 minut
  statusTimer = setInterval(() => {
    console.log('🔄 Automatyczne odświeżanie statusów systemów...')
    checkStatuses()
  }, 5 * 60 * 1000) // 5 minut
})

onUnmounted(() => {
  // Wyczyść timer przy odmontowaniu komponentu
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
})
</script> 