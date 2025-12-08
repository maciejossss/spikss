<template>
  <div class="p-6 space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-secondary-900">Karty pracy</h1>
        <p class="text-sm text-secondary-500">Podsumowanie wykonanych zleceń na podstawie danych z aplikacji mobilnej</p>
      </div>
      <div class="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          class="btn-secondary btn-sm"
          @click="setCurrentWeek"
          :disabled="loading"
        >
          Bieżący tydzień
        </button>
        <button
          type="button"
          class="btn-secondary btn-sm"
          @click="setPreviousWeek"
          :disabled="loading"
        >
          Poprzedni tydzień
        </button>
        <button
          type="button"
          class="btn-secondary btn-sm"
          @click="setCurrentMonth"
          :disabled="loading"
        >
          Bieżący miesiąc
        </button>
        <button
          type="button"
          class="btn-primary btn-sm"
          @click="loadLogs"
          :disabled="loading"
        >
          <i class="fas fa-rotate mr-2" :class="{ 'animate-spin': loading }"></i>
          Odśwież dane
        </button>
        <button
          type="button"
          class="btn-success btn-sm"
          @click="handleGeneratePdf"
          :disabled="loading || !orderedEntries.length"
        >
          <i class="fas fa-file-pdf mr-2"></i>
          Generuj PDF
        </button>
      </div>
    </header>

    <section class="bg-white rounded-xl border border-secondary-200 shadow-sm p-4">
      <form class="grid gap-4 md:grid-cols-4">
        <div class="md:col-span-2">
          <label class="block text-xs uppercase font-semibold text-secondary-500 mb-1">Technik</label>
          <select
            v-model="filters.technicianId"
            class="input-field"
            :disabled="loading"
          >
            <option value="">Wszyscy technicy</option>
            <option
              v-for="tech in technicians"
              :key="tech.id"
              :value="String(tech.id)"
            >
              {{ tech.full_name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs uppercase font-semibold text-secondary-500 mb-1">Od</label>
          <input
            type="date"
            v-model="filters.fromDate"
            class="input-field"
            :disabled="loading"
          >
        </div>
        <div>
          <label class="block text-xs uppercase font-semibold text-secondary-500 mb-1">Do</label>
          <input
            type="date"
            v-model="filters.toDate"
            class="input-field"
            :disabled="loading"
          >
        </div>
      </form>
    </section>

    <section class="grid gap-4 md:grid-cols-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-xs uppercase tracking-wide text-blue-600 font-semibold">Zakres dat</p>
        <p class="text-lg font-semibold text-blue-900 mt-1">{{ rangeLabel }}</p>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-xs uppercase tracking-wide text-green-600 font-semibold">Liczba wpisów</p>
        <p class="text-lg font-semibold text-green-900 mt-1">{{ workLogs.length }}</p>
      </div>
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-xs uppercase tracking-wide text-yellow-600 font-semibold">Łączny czas pracy</p>
        <p class="text-lg font-semibold text-yellow-900 mt-1">{{ totalHoursLabel }}</p>
      </div>
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p class="text-xs uppercase tracking-wide text-purple-600 font-semibold">Technik</p>
        <p class="text-lg font-semibold text-purple-900 mt-1">{{ technicianLabel }}</p>
      </div>
    </section>

    <section class="bg-white rounded-xl border border-secondary-200 shadow-sm">
      <div class="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-secondary-900">Zestawienie prac</h2>
        <span class="text-xs text-secondary-500" v-if="loading">Trwa pobieranie danych…</span>
      </div>
      <div class="relative">
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm text-secondary-500 text-sm font-medium"
        >
          <i class="fas fa-spinner fa-spin text-xl text-secondary-400"></i>
          <span>Trwa pobieranie danych z synchronizacji…</span>
        </div>
        <div v-if="!workLogs.length && !loading" class="p-10 text-center text-secondary-500">
          <i class="fas fa-clipboard-list text-3xl mb-3 text-secondary-300"></i>
          <p>Brak wpisów w wybranym zakresie.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-secondary-200">
            <thead class="bg-secondary-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Data</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Klient / Lokalizacja</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Opis prac (A)</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Uwagi (B)</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Użyte materiały</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-secondary-500">Kategorie</th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-secondary-500">Protokół</th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-secondary-500">Faktura</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-secondary-500">Godziny</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary-100 bg-white">
              <tr
                v-for="entry in orderedEntries"
                :key="`${entry.id}-${entry.actual_end_date || entry.updated_at}`"
                class="align-top hover:bg-secondary-50"
              >
                <td class="px-4 py-4 text-sm text-secondary-700 whitespace-nowrap">
                  <div class="font-semibold text-secondary-900">{{ entry.order_number || ('#' + entry.id) }}</div>
                  <div class="text-xs text-secondary-500">{{ formatDate(entry.actual_end_date) }}</div>
                  <div class="text-xs text-secondary-500" v-if="entry.actual_start_date || entry.actual_end_date">
                    <div v-if="entry.actual_start_date">Start: {{ formatDateTime(entry.actual_start_date) }}</div>
                    <div v-if="entry.actual_end_date">Koniec: {{ formatDateTime(entry.actual_end_date) }}</div>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-secondary-700">
                  <div class="font-medium text-secondary-900">{{ entry.client_display_name || 'Klient nieznany' }}</div>
                  <div class="text-xs text-secondary-500" v-if="entry.client_address">{{ entry.client_address }}</div>
                  <div class="text-xs text-secondary-500" v-if="entry.device_name">
                    Urządzenie: {{ [entry.device_name, entry.device_model, entry.device_serial].filter(Boolean).join(', ') }}
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-secondary-700 whitespace-pre-line">
                  {{ entry.completion_notes || 'Brak danych' }}
                </td>
                <td class="px-4 py-4 text-sm text-secondary-700 whitespace-pre-line">
                  {{ entry.technician_notes || '—' }}
                </td>
                <td class="px-4 py-4 text-sm text-secondary-700">
                  <template v-if="entry.parts.length">
                    <ul class="list-disc list-inside space-y-1">
                      <li v-for="(part, idx) in entry.parts" :key="idx">
                        {{ part.name }} <span v-if="part.part_number">({{ part.part_number }})</span>
                        <span v-if="part.quantity">×{{ part.quantity }}</span>
                      </li>
                    </ul>
                  </template>
                  <span v-else class="text-secondary-400">Brak części</span>
                </td>
                <td class="px-4 py-4 text-sm text-secondary-700">
                  <template v-if="entry.categoryLabels.length">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="label in entry.categoryLabels"
                        :key="label"
                        class="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded"
                      >
                        {{ label }}
                      </span>
                    </div>
                  </template>
                  <span v-else class="text-secondary-400">Brak kategorii</span>
                </td>
                <td class="px-4 py-4 text-center text-sm text-secondary-700 whitespace-nowrap">
                  {{ entry.has_protocol ? 'tak' : 'nie' }}
                </td>
                <td class="px-4 py-4 text-center text-sm text-secondary-700 whitespace-nowrap">
                  {{ entry.has_invoice ? 'tak' : 'nie' }}
                </td>
                <td class="px-4 py-4 text-right text-sm font-medium text-secondary-900 whitespace-nowrap space-y-1">
                  <div v-if="entry.reported_hours != null">
                    Zgłoszone: {{ formatHours(entry.reported_hours) }}
                  </div>
                  <div v-if="entry.calculated_seconds != null" class="text-xs text-secondary-500">
                    Policzone (start→koniec): {{ formatDuration(entry.calculated_seconds) }}
                  </div>
                  <div v-if="entry.reported_hours == null && entry.calculated_seconds == null">
                    0 h
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { fetchTechnicians, fetchWorkLogs } from '../services/workCardService'
import { renderWorkCardHtml } from '../utils/workCardPdf'

const technicians = ref([])
const workLogs = ref([])
const loading = ref(false)
const companyProfile = ref(null)
const filtersReady = ref(false)

const filters = reactive({
  technicianId: '',
  fromDate: '',
  toDate: ''
})

let reloadTimer = null

const setDateRange = (start, end) => {
  filters.fromDate = start
  filters.toDate = end
  scheduleLoad()
}

const setCurrentWeek = () => {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  setDateRange(formatDateInput(monday), formatDateInput(sunday))
}

const setPreviousWeek = () => {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1) - 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  setDateRange(formatDateInput(monday), formatDateInput(sunday))
}

const setCurrentMonth = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  setDateRange(formatDateInput(start), formatDateInput(end))
}

const formatDateInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('pl-PL')
  } catch (_) {
    return value
  }
}

const formatDateTime = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  } catch (_) {
    return ''
  }
}

const formatHours = (hours) => {
  const num = typeof hours === 'number' ? hours : Number(hours)
  if (!num || Number.isNaN(num)) return '0 h'
  return `${(Math.round(num * 10) / 10).toFixed(1)} h`
}

const formatDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0h 0m'
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const technicianLabel = computed(() => {
  if (!filters.technicianId) return 'Wszyscy'
  const match = technicians.value.find(t => String(t.id) === String(filters.technicianId))
  return match?.full_name || 'Technik nieznany'
})

const rangeLabel = computed(() => {
  const start = filters.fromDate ? new Date(filters.fromDate).toLocaleDateString('pl-PL') : '—'
  const end = filters.toDate ? new Date(filters.toDate).toLocaleDateString('pl-PL') : '—'
  return `${start} – ${end}`
})

const orderedEntries = computed(() => {
  return (workLogs.value || []).map(entry => ({
    ...entry,
    categoryLabels: mapCategories(entry.categoryCodes || entry.completed_categories || entry.service_categories)
  }))
})

const totalHours = computed(() => {
  return orderedEntries.value.reduce((sum, entry) => {
    if (entry.reported_hours != null) return sum + entry.reported_hours
    if (entry.calculated_hours != null) return sum + entry.calculated_hours
    return sum
  }, 0)
})

const totalHoursLabel = computed(() => formatHours(totalHours.value))

const loadTechnicians = async () => {
  const list = await fetchTechnicians()
  technicians.value = list
}

const loadCompanyProfile = async () => {
  try {
    if (window?.electronAPI?.settings) {
      const result = await window.electronAPI.settings.getCompany()
      if (result?.success) {
        companyProfile.value = result.data || null
      }
    }
  } catch (error) {
    console.warn('[WorkCards] loadCompanyProfile failed:', error)
  }
}

const loadLogs = async () => {
  loading.value = true
  workLogs.value = []
  try {
    const logs = await fetchWorkLogs({
      technicianId: filters.technicianId ? Number(filters.technicianId) : null,
      fromDate: filters.fromDate,
      toDate: filters.toDate
    })
    workLogs.value = Array.isArray(logs) ? logs : []
  } finally {
    loading.value = false
  }
}

const scheduleLoad = () => {
  if (!filtersReady.value) return
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => {
    loadLogs()
  }, 150)
}

const handleGeneratePdf = async () => {
  if (loading.value || !orderedEntries.value.length) return
  try {
    const technician = technicians.value.find(t => String(t.id) === String(filters.technicianId))
    const html = renderWorkCardHtml({
      company: companyProfile.value,
      technicianName: technician?.full_name || 'Wszyscy technicy',
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      entries: orderedEntries.value
    })
    const stamp = filters.fromDate || filters.toDate || new Date().toISOString().slice(0, 10)
    const fileName = `karta_pracy_${stamp.replace(/[^0-9]/g, '')}.pdf`
    const result = await window.electronAPI.workCards.generatePdf({
      html,
      fileName
    })
    if (result?.success) {
      alert(`Karta pracy zapisana w pliku:\n${result.path}`)
    } else if (result?.error) {
      alert(`Nie udało się wygenerować karty pracy w PDF:\n${result.error}`)
    }
  } catch (error) {
    console.error('[WorkCards] PDF generation failed:', error)
    alert('Nie udało się wygenerować karty pracy w PDF.')
  }
}

onMounted(async () => {
  await loadCompanyProfile()
  await loadTechnicians()
  setCurrentWeek()
  await loadLogs()
  filtersReady.value = true
})

onUnmounted(() => {
  if (reloadTimer) clearTimeout(reloadTimer)
})

watch(() => filters.technicianId, scheduleLoad)
watch(() => filters.fromDate, scheduleLoad)
watch(() => filters.toDate, scheduleLoad)

// Kategorie z Monitora – kopiujemy słownik, aby zachować spójność nazw
const MOBILE_SERVICE_CATEGORIES = {
  '02': { name: '02: AWARIA', subcategories: { '0201': '0201: Naprawa bez użycia części', '0202': '0202: Naprawa z użyciem części' } },
  '01': { name: '01: Diagnostyka', subcategories: { '0101': '0101: Diagnostyka awarii', '0102': '0102: Sprawdzenie parametrów' } },
  '04': { name: '04: Czyszczenie', subcategories: { '0401': '0401: Czyszczenie kotła', '0402': '0402: Czyszczenie palnika' } },
  '05': { name: '05: Regulacja', subcategories: { '0501': '0501: Regulacja palnika', '0502': '0502: Regulacja automatyki' } },
  '08': { name: '08: Przegląd i konserwacja', subcategories: { '0801': '0801: Przegląd okresowy', '0802': '0802: Konserwacja' } },
  '09': { name: '09: Remont i konserwacja', subcategories: { '0901': '0901: Remont kotła', '0902': '0902: Wymiana części' } },
  '06': { name: '06: Sprawdzenie szczelności gazu', subcategories: { '0601': '0601: Sprawdzenie szczelności' } },
  '07': { name: '07: Analiza spalin', subcategories: { '0701': '0701: Analiza spalin' } },
  '03': { name: '03: Przeszkolenie', subcategories: { '0301': '0301: Przeszkolenie użytkownika' } },
  '11': { name: '11: Uruchomienie', subcategories: { '1101': '1101: Uruchomienie urządzenia' } },
  '10': { name: '10: Usunięcie awarii', subcategories: { '1001': '1001: Usunięcie awarii' } }
}

const legacyCategories = {
  'A1': 'Czyszczenie palnika (mechaniczne)',
  'A2': 'Czyszczenie palnika (chemiczne)',
  'A3': 'Czyszczenie wymiennika (mechaniczne)',
  'A4': 'Czyszczenie wymiennika (chemiczne)',
  'A5': 'Wymiana filtrów paliwa (gaz)',
  'A6': 'Wymiana filtrów paliwa (olej)',
  'A10': 'Kontrola i wymiana uszczelek',
  'B4': 'Wymiana elektrody zapłonowej',
  'B5': 'Wymiana elektrody jonizacyjnej',
  'B6': 'Wymiana dyszy paliwowej (gaz)',
  'B7': 'Wymiana dyszy paliwowej (olej)',
  'B8': 'Wymiana czujnika temperatury',
  'B9': 'Wymiana czujnika ciśnienia',
  'B10': 'Wymiana zaworu bezpieczeństwa',
  'B12': 'Wymiana pompy obiegowej',
  'B13': 'Wymiana wentylatora palnika',
  'G1': 'Diagnoza usterki',
  'G5': 'Tymczasowa naprawa'
}

const mapCategories = (raw) => {
  if (!raw) return []
  let codes = []
  if (Array.isArray(raw)) {
    codes = raw.map(String)
  } else {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) codes = parsed.map(String)
    } catch (_) {
      codes = String(raw).split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  const labels = []
  for (const code of codes) {
    if (legacyCategories[code]) {
      labels.push(legacyCategories[code])
      continue
    }
    if (MOBILE_SERVICE_CATEGORIES[code]) {
      labels.push(MOBILE_SERVICE_CATEGORIES[code].name)
      continue
    }
    for (const main of Object.values(MOBILE_SERVICE_CATEGORIES)) {
      if (main.subcategories && main.subcategories[code]) {
        labels.push(main.subcategories[code])
        break
      }
    }
  }
  return labels
}
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

