<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Części zamienne</h1>
        <p class="text-secondary-600 mt-1">Zarządzanie magazynem części zamiennych</p>
      </div>
      <div class="flex items-center space-x-2">
        <button @click="showSuppliers = true" class="btn-secondary">
          <i class="fas fa-truck mr-2"></i>
          Dostawcy
        </button>
        <a
          href="https://viparts.viessmann-climatesolutions.com/overview"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
          title="Otwórz katalog VIParts w przeglądarce"
        >
          <i class="fas fa-external-link-alt mr-2"></i>
          Viessmann (VIParts)
        </a>
        <a
          href="https://zamienne.dedietrich.pl/"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
          title="Otwórz katalog De Dietrich w przeglądarce"
        >
          <i class="fas fa-external-link-alt mr-2"></i>
          De Dietrich
        </a>
        <a
          href="https://bosch-pl-home.thernovo.com/documentation"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
          title="Otwórz dokumentację Bosch w przeglądarce"
        >
          <i class="fas fa-external-link-alt mr-2"></i>
          Bosch
        </a>
        <a
          href="https://buderus-pl.boschhc-documents.com/td/?sort-type=score&sort-direction=desc&language=pl"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
          title="Otwórz dokumentację Buderus w przeglądarce"
        >
          <i class="fas fa-external-link-alt mr-2"></i>
          Buderus
        </a>
        <a
          href="https://bimsplus24.pl/#DeepSearchForParts"
          target="_blank"
          rel="noopener"
          class="btn-secondary"
          title="Otwórz BIMS+ w przeglądarce"
        >
          <i class="fas fa-external-link-alt mr-2"></i>
          BIMS+
        </a>
        <input
          ref="importInput"
          type="file"
          accept=".json,.csv"
          class="hidden"
          @change="handleImportFile"
        />
        <button @click="openImportDialog" class="btn-secondary">
          <i class="fas fa-file-import mr-2"></i>
          Import JSON
        </button>
        <button @click="exportParts" class="btn-secondary">
          <i class="fas fa-file-export mr-2"></i>
          Eksport CSV
        </button>
        <button @click="showAddModal = true" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj część
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-puzzle-piece text-2xl text-primary-600"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-secondary-500">Wszystkie części</p>
            <p class="text-2xl font-bold text-secondary-900">{{ stats.total }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-check-circle text-2xl text-green-600"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-secondary-500">Dostępne</p>
            <p class="text-2xl font-bold text-secondary-900">{{ stats.available }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-2xl text-yellow-600"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-secondary-500">Niski stan</p>
            <p class="text-2xl font-bold text-secondary-900">{{ stats.lowStock }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-times-circle text-2xl text-red-600"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-secondary-500">Brak na stanie</p>
            <p class="text-2xl font-bold text-secondary-900">{{ stats.outOfStock }}</p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="importSummary"
      class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm flex items-start justify-between gap-4"
    >
      <div>
        <p class="font-medium">Import zakończony powodzeniem.</p>
        <p class="mt-1">
          Dodano: <strong>{{ importSummary.inserted }}</strong>,
          zaktualizowano: <strong>{{ importSummary.updated }}</strong>,
          pominięto: <strong>{{ importSummary.errors?.length || 0 }}</strong>.
        </p>
        <p v-if="importSummary.errors?.length" class="mt-1 text-green-700">
          Sprawdź logi importu, aby poznać szczegóły błędnych wierszy.
        </p>
      </div>
      <button class="btn-secondary btn-sm" @click="importSummary = null">
        Zamknij
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <!-- Search -->
        <div class="col-span-1 md:col-span-2">
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Wyszukaj części
          </label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nazwa, numer katalogowy, producent, kod magazynowy..."
              class="input-field pl-10"
            />
            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"></i>
          </div>
        </div>

        <!-- Magazine Code -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Kod magazynowy
          </label>
          <input
            v-model="magazineCodeQuery"
            type="text"
            placeholder="np. MAG-2025-0001"
            class="input-field font-mono"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Kategoria
          </label>
          <select v-model="selectedCategory" class="select-field">
            <option value="">Wszystkie kategorie</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>

        <!-- Supplier -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Dostawca
          </label>
          <select v-model="selectedSupplierId" class="select-field">
            <option :value="null">Wszyscy</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}{{ s.nip ? ' • NIP '+s.nip : '' }}</option>
          </select>
        </div>

        <!-- Stock Status -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Stan magazynowy
          </label>
          <select v-model="selectedStockStatus" class="select-field">
            <option value="">Wszystkie</option>
            <option value="available">Dostępne</option>
            <option value="low">Niski stan</option>
            <option value="out">Brak na stanie</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Parts List -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-primary-600"></i>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
            <div>
              <h3 class="text-sm font-medium text-red-800">Błąd ładowania danych</h3>
              <p class="text-sm text-red-700 mt-1">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="parts.length === 0" class="text-center py-12">
        <i class="fas fa-puzzle-piece text-6xl text-secondary-300 mb-4"></i>
        <h3 class="text-lg font-medium text-secondary-900 mb-2">
          {{ searchQuery || selectedCategory || selectedStockStatus ? 'Brak wyników' : 'Brak części zamiennych' }}
        </h3>
        <p class="text-secondary-600 mb-6">
          {{ searchQuery || selectedCategory || selectedStockStatus 
            ? 'Spróbuj zmienić kryteria wyszukiwania' 
            : 'Dodaj pierwszą część zamienną do magazynu' 
          }}
        </p>
        <button v-if="!searchQuery && !selectedCategory && !selectedStockStatus" @click="showAddModal = true" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj pierwszą część
        </button>
      </div>

      <!-- Parts Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-secondary-50 border-b border-secondary-200">
            <tr>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Kod magazynowy</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Część</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Kod kreskowy</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Producent / Marka</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Grupa montażowa</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Dostawca</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Kategoria</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Stan</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Ceny</th>
              <th class="text-left py-3 px-4 font-medium text-secondary-900">Akcje</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-200">
            <tr
              v-for="part in parts"
              :key="part.id"
              class="hover:bg-secondary-50 transition-colors"
            >
              <td class="py-3 px-4">
                <span class="font-mono text-sm text-secondary-900">{{ part.magazine_code || '—' }}</span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mr-3">
                    <i class="fas fa-puzzle-piece text-secondary-600"></i>
                  </div>
                  <div>
                    <div class="font-medium text-secondary-900">{{ part.name }}</div>
                    <div class="text-xs text-secondary-500">
                      Nr kat.: <span class="font-mono">{{ part.part_number || '—' }}</span>
                    </div>
                    <div v-if="part.description" class="text-xs text-secondary-500 mt-1">{{ part.description }}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="text-sm font-medium text-secondary-900">
                  Kod prod.: <span class="font-mono">{{ part.manufacturer_code || '—' }}</span>
                </div>
                <div class="text-xs text-secondary-500 mt-1">
                  EAN: <span class="font-mono">{{ part.barcode || '—' }}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="text-sm text-secondary-900">{{ part.manufacturer || '—' }}</div>
                <div class="text-xs text-secondary-500" v-if="part.brand">Marka: {{ part.brand }}</div>
                <div class="text-xs text-secondary-500" v-if="part.manufacturer_code">Kod prod.: {{ part.manufacturer_code }}</div>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-secondary-900">{{ part.assembly_group || '—' }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-secondary-900">{{ supplierName(part) }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-secondary-900">{{ part.category || '—' }}</span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-secondary-900">{{ part.stock_quantity }}</span>
                  <span
                    :class="getStockStatusClass(part)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ getStockStatusText(part) }}
                  </span>
                </div>
                <div class="text-xs text-secondary-500 mt-1">Min: {{ part.min_stock_level }}</div>
              </td>
              <td class="py-3 px-4">
                <div class="text-sm text-secondary-900">
                  {{ formatCurrency(part.gross_price, part.currency) }}
                </div>
                <div class="text-xs text-secondary-500">
                  Netto: {{ formatCurrency(part.net_price, part.currency) }} • VAT {{ part.vat_rate }}%
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                  <button
                    @click="showStockModal(part)"
                    class="text-blue-600 hover:text-blue-900"
                    title="Zarządzaj stanem"
                  >
                    <i class="fas fa-boxes"></i>
                  </button>
                  <button
                    @click="editPart(part)"
                    class="text-secondary-600 hover:text-secondary-900"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="deletePart(part)"
                    class="text-red-600 hover:text-red-900"
                    title="Usuń"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="border-t border-secondary-200 px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="text-sm text-secondary-700">
            Pokazano {{ parts.length }} z {{ pagination.total }} części
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="changePage('prev')"
              :disabled="currentPage === 1 || isLoading"
              class="btn-secondary btn-sm disabled:opacity-50"
            >
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-sm text-secondary-700">
              {{ currentPage }} / {{ pagination.totalPages }}
            </span>
            <button
              @click="changePage('next')"
              :disabled="currentPage >= pagination.totalPages || isLoading"
              class="btn-secondary btn-sm disabled:opacity-50"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Part Modal -->
    <PartFormModal
      v-if="showAddModal || showEditModal"
      :part="selectedPart"
      :is-edit="showEditModal"
      @close="closeModals"
      @saved="onPartSaved"
    />

    <SuppliersListModal
      v-if="showSuppliers"
      @close="showSuppliers=false"
    />

    <!-- Stock Management Modal -->
    <StockModal
      v-if="showStockManagementModal"
      :part="selectedPart"
      @close="showStockManagementModal = false"
      @updated="onStockUpdated"
    />

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń część"
      :message="`Czy na pewno chcesz usunąć część ${partToDelete?.name}?`"
      confirm-text="Usuń"
      confirm-class="btn-danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import PartFormModal from '../components/PartFormModal.vue'
import SuppliersListModal from '../components/SuppliersListModal.vue'
import StockModal from '../components/StockModal.vue'

const API_BASE = 'http://localhost:5174'
const ITEMS_PER_PAGE = 25
const DEFAULT_STATS = { total: 0, available: 0, lowStock: 0, outOfStock: 0 }

const parts = ref([])
const stats = ref({ ...DEFAULT_STATS })
const pagination = ref({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 })
const suppliers = ref([])
const categories = ref([])

const isLoading = ref(false)
const error = ref('')

const searchQuery = ref('')
const magazineCodeQuery = ref('')
const selectedCategory = ref('')
const selectedSupplierId = ref(null)
const selectedStockStatus = ref('')
const currentPage = ref(1)

const importInput = ref(null)
const importSummary = ref(null)

const showAddModal = ref(false)
const showEditModal = ref(false)
const showStockManagementModal = ref(false)
const showDeleteModal = ref(false)
const showSuppliers = ref(false)
const selectedPart = ref(null)
const partToDelete = ref(null)

let searchTimer = null

const formatCurrency = (value, currency = 'PLN') => {
  const num = Number(value ?? 0)
  return `${num.toFixed(2)} ${currency}`
}

const normalizePart = (row = {}) => {
  const gross = Number(row.gross_price ?? row.price ?? 0)
  const vat = Number(row.vat_rate ?? 23)
  const net = row.net_price != null
    ? Number(row.net_price)
    : (vat === 0 ? gross : gross / (1 + vat / 100))
  return {
    ...row,
    gross_price: Number(gross.toFixed(2)),
    net_price: Number(net.toFixed(2)),
    vat_rate: vat,
    price: Number(gross.toFixed(2))
  }
}

const supplierName = part => {
  const id = Number(part?.supplier_id || 0)
  if (!id) return part?.supplier || '—'
  const supplier = suppliers.value.find(s => Number(s.id) === id)
  return supplier ? supplier.name : (part?.supplier || '—')
}

const getStockStatusClass = part => {
  if (part.stock_quantity === 0) return 'bg-red-100 text-red-800'
  if (part.stock_quantity <= part.min_stock_level) return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

const getStockStatusText = part => {
  if (part.stock_quantity === 0) return 'Brak'
  if (part.stock_quantity <= part.min_stock_level) return 'Niski'
  return 'OK'
}

const loadCategories = async () => {
  try {
    const localResp = await fetch(`${API_BASE}/api/part-categories`)
    if (localResp.ok) {
      const localJson = await localResp.json().catch(() => ({}))
      if (Array.isArray(localJson?.data)) {
        categories.value = localJson.data.filter(c => c.is_active !== false).map(c => c.name)
        return
      }
    }
  } catch (_) { /* ignore */ }

  try {
    const remoteResp = await fetch('https://web-production-fc58d.up.railway.app/api/part-categories')
    if (remoteResp.ok) {
      const remoteJson = await remoteResp.json().catch(() => ({}))
      categories.value = (remoteJson.data || []).filter(c => c.is_active !== false).map(c => c.name)
    }
  } catch (_) {
    categories.value = []
  }
}

const loadSuppliers = async () => {
  try {
    const resp = await fetch(`${API_BASE}/api/desktop/suppliers?active=1`)
    if (resp.ok) {
      suppliers.value = await resp.json().catch(() => [])
    }
  } catch (_) {
    suppliers.value = []
  }
}

const loadPartsFromSQLite = async () => {
  if (!window.electronAPI?.database) throw new Error('No direct database access')
  const offset = (currentPage.value - 1) * ITEMS_PER_PAGE
  const rows = await window.electronAPI.database.query(
    'SELECT * FROM spare_parts ORDER BY name LIMIT ? OFFSET ?',
    [ITEMS_PER_PAGE, offset]
  )
  const countRow = await window.electronAPI.database.get(
    'SELECT COUNT(*) AS total FROM spare_parts'
  )
  const normalized = (rows || []).map(normalizePart)
  parts.value = normalized
  pagination.value = {
    page: currentPage.value,
    limit: ITEMS_PER_PAGE,
    total: Number(countRow?.total || normalized.length),
    totalPages: Math.max(1, Math.ceil((countRow?.total || normalized.length) / ITEMS_PER_PAGE))
  }
  stats.value = {
    total: normalized.length,
    available: normalized.filter(p => p.stock_quantity > p.min_stock_level).length,
    lowStock: normalized.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length,
    outOfStock: normalized.filter(p => p.stock_quantity === 0).length
  }
}

const loadParts = async (options = {}) => {
  if (options.resetPage) currentPage.value = 1
  isLoading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      limit: String(ITEMS_PER_PAGE)
    })

    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
    if (selectedCategory.value) params.set('category', selectedCategory.value)
    if (selectedStockStatus.value) params.set('stock', selectedStockStatus.value)
    if (magazineCodeQuery.value.trim()) params.set('magCode', magazineCodeQuery.value.trim())
    if (selectedSupplierId.value != null && selectedSupplierId.value !== '') {
      params.set('supplierId', String(selectedSupplierId.value))
    }

    const resp = await fetch(`${API_BASE}/api/desktop/spare-parts?${params.toString()}`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

    const data = await resp.json().catch(() => ({}))
    const mapped = (data.data || []).map(normalizePart)
    parts.value = mapped
    if (!categories.value.length) {
      const uniqueCategories = Array.from(new Set(mapped.map(item => item.category).filter(Boolean)))
      categories.value = uniqueCategories
    }
    stats.value = data.stats || { ...DEFAULT_STATS }
    pagination.value = {
      page: data.pagination?.page || currentPage.value,
      limit: data.pagination?.limit || ITEMS_PER_PAGE,
      total: data.pagination?.total || mapped.length,
      totalPages: data.pagination?.totalPages || Math.max(1, Math.ceil((data.pagination?.total || mapped.length) / ITEMS_PER_PAGE))
    }
    currentPage.value = pagination.value.page
  } catch (err) {
    console.warn('Falling back to direct SQLite load:', err?.message || err)
    try {
      await loadPartsFromSQLite()
    } catch (fallbackErr) {
      console.error('Error loading parts:', fallbackErr)
      error.value = 'Błąd podczas ładowania części zamiennych.'
      parts.value = []
      stats.value = { ...DEFAULT_STATS }
      pagination.value = { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 }
    }
  } finally {
    isLoading.value = false
  }
}

const changePage = direction => {
  if (direction === 'prev' && currentPage.value > 1) {
    currentPage.value -= 1
  } else if (direction === 'next' && currentPage.value < pagination.value.totalPages) {
    currentPage.value += 1
  }
}

const showStockModal = part => {
  selectedPart.value = part
  showStockManagementModal.value = true
}

const editPart = part => {
  selectedPart.value = part
  showEditModal.value = true
}

const deletePart = part => {
  partToDelete.value = part
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run('DELETE FROM spare_parts WHERE id = ?', [partToDelete.value.id])
    }
    await loadParts()
    showDeleteModal.value = false
    partToDelete.value = null
  } catch (err) {
    console.error('Error deleting part:', err)
    error.value = 'Błąd podczas usuwania części.'
  }
}

const closeModals = () => {
  showAddModal.value = false
  showEditModal.value = false
  selectedPart.value = null
}

const onPartSaved = async () => {
  closeModals()
  await loadParts({ resetPage: true })
}

const onStockUpdated = async () => {
  showStockManagementModal.value = false
  await loadParts()
}

const exportParts = async () => {
  try {
    const resp = await fetch(`${API_BASE}/api/desktop/spare-parts/export`)
    if (!resp.ok) throw new Error('Export failed')
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spare_parts_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export error:', err)
    error.value = 'Nie udało się wyeksportować części.'
  }
}

const openImportDialog = () => {
  if (importInput.value) {
    importInput.value.value = ''
    importInput.value.click()
  }
}

const handleImportFile = async event => {
  const file = event.target?.files?.[0]
  if (!file) return
  try {
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Obecnie obsługiwany jest import plików JSON.')
    }
    const text = await file.text()
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : []
    if (!items.length) {
      throw new Error('Plik nie zawiera listy części (items).')
    }
    const resp = await fetch(`${API_BASE}/api/desktop/spare-parts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    const result = await resp.json().catch(() => ({}))
    if (!resp.ok || !result.success) {
      throw new Error(result.error || 'Import nie powiódł się.')
    }
    importSummary.value = result.summary || null
    await loadParts({ resetPage: true })
  } catch (err) {
    console.error('Import error:', err)
    importSummary.value = null
    error.value = err.message || 'Błąd importu danych.'
  } finally {
    if (event.target) event.target.value = ''
  }
}

watch(() => currentPage.value, () => {
  loadParts()
})

watch([selectedCategory, selectedSupplierId, selectedStockStatus], () => {
  currentPage.value = 1
  loadParts()
})

watch(searchQuery, value => {
  currentPage.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadParts()
  }, 300)
})

watch(magazineCodeQuery, value => {
  currentPage.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadParts()
  }, 300)
})

onMounted(async () => {
  await loadCategories()
  await loadSuppliers()
  await loadParts()
})
</script>