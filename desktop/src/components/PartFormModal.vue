<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto m-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-secondary-200">
        <h2 class="text-xl font-bold text-secondary-900">
          {{ isEdit ? 'Edytuj część' : 'Dodaj nową część' }}
        </h2>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="savePart" class="p-6 space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Magazine code -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kod magazynowy *
            </label>
            <div class="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-2 md:space-y-0">
              <input
                v-model="form.magazine_code"
                type="text"
                class="input-field md:flex-1"
                :class="{ 'border-red-300': errors.magazine_code }"
                placeholder="np. MAG-2024-0001"
              />
              <button
                type="button"
                class="btn-secondary whitespace-nowrap"
                :disabled="isGeneratingCode"
                @click="regenerateMagazineCode"
              >
                <i v-if="isGeneratingCode" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-random mr-2"></i>
                Generuj
              </button>
            </div>
            <p v-if="errors.magazine_code" class="text-red-600 text-xs mt-1">{{ errors.magazine_code }}</p>
          </div>

          <!-- Name -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Nazwa części *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              :class="{ 'border-red-300': errors.name }"
              placeholder="np. Filtr powietrza"
            />
            <p v-if="errors.name" class="text-red-600 text-xs mt-1">{{ errors.name }}</p>
          </div>

  <!-- Part Number -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Numer katalogowy *
            </label>
            <input
              v-model="form.part_number"
              type="text"
              required
              class="input-field"
              :class="{ 'border-red-300': errors.part_number }"
              placeholder="np. VIE-FIL-001"
            />
            <p v-if="errors.part_number" class="text-red-600 text-xs mt-1">{{ errors.part_number }}</p>
          </div>

          <!-- Manufacturer -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Producent *
            </label>
            <input
              v-model="form.manufacturer"
              type="text"
              required
              class="input-field"
              :class="{ 'border-red-300': errors.manufacturer }"
              placeholder="np. Viessmann"
            />
            <p v-if="errors.manufacturer" class="text-red-600 text-xs mt-1">{{ errors.manufacturer }}</p>
          </div>

          <!-- Manufacturer code -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kod producenta
            </label>
            <input
              v-model="form.manufacturer_code"
              type="text"
              class="input-field"
              placeholder="np. 87070210260"
            />
          </div>

          <!-- Brand -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Marka
            </label>
            <input
              v-model="form.brand"
              type="text"
              class="input-field"
              placeholder="np. Viessmann Premium"
            />
            <p class="text-xs text-secondary-500 mt-1">Nazwa marketingowa (może być taka sama jak producent)</p>
          </div>

          <!-- Assembly group -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Grupa montażowa
            </label>
            <input
              v-model="form.assembly_group"
              type="text"
              class="input-field"
              placeholder="np. ARMATURA GAZOWA"
            />
          </div>

          <!-- Barcode -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kod kreskowy / EAN
            </label>
            <input
              v-model="form.barcode"
              type="text"
              class="input-field"
              placeholder="np. 4010009951582"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kategoria główna *
            </label>
            <select
              v-model="mainCategoryId"
              required
              class="select-field"
              :class="{ 'border-red-300': errors.category }"
            >
              <option :value="null">Wybierz kategorię główną</option>
              <option v-for="opt in topLevelCategories" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
            <p v-if="errors.category" class="text-red-600 text-xs mt-1">{{ errors.category }}</p>

            <label class="block text-sm font-medium text-secondary-700 mb-2 mt-4">
              Podkategoria (opcjonalnie)
            </label>
            <select
              v-model="childCategoryId"
              class="select-field"
              :disabled="!mainCategoryId || childrenOfMain.length === 0"
            >
              <option :value="null">(brak podkategorii)</option>
              <option v-for="opt in childrenOfMain" :key="opt.id" :value="opt.id">
                {{ opt.name }}
              </option>
            </select>
            <p class="text-xs text-secondary-500 mt-1" v-if="childrenOfMain.length === 0 && mainCategoryId">Brak podkategorii w tej grupie</p>
          </div>

          <!-- Pricing -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Ceny i VAT
            </label>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span class="text-xs text-secondary-500 mb-1 block">Cena netto</span>
                <input
                  v-model.number="form.net_price"
                  type="number"
                  step="0.01"
                  min="0"
                  class="input-field"
                  placeholder="0.00"
                />
              </div>
              <div>
                <span class="text-xs text-secondary-500 mb-1 block">VAT (%)</span>
                <input
                  v-model.number="form.vat_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  class="input-field"
                  placeholder="23"
                />
              </div>
              <div>
                <span class="text-xs text-secondary-500 mb-1 block">Cena brutto *</span>
                <input
                  v-model.number="form.gross_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="input-field"
                  :class="{ 'border-red-300': errors.gross_price }"
                  placeholder="0.00"
                />
                <p v-if="errors.gross_price" class="text-red-600 text-xs mt-1">{{ errors.gross_price }}</p>
              </div>
              <div>
                <span class="text-xs text-secondary-500 mb-1 block">Waluta</span>
                <input
                  v-model="form.currency"
                  type="text"
                  class="input-field"
                  placeholder="PLN"
                />
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Opis
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              class="input-field"
              placeholder="Dodatkowe informacje o części..."
            ></textarea>
          </div>
        </div>

        <!-- Stock Information -->
        <div class="border-t border-secondary-200 pt-6">
          <h3 class="text-lg font-medium text-secondary-900 mb-4">
            <i class="fas fa-boxes mr-2"></i>
            Informacje magazynowe
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Current Stock -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Stan obecny *
              </label>
              <input
                v-model.number="form.stock_quantity"
                type="number"
                min="0"
                required
                class="input-field"
                :class="{ 'border-red-300': errors.stock_quantity }"
                placeholder="0"
              />
              <p v-if="errors.stock_quantity" class="text-red-600 text-xs mt-1">{{ errors.stock_quantity }}</p>
            </div>

            <!-- Min Stock Level -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Minimalny poziom *
              </label>
              <input
                v-model.number="form.min_stock_level"
                type="number"
                min="0"
                required
                class="input-field"
                :class="{ 'border-red-300': errors.min_stock_level }"
                placeholder="0"
              />
              <p v-if="errors.min_stock_level" class="text-red-600 text-xs mt-1">{{ errors.min_stock_level }}</p>
            </div>

            <!-- Location -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Lokalizacja
              </label>
              <input
                v-model="form.location"
                type="text"
                class="input-field"
                placeholder="np. Regał A1"
              />
            </div>

            <!-- Weight -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Waga (kg)
              </label>
              <input
                v-model.number="form.weight"
                type="number"
                min="0"
                step="0.001"
                class="input-field"
                placeholder="0.000"
              />
            </div>

            <!-- Unit -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Jednostka miary
              </label>
              <input
                v-model="form.unit"
                type="text"
                class="input-field"
                placeholder="np. szt."
              />
            </div>

            <!-- Package size -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Wielkość opakowania
              </label>
              <input
                v-model="form.package_size"
                type="text"
                class="input-field"
                placeholder="np. 10 szt."
              />
            </div>
          </div>
        </div>

        <!-- Supplier Information -->
        <div class="border-t border-secondary-200 pt-6">
          <h3 class="text-lg font-medium text-secondary-900 mb-4">
            <i class="fas fa-truck mr-2"></i>
            Informacje o dostawcy
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Supplier -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Dostawca
              </label>
              <select v-model="selectedSupplierId" class="select-field w-full">
                <option :value="null">(brak – wpisz ręcznie poniżej)</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}{{ s.nip ? ' • NIP ' + s.nip : '' }}</option>
              </select>
              <p class="text-xs text-secondary-500 mt-1">Możesz też wpisać nazwę ręcznie:</p>
              <input v-model="form.supplier" type="text" class="input-field" placeholder="np. Hurtownia ABC" />
            </div>

            <!-- Supplier Part Number -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Numer u dostawcy
              </label>
              <input
                v-model="form.supplier_part_number"
                type="text"
                class="input-field"
                placeholder="Numer katalogowy dostawcy"
              />
            </div>

            <!-- Lead Time -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Czas dostawy (dni)
              </label>
              <input
                v-model.number="form.lead_time_days"
                type="number"
                min="0"
                class="input-field"
                placeholder="7"
              />
            </div>

            <!-- Last Order Date -->
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Ostatnie zamówienie
              </label>
              <input
                v-model="form.last_order_date"
                type="date"
                class="input-field"
              />
            </div>
          </div>
        </div>

        <!-- Device Compatibility -->
        <div class="border-t border-secondary-200 pt-6">
          <h3 class="text-lg font-medium text-secondary-900 mb-4">
            <i class="fas fa-cogs mr-2"></i>
            Kompatybilność z modelami urządzeń
          </h3>
          
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Pasuje do (modele / nr katalogowe)
            </label>
            <textarea
              v-model="form.model_compatibility"
              rows="3"
              class="input-field"
              placeholder="np. GB142‑24/30/45/60, Logano, Logatop TE 1.0/1.1, DTG 210 EZ / NEZ..."
            ></textarea>
            <p class="text-xs text-secondary-500 mt-1">
              Wpisz modele urządzeń, numery katalogowe lub serie, z którymi kompatybilna jest ta część
            </p>
          </div>
        </div>

        <!-- Notes -->
        <div class="border-t border-secondary-200 pt-6">
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Notatki
          </label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="input-field"
            placeholder="Dodatkowe notatki dotyczące części..."
          ></textarea>
        </div>

        <!-- Error Display -->
        <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
            <div>
              <h3 class="text-sm font-medium text-red-800">Błąd zapisu</h3>
              <p class="text-sm text-red-700 mt-1">{{ formError }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-secondary-200">
          <button
            type="button"
            @click="$emit('close')"
            class="btn-secondary"
          >
            Anuluj
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary"
          >
            <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-save mr-2"></i>
            {{ isEdit ? 'Zaktualizuj' : 'Dodaj część' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'

const props = defineProps({
  part: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

// Form data
const form = reactive({
  magazine_code: '',
  name: '',
  part_number: '',
  manufacturer: '',
  manufacturer_code: '',
  brand: '',
  assembly_group: '',
  barcode: '',
  category: '',
  description: '',
  net_price: 0,
  gross_price: 0,
  vat_rate: 23,
  currency: 'PLN',
  stock_quantity: 0,
  min_stock_level: 1,
  weight: 0,
  unit: '',
  package_size: '',
  location: '',
  supplier: '',
  supplier_part_number: '',
  lead_time_days: 0,
  last_order_date: '',
  model_compatibility: '',
  notes: ''
})

// State
const isLoading = ref(false)
const formError = ref('')
const errors = ref({})
const suppliers = ref([])
const selectedSupplierId = ref(null)
const isGeneratingCode = ref(false)
let priceSyncing = false

const normalizeText = value => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(
    typeof value === 'string' ? value.replace(',', '.').trim() : value
  )
  return Number.isFinite(num) ? num : fallback
}

const normalizeCurrency = value => {
  const text = normalizeText(value).toUpperCase()
  return text || 'PLN'
}

const optional = value => {
  const text = normalizeText(value)
  return text.length ? text : null
}

const inventoryUpdateColumns = [
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
  'location',
  'supplier',
  'supplier_part_number',
  'lead_time_days',
  'last_order_date',
  'notes',
  'supplier_id',
  'device_id',
  'synced_at',
  'updated_by',
  'updated_at'
]

const inventoryInsertColumns = [...inventoryUpdateColumns, 'created_at']

// Categories (loaded from Railway)
const categoriesRaw = ref([])
// Flattened list no longer used for selection; keeping for potential future display
const categoryOptions = computed(() => {
  const opts = []
  const byParent = new Map()
  for (const c of categoriesRaw.value) {
    const pid = c.parent_id || 0
    if (!byParent.has(pid)) byParent.set(pid, [])
    byParent.get(pid).push(c)
  }
  const walk = (parentId, level, prefix=[]) => {
    const items = (byParent.get(parentId) || []).sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
    for (const it of items) {
      const label = `${'  '.repeat(level)}${it.name}`
      opts.push({ value: it.name, label })
      walk(it.id, level+1, [...prefix, it.name])
    }
  }
  walk(0,0,[])
  return opts
})

// Cascading selection state
const mainCategoryId = ref(null)
const childCategoryId = ref(null)

const topLevelCategories = computed(() =>
  categoriesRaw.value
    .filter(c => !c.parent_id)
    .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
)

const childrenOfMain = computed(() =>
  categoriesRaw.value
    .filter(c => c.parent_id === mainCategoryId.value)
    .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
)

watch(mainCategoryId, () => {
  // reset subcategory when main changes
  childCategoryId.value = null
})

watch(() => form.net_price, value => {
  if (priceSyncing) return
  priceSyncing = true
  const vat = toNumber(form.vat_rate, 0)
  const net = toNumber(value, 0)
  form.gross_price = Number((net * (1 + vat / 100)).toFixed(2))
  priceSyncing = false
})

watch(() => form.gross_price, value => {
  if (priceSyncing) return
  priceSyncing = true
  const vat = toNumber(form.vat_rate, 0)
  const gross = toNumber(value, 0)
  const divisor = 1 + vat / 100
  form.net_price = divisor === 0 ? gross : Number((gross / divisor).toFixed(2))
  priceSyncing = false
})

watch(() => form.vat_rate, () => {
  if (priceSyncing) return
  priceSyncing = true
  const vat = toNumber(form.vat_rate, 0)
  const net = toNumber(form.net_price, 0)
  form.gross_price = Number((net * (1 + vat / 100)).toFixed(2))
  priceSyncing = false
})

function resolveCategoryNameForSave() {
  const byId = new Map(categoriesRaw.value.map(c => [c.id, c]))
  if (childCategoryId.value && byId.get(childCategoryId.value)) {
    return byId.get(childCategoryId.value).name
  }
  if (mainCategoryId.value && byId.get(mainCategoryId.value)) {
    return byId.get(mainCategoryId.value).name
  }
  return ''
}

function prefillCategorySelectionFromFormName() {
  if (!form.category || categoriesRaw.value.length === 0) return
  const found = categoriesRaw.value.find(c => c.name === form.category)
  if (!found) return
  if (found.parent_id) {
    mainCategoryId.value = found.parent_id
    childCategoryId.value = found.id
  } else {
    mainCategoryId.value = found.id
    childCategoryId.value = null
  }
}

const applyPartToForm = (part) => {
  if (!part) return
  priceSyncing = true
  form.magazine_code = normalizeText(part.magazine_code).toUpperCase()
  form.name = normalizeText(part.name)
  form.part_number = normalizeText(part.part_number)
  form.manufacturer = normalizeText(part.manufacturer)
  form.manufacturer_code = normalizeText(part.manufacturer_code)
  form.brand = normalizeText(part.brand)
  form.assembly_group = normalizeText(part.assembly_group)
  form.barcode = normalizeText(part.barcode)
  form.category = normalizeText(part.category)
  form.description = normalizeText(part.description)
  form.gross_price = toNumber(part.gross_price != null ? part.gross_price : part.price, 0)
  form.vat_rate = toNumber(part.vat_rate, 23)
  const divisor = 1 + (form.vat_rate / 100)
  form.net_price = part.net_price != null
    ? toNumber(part.net_price, 0)
    : (divisor === 0 ? form.gross_price : Number((form.gross_price / divisor).toFixed(2)))
  form.currency = normalizeCurrency(part.currency)
  form.stock_quantity = toNumber(part.stock_quantity, 0)
  form.min_stock_level = toNumber(part.min_stock_level, 1)
  form.weight = toNumber(part.weight, 0)
  form.unit = normalizeText(part.unit)
  form.package_size = normalizeText(part.package_size)
  form.location = normalizeText(part.location)
  form.supplier = normalizeText(part.supplier)
  form.supplier_part_number = normalizeText(part.supplier_part_number)
  form.lead_time_days = toNumber(part.lead_time_days, 0)
  form.last_order_date = part.last_order_date ? String(part.last_order_date).split('T')[0] : ''
  form.model_compatibility = normalizeText(part.model_compatibility)
  form.notes = normalizeText(part.notes)
  priceSyncing = false
  prefillCategorySelectionFromFormName()
  if (part.supplier_id != null) selectedSupplierId.value = Number(part.supplier_id)
}

const fetchMagazineCode = async (force = false) => {
  if (!force && normalizeText(form.magazine_code)) return
  isGeneratingCode.value = true
  let generatedCode = null
  try {
    const resp = await fetch('http://localhost:5174/api/desktop/spare-parts/generate-code')
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}))
      if (data?.code) {
        generatedCode = String(data.code).toUpperCase()
      }
    }
  } catch (_) { /* ignore */ }
  if (!generatedCode) {
    generatedCode = normalizeText(form.magazine_code) || `MAG-${Date.now()}`
  }
  form.magazine_code = generatedCode.toUpperCase()
  isGeneratingCode.value = false
}

const regenerateMagazineCode = async () => {
  form.magazine_code = ''
  await fetchMagazineCode(true)
}

async function loadPartCategories(){
  const assignCategories = data => {
    categoriesRaw.value = Array.isArray(data) ? data : []
  }

  try {
    const localResp = await fetch('http://localhost:5174/api/part-categories')
    if (localResp.ok) {
      const localJson = await localResp.json().catch(() => ({}))
      if (Array.isArray(localJson?.data) && localJson.data.length) {
        assignCategories(localJson.data)
        prefillCategorySelectionFromFormName()
        return
      }
    }
  } catch (_) { /* ignore */ }

  try{
    const r = await fetch('https://web-production-fc58d.up.railway.app/api/part-categories')
    if(r.ok){
      const j=await r.json()
      assignCategories(j.data || [])
    } else {
      assignCategories([])
    }
  }catch{ assignCategories([]) }

  prefillCategorySelectionFromFormName()
}

// Suppliers loader
onMounted(async () => {
  try {
    const r = await fetch('http://localhost:5174/api/desktop/suppliers?active=1')
    suppliers.value = await r.json().catch(()=>[])
    if (props.isEdit && props.part && props.part.supplier_id) {
      selectedSupplierId.value = props.part.supplier_id
    }
  } catch (_) { suppliers.value = [] }
})

// Validation
const validateForm = () => {
  errors.value = {}

  if (!normalizeText(form.name)) {
    errors.value.name = 'Nazwa jest wymagana'
  }

  if (!normalizeText(form.part_number)) {
    errors.value.part_number = 'Numer katalogowy jest wymagany'
  }

  if (!normalizeText(form.manufacturer)) {
    errors.value.manufacturer = 'Producent jest wymagany'
  }

  if (!normalizeText(form.magazine_code)) {
    errors.value.magazine_code = 'Kod magazynowy jest wymagany'
  }

  // Require at least main category
  if (!mainCategoryId.value) {
    errors.value.category = 'Wybierz kategorię główną'
  }

  if (toNumber(form.gross_price, 0) <= 0) {
    errors.value.gross_price = 'Cena brutto musi być większa od 0'
  }

  if (toNumber(form.stock_quantity, 0) < 0) {
    errors.value.stock_quantity = 'Stan nie może być ujemny'
  }

  if (toNumber(form.min_stock_level, 0) < 0) {
    errors.value.min_stock_level = 'Minimalny poziom nie może być ujemny'
  }

  return Object.keys(errors.value).length === 0
}

// Actions
const buildPartPayload = async () => {
  await fetchMagazineCode(false)
  const categoryName = resolveCategoryNameForSave()
  const vatRate = toNumber(form.vat_rate, 23)
  const gross = toNumber(form.gross_price, 0)
  const net = toNumber(form.net_price, 0)

  form.category = categoryName

  const payload = {
    magazine_code: normalizeText(form.magazine_code).toUpperCase(),
    name: normalizeText(form.name),
    part_number: normalizeText(form.part_number),
    manufacturer: normalizeText(form.manufacturer),
    manufacturer_code: optional(form.manufacturer_code),
    brand: optional(form.brand),
    assembly_group: optional(form.assembly_group),
    barcode: optional(form.barcode),
    category: categoryName,
    description: optional(form.description),
    net_price: Number(net.toFixed(2)),
    gross_price: Number(gross.toFixed(2)),
    vat_rate: Number(vatRate.toFixed(2)),
    currency: normalizeCurrency(form.currency),
    stock_quantity: toNumber(form.stock_quantity, 0),
    min_stock_level: toNumber(form.min_stock_level, 0),
    weight: toNumber(form.weight, 0),
    unit: optional(form.unit),
    package_size: optional(form.package_size),
    location: optional(form.location),
    supplier: optional(form.supplier),
    supplier_part_number: optional(form.supplier_part_number),
    lead_time_days: toNumber(form.lead_time_days, 0),
    last_order_date: optional(form.last_order_date),
    model_compatibility: optional(form.model_compatibility),
    notes: optional(form.notes),
    supplier_id: selectedSupplierId.value != null ? Number(selectedSupplierId.value) : null,
    device_id: props.deviceId != null ? Number(props.deviceId) : null,
    updated_by: 'desktop',
    synced_at: null,
    updated_at: new Date().toISOString()
  }

  if (!payload.magazine_code) {
    payload.magazine_code = `MAG-${Date.now()}`
  }

  payload.price = payload.gross_price

  return payload
}

const syncPartToRailway = async (payload) => {
  try {
    const body = {
      items: [
        {
          magazine_code: payload.magazine_code,
          name: payload.name,
          part_number: payload.part_number,
          manufacturer: payload.manufacturer,
          manufacturer_code: payload.manufacturer_code,
          brand: payload.brand,
          assembly_group: payload.assembly_group,
          barcode: payload.barcode,
          category: payload.category,
          description: payload.description,
          net_price: payload.net_price,
          gross_price: payload.gross_price,
          vat_rate: payload.vat_rate,
          currency: payload.currency,
          price: payload.price,
          stock_quantity: payload.stock_quantity,
          min_stock_level: payload.min_stock_level,
          weight: payload.weight,
          unit: payload.unit,
          package_size: payload.package_size,
          supplier: payload.supplier,
          supplier_part_number: payload.supplier_part_number,
          lead_time_days: payload.lead_time_days,
          last_order_date: payload.last_order_date,
          model_compatibility: payload.model_compatibility,
          notes: payload.notes,
          location: payload.location,
          assembly_group: payload.assembly_group
        }
      ]
    }

    await fetch('http://localhost:5174/api/railway/sync-parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => null)
  } catch (err) {
    console.warn('[inventory] sync to Railway failed:', err?.message || err)
  }
}

const savePart = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  formError.value = ''

  try {
    const payload = await buildPartPayload()

    if (!payload.name || !payload.part_number || !payload.manufacturer) {
      throw new Error('Brak wymaganych pól')
    }

    if (props.isEdit && props.part) {
      payload.id = props.part.id
      if (window.electronAPI?.database) {
        const updateSql = `
          UPDATE spare_parts SET
            ${inventoryUpdateColumns.map(col => `${col} = ?`).join(', ')}
          WHERE id = ?
        `
        const updateValues = inventoryUpdateColumns.map(col => payload[col] ?? null)
        updateValues.push(payload.id)
        await window.electronAPI.database.run(updateSql, updateValues)
      }
    } else {
      payload.created_at = payload.updated_at
      if (window.electronAPI?.database) {
        const insertSql = `
          INSERT INTO spare_parts (
            ${inventoryInsertColumns.join(', ')}
          ) VALUES (
            ${inventoryInsertColumns.map(() => '?').join(', ')}
          )
        `
        const insertValues = inventoryInsertColumns.map(col => payload[col] ?? null)
        const result = await window.electronAPI.database.run(insertSql, insertValues)
        payload.id = result.lastID
      }
    }

    await syncPartToRailway(payload)
    emit('saved', payload)
  } catch (err) {
    console.error('Error saving part:', err)
    formError.value = 'Błąd podczas zapisywania części. Spróbuj ponownie.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadPartCategories()
  if (props.isEdit && props.part) {
    applyPartToForm(props.part)
  } else {
    await fetchMagazineCode()
  }
})
</script> 