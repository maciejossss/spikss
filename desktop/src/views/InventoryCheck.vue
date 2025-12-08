<template>
  <div class="p-6 space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Inwentura</h1>
        <p class="text-secondary-600 mt-1 max-w-3xl">
          Narzędzie do ręcznego spisu z natury. Dane nie są synchronizowane z magazynem ani Railway.
          Uzupełnij pozycje, podaj nazwę pliku i wygeneruj raport PDF zapisany lokalnie w katalogu
          <span class="font-mono">inventories/</span>.
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          type="button"
          class="btn-secondary"
          @click="resetAll"
          :disabled="!items.length"
        >
          <i class="fas fa-undo mr-2"></i>
          Wyczyść listę
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 space-y-4">
      <h2 class="text-lg font-semibold text-secondary-900">Zapisane inwentury</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Aktualna inwentura *</label>
          <input
            v-model="snapshotName"
            type="text"
            class="input-field"
            placeholder="np. Inwentura styczeń 2025"
            @input="markDirty"
          />
          <p class="text-xs mt-1" :class="isDirty ? 'text-orange-600' : 'text-secondary-500'">
            {{ isDirty ? 'Niezapisane zmiany w bieżącej inwenturze.' : 'Zmiany zostały zapisane.' }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Wczytaj zapis</label>
          <select
            v-model="selectedSnapshotId"
            class="select-field"
            :disabled="loadingSnapshots || !hasSnapshots"
          >
            <option value="">(Nowa inwentura)</option>
            <option
              v-for="snapshot in snapshots"
              :key="snapshot.id"
              :value="String(snapshot.id)"
            >
              {{ snapshot.name }} • {{ formatSnapshotDate(snapshot.updated_at) }} • {{ snapshot.items_count }} poz.
            </option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-secondary btn-sm" @click="createNewSnapshot" :disabled="savingSnapshot">
          <i class="fas fa-file mr-1"></i>
          Nowa inwentura
        </button>
        <button type="button" class="btn-secondary btn-sm" @click="loadSelectedSnapshot" :disabled="!selectedSnapshotId || loadingSnapshots || !hasSnapshots">
          <i class="fas fa-folder-open mr-1"></i>
          Wczytaj
        </button>
        <button type="button" class="btn-primary btn-sm" @click="saveSnapshot" :disabled="!snapshotNameValid || savingSnapshot">
          <i class="fas fa-save mr-1"></i>
          Zapisz
        </button>
        <button type="button" class="btn-primary btn-sm" @click="saveSnapshotAs" :disabled="!snapshotNameValid || savingSnapshot">
          <i class="fas fa-clone mr-1"></i>
          Zapisz jako nową
        </button>
        <button
          type="button"
          class="btn-danger btn-sm"
          @click="deleteSelectedSnapshot"
          :disabled="!selectedSnapshotId || savingSnapshot || !hasSnapshots"
        >
          <i class="fas fa-trash mr-1"></i>
          Usuń zapis
        </button>
        <span v-if="loadingSnapshots" class="text-secondary-500 text-sm">
          <i class="fas fa-spinner fa-spin mr-1"></i>
          Ładuję zapisy...
        </span>
        <span v-if="!loadingSnapshots && !hasSnapshots" class="text-secondary-500 text-sm">
          Brak zapisanych inwentur.
        </span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 space-y-6">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Kod producenta *</label>
            <input
              v-model.trim="form.manufacturerCode"
              type="text"
              class="input-field font-mono"
              placeholder="np. 87070210260"
              @input="markDirty"
            />
            <p v-if="errors.manufacturerCode" class="text-xs text-red-600 mt-1">{{ errors.manufacturerCode }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Kod magazynowy *</label>
            <input
              v-model.trim="form.magazineCode"
              type="text"
              class="input-field font-mono"
              placeholder="np. MAG-2025-0001"
              @input="markDirty"
            />
            <p v-if="errors.magazineCode" class="text-xs text-red-600 mt-1">{{ errors.magazineCode }}</p>
          </div>
          <div class="lg:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">Nazwa towaru *</label>
            <input
              v-model.trim="form.name"
              type="text"
              class="input-field"
              placeholder="Nazwa części / produktu"
              @input="markDirty"
            />
            <p v-if="errors.name" class="text-xs text-red-600 mt-1">{{ errors.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Ilość w ewidencji *</label>
            <input
              v-model.number="form.qtyStock"
              type="number"
              min="0"
              step="1"
              class="input-field"
              @input="markDirty"
            />
            <p v-if="errors.qtyStock" class="text-xs text-red-600 mt-1">{{ errors.qtyStock }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Ilość policzona *</label>
            <input
              v-model.number="form.qtyCounted"
              type="number"
              min="0"
              step="1"
              class="input-field"
              @input="markDirty"
            />
            <p v-if="errors.qtyCounted" class="text-xs text-red-600 mt-1">{{ errors.qtyCounted }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Cena netto (PLN) *</label>
            <input
              v-model.number="form.netPrice"
              type="number"
              min="0"
              step="0.01"
              class="input-field"
              @input="markDirty"
            />
            <p v-if="errors.netPrice" class="text-xs text-red-600 mt-1">{{ errors.netPrice }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">VAT (%) *</label>
            <input
              v-model.number="form.vatRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="input-field"
              @input="markDirty"
            />
            <p v-if="errors.vatRate" class="text-xs text-red-600 mt-1">{{ errors.vatRate }}</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button type="submit" class="btn-primary">
            <i v-if="editIndex === null" class="fas fa-plus mr-2"></i>
            <i v-else class="fas fa-save mr-2"></i>
            {{ editIndex === null ? 'Dodaj pozycję' : 'Zapisz zmiany' }}
          </button>
          <button
            v-if="editIndex !== null"
            type="button"
            class="btn-secondary"
            @click="cancelEdit"
          >
            Anuluj edycję
          </button>
        </div>
      </form>

      <div class="border-t border-secondary-200 pt-4">
        <div v-if="!items.length" class="text-center py-10 text-secondary-500">
          Dodaj pierwszą pozycję, aby rozpocząć inwenturę.
        </div>

        <div v-else class="space-y-4">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-secondary-200">
              <thead class="bg-secondary-50">
                <tr>
                  <th class="text-left py-3 px-4 text-sm font-medium text-secondary-700">Kod prod.</th>
                  <th class="text-left py-3 px-4 text-sm font-medium text-secondary-700">Kod magaz.</th>
                  <th class="text-left py-3 px-4 text-sm font-medium text-secondary-700">Nazwa</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Ewidencja</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Policzono</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Różnica</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Cena netto</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Cena brutto</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Netto policzone</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Różnica netto</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-secondary-700">Różnica brutto</th>
                  <th class="text-center py-3 px-4 text-sm font-medium text-secondary-700">Akcje</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100">
                <tr
                  v-for="(item, index) in items"
                  :key="index"
                  class="hover:bg-secondary-50 transition"
                >
                  <td class="py-3 px-4 font-mono text-sm text-secondary-900">{{ item.manufacturerCode }}</td>
                  <td class="py-3 px-4 font-mono text-sm text-secondary-900">{{ item.magazineCode }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900">{{ item.name }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right">{{ item.qtyStock }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right">{{ item.qtyCounted }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right" :class="item.qtyDiff > 0 ? 'text-green-600' : item.qtyDiff < 0 ? 'text-red-600' : ''">
                    {{ formatNumber(item.qtyDiff) }}
                  </td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right">{{ formatCurrency(item.netUnit) }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right">{{ formatCurrency(item.grossUnit) }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right">{{ formatCurrency(item.netCounted) }}</td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right" :class="item.netDiff > 0 ? 'text-green-600' : item.netDiff < 0 ? 'text-red-600' : ''">
                    {{ formatCurrency(item.netDiff) }}
                  </td>
                  <td class="py-3 px-4 text-sm text-secondary-900 text-right" :class="item.grossDiff > 0 ? 'text-green-600' : item.grossDiff < 0 ? 'text-red-600' : ''">
                    {{ formatCurrency(item.grossDiff) }}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center justify-center space-x-3 text-secondary-500">
                      <button
                        type="button"
                        class="hover:text-secondary-900"
                        title="Edytuj"
                        @click="editItem(index)"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        class="text-red-600 hover:text-red-800"
                        title="Usuń"
                        @click="removeItem(index)"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-secondary-50 border border-secondary-200 rounded-xl p-4 space-y-2">
              <h3 class="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Ilości</h3>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Pozycje</span>
                <span>{{ summary.totalItems }}</span>
              </div>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Niedobory</span>
                <span class="text-red-600">{{ summary.missingCount }}</span>
              </div>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Nadwyżki</span>
                <span class="text-green-600">{{ summary.surplusCount }}</span>
              </div>
            </div>
            <div class="bg-secondary-50 border border-secondary-200 rounded-xl p-4 space-y-2">
              <h3 class="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Wartości netto</h3>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Ewidencja</span>
                <span>{{ formatCurrency(summary.netStockValue) }}</span>
              </div>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Policzone</span>
                <span>{{ formatCurrency(summary.netCountedValue) }}</span>
              </div>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Różnica</span>
                <span :class="summary.netDifference > 0 ? 'text-green-600' : summary.netDifference < 0 ? 'text-red-600' : ''">
                  {{ formatCurrency(summary.netDifference) }}
                </span>
              </div>
            </div>
            <div class="bg-secondary-50 border border-secondary-200 rounded-xl p-4 space-y-2">
              <h3 class="text-sm font-semibold text-secondary-700 uppercase tracking-wide">Wartości brutto</h3>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Policzone</span>
                <span>{{ formatCurrency(summary.grossCountedValue) }}</span>
              </div>
              <div class="flex justify-between text-sm text-secondary-800">
                <span>Różnica</span>
                <span :class="summary.grossDifference > 0 ? 'text-green-600' : summary.grossDifference < 0 ? 'text-red-600' : ''">
                  {{ formatCurrency(summary.grossDifference) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 space-y-4 max-w-3xl">
      <h2 class="text-lg font-semibold text-secondary-900">Eksport do PDF</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">Nazwa pliku *</label>
          <input
            v-model.trim="fileName"
            type="text"
            class="input-field font-mono"
            placeholder="np. inwentura-styczen-2025.pdf"
          />
          <p v-if="errors.fileName" class="text-xs text-red-600 mt-1">{{ errors.fileName }}</p>
        </div>
        <div class="flex items-end">
          <button
            type="button"
            class="btn-primary"
            @click="generatePdf"
            :disabled="!items.length || generating"
          >
            <i v-if="!generating" class="fas fa-file-pdf mr-2"></i>
            <i v-else class="fas fa-spinner fa-spin mr-2"></i>
            Generuj PDF
          </button>
        </div>
      </div>
      <p class="text-xs text-secondary-500">
        Pliki zapisywane są w katalogu <span class="font-mono">inventories/</span> w danych użytkownika aplikacji.
      </p>
      <div v-if="infoMessage" class="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3">
        {{ infoMessage }}
      </div>
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'

const API_BASE = 'http://localhost:5174'

const items = ref([])
const editIndex = ref(null)
const generating = ref(false)
const infoMessage = ref('')
const errorMessage = ref('')
const fileName = ref('')

const snapshots = ref([])
const selectedSnapshotId = ref('')
const activeSnapshotId = ref(null)
const loadingSnapshots = ref(false)
const savingSnapshot = ref(false)
const snapshotName = ref('')
const snapshotBaselineName = ref('')
let suppressNameWatch = false
const isDirty = ref(false)
const hasSnapshots = computed(() => snapshots.value.length > 0)
let ensuringDefaultSnapshot = false

const form = reactive({
  manufacturerCode: '',
  magazineCode: '',
  name: '',
  qtyStock: 0,
  qtyCounted: 0,
  netPrice: 0,
  vatRate: 23
})

const errors = reactive({})

const summary = computed(() => {
  if (!items.value.length) {
    return {
      totalItems: 0,
      missingCount: 0,
      surplusCount: 0,
      netStockValue: 0,
      netCountedValue: 0,
      netDifference: 0,
      grossCountedValue: 0,
      grossDifference: 0
    }
  }

  return items.value.reduce((acc, item) => {
    acc.totalItems += 1
    if (item.qtyDiff < 0) acc.missingCount += 1
    if (item.qtyDiff > 0) acc.surplusCount += 1
    acc.netStockValue += item.netStock
    acc.netCountedValue += item.netCounted
    acc.netDifference += item.netDiff
    acc.grossCountedValue += item.grossCounted
    acc.grossDifference += item.grossDiff
    return acc
  }, {
    totalItems: 0,
    missingCount: 0,
    surplusCount: 0,
    netStockValue: 0,
    netCountedValue: 0,
    netDifference: 0,
    grossCountedValue: 0,
    grossDifference: 0
  })
})

const formatNumber = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatCurrency = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0,00 PLN'
  return `${num.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`
}

const snapshotNameValid = computed(() => snapshotName.value.trim().length > 0)

watch(snapshotName, value => {
  if (suppressNameWatch) return
  if (value.trim() !== snapshotBaselineName.value.trim()) {
    isDirty.value = true
  }
})

const formatSnapshotDate = value => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pl-PL')
  } catch (_) {
    return value
  }
}

const markDirty = () => {
  isDirty.value = true
}

const currentItemsPayload = () => (
  items.value.map(item => ({
    manufacturerCode: item.manufacturerCode,
    magazineCode: item.magazineCode,
    name: item.name,
    qtyStock: item.qtyStock,
    qtyCounted: item.qtyCounted,
    netPrice: item.netPrice,
    vatRate: item.vatRate
  }))
)

const mapDbItemToInventory = dbItem => normalizeItem({
  manufacturerCode: dbItem.manufacturer_code,
  magazineCode: dbItem.magazine_code,
  name: dbItem.name,
  qtyStock: dbItem.qty_stock,
  qtyCounted: dbItem.qty_counted,
  netPrice: dbItem.net_price,
  vatRate: dbItem.vat_rate
})

const ensureDefaultSnapshot = async () => {
  if (ensuringDefaultSnapshot) return
  ensuringDefaultSnapshot = true
  try {
    const name = snapshotName.value.trim() || 'Inwentura robocza'
    const payload = {
      name,
      status: 'draft',
      metadata: { autoCreated: true },
      items: currentItemsPayload()
    }
    const resp = await fetch(`${API_BASE}/api/desktop/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.error || 'Nie udało się utworzyć domyślnej inwentury.')
    }
    const createdAt = new Date().toISOString()
    const newId = data?.id || null
    const snapshot = {
      id: newId,
      name,
      status: 'draft',
      metadata: JSON.stringify({ autoCreated: true }),
      created_at: createdAt,
      updated_at: createdAt,
      items_count: payload.items.length
    }
    const snapshotItems = payload.items.map(item => ({
      manufacturer_code: item.manufacturerCode,
      magazine_code: item.magazineCode,
      name: item.name,
      qty_stock: item.qtyStock,
      qty_counted: item.qtyCounted,
      net_price: item.netPrice,
      vat_rate: item.vatRate
    }))
    snapshots.value = [snapshot]
    applySnapshot(snapshot, snapshotItems, { silent: true })
    suppressNameWatch = true
    snapshotName.value = name
    snapshotBaselineName.value = name
    suppressNameWatch = false
    selectedSnapshotId.value = newId ? String(newId) : ''
    infoMessage.value = 'Utworzono domyślną inwenturę. Możesz kontynuować pracę.'
    errorMessage.value = ''
    return newId
  } catch (err) {
    console.error('[inventory] ensure default snapshot failed:', err?.message || err)
    return null
  } finally {
    ensuringDefaultSnapshot = false
  }
}

const fetchSnapshots = async () => {
  loadingSnapshots.value = true
  try {
    const resp = await fetch(`${API_BASE}/api/desktop/inventory`)
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.error || 'Nie udało się pobrać listy inwentur.')
    }
    snapshots.value = Array.isArray(data?.data) ? data.data : []
    if (!snapshots.value.length) {
      loadingSnapshots.value = false
      await ensureDefaultSnapshot()
      return
    }
    if (activeSnapshotId.value && !snapshots.value.some(s => s.id === activeSnapshotId.value)) {
      activeSnapshotId.value = null
      selectedSnapshotId.value = ''
    }
    errorMessage.value = ''
    if (!activeSnapshotId.value) {
      await loadSnapshotById(snapshots.value[0].id, true)
    }
    if (!selectedSnapshotId.value && snapshots.value.length) {
      selectedSnapshotId.value = String(snapshots.value[0].id)
    }
    let list = Array.isArray(data?.data) ? data.data : []
    if (!list.length) {
      const createdId = await ensureDefaultSnapshot()
      if (createdId) {
        const respSingle = await fetch(`${API_BASE}/api/desktop/inventory/${createdId}`).catch(() => null)
        if (respSingle && respSingle.ok) {
          const jsonSingle = await respSingle.json().catch(() => ({}))
          if (jsonSingle?.data?.snapshot) {
            list = [jsonSingle.data.snapshot]
          }
        }
      }
    }
    snapshots.value = list
    if (activeSnapshotId.value && !snapshots.value.some(s => String(s.id) === String(activeSnapshotId.value))) {
      activeSnapshotId.value = null
      selectedSnapshotId.value = ''
    }
    errorMessage.value = ''
    if (snapshots.value.length) {
      const target = snapshots.value.find(s => String(s.id) === String(activeSnapshotId.value)) || snapshots.value[0]
      await loadSnapshotById(target.id, true)
      selectedSnapshotId.value = target.id != null ? String(target.id) : ''
    }
  } catch (err) {
    errorMessage.value = err?.message || 'Błąd podczas ładowania zapisów inwentur.'
  } finally {
    loadingSnapshots.value = false
  }
}

const applySnapshot = (snapshot, snapshotItems = [], options = {}) => {
  items.value = snapshotItems.map(mapDbItemToInventory)
  resetForm()
  suppressNameWatch = true
  snapshotName.value = snapshot?.name || ''
  snapshotBaselineName.value = snapshot?.name || ''
  suppressNameWatch = false
  activeSnapshotId.value = snapshot?.id || null
  selectedSnapshotId.value = snapshot?.id ? String(snapshot.id) : ''
  isDirty.value = false
  if (!options.silent) {
    infoMessage.value = `Wczytano inwenturę: ${snapshot?.name || 'nowa'}`
  }
  errorMessage.value = ''
}

const loadSnapshotById = async (snapshotId, skipLoader = false) => {
  if (!skipLoader) loadingSnapshots.value = true
  try {
    const resp = await fetch(`${API_BASE}/api/desktop/inventory/${snapshotId}`)
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.error || 'Nie udało się pobrać szczegółów inwentury.')
    }
    applySnapshot(data?.data?.snapshot || { id: snapshotId, name: snapshotName.value }, data?.data?.items || [])
  } catch (err) {
    errorMessage.value = err?.message || 'Błąd podczas wczytywania inwentury.'
  } finally {
    if (!skipLoader) loadingSnapshots.value = false
  }
}

const loadSelectedSnapshot = async () => {
  if (!selectedSnapshotId.value) return
  const id = Number(selectedSnapshotId.value)
  if (!Number.isFinite(id) || id <= 0) {
    errorMessage.value = 'Wybierz poprawny zapis inwentury.'
    return
  }
  if (isDirty.value && !window.confirm('Masz niezapisane zmiany. Wczytanie inwentury je nadpisze. Kontynuować?')) {
    return
  }
  await loadSnapshotById(id)
}

const createNewSnapshot = () => {
  if (isDirty.value && !window.confirm('Masz niezapisane zmiany. Utworzenie nowej inwentury je usunie. Kontynuować?')) {
    return
  }
  activeSnapshotId.value = null
  selectedSnapshotId.value = ''
  suppressNameWatch = true
  snapshotName.value = ''
  snapshotBaselineName.value = ''
  suppressNameWatch = false
  items.value = []
  resetForm()
  isDirty.value = false
  infoMessage.value = 'Rozpoczęto nową, pustą inwenturę.'
  errorMessage.value = ''
}

const persistSnapshot = async (snapshotId, name, isNew) => {
  savingSnapshot.value = true
  try {
    const payload = {
      name,
      status: 'draft',
      metadata: {},
      items: currentItemsPayload()
    }
    const url = isNew
      ? `${API_BASE}/api/desktop/inventory`
      : `${API_BASE}/api/desktop/inventory/${snapshotId}`
    const resp = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.error || 'Nie udało się zapisać inwentury.')
    }
    if (isNew) {
      activeSnapshotId.value = data?.id || null
      selectedSnapshotId.value = activeSnapshotId.value ? String(activeSnapshotId.value) : ''
      infoMessage.value = `Zapisano nową inwenturę: ${name}`
    } else {
      infoMessage.value = `Zapisano zmiany w inwenturze: ${name}`
    }
    suppressNameWatch = true
    snapshotBaselineName.value = name
    snapshotName.value = name
    suppressNameWatch = false
    errorMessage.value = ''
    isDirty.value = false
    await fetchSnapshots()
  } catch (err) {
    errorMessage.value = err?.message || 'Błąd podczas zapisywania inwentury.'
  } finally {
    savingSnapshot.value = false
  }
}

const saveSnapshot = async () => {
  const name = snapshotName.value.trim()
  if (!name) {
    errorMessage.value = 'Podaj nazwę inwentury przed zapisem.'
    return
  }
  if (!activeSnapshotId.value) {
    await saveSnapshotAs()
    return
  }
  await persistSnapshot(activeSnapshotId.value, name, false)
}

const saveSnapshotAs = async () => {
  const name = snapshotName.value.trim()
  if (!name) {
    errorMessage.value = 'Podaj nazwę inwentury przed zapisem.'
    return
  }
  await persistSnapshot(null, name, true)
}

const deleteSelectedSnapshot = async () => {
  if (!selectedSnapshotId.value) return
  const id = Number(selectedSnapshotId.value)
  if (!Number.isFinite(id) || id <= 0) {
    errorMessage.value = 'Wybierz poprawny zapis inwentury.'
    return
  }
  if (!window.confirm('Czy na pewno chcesz usunąć wybraną inwenturę?')) return
  try {
    const resp = await fetch(`${API_BASE}/api/desktop/inventory/${id}`, { method: 'DELETE' })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.error || 'Nie udało się usunąć inwentury.')
    }
    if (activeSnapshotId.value === id) {
      createNewSnapshot()
    }
    await fetchSnapshots()
    infoMessage.value = 'Inwentura została usunięta.'
    errorMessage.value = ''
  } catch (err) {
    errorMessage.value = err?.message || 'Błąd podczas usuwania inwentury.'
  }
}

const resetForm = () => {
  form.manufacturerCode = ''
  form.magazineCode = ''
  form.name = ''
  form.qtyStock = 0
  form.qtyCounted = 0
  form.netPrice = 0
  form.vatRate = 23
  editIndex.value = null
  Object.keys(errors).forEach(key => { delete errors[key] })
}

const validateForm = () => {
  Object.keys(errors).forEach(key => { delete errors[key] })

  if (!form.manufacturerCode) errors.manufacturerCode = 'Kod producenta jest wymagany'
  if (!form.magazineCode) errors.magazineCode = 'Kod magazynowy jest wymagany'
  if (!form.name) errors.name = 'Nazwa towaru jest wymagana'
  if (!Number.isFinite(form.qtyStock) || form.qtyStock < 0) errors.qtyStock = 'Podaj ilość ewidencyjną (≥ 0)'
  if (!Number.isFinite(form.qtyCounted) || form.qtyCounted < 0) errors.qtyCounted = 'Podaj ilość policzoną (≥ 0)'
  if (!Number.isFinite(form.netPrice) || form.netPrice < 0) errors.netPrice = 'Cena netto musi być ≥ 0'
  if (!Number.isFinite(form.vatRate) || form.vatRate < 0 || form.vatRate > 100) errors.vatRate = 'VAT musi być w zakresie 0-100%'

  return Object.keys(errors).length === 0
}

const normalizeItem = payload => {
  const qtyStock = Number(payload.qtyStock) || 0
  const qtyCounted = Number(payload.qtyCounted) || 0
  const netPrice = Number(payload.netPrice) || 0
  const vatRate = Number(payload.vatRate) || 0
  const vatMultiplier = 1 + (vatRate / 100)

  const netStock = qtyStock * netPrice
  const netCounted = qtyCounted * netPrice
  const qtyDiff = qtyCounted - qtyStock
  const netDiff = qtyDiff * netPrice
  const grossCounted = netCounted * vatMultiplier
  const grossDiff = netDiff * vatMultiplier

  return {
    manufacturerCode: String(payload.manufacturerCode || '').trim(),
    magazineCode: String(payload.magazineCode || '').trim(),
    name: String(payload.name || '').trim(),
    qtyStock,
    qtyCounted,
    netPrice,
    netUnit: netPrice,
    grossUnit: netPrice * vatMultiplier,
    vatRate,
    qtyDiff,
    netStock,
    netCounted,
    netDiff,
    grossCounted,
    grossDiff
  }
}

const handleSubmit = () => {
  if (!validateForm()) return
  const normalized = normalizeItem(form)

  if (editIndex.value !== null) {
    items.value.splice(editIndex.value, 1, normalized)
    editIndex.value = null
  } else {
    items.value.push(normalized)
  }
  markDirty()
  resetForm()
}

const editItem = index => {
  const current = items.value[index]
  if (!current) return
  form.manufacturerCode = current.manufacturerCode
  form.magazineCode = current.magazineCode
  form.name = current.name
  form.qtyStock = current.qtyStock
  form.qtyCounted = current.qtyCounted
  form.netPrice = current.netPrice
  form.vatRate = current.vatRate
  editIndex.value = index
  Object.keys(errors).forEach(key => { delete errors[key] })
}

const cancelEdit = () => {
  resetForm()
}

const removeItem = index => {
  items.value.splice(index, 1)
  if (editIndex.value === index) {
    resetForm()
  }
  markDirty()
}

const resetAll = () => {
  const hadItems = items.value.length > 0
  items.value = []
  resetForm()
  infoMessage.value = ''
  errorMessage.value = ''
  if (hadItems) markDirty()
}

const sanitizeFileName = raw => {
  const text = String(raw || '').trim()
  if (!text) return ''
  const normalized = text
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!normalized) return ''
  return `${normalized}.pdf`
}

const validateBeforePdf = () => {
  let valid = true
  delete errors.fileName
  if (!items.value.length) {
    errorMessage.value = 'Dodaj przynajmniej jedną pozycję, aby wygenerować raport.'
    valid = false
  }
  const sanitized = sanitizeFileName(fileName.value)
  if (!sanitized) {
    errors.fileName = 'Podaj poprawną nazwę pliku (tylko litery/cyfry/-/_).'
    valid = false
  }
  return { valid, sanitized }
}

const generatePdf = async () => {
  const { valid, sanitized } = validateBeforePdf()
  if (!valid) return

  infoMessage.value = ''
  errorMessage.value = ''
  generating.value = true

  try {
    const payload = {
      fileName: sanitized,
      items: items.value.map(item => ({
        manufacturerCode: item.manufacturerCode,
        magazineCode: item.magazineCode,
        name: item.name,
        qtyStock: item.qtyStock,
        qtyCounted: item.qtyCounted,
        netPrice: item.netPrice,
        vatRate: item.vatRate
      })),
      summary: summary.value,
      metadata: {
        generatedAt: new Date().toISOString(),
        snapshotId: activeSnapshotId.value,
        snapshotName: snapshotName.value.trim() || null
      }
    }

    const response = await fetch(`${API_BASE}/api/desktop/inventory-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Nie udało się wygenerować raportu.')
    }

    infoMessage.value = result.message || `Raport zapisany: ${result.path || sanitized}`
    errorMessage.value = ''
  } catch (err) {
    errorMessage.value = err?.message || 'Wystąpił błąd podczas generowania PDF.'
  } finally {
    generating.value = false
  }
}
</script>