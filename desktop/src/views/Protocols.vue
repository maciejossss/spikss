PRAWDA ?
<template>
  <div class="p-6 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-secondary-900">Protokóły serwisowe</h1>
        <p class="text-sm text-secondary-500">Archiwum dokumentów po zakończonych zleceniach</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="openCreateModal"
          class="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
        >
          <i class="fas fa-plus mr-2"></i>
          Utwórz protokół
        </button>
        <button
          @click="loadProtocols"
          :disabled="loadingList"
          class="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition"
          :class="loadingList ? 'border-secondary-200 text-secondary-300 cursor-not-allowed' : 'border-secondary-200 text-secondary-600 hover:border-secondary-300 hover:text-secondary-900'"
        >
          <i class="fas fa-rotate mr-2" :class="loadingList ? 'animate-spin' : ''"></i>
          Odśwież listę
        </button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Lista protokółów</h2>
          <span class="text-xs text-secondary-400">{{ protocols.length }} pozycji</span>
        </div>
        <div class="max-h-[70vh] overflow-y-auto divide-y divide-secondary-100">
          <div
            v-for="item in protocols"
            :key="item.id"
            role="button"
            tabindex="0"
            @click="selectProtocol(item)"
            @keydown.enter.prevent="selectProtocol(item)"
            @keydown.space.prevent="selectProtocol(item)"
            class="w-full px-4 py-3 transition flex items-start gap-3 cursor-pointer"
            :class="selectedProtocol?.id === item.id ? 'bg-primary-50/80 border-l-4 border-primary-500' : 'hover:bg-secondary-50'"
          >
            <div class="mt-0.5">
              <span
                class="inline-flex items-center justify-center w-8 h-8 rounded-full"
                :class="statusBadge(item)"
              >
                <i :class="statusIcon(item)"></i>
              </span>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-secondary-800">{{ item.order_number || ('#' + item.order_id) }}</p>
                <div class="flex items-center gap-2">
                  <p class="text-xs text-secondary-400">{{ formatDate(item.issued_at) }}</p>
                  <button
                    type="button"
                    class="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                    @click.stop="handleDeleteProtocol(item)"
                    :disabled="deletingId === item.id"
                    title="Usuń protokół"
                  >
                    <i v-if="deletingId === item.id" class="fas fa-spinner animate-spin"></i>
                    <i v-else class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <p class="text-xs text-secondary-500 truncate">{{ item.template_name }}</p>
              <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-secondary-500">
                <span v-if="item.client_snapshot?.display_name">Klient: {{ item.client_snapshot.display_name }}</span>
                <span v-if="item.device_snapshot?.name">• Urządzenie: {{ item.device_snapshot.name }}</span>
              </div>
            </div>
          </div>
          <div v-if="!protocols.length && !loadingList" class="p-6 text-center text-secondary-500 text-sm">
            Brak wygenerowanych protokółów. Użyj przycisku „Utwórz protokół”.
          </div>
          <div v-if="loadingList" class="p-6 text-center text-secondary-400 text-sm animate-pulse">
            Ładowanie listy…
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-4">
        <div v-if="selectedProtocol" class="bg-white border border-secondary-200 rounded-xl shadow-sm">
          <div class="px-6 py-4 border-b border-secondary-200 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-secondary-900">
                Protokół dla {{ selectedProtocol.order_number || ('zlecenia #' + selectedProtocol.order_id) }}
              </h2>
              <p class="text-sm text-secondary-500">Wystawiono: {{ formatDate(selectedProtocol.issued_at) }} • Szablon: {{ selectedProtocol.template_name }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                @click="handleGeneratePdf(selectedProtocol)"
                class="px-3 py-2 text-sm font-medium rounded-lg border border-secondary-200 text-secondary-600 hover:text-secondary-900 hover:border-secondary-300"
              >
                <i class="fas fa-file-pdf mr-2 text-red-500"></i>
                Generuj PDF
              </button>
              <button
                v-if="selectedProtocol.local_pdf_path"
                @click="openPdf(selectedProtocol.local_pdf_path)"
                class="px-3 py-2 text-sm font-medium rounded-lg border border-secondary-200 text-secondary-600 hover:text-secondary-900 hover:border-secondary-300"
              >
                <i class="fas fa-folder-open mr-2"></i>
                Otwórz PDF
              </button>
              <button
                @click="handleExport(selectedProtocol)"
                class="px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                <i class="fas fa-paper-plane mr-2"></i>
                Wyślij do Railway
              </button>
            </div>
          </div>

          <div class="px-6 py-5 space-y-5">
            <section class="grid gap-4 md:grid-cols-2">
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200/60">
                <h3 class="text-sm font-semibold text-secondary-800 mb-2 uppercase tracking-wide">Dane serwisu</h3>
                <p class="text-sm text-secondary-700 whitespace-pre-line">{{ renderCompany(selectedProtocol.service_company_snapshot) }}</p>
              </div>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200/60">
                <h3 class="text-sm font-semibold text-secondary-800 mb-2 uppercase tracking-wide">Klient</h3>
                <p class="text-sm text-secondary-700 whitespace-pre-line">{{ renderClient(selectedProtocol.client_snapshot) }}</p>
              </div>
            </section>

            <section class="grid gap-4 md:grid-cols-2">
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200/60">
                <h3 class="text-sm font-semibold text-secondary-800 mb-2 uppercase tracking-wide">Urządzenie</h3>
                <p class="text-sm text-secondary-700 whitespace-pre-line">{{ renderDevice(selectedProtocol.device_snapshot) }}</p>
              </div>
              <div class="bg-secondary-50 rounded-lg p-4 border border-secondary-200/60">
                <h3 class="text-sm font-semibold text-secondary-800 mb-2 uppercase tracking-wide">Serwisant</h3>
                <p class="text-sm text-secondary-700 whitespace-pre-line">{{ renderTechnician(selectedProtocol.technician_snapshot) }}</p>
              </div>
            </section>

            <section class="bg-white border border-secondary-200 rounded-lg">
              <div class="px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">Zakres czynności</h3>
                <span class="text-xs text-secondary-400">Instalacja: {{ selectedProtocol.checks_snapshot?.installation?.fuelType || 'nie określono' }} • Szczelna: {{ selectedProtocol.checks_snapshot?.installation?.sealed ? 'tak' : 'nie' }}</span>
              </div>
              <div class="px-4 py-4 space-y-3">
                <template v-if="getCheckedItems(selectedProtocol.checks_snapshot).length">
                  <ul class="grid md:grid-cols-2 gap-2 text-sm text-secondary-700">
                    <li v-for="item in getCheckedItems(selectedProtocol.checks_snapshot)" :key="item.id" class="flex items-start gap-2">
                      <i class="fas fa-check-circle text-green-600 mt-0.5"></i>
                      <span>{{ item.label }}</span>
                    </li>
                  </ul>
                </template>
                <p v-else class="text-sm text-secondary-500">Brak zaznaczonych czynności.</p>
                <div v-if="selectedProtocol.checks_snapshot?.extra" class="text-sm text-secondary-600">
                  <strong>Dodatkowe informacje:</strong>
                  <p class="whitespace-pre-line">{{ selectedProtocol.checks_snapshot.extra }}</p>
                </div>
              </div>
            </section>

            <section class="bg-white border border-secondary-200 rounded-lg">
              <div class="px-4 py-3 border-b border-secondary-200">
                <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">Użyte części</h3>
              </div>
              <div class="px-4 py-4 space-y-3">
                <p v-if="renderParts(selectedProtocol.parts_snapshot)" class="text-sm text-secondary-700 whitespace-pre-line">{{ renderParts(selectedProtocol.parts_snapshot) }}</p>
                <p v-else class="text-sm text-secondary-500">Brak danych o częściach.</p>
              </div>
            </section>

            <section class="bg-white border border-secondary-200 rounded-lg">
              <div class="px-4 py-3 border-b border-secondary-200">
                <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">Opis i uwagi</h3>
              </div>
              <div class="px-4 py-4 space-y-3 text-sm text-secondary-700">
                <div>
                  <strong>Podsumowanie prac:</strong>
                  <p class="whitespace-pre-line">{{ selectedProtocol.summary_text || 'Brak opisu.' }}</p>
                </div>
                <div v-if="selectedProtocol.notes">
                  <strong>Uwagi serwisu:</strong>
                  <p class="whitespace-pre-line">{{ selectedProtocol.notes }}</p>
                </div>
              </div>
            </section>

            <section class="bg-white border border-secondary-200 rounded-lg">
              <div class="px-4 py-3 border-b border-secondary-200">
                <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">Klauzule i oświadczenia</h3>
              </div>
              <div class="px-4 py-4 text-sm text-secondary-700 whitespace-pre-line">
                {{ selectedProtocol.acceptance_clause || defaultAcceptanceClause }}
              </div>
            </section>
          </div>
        </div>

        <div v-else class="bg-white border border-dashed border-secondary-300 rounded-xl p-10 text-center text-secondary-500">
          Wybierz protokół z listy po lewej, aby zobaczyć szczegóły.
        </div>
      </div>
    </div>

    <!-- Modal tworzenia -->
    <div v-if="showCreateModal" class="fixed inset-0 z-40 flex items-center justify-center bg-secondary-900/70">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-secondary-900">Nowy protokół serwisowy</h2>
          <button @click="closeCreateModal" class="text-secondary-400 hover:text-secondary-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          <section class="space-y-4">
            <header class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">1. Wybierz zakończone zlecenie</h3>
                <p class="text-xs text-secondary-500">Lista obejmuje ostatnie ukończone zlecenia.</p>
              </div>
              <button
                @click="loadRecentOrders"
                class="text-xs uppercase font-semibold text-blue-600 hover:text-blue-800"
              >
                Odśwież listę
              </button>
            </header>
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400"></i>
              <input
                v-model="orderSearch"
                type="text"
                placeholder="Szukaj po numerze zlecenia, kliencie lub urządzeniu"
                class="pl-10 input-field w-full"
              >
            </div>
            <div class="border border-secondary-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-secondary-100">
              <button
                v-for="order in filteredOrders"
                :key="order.id"
                @click="selectCreateOrder(order)"
                class="w-full text-left px-4 py-3 transition"
                :class="createForm.orderId === order.id ? 'bg-primary-50/70' : 'hover:bg-secondary-50'"
              >
                <p class="text-sm font-semibold text-secondary-800">{{ order.order_number || ('#' + order.id) }}</p>
                <p class="text-xs text-secondary-500 truncate">{{ order.title || order.description }}</p>
                <div class="text-[11px] text-secondary-400 mt-1 flex flex-wrap gap-2">
                  <span>Klient: {{ order.client_display }}</span>
                  <span>• Urządzenie: {{ order.device_display }}</span>
                  <span>• Zakończono: {{ formatDate(order.completed_at) }}</span>
                </div>
              </button>
              <div v-if="!filteredOrders.length && !loadingOrders" class="p-4 text-center text-secondary-500 text-sm">
                Brak pasujących zleceń.
              </div>
              <div v-if="loadingOrders" class="p-4 text-center text-secondary-400 text-sm animate-pulse">
                Ładowanie…
              </div>
            </div>
          </section>

          <section v-if="createContext" class="space-y-4">
            <h3 class="text-sm font-semibold text-secondary-800 uppercase tracking-wide">2. Uzupełnij protokół</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Szablon</label>
                <input v-model="createForm.templateName" type="text" class="input-field" placeholder="Nazwa szablonu">
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Data wystawienia</label>
                <input v-model="createForm.issuedAt" type="date" class="input-field">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Opis wykonanych czynności</label>
              <textarea v-model="createForm.summaryText" rows="4" class="input-field"></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Uwagi serwisu</label>
              <textarea v-model="createForm.notes" rows="3" class="input-field"></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Zakres czynności</label>
              <div class="border border-secondary-200 rounded-lg divide-y divide-secondary-100">
                <div class="px-4 py-3 bg-secondary-50 flex flex-wrap gap-3 items-center">
                  <label class="flex items-center gap-2 text-sm text-secondary-700">
                    <span class="uppercase text-xs font-semibold text-secondary-500">Instalacja</span>
                  </label>
                  <select v-model="createForm.installationFuel" class="input-field w-40 text-sm">
                    <option value="gaz">Instalacja gazowa</option>
                    <option value="olej">Instalacja olejowa</option>
                    <option value="inne">Inne</option>
                  </select>
                  <label class="flex items-center gap-2 text-sm text-secondary-700">
                    <input type="checkbox" v-model="createForm.installationSealed" class="rounded border-secondary-300">
                    Szczelna
                  </label>
                </div>
                <div class="px-4 py-4 grid md:grid-cols-2 gap-2">
                  <label
                    v-for="item in createForm.checks"
                    :key="item.id"
                    class="flex items-start gap-2 text-sm text-secondary-700 cursor-pointer"
                  >
                    <input type="checkbox" v-model="item.checked" class="mt-1 rounded border-secondary-300">
                    <span>{{ item.label }}</span>
                  </label>
                </div>
                <div class="px-4 py-4 space-y-3">
                  <div class="flex gap-2">
                    <input v-model="newCheckLabel" type="text" placeholder="Dodaj własny punkt" class="input-field flex-1 text-sm">
                    <button @click="addCustomCheck" class="px-3 py-2 text-sm font-medium rounded-lg bg-secondary-100 hover:bg-secondary-200">
                      Dodaj
                    </button>
                  </div>
                  <textarea v-model="createForm.extra" rows="2" class="input-field text-sm" placeholder="Dodatkowe informacje"></textarea>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-secondary-500 mb-1">Klauzula akceptacji</label>
              <textarea v-model="createForm.acceptanceClause" rows="4" class="input-field"></textarea>
            </div>

            <div class="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-secondary-800 mb-2">Podgląd podsumowania</h4>
              <p class="text-sm text-secondary-700 whitespace-pre-line">{{ previewSummary }}</p>
            </div>
          </section>
        </div>
        <div class="px-6 py-4 border-t border-secondary-200 bg-secondary-50 flex items-center justify-between">
          <div class="text-xs text-secondary-400">Po zapisaniu dokument trafi do listy po lewej i będzie można wygenerować PDF.</div>
          <div class="flex gap-3">
            <button @click="closeCreateModal" class="px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 hover:text-secondary-900 hover:border-secondary-300 text-sm font-medium">
              Anuluj
            </button>
            <button
              @click="submitCreateForm"
              :disabled="createLoading || !createForm.orderId"
              class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i v-if="createLoading" class="fas fa-spinner animate-spin mr-2"></i>
              Zapisz protokół
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  fetchProtocols,
  fetchProtocolDefaults,
  fetchProtocolContext,
  fetchProtocol,
  createProtocol,
  updateProtocol,
  exportProtocolToRailway,
  generateProtocolPdf,
  ensureProtocolFolder,
  openProtocolPdf,
  deleteProtocol
} from '../services/protocolService'

const protocols = ref([])
const loadingList = ref(false)
const selectedProtocol = ref(null)
const defaultAcceptanceClause = ref('')
const showCreateModal = ref(false)
const createLoading = ref(false)
const createContext = ref(null)
const availableOrders = ref([])
const loadingOrders = ref(false)
const orderSearch = ref('')
const newCheckLabel = ref('')
const deletingId = ref(null)

const createForm = reactive({
  orderId: null,
  templateName: 'Protokół serwisowy',
  issuedAt: '',
  summaryText: '',
  notes: '',
  checks: [],
  installationFuel: 'gaz',
  installationSealed: true,
  extra: '',
  acceptanceClause: ''
})

const fetchOrderList = async () => {
  if (!window?.electronAPI?.database) return []
  const sql = `
    SELECT so.id, so.order_number, so.title, so.description, so.completed_at,
           c.company_name, c.first_name, c.last_name,
           d.name AS device_name, d.model AS device_model
    FROM service_orders so
    LEFT JOIN clients c ON c.id = so.client_id
    LEFT JOIN devices d ON d.id = so.device_id
    WHERE LOWER(so.status) = 'completed'
    ORDER BY datetime(COALESCE(so.completed_at, so.updated_at, so.created_at)) DESC
    LIMIT 200
  `
  const rows = await window.electronAPI.database.query(sql).catch(() => [])
  return Array.isArray(rows) ? rows.map(row => ({
    ...row,
    client_display: [row.company_name, row.first_name, row.last_name].filter(Boolean).join(' '),
    device_display: [row.device_name, row.device_model].filter(Boolean).join(' ')
  })) : []
}

const loadProtocols = async () => {
  try {
    loadingList.value = true
    const data = await fetchProtocols({ limit: 200, offset: 0 })
    const filtered = (data || []).filter(p => String(p.desktop_sync_status || '').toLowerCase() !== 'archived')
    protocols.value = filtered.map(normalizeProtocol)
    if (filtered.length && !selectedProtocol.value) {
      selectedProtocol.value = protocols.value[0]
    } else if (selectedProtocol.value) {
      const refreshed = protocols.value.find(p => p.id === selectedProtocol.value.id)
      if (refreshed) {
        selectedProtocol.value = refreshed
      }
    }
  } catch (error) {
    console.error('Protocols load failed:', error)
  } finally {
    loadingList.value = false
  }
}

const normalizeProtocol = (protocol) => {
  if (!protocol) return null
  const clone = { ...protocol }
  clone.pdf_uploaded = !!(protocol.pdf_uploaded || protocol.pdf_uploaded === true)
  return clone
}

const selectProtocol = async (protocol) => {
  try {
    const fresh = await fetchProtocol(protocol.id)
    selectedProtocol.value = normalizeProtocol(fresh || protocol)
  } catch (error) {
    console.warn('Protocol refresh failed:', error)
    selectedProtocol.value = protocol
  }
}

const statusBadge = (protocol) => {
  if (!protocol) return 'bg-secondary-100 text-secondary-500'
  if (protocol.desktop_sync_status === 'sent') return 'bg-green-100 text-green-700'
  if (protocol.desktop_sync_status === 'pending') return 'bg-amber-100 text-amber-700'
  return 'bg-secondary-100 text-secondary-500'
}

const statusIcon = (protocol) => {
  if (!protocol) return 'fas fa-file'
  if (protocol.desktop_sync_status === 'sent') return 'fas fa-check'
  if (protocol.desktop_sync_status === 'pending') return 'fas fa-clock'
  return 'fas fa-file'
}

const handleDeleteProtocol = async (protocol) => {
  try {
    if (!protocol?.id) return
    const confirmed = window.confirm('Czy na pewno chcesz usunąć ten protokół?')
    if (!confirmed) return
    deletingId.value = protocol.id
    const success = await deleteProtocol(protocol.id)
    if (success) {
      protocols.value = protocols.value.filter(p => p.id !== protocol.id)
      if (selectedProtocol.value?.id === protocol.id) {
        selectedProtocol.value = protocols.value.length ? protocols.value[0] : null
      }
    }
  } catch (error) {
    console.error('Protocol delete failed:', error)
    alert('Nie udało się usunąć protokołu. Spróbuj ponownie.')
  } finally {
    deletingId.value = null
  }
}

const formatDate = (value) => {
  if (!value) return '-'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('pl-PL')
  } catch (_) {
    return value
  }
}

const renderCompany = (snapshot) => {
  if (!snapshot) return 'Brak danych'
  const lines = []
  if (snapshot.name) lines.push(snapshot.name)
  if (snapshot.address) lines.push(snapshot.address)
  if (snapshot.city && !snapshot.address?.includes(snapshot.city)) lines.push(snapshot.city)
  if (snapshot.nip) lines.push(`NIP: ${snapshot.nip}`)
  if (snapshot.regon) lines.push(`REGON: ${snapshot.regon}`)
  if (snapshot.phone) lines.push(`Tel: ${snapshot.phone}`)
  if (snapshot.email) lines.push(`Email: ${snapshot.email}`)
  if (snapshot.website) lines.push(`WWW: ${snapshot.website}`)
  return lines.join('\n') || 'Brak danych'
}

const renderClient = (snapshot) => {
  if (!snapshot) return 'Brak danych'
  const lines = []
  if (snapshot.display_name) lines.push(snapshot.display_name)
  if (snapshot.address) lines.push(snapshot.address)
  if (snapshot.nip) lines.push(`NIP: ${snapshot.nip}`)
  if (snapshot.regon) lines.push(`REGON: ${snapshot.regon}`)
  if (snapshot.phone) lines.push(`Tel: ${snapshot.phone}`)
  if (snapshot.email) lines.push(`Email: ${snapshot.email}`)
  return lines.join('\n') || 'Brak danych'
}

const renderDevice = (snapshot) => {
  if (!snapshot) return 'Brak danych'
  const lines = []
  if (snapshot.name) lines.push(snapshot.name)
  if (snapshot.manufacturer || snapshot.model) lines.push([snapshot.manufacturer, snapshot.model].filter(Boolean).join(' '))
  if (snapshot.serial_number) lines.push(`Nr seryjny: ${snapshot.serial_number}`)
  if (snapshot.production_year) lines.push(`Rok prod.: ${snapshot.production_year}`)
  if (snapshot.fuel_type) lines.push(`Paliwo: ${snapshot.fuel_type}`)
  if (snapshot.power_rating) lines.push(`Moc: ${snapshot.power_rating}`)
  return lines.join('\n') || 'Brak danych'
}

const renderTechnician = (snapshot) => {
  if (!snapshot) return 'Brak danych'
  const lines = []
  if (snapshot.full_name) lines.push(snapshot.full_name)
  if (snapshot.email) lines.push(`Email: ${snapshot.email}`)
  if (snapshot.phone) lines.push(`Tel: ${snapshot.phone}`)
  return lines.join('\n') || 'Brak danych'
}

const renderParts = (snapshot) => {
  if (!snapshot) return ''
  if (snapshot.parts && Array.isArray(snapshot.parts) && snapshot.parts.length) {
    return snapshot.parts.map(part => {
      const qty = part.quantity ? ` ×${part.quantity}` : ''
      const pn = part.part_number ? ` (${part.part_number})` : ''
      return `${part.name || 'Część'}${pn}${qty}`
    }).join('\n')
  }
  if (snapshot.partsText) return snapshot.partsText
  return ''
}

const openCreateModal = async () => {
  showCreateModal.value = true
  createLoading.value = false
  orderSearch.value = ''
  newCheckLabel.value = ''
  createForm.orderId = null
  createContext.value = null
  createForm.templateName = 'Protokół serwisowy'
  createForm.summaryText = ''
  createForm.notes = ''
  createForm.installationFuel = 'gaz'
  createForm.installationSealed = true
  createForm.extra = ''
  try {
    const defaults = await fetchProtocolDefaults().catch(() => ({ checks: [], acceptanceClause: '' }))
    defaultAcceptanceClause.value = defaults.acceptanceClause || defaultAcceptanceClause.value
    createForm.acceptanceClause = defaults.acceptanceClause || defaultAcceptanceClause.value
    createForm.checks = (defaults.checks || []).map(item => ({ ...item }))
  } catch (error) {
    console.warn('Protocol defaults fetch failed:', error)
    createForm.checks = []
  }
  await loadRecentOrders()
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const loadRecentOrders = async () => {
  try {
    loadingOrders.value = true
    availableOrders.value = await fetchOrderList()
  } catch (error) {
    console.error('Orders load failed:', error)
  } finally {
    loadingOrders.value = false
  }
}

const filteredOrders = computed(() => {
  const query = orderSearch.value.trim().toLowerCase()
  if (!query) return availableOrders.value
  return availableOrders.value.filter(order => {
    return [order.order_number, order.title, order.description, order.client_display, order.device_display]
      .some(field => field && String(field).toLowerCase().includes(query))
  })
})

const selectCreateOrder = async (order) => {
  if (!order) return
  createForm.orderId = order.id
  createLoading.value = true
  try {
    const ctx = await fetchProtocolContext(order.id)
    createContext.value = ctx
    if (!createForm.issuedAt) {
      createForm.issuedAt = (ctx?.order?.completed_at || new Date().toISOString()).slice(0, 10)
    }
    createForm.templateName = `Protokół z przeglądu – ${ctx?.device?.name || order.title || 'Urządzenie'}`
    createForm.summaryText = buildDefaultSummary(ctx)
    createForm.notes = ctx?.order?.notes || ''
    createForm.installationFuel = ctx?.order?.fuel_type || 'gaz'
    createForm.installationSealed = true
  } catch (error) {
    console.error('Context load failed:', error)
  } finally {
    createLoading.value = false
  }
}

const buildDefaultSummary = (ctx) => {
  if (!ctx) return ''
  const order = ctx.order || {}
  const device = ctx.device || {}
  const issuedDate = createForm.issuedAt ? formatDate(createForm.issuedAt) : formatDate(order.completed_at || new Date())
  const clientName = ctx.client?.display_name || ctx.client?.company_name || 'klienta'
  return `W dniu ${issuedDate} wykonano czynności serwisowe u ${clientName}. Urządzenie: ${device.name || 'urządzenie'}, model ${device.model || '-'}, numer seryjny ${device.serial_number || '-'}.` 
}

const addCustomCheck = () => {
  const label = newCheckLabel.value.trim()
  if (!label) return
  createForm.checks.push({ id: `custom_${Date.now()}`, label, checked: true })
  newCheckLabel.value = ''
}

const previewSummary = computed(() => {
  const parts = []
  if (createForm.summaryText) parts.push(createForm.summaryText)
  if (createForm.notes) parts.push(`Uwagi serwisu: ${createForm.notes}`)
  return parts.join('\n\n')
})

const submitCreateForm = async () => {
  if (!createForm.orderId) return
  createLoading.value = true
  try {
    const payload = {
      orderId: createForm.orderId,
      templateName: createForm.templateName,
      templateVersion: 1,
      issuedAt: createForm.issuedAt,
      summaryText: createForm.summaryText,
      notes: createForm.notes,
      acceptanceClause: createForm.acceptanceClause,
      checks: {
        installation: {
          fuelType: createForm.installationFuel,
          sealed: createForm.installationSealed
        },
        items: createForm.checks,
        extra: createForm.extra
      }
    }
    const protocol = await createProtocol(payload)
    closeCreateModal()
    await loadProtocols()
    if (protocol) {
      await selectProtocol(protocol)
    }
  } catch (error) {
    console.error('Protocol create failed:', error)
    alert('Nie udało się zapisać protokołu. Sprawdź konsolę (F12) po szczegóły.')
  } finally {
    createLoading.value = false
  }
}

const handleGeneratePdf = async (protocol) => {
  try {
    const fresh = await fetchProtocol(protocol.id)
    const html = renderProtocolHtml(fresh || protocol)
    const result = await generateProtocolPdf({
      protocolId: protocol.id,
      html,
      fileName: `protokol_${protocol.order_number || protocol.id}.pdf`
    })
    if (result?.path) {
      await updateProtocol(protocol.id, {
        pdfFilename: result.fileName,
        localPdfPath: result.path,
        pdfUploaded: false
      }).catch(() => null)
      await loadProtocols()
      alert(`Protokół zapisany w pliku:\n${result.path}`)
    }
  } catch (error) {
    console.error('PDF generation failed:', error)
    alert('Nie udało się wygenerować PDF. Sprawdź konsolę (F12) po szczegóły.')
  }
}

const handleExport = async (protocol) => {
  try {
    const folder = await ensureProtocolFolder()
    if (!protocol.local_pdf_path && !folder) {
      if (!confirm('Nie znaleziono wygenerowanego PDF. Kontynuować wysyłkę bez pliku?')) {
        return
      }
    }
    await exportProtocolToRailway(protocol.id)
    await loadProtocols()
    alert('Protokół wysłany do Railway.')
  } catch (error) {
    console.error('Protocol export failed:', error)
    alert('Nie udało się wysłać protokołu. Sprawdź konsolę (F12) po szczegóły.')
  }
}

const openPdf = async (path) => {
  try {
    const ok = await openProtocolPdf(path)
    if (!ok) throw new Error('open failed')
  } catch (error) {
    console.error('Open PDF failed:', error)
    alert('Nie udało się otworzyć pliku. Sprawdź, czy istnieje na dysku.')
  }
}

const escapeHtml = (value) => {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const getCheckedItems = (snapshot) => {
  return (snapshot?.items || []).filter(item => item && item.checked)
}

const renderProtocolHtml = (protocol) => {
  if (!protocol) return '<html><body><h1>Protokół serwisowy</h1></body></html>'
  const companySnapshot = protocol.service_company_snapshot || {}
  const clientSnapshot = protocol.client_snapshot || {}
  const deviceSnapshot = protocol.device_snapshot || {}
  const technicianSnapshot = protocol.technician_snapshot || {}
  const partsSnapshot = protocol.parts_snapshot || {}

  const logoSrc = companySnapshot.logo_base64
    ? `data:${companySnapshot.logo_mime || 'image/png'};base64,${companySnapshot.logo_base64}`
    : null

  const serviceRows = [
    { label: 'Nazwa firmy', value: companySnapshot.name },
    { label: 'Adres siedziby', value: [companySnapshot.address, companySnapshot.city].filter(Boolean).join(', ') },
    { label: 'NIP', value: companySnapshot.nip },
    { label: 'Telefon / email', value: [companySnapshot.phone, companySnapshot.email].filter(Boolean).join(' | ') }
  ]

  const clientName = clientSnapshot.display_name || clientSnapshot.company_name || [clientSnapshot.first_name, clientSnapshot.last_name].filter(Boolean).join(' ')
  const clientRows = [
    { label: 'Nazwa firmy / osoba', value: clientName },
    { label: 'Adres', value: [clientSnapshot.address_street, clientSnapshot.address_city, clientSnapshot.address_postal_code, clientSnapshot.address_country].filter(Boolean).join(', ') || clientSnapshot.address },
    { label: 'NIP', value: clientSnapshot.nip },
    { label: 'Kontakt', value: [clientSnapshot.phone, clientSnapshot.email].filter(Boolean).join(' | ') }
  ]

  const deviceRows = [
    { label: 'Typ / model', value: [deviceSnapshot.name, deviceSnapshot.model].filter(Boolean).join(' ') },
    { label: 'Numer seryjny', value: deviceSnapshot.serial_number },
    { label: 'Rok produkcji', value: deviceSnapshot.production_year },
    { label: 'Paliwo / moc', value: [deviceSnapshot.fuel_type, deviceSnapshot.power_rating].filter(Boolean).join(' | ') }
  ]

  const checklistItems = getCheckedItems(protocol.checks_snapshot)
  const extraNote = protocol.checks_snapshot?.extra ? escapeHtml(protocol.checks_snapshot.extra).replace(/\n/g, '<br>') : ''
  const fuelType = protocol.checks_snapshot?.installation?.fuelType || 'nie określono'
  const sealed = protocol.checks_snapshot?.installation?.sealed ? 'tak' : 'nie'

  const partsRows = Array.isArray(partsSnapshot.parts) ? partsSnapshot.parts.filter(Boolean) : []
  const partsHtml = partsRows.length
    ? `<table class="inner-table parts"><thead><tr><th>Nazwa części</th><th>Nr katalogowy</th><th>Ilość</th></tr></thead><tbody>${partsRows.map(part => `
        <tr>
          <td>${escapeHtml(part.name || '')}</td>
          <td>${escapeHtml(part.part_number || '')}</td>
          <td class="center">${escapeHtml(part.quantity != null ? String(part.quantity) : '')}</td>
        </tr>
      `).join('')}</tbody></table>`
    : (partsSnapshot.partsText ? `<p>${escapeHtml(partsSnapshot.partsText).replace(/\n/g, '<br>')}</p>` : '<p class="muted">Brak części do wylistowania.</p>')

  const summaryHtml = protocol.summary_text
    ? escapeHtml(protocol.summary_text).replace(/\n/g, '<br>')
    : '<span class="muted">Brak opisu.</span>'
  const notesHtml = protocol.notes
    ? `<p><strong>Uwagi serwisu:</strong><br>${escapeHtml(protocol.notes).replace(/\n/g, '<br>')}</p>`
    : ''

  const clause = (protocol.acceptance_clause || defaultAcceptanceClause.value || '').replace(/\n/g, '<br>')
  const orderNumber = protocol.order_number || protocol.order_id
  const issued = formatDate(protocol.issued_at)
  const created = formatDate(protocol.created_at)
  const technicianName = escapeHtml(technicianSnapshot.full_name || '')

  const simpleTable = (rows = []) => {
    const filtered = rows.filter(item => item.value != null && String(item.value).trim() !== '')
    if (!filtered.length) return '<p class="muted">Brak danych.</p>'
    return `
      <table class="inner-table">
        ${filtered.map(item => `
          <tr>
            <th>${escapeHtml(item.label)}</th>
            <td>${escapeHtml(item.value).replace(/\n/g, '<br>')}</td>
          </tr>
        `).join('')}
      </table>
    `
  }

  const checklistHtml = checklistItems.length
    ? `<ul class="checklist">${checklistItems.map(item => `<li>${escapeHtml(item.label)}</li>`).join('')}</ul>`
    : '<p class="muted">Brak zaznaczonych czynności.</p>'

  const extraHtml = extraNote ? `<p class="extra">${extraNote}</p>` : ''

  return `
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        @page { size: A4; margin: 14mm 16mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1f2937; margin: 0; }
        .layout { width: 100%; border-collapse: collapse; border: 1px solid #111; table-layout: fixed; }
        .layout td { border: 1px solid #111; padding: 4px; vertical-align: top; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .header-info { text-align: right; font-size: 9.5pt; }
        .doc-title { font-size: 12pt; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
        .logo { max-width: 120px; max-height: 55px; object-fit: contain; }
        .section-title { font-weight: 600; text-transform: uppercase; font-size: 10pt; margin-bottom: 3px; }
        .inner-table { width: 100%; border-collapse: collapse; }
        .inner-table th { width: 38%; text-align: left; padding: 2px 3px; font-weight: 600; font-size: 9.5pt; border-bottom: 1px solid #d1d5db; }
        .inner-table td { padding: 2px 3px; font-size: 9.5pt; border-bottom: 1px solid #e5e7eb; }
        .inner-table tr:last-child th, .inner-table tr:last-child td { border-bottom: none; }
        .parts thead th { text-align: center; }
        .parts td.center { text-align: center; }
        .muted { color: #6b7280; font-style: italic; }
        .checklist { margin: 0; padding: 0; font-size: 9.5pt; list-style: none; column-count: 2; column-gap: 14px; }
        .checklist li { break-inside: avoid; margin-bottom: 2px; padding-left: 12px; position: relative; }
        .checklist li::before { content: '\\2022'; position: absolute; left: 0; top: 0; }
        .extra { margin-top: 4px; font-size: 9.5pt; }
        .section.parts-section { font-size: 9.5pt; }
        .description-content { font-size: 9.5pt; }
        .signature-row { height: 70px; }
        .signature-row td { vertical-align: bottom; padding: 10px 12px; }
        .signature-name-label { font-size: 9.5pt; font-weight: 600; margin-bottom: 4px; }
        .signature-name-value { font-size: 9.5pt; }
        .signature-sign-cell { text-align: center; }
        .signature-line { border-top: 1px solid #111; width: 80%; margin: 0 auto 6px; }
        .signature-caption { font-size: 9.5pt; }
        .clause { font-size: 8.5pt; line-height: 1.3; }
      </style>
    </head>
    <body>
      <table class="layout">
        <tr>
          <td colspan="2">
            <div class="header">
              <div>
                ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="Logo">` : ''}
              </div>
              <div class="header-info">
                <div class="doc-title">${escapeHtml(protocol.template_name || 'Protokół serwisowy')}</div>
                <div>Nr protokołu / zlecenia: ${escapeHtml(orderNumber || '')}</div>
                <div>Data wykonania: ${escapeHtml(issued)}</div>
                <div>Data sporządzenia: ${escapeHtml(created)}</div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="section-title">Dane firmy wykonującej prace serwisowe</div>
            ${simpleTable(serviceRows)}
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="section-title">Dane klienta / właściciela urządzenia</div>
            ${simpleTable(clientRows)}
          </td>
        </tr>
        <tr>
          <td>
            <div class="section-title">Informacje o urządzeniu</div>
            ${simpleTable(deviceRows)}
          </td>
          <td>
            <div class="section-title">Serwisant</div>
            ${simpleTable([
              { label: 'Imię i nazwisko', value: technicianSnapshot.full_name },
              { label: 'Telefon', value: technicianSnapshot.phone },
              { label: 'Email', value: technicianSnapshot.email }
            ])}
            <div class="section-title" style="margin-top:10px;">Parametry zgłoszenia</div>
            ${simpleTable([
              { label: 'Rodzaj instalacji', value: fuelType },
              { label: 'Szczelność instalacji', value: sealed }
            ])}
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="section-title">Opis wykonanych czynności</div>
            ${checklistHtml}
            ${extraHtml}
          </td>
        </tr>
        <tr>
          <td colspan="2" class="parts-section">
            <div class="section-title">Wykaz zużytych części i materiałów</div>
            ${partsHtml}
          </td>
        </tr>
        <tr>
          <td colspan="2" class="description-content">
            <div class="section-title">Opis czynności serwisowych / Uwagi</div>
            <p>${summaryHtml}</p>
            ${notesHtml}
          </td>
        </tr>
        <tr>
          <td colspan="2" class="clause">
            ${clause}
          </td>
        </tr>
        <tr class="signature-row">
          <td>
            <div class="signature-name-label">Imię i nazwisko serwisanta:</div>
            <div class="signature-name-value">${technicianName || '&nbsp;'}</div>
          </td>
          <td class="signature-sign-cell">
            <div class="signature-line"></div>
            <div class="signature-caption">Podpis serwisanta</div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}

onMounted(async () => {
  try {
    const defaults = await fetchProtocolDefaults().catch(() => ({ checks: [], acceptanceClause: '' }))
    defaultAcceptanceClause.value = defaults.acceptanceClause || ''
  } catch (_) {}
  await loadProtocols()
})
</script>

<style scoped>
.input-field {
  width: 100%;
  border: 1px solid rgba(203, 213, 225, 1);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #334155;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-field:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
</style>

