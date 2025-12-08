<template>
  <div class="p-6">
    <!-- Nagłówek -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-secondary-900">Raporty</h1>
      
      <!-- Kontrolki -->
      <div class="flex items-center space-x-4">
        <!-- Wybór okresu -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-secondary-700">Okres:</label>
          <select
            v-model="selectedPeriod"
            @change="loadReportData"
            class="px-3 py-1 border border-secondary-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Dzisiaj</option>
            <option value="this_week">Bieżący tydzień</option>
            <option value="this_month">Bieżący miesiąc</option>
            <option value="this_year">Bieżący rok</option>
            <option value="custom">Własny zakres</option>
          </select>
        </div>

        <!-- Przycisk generowania raportu -->
        <button
          @click="generateReport"
          :disabled="loading"
          class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-file-pdf mr-2"></i>
          Generuj PDF
        </button>

        <!-- Reset raportu -->
        <button
          @click="resetReportData"
          :disabled="loading"
          class="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <i class="fas fa-trash-restore mr-2"></i>
          Resetuj raport
        </button>
      </div>
    </div>

    <!-- Własny zakres dat -->
    <div v-if="selectedPeriod === 'custom'" class="mb-6 p-4 bg-secondary-50 rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Data od:</label>
          <input
            v-model="customDateFrom"
            type="date"
            @change="loadReportData"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Data do:</label>
          <input
            v-model="customDateTo"
            type="date"
            @change="loadReportData"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>

    <!-- Kluczowe wskaźniki KPI -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-secondary-600">Przychody</p>
            <p class="text-2xl font-bold text-secondary-900">{{ formatCurrency(kpiData.revenue) }}</p>
            <p class="text-sm text-green-600 mt-1">
              <i class="fas fa-arrow-up mr-1"></i>
              +{{ kpiData.revenueGrowth }}%
            </p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <i class="fas fa-money-bill-wave text-green-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-secondary-600">Zlecenia</p>
            <p class="text-2xl font-bold text-secondary-900">{{ kpiData.ordersCount }}</p>
            <p class="text-sm text-blue-600 mt-1">
              <i class="fas fa-arrow-up mr-1"></i>
              +{{ kpiData.ordersGrowth }}%
            </p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <i class="fas fa-clipboard-list text-blue-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-secondary-600">Nowi klienci</p>
            <p class="text-2xl font-bold text-secondary-900">{{ kpiData.newClients }}</p>
            <p class="text-sm text-purple-600 mt-1">
              <i class="fas fa-arrow-up mr-1"></i>
              +{{ kpiData.clientsGrowth }}%
            </p>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <i class="fas fa-user-plus text-purple-600 text-xl"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-secondary-600">Śr. czas realizacji</p>
            <p class="text-2xl font-bold text-secondary-900">{{ kpiData.avgCompletionTime }}h</p>
            <p class="text-sm text-orange-600 mt-1">
              <i class="fas fa-arrow-down mr-1"></i>
              -{{ kpiData.timeImprovement }}%
            </p>
          </div>
          <div class="p-3 bg-orange-100 rounded-full">
            <i class="fas fa-clock text-orange-600 text-xl"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Wykres przychodów -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          <i class="fas fa-chart-line mr-2 text-green-600"></i>
          Przychody w czasie
        </h3>
        <div class="h-64 flex items-center justify-center">
          <div v-if="loading" class="text-secondary-500">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Ładowanie danych...
          </div>
          <canvas v-else ref="revenueChart" class="w-full h-full"></canvas>
        </div>
      </div>

      <!-- Wykres statusów zleceń -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          <i class="fas fa-chart-pie mr-2 text-blue-600"></i>
          Status zleceń
        </h3>
        <div class="h-64 flex items-center justify-center">
          <div v-if="loading" class="text-secondary-500">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Ładowanie danych...
          </div>
          <canvas v-else ref="statusChart" class="w-full h-full"></canvas>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <!-- Top klienci -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          <i class="fas fa-trophy mr-2 text-yellow-600"></i>
          Top Klienci
        </h3>
        <div class="space-y-3">
          <div
            v-for="(client, index) in topClients"
            :key="client.id"
            class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <div class="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full font-semibold text-sm">
                {{ index + 1 }}
              </div>
              <div>
                <p class="font-medium text-secondary-900">{{ client.name }}</p>
                <p class="text-sm text-secondary-600">{{ client.ordersCount }} zleceń</p>
              </div>
            </div>
            <p class="font-semibold text-secondary-900">{{ formatCurrency(client.revenue) }}</p>
          </div>
        </div>
      </div>

      <!-- Najpopularniejsze usługi -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          <i class="fas fa-star mr-2 text-orange-600"></i>
          Popularne usługi
        </h3>
        <div class="space-y-3">
          <div
            v-for="service in popularServices"
            :key="service.type"
            class="flex items-center justify-between"
          >
            <div>
              <p class="font-medium text-secondary-900">{{ service.name }}</p>
              <p class="text-sm text-secondary-600">{{ service.count }} zleceń</p>
            </div>
            <div class="w-24 bg-secondary-200 rounded-full h-2">
              <div 
                class="bg-primary-600 h-2 rounded-full" 
                :style="{ width: service.percentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statystyki finansowe -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          <i class="fas fa-calculator mr-2 text-green-600"></i>
          Finanse
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-secondary-600">Faktury opłacone</span>
              <span class="text-sm font-medium text-green-600">{{ financialStats.paidInvoicesPercentage }}%</span>
            </div>
            <div class="w-full bg-secondary-200 rounded-full h-2">
              <div 
                class="bg-green-500 h-2 rounded-full" 
                :style="{ width: financialStats.paidInvoicesPercentage + '%' }"
              ></div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-secondary-600">Faktury przeterminowane</span>
              <span class="text-sm font-medium text-red-600">{{ financialStats.overdueInvoicesPercentage }}%</span>
            </div>
            <div class="w-full bg-secondary-200 rounded-full h-2">
              <div 
                class="bg-red-500 h-2 rounded-full" 
                :style="{ width: financialStats.overdueInvoicesPercentage + '%' }"
              ></div>
            </div>
          </div>

          <div class="pt-3 border-t">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-secondary-600">Należności</p>
                <p class="font-semibold text-secondary-900">{{ formatCurrency(financialStats.receivables) }}</p>
              </div>
              <div>
                <p class="text-secondary-600">Średni czas płatności</p>
                <p class="font-semibold text-secondary-900">{{ financialStats.avgPaymentTime }} dni</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela szczegółowa -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-secondary-200">
        <h3 class="text-lg font-semibold text-secondary-900">
          <i class="fas fa-table mr-2 text-secondary-600"></i>
          Szczegółowe dane zleceń
        </h3>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200">
          <thead class="bg-secondary-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Zlecenie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Klient
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Technik
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Data
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Wartość
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Wymienione części
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Czas realizacji
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-secondary-200">
            <tr v-for="order in detailedOrders" :key="order.id" class="hover:bg-secondary-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-secondary-900">{{ order.orderNumber }}</div>
                  <div class="text-sm text-secondary-500">{{ order.title }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                {{ order.clientName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                {{ order.technicianName || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getStatusClass(order.status)"
                >
                  {{ getStatusText(order.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                {{ formatCurrency(order.totalCost) }}
              </td>
              <td class="px-6 py-4 text-sm text-secondary-900">
                <div v-if="order.partsList && order.partsList.length" class="space-y-1 leading-tight">
                  <div
                    v-for="(part, partIndex) in order.partsList"
                    :key="`${order.id}-part-${partIndex}`"
                  >
                    {{ part }}
                  </div>
                </div>
                <span v-else class="text-secondary-400 italic">Brak danych</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                {{ order.completionTime || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'

const loading = ref(true)
const selectedPeriod = ref('this_month')
const customDateFrom = ref('')
const customDateTo = ref('')

const revenueChart = ref(null)
const statusChart = ref(null)

const kpiData = ref(createEmptyKpi())
const topClients = ref([])
const popularServices = ref([])
const financialStats = ref(createEmptyFinancialStats())
const detailedOrders = ref([])

const chartSeries = reactive({
  revenue: { labels: [], data: [] },
  statuses: { labels: [], data: [] }
})

const currentRangeLabel = ref('')

let revenueChartInstance = null
let statusChartInstance = null

const SERVICE_TYPE_LABELS = {
  maintenance: 'Przeglądy',
  repair: 'Naprawy',
  installation: 'Instalacje',
  consultation: 'Konsultacje'
}

const STATUS_ORDER = ['completed', 'in_progress', 'pending', 'assigned', 'new', 'cancelled']

const PERIOD_LABELS = {
  today: 'Dzisiaj',
  this_week: 'Bieżący tydzień',
  this_month: 'Bieżący miesiąc',
  this_year: 'Bieżący rok',
  custom: 'Własny zakres'
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function createEmptyKpi() {
  return {
    revenue: 0,
    revenueGrowth: 0,
    ordersCount: 0,
    ordersGrowth: 0,
    newClients: 0,
    clientsGrowth: 0,
    avgCompletionTime: 0,
    timeImprovement: 0
  }
}

function createEmptyFinancialStats() {
  return {
    paidInvoicesPercentage: 0,
    overdueInvoicesPercentage: 0,
    receivables: 0,
    avgPaymentTime: 0
  }
}

function createEmptyDataset() {
  return {
    orders: [],
    orderParts: [],
    timeEntries: [],
    invoices: [],
    clients: []
  }
}

function createEmptyMetrics() {
  return {
    kpiData: createEmptyKpi(),
    topClients: [],
    popularServices: [],
    financialStats: createEmptyFinancialStats(),
    detailedOrders: [],
    chartSeries: {
      revenue: { labels: [], data: [] },
      statuses: { labels: [], data: [] }
    }
  }
}

const formatCurrency = (amount) => {
  const numeric = Number(amount || 0)
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(numeric)
}

const formatDate = (input) => {
  if (!input) return '-'
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pl-PL')
}

const getStatusClass = (status) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    assigned: 'bg-indigo-100 text-indigo-800',
    new: 'bg-slate-100 text-slate-800'
  }
  return classes[status] || classes.pending
}

const getStatusText = (status) => {
  const texts = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Ukończone',
    cancelled: 'Anulowane',
    assigned: 'Przypisane',
    new: 'Nowe'
  }
  return texts[status] || 'Oczekujące'
}

const safeNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const sumNumbers = (items, selector) => {
  return (items || []).reduce((sum, item) => sum + safeNumber(selector(item)), 0)
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const addDays = (date, days) => new Date(date.getTime() + days * ONE_DAY_MS)

const startOfMonth = (date) => {
  const d = new Date(date)
  d.setDate(1)
  return startOfDay(d)
}

const endOfMonth = (date) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  return endOfDay(d)
}

const startOfYear = (date) => startOfDay(new Date(date.getFullYear(), 0, 1))
const endOfYear = (date) => endOfDay(new Date(date.getFullYear(), 11, 31))

const parseDateInput = (value) => {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp)
}

const formatSqliteDate = (date) => {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const iso = d.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`
}

const getPeriodRange = (period, from, to) => {
  const now = new Date()
  let start
  let end

  switch (period) {
    case 'today':
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case 'this_week': {
      const day = now.getDay() || 7
      start = startOfDay(addDays(now, -(day - 1)))
      end = endOfDay(addDays(start, 6))
      break
    }
    case 'this_year':
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case 'custom': {
      let startCustom = parseDateInput(from)
      let endCustom = parseDateInput(to)
      if (!startCustom || !endCustom) {
        endCustom = endOfDay(now)
        startCustom = startOfDay(addDays(endCustom, -29))
        customDateFrom.value = startCustom.toISOString().slice(0, 10)
        customDateTo.value = endCustom.toISOString().slice(0, 10)
      }
      if (startCustom > endCustom) {
        const tmp = startCustom
        startCustom = endCustom
        endCustom = tmp
      }
      start = startOfDay(startCustom)
      end = endOfDay(endCustom)
      break
    }
    case 'this_month':
    default:
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
  }

  return { start, end }
}

const getPreviousRange = (range) => {
  if (!range?.start || !range?.end) return null
  const days = Math.max(1, Math.round((range.end - range.start) / ONE_DAY_MS) + 1)
  const prevStart = startOfDay(addDays(range.start, -days))
  const prevEnd = endOfDay(addDays(prevStart, days - 1))
  return { start: prevStart, end: prevEnd }
}

const groupBy = (items, keyFn) => {
  const map = new Map()
  for (const item of items || []) {
    const key = keyFn(item)
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key).push(item)
  }
  return map
}

const formatClientName = (order) => {
  if (!order) return 'Brak klienta'
  if (order.company_name) return order.company_name
  const first = order.first_name || ''
  const last = order.last_name || ''
  const full = `${first} ${last}`.trim()
  return full || 'Brak klienta'
}

const orderPrimaryDate = (order) => order?.completed_at || order?.started_at || order?.scheduled_date || order?.created_at || null

const computeCompletionHours = (order) => {
  if (!order?.started_at || !order?.completed_at) return null
  const start = new Date(order.started_at)
  const end = new Date(order.completed_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
  return (end - start) / (60 * 60 * 1000)
}

const formatCompletionTime = (hours) => {
  if (hours == null) return null
  return `${(Math.round(hours * 10) / 10).toFixed(1)}h`
}

const parseServiceCategories = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
      }
    } catch (_) {
      // ignore - fallback to split
    }
    return trimmed
      .split(/[,;|]/)
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

const resolveServiceName = (code) => {
  if (!code) return 'Inne usługi'
  const normalized = String(code).toLowerCase()
  if (SERVICE_TYPE_LABELS[normalized]) {
    return SERVICE_TYPE_LABELS[normalized]
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const computeGrowth = (previous, current) => {
  const prev = safeNumber(previous)
  const curr = safeNumber(current)
  if (prev === 0 && curr === 0) return 0
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

const computeImprovement = (previous, current) => {
  const prev = safeNumber(previous)
  const curr = safeNumber(current)
  if (prev === 0 || curr === 0) return 0
  return Math.round(((prev - curr) / prev) * 1000) / 10
}

const isInvoicePaid = (invoice) => {
  const status = String(invoice?.status || '').toLowerCase()
  if (status === 'paid' || status === 'zapłacona') return true
  if (invoice?.paid_date) return true
  return false
}

const isInvoiceOverdue = (invoice) => {
  if (!invoice) return false
  if (isInvoicePaid(invoice)) return false
  if (!invoice.due_date) return false
  const due = new Date(invoice.due_date)
  if (Number.isNaN(due.getTime())) return false
  return due < new Date()
}

const calculateAvgPaymentTime = (invoices) => {
  const durations = []
  for (const invoice of invoices || []) {
    if (!isInvoicePaid(invoice)) continue
    if (!invoice.issue_date || !invoice.paid_date) continue
    const issue = new Date(invoice.issue_date)
    const paid = new Date(invoice.paid_date)
    if (Number.isNaN(issue.getTime()) || Number.isNaN(paid.getTime()) || paid <= issue) continue
    durations.push((paid - issue) / ONE_DAY_MS)
  }
  if (!durations.length) return 0
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
  return Math.round(avg * 10) / 10
}

const formatChartKey = (date, aggregateByMonth) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  if (aggregateByMonth) {
    return `${year}-${month}`
  }
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const displayForChartKey = (key, aggregateByMonth) => {
  if (!key) return ''
  if (aggregateByMonth) {
    const [year, month] = key.split('-')
    return `${month}.${year}`
  }
  const [year, month, day] = key.split('-')
  return `${day}.${month}.${year}`
}

const escapeHtml = (text) => {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const loadReportData = async () => {
  loading.value = true

  try {
    const range = getPeriodRange(selectedPeriod.value, customDateFrom.value, customDateTo.value)
    if (!range?.start || !range?.end) {
      applyReportMetrics(createEmptyMetrics())
      currentRangeLabel.value = ''
      return
    }

    const rangeLabel =
      selectedPeriod.value === 'custom'
        ? `${formatDate(range.start)} – ${formatDate(range.end)}`
        : PERIOD_LABELS[selectedPeriod.value] || `${formatDate(range.start)} – ${formatDate(range.end)}`

    currentRangeLabel.value = rangeLabel

    const previousRange = getPreviousRange(range)

    const [currentDataset, previousDataset] = await Promise.all([
      fetchDataset(range),
      previousRange ? fetchDataset(previousRange) : Promise.resolve(createEmptyDataset())
    ])

    const metrics = buildReportMetrics(currentDataset, previousDataset, range)
    applyReportMetrics(metrics)
  } catch (error) {
    console.error('Błąd podczas ładowania danych raportu:', error)
    applyReportMetrics(createEmptyMetrics())
  } finally {
    loading.value = false
    await nextTick()
    generateCharts()
  }
}

const fetchDataset = async (range) => {
  const dataset = createEmptyDataset()
  if (!range?.start || !range?.end) return dataset

  if (!window.electronAPI?.database) {
    console.warn('Reports: Brak połączenia z bazą – używam pustego zestawu danych.')
    return dataset
  }

  const from = formatSqliteDate(range.start)
  const to = formatSqliteDate(range.end)

  const orders = await window.electronAPI.database
    .query(
      `
      SELECT so.*,\n             c.first_name,\n             c.last_name,\n             c.company_name,\n             c.type AS client_type,\n             d.name AS device_name,\n             d.serial_number,\n             d.model,\n             d.manufacturer,\n             u.full_name AS technician_name\n        FROM service_orders so\n   LEFT JOIN clients c ON c.id = so.client_id\n   LEFT JOIN devices d ON d.id = so.device_id\n   LEFT JOIN users u ON u.id = so.assigned_user_id\n       WHERE datetime(COALESCE(so.completed_at, so.scheduled_date, so.created_at)) BETWEEN datetime(?) AND datetime(?)\n       ORDER BY datetime(COALESCE(so.completed_at, so.scheduled_date, so.created_at)) DESC\n    `,
      [from, to]
    )
    .catch(() => [])

  dataset.orders = Array.isArray(orders) ? orders : []

  const orderIds = dataset.orders.map((o) => o.id).filter((id) => id != null)

  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',')

    const parts = await window.electronAPI.database
      .query(
        `
        SELECT
          op.*,
          COALESCE(sp.name, 'Nieznana część') AS part_name,
          COALESCE(sp.part_number, '') AS part_number,
          sp.manufacturer,
          sp.brand
        FROM order_parts op
   LEFT JOIN spare_parts sp ON sp.id = op.part_id
       WHERE op.order_id IN (${placeholders})
    ORDER BY op.order_id, COALESCE(sp.name, 'Nieznana część')
      `,
        orderIds
      )
      .catch(() => [])

    dataset.orderParts = Array.isArray(parts) ? parts : []

    const entries = await window.electronAPI.database
      .query(
        `
        SELECT *
          FROM time_entries
         WHERE order_id IN (${placeholders})
      ORDER BY datetime(date || ' ' || start_time) DESC
      `,
        orderIds
      )
      .catch(() => [])

    dataset.timeEntries = Array.isArray(entries) ? entries : []

    const invoices = await window.electronAPI.database
      .query(
        `
        SELECT i.*, so.order_number
          FROM invoices i
     LEFT JOIN service_orders so ON so.id = i.order_id
         WHERE i.order_id IN (${placeholders})
      ORDER BY datetime(COALESCE(i.paid_date, i.due_date, i.issue_date)) DESC
      `,
        orderIds
      )
      .catch(() => [])

    dataset.invoices = Array.isArray(invoices) ? invoices : []
  }

  const clients = await window.electronAPI.database
    .query(
      `
      SELECT *
        FROM clients
       WHERE created_at IS NOT NULL
         AND datetime(created_at) BETWEEN datetime(?) AND datetime(?)
    `,
      [from, to]
    )
    .catch(() => [])

  dataset.clients = Array.isArray(clients) ? clients : []

  return dataset
}

const buildReportMetrics = (current, previous, range) => {
  const metrics = createEmptyMetrics()

  const orders = current.orders || []
  const prevOrders = previous.orders || []
  const orderParts = current.orderParts || []
  const partsByOrder = groupBy(orderParts, (part) => part.order_id)

  const rangeDays = Math.max(1, Math.round((range.end - range.start) / ONE_DAY_MS) + 1)
  const aggregateByMonth = rangeDays > 62

  const revenue = sumNumbers(orders, (order) =>
    order.total_cost != null ? order.total_cost : safeNumber(order.parts_cost) + safeNumber(order.labor_cost)
  )
  const prevRevenue = sumNumbers(prevOrders, (order) =>
    order.total_cost != null ? order.total_cost : safeNumber(order.parts_cost) + safeNumber(order.labor_cost)
  )

  const completionTimes = orders
    .map((order) => computeCompletionHours(order))
    .filter((value) => value != null)

  const avgCompletionTime = completionTimes.length
    ? Math.round((completionTimes.reduce((sum, value) => sum + value, 0) / completionTimes.length) * 10) / 10
    : 0

  const prevCompletionTimes = prevOrders
    .map((order) => computeCompletionHours(order))
    .filter((value) => value != null)

  const prevAvgCompletion = prevCompletionTimes.length
    ? Math.round((prevCompletionTimes.reduce((sum, value) => sum + value, 0) / prevCompletionTimes.length) * 10) / 10
    : 0

  const newClientsCount = (current.clients || []).length
  const prevNewClients = (previous.clients || []).length

  metrics.kpiData = {
    revenue,
    revenueGrowth: computeGrowth(prevRevenue, revenue),
    ordersCount: orders.length,
    ordersGrowth: computeGrowth(prevOrders.length, orders.length),
    newClients: newClientsCount,
    clientsGrowth: computeGrowth(prevNewClients, newClientsCount),
    avgCompletionTime,
    timeImprovement: computeImprovement(prevAvgCompletion, avgCompletionTime)
  }

  const clientMap = new Map()
  for (const order of orders) {
    const clientId = order.client_id != null ? order.client_id : `order-${order.id}`
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        id: clientId,
        name: formatClientName(order),
        ordersCount: 0,
        revenue: 0
      })
    }
    const entry = clientMap.get(clientId)
    entry.ordersCount += 1
    entry.revenue += order.total_cost != null
      ? safeNumber(order.total_cost)
      : safeNumber(order.parts_cost) + safeNumber(order.labor_cost)
  }

  metrics.topClients = Array.from(clientMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const serviceCount = new Map()
  for (const order of orders) {
    const categories = parseServiceCategories(order.service_categories)
    if (categories.length) {
      for (const category of categories) {
        const label = resolveServiceName(category)
        serviceCount.set(label, (serviceCount.get(label) || 0) + 1)
      }
    } else {
      const label = resolveServiceName(order.type || 'inne')
      serviceCount.set(label, (serviceCount.get(label) || 0) + 1)
    }
  }

  const serviceList = Array.from(serviceCount.entries()).sort((a, b) => b[1] - a[1])
  const maxServiceCount = serviceList.length ? serviceList[0][1] : 0

  metrics.popularServices = serviceList.slice(0, 6).map(([name, count]) => ({
    type: name.toLowerCase(),
    name,
    count,
    percentage: maxServiceCount ? Math.round((count / maxServiceCount) * 100) : 0
  }))

  const invoices = current.invoices || []
  if (invoices.length) {
    const paidCount = invoices.filter(isInvoicePaid).length
    const overdueCount = invoices.filter(isInvoiceOverdue).length
    const receivables = invoices
      .filter((inv) => !isInvoicePaid(inv))
      .reduce((sum, inv) => sum + safeNumber(inv.gross_amount || inv.net_amount), 0)

    metrics.financialStats = {
      paidInvoicesPercentage: Math.round((paidCount / invoices.length) * 1000) / 10,
      overdueInvoicesPercentage: Math.round((overdueCount / invoices.length) * 1000) / 10,
      receivables,
      avgPaymentTime: calculateAvgPaymentTime(invoices)
    }
  } else {
    metrics.financialStats = createEmptyFinancialStats()
  }

  const detailed = orders.map((order) => {
    const orderDate = orderPrimaryDate(order)
    const parts = partsByOrder.get(order.id) || []
    const partsList = parts.map((part) => {
      const label = [part.part_name, part.part_number].filter(Boolean).join(' ').trim()
      const quantity = part.quantity != null ? `× ${part.quantity}` : ''
      return `${label}${quantity ? ` ${quantity}` : ''}`.trim()
    })
    const completionHours = computeCompletionHours(order)
    return {
      id: order.id,
      orderNumber: order.order_number,
      title: order.title || order.description || `Zlecenie ${order.order_number || order.id}`,
      clientName: formatClientName(order),
      technicianName: order.technician_name || '-',
      deviceName: order.device_name || '',
      createdAt: orderDate,
      status: order.status || 'pending',
      totalCost: order.total_cost != null
        ? safeNumber(order.total_cost)
        : safeNumber(order.parts_cost) + safeNumber(order.labor_cost),
      completionTime: formatCompletionTime(completionHours),
      partsList,
      notes: order.notes || '',
      description: order.description || '',
      needs: order.estimated_cost_note || '',
      partsText: order.parts_used || '',
      timeEntries: (current.timeEntries || []).filter((te) => te.order_id === order.id)
    }
  })

  metrics.detailedOrders = detailed.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  const revenueBuckets = new Map()
  for (const order of orders) {
    const dateValue = orderPrimaryDate(order)
    if (!dateValue) continue
    const dateObj = new Date(dateValue)
    if (Number.isNaN(dateObj.getTime())) continue
    const key = formatChartKey(dateObj, aggregateByMonth)
    if (!key) continue
    const orderValue = order.total_cost != null
      ? safeNumber(order.total_cost)
      : safeNumber(order.parts_cost) + safeNumber(order.labor_cost)
    revenueBuckets.set(key, (revenueBuckets.get(key) || 0) + orderValue)
  }

  const sortedKeys = Array.from(revenueBuckets.keys()).sort()

  metrics.chartSeries.revenue = {
    labels: sortedKeys.map((key) => displayForChartKey(key, aggregateByMonth)),
    data: sortedKeys.map((key) => Math.round(revenueBuckets.get(key) * 100) / 100)
  }

  const statusBuckets = new Map()
  for (const order of orders) {
    const status = order.status || 'pending'
    statusBuckets.set(status, (statusBuckets.get(status) || 0) + 1)
  }

  const orderedStatuses = STATUS_ORDER.filter((status) => statusBuckets.has(status))
  const otherStatuses = Array.from(statusBuckets.keys()).filter((status) => !STATUS_ORDER.includes(status))
  const statusKeys = [...orderedStatuses, ...otherStatuses]

  metrics.chartSeries.statuses = {
    labels: statusKeys.map(getStatusText),
    data: statusKeys.map((status) => statusBuckets.get(status))
  }

  return metrics
}

const applyReportMetrics = (metrics) => {
  kpiData.value = metrics.kpiData
  topClients.value = metrics.topClients
  popularServices.value = metrics.popularServices
  financialStats.value = metrics.financialStats
  detailedOrders.value = metrics.detailedOrders
  chartSeries.revenue = metrics.chartSeries.revenue
  chartSeries.statuses = metrics.chartSeries.statuses
}

const generateCharts = async () => {
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    if (revenueChartInstance) {
      revenueChartInstance.destroy()
      revenueChartInstance = null
    }

    if (statusChartInstance) {
      statusChartInstance.destroy()
      statusChartInstance = null
    }

    if (revenueChart.value) {
      revenueChartInstance = new Chart(revenueChart.value.getContext('2d'), {
        type: 'line',
        data: {
          labels: chartSeries.revenue.labels,
          datasets: [
            {
              label: 'Przychody (PLN)',
              data: chartSeries.revenue.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `${Number(value).toLocaleString('pl-PL')} zł`
              }
            }
          }
        }
      })
    }

    if (statusChart.value) {
      statusChartInstance = new Chart(statusChart.value.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: chartSeries.statuses.labels,
          datasets: [
            {
              data: chartSeries.statuses.data,
              backgroundColor: [
                'rgb(34, 197, 94)',
                'rgb(59, 130, 246)',
                'rgb(251, 191, 36)',
                'rgb(99, 102, 241)',
                'rgb(148, 163, 184)',
                'rgb(239, 68, 68)'
              ],
              borderWidth: 2,
              borderColor: '#fff'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      })
    }
  } catch (error) {
    console.error('Błąd podczas generowania wykresów:', error)
  }
}

const generateReport = async () => {
  loading.value = true

  try {
    const rowsHtml = detailedOrders.value
      .map((order) => {
        return [
          '<tr>',
          `<td>${escapeHtml(order.orderNumber || '')}</td>`,
          `<td>${escapeHtml(order.title || '')}</td>`,
          `<td>${escapeHtml(order.clientName || '')}</td>`,
          `<td>${escapeHtml(order.technicianName || '')}</td>`,
          `<td>${escapeHtml(formatDate(order.createdAt))}</td>`,
          `<td>${escapeHtml(getStatusText(order.status))}</td>`,
          `<td>${escapeHtml(formatCurrency(order.totalCost))}</td>`,
          '</tr>'
        ].join('')
      })
      .join('')

    const detailsHtml = detailedOrders.value
      .map((order) => {
        const segments = [
          '<div style="margin-bottom:18px;">',
          `<h3 style="margin:0 0 6px;font-size:15px;">${escapeHtml(order.orderNumber || order.title || '')}</h3>`,
          `<p style="margin:2px 0;font-size:12px;"><strong>Klient:</strong> ${escapeHtml(order.clientName || '-')}</p>`,
          `<p style="margin:2px 0;font-size:12px;"><strong>Technik:</strong> ${escapeHtml(order.technicianName || '-')}</p>`
        ]
        if (order.deviceName) {
          segments.push(
            `<p style="margin:2px 0;font-size:12px;"><strong>Urządzenie:</strong> ${escapeHtml(order.deviceName)}</p>`
          )
        }
        segments.push(
          `<p style="margin:2px 0;font-size:12px;"><strong>Data:</strong> ${escapeHtml(formatDate(order.createdAt))}</p>`
        )
        segments.push(
          `<p style="margin:2px 0;font-size:12px;"><strong>Status:</strong> ${escapeHtml(getStatusText(order.status))}</p>`
        )
        segments.push(
          `<p style="margin:2px 0;font-size:12px;"><strong>Wartość:</strong> ${escapeHtml(formatCurrency(order.totalCost))}</p>`
        )
        if (order.partsList && order.partsList.length) {
          segments.push(
            `<p style="margin:6px 0 0;font-size:12px;"><strong>Wymienione części:</strong><br>${order.partsList
              .map((part) => escapeHtml(part))
              .join('<br />')}</p>`
          )
        }
        if (order.needs) {
          segments.push(
            `<p style="margin:6px 0 0;font-size:12px;"><strong>Co miało być wymienione:</strong><br>${escapeHtml(order.needs)}</p>`
          )
        }
        if (order.description) {
          segments.push(
            `<p style="margin:6px 0 0;font-size:12px;"><strong>Opis zlecenia:</strong><br>${escapeHtml(order.description)}</p>`
          )
        }
        if (order.notes) {
          segments.push(
            `<p style="margin:6px 0 0;font-size:12px;"><strong>Co wykonano / notatki:</strong><br>${escapeHtml(order.notes)}</p>`
          )
        }
        if (order.partsText) {
          segments.push(
            `<p style="margin:6px 0 0;font-size:12px;"><strong>Tekst użytych części:</strong><br>${escapeHtml(order.partsText)}</p>`
          )
        }
        segments.push('</div>')
        return segments.join('')
      })
      .join('')

    const reportHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            h2 { margin: 24px 0 12px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f9fafb; font-weight: 600; }
            ul { padding-left: 18px; font-size: 13px; }
            li { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Raport serwisowy</h1>
          <div style="font-size:13px; margin-bottom:12px;">
            Okres: ${escapeHtml(currentRangeLabel.value || PERIOD_LABELS[selectedPeriod.value] || '')}
          </div>
          <h2>KPI</h2>
          <ul>
            <li>Przychody: ${escapeHtml(formatCurrency(kpiData.value.revenue))} (zmiana: ${escapeHtml(String(kpiData.value.revenueGrowth))}%)</li>
            <li>Zlecenia: ${escapeHtml(String(kpiData.value.ordersCount))} (zmiana: ${escapeHtml(String(kpiData.value.ordersGrowth))}%)</li>
            <li>Nowi klienci: ${escapeHtml(String(kpiData.value.newClients))} (zmiana: ${escapeHtml(String(kpiData.value.clientsGrowth))}%)</li>
            <li>Średni czas realizacji: ${escapeHtml(String(kpiData.value.avgCompletionTime))}h (poprawa: ${escapeHtml(String(kpiData.value.timeImprovement))}%)</li>
          </ul>
          <h2>Szczegółowe zlecenia</h2>
          <table>
            <thead>
              <tr>
                <th>Zlecenie</th>
                <th>Tytuł</th>
                <th>Klient</th>
                <th>Technik</th>
                <th>Data</th>
                <th>Status</th>
                <th>Wartość</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <h2>Opis wykonanych prac</h2>
          ${detailsHtml}
        </body>
      </html>`

    const defaultName = `raport_${new Date().toISOString().slice(0, 10)}.pdf`
    const savedPath = await window.electronAPI?.reports?.generatePDF(reportHtml, defaultName)
    if (savedPath) {
      alert(`Zapisano raport: ${savedPath}`)
    }
  } catch (error) {
    console.error('Błąd podczas generowania raportu:', error)
    alert('Wystąpił błąd podczas generowania raportu')
  } finally {
    loading.value = false
  }
}

const resetReportData = async () => {
  if (!confirm('Resetować dane raportu (tymczasowe zestawienia)? Dane klientów/zleceń pozostaną nienaruszone.')) {
    return
  }
  applyReportMetrics(createEmptyMetrics())
  currentRangeLabel.value = ''
}

onMounted(() => {
  loadReportData()
})
</script>

<style scoped>
/* Dodatkowe style dla wykresów */
canvas {
  max-height: 250px;
}
</style>