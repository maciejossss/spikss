<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-secondary-200 sticky top-0 bg-white rounded-t-xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-secondary-900">
            {{ isEdit ? 'Edytuj zlecenie' : 'Nowe zlecenie serwisowe' }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-secondary-400 hover:text-secondary-600"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="px-6 py-4">
        <form @submit.prevent="saveOrder" class="space-y-6">
          <!-- Podstawowe informacje -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Podstawowe informacje</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Numer zlecenia -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Numer zlecenia
                </label>
                <input
                  v-model="form.order_number"
                  type="text"
                  readonly
                  class="input-field bg-secondary-50"
                  placeholder="Automatycznie generowany"
                />
              </div>

              <!-- Typ zlecenia (Główne kategorie) -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Typ zlecenia *
                </label>
                <select 
                  v-model="form.main_category_id" 
                  required 
                  class="input-field"
                  :class="{ 'border-red-300': errors.main_category_id }"
                  @change="onMainCategoryChange"
                >
                  <option value="">Wybierz typ zlecenia</option>
                  <option 
                    v-for="category in mainCategories" 
                    :key="category.id" 
                    :value="category.id"
                  >
                    {{ category.code }}: {{ category.name }}
                  </option>
                </select>
                <p v-if="errors.main_category_id" class="mt-1 text-sm text-red-600">{{ errors.main_category_id }}</p>
              </div>

              <!-- Kategorie usług (opcjonalne przy tworzeniu) -->
              <div class="md:col-span-2">
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-medium text-secondary-700">
                    Kategorie usług (opcjonalne)
                  </label>
                  <button type="button" @click="refreshCategories" class="text-xs px-2 py-1 border border-secondary-300 rounded hover:bg-secondary-50 text-secondary-700">
                    <i v-if="isRefreshingCategories" class="fas fa-spinner fa-spin mr-1"></i>
                    <i v-else class="fas fa-sync-alt mr-1"></i>
                    Odśwież kategorie
                  </button>
                </div>
                <div class="space-y-3">
                  <!-- Info o wyborze kategorii -->
                  <div class="text-sm text-secondary-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                    <strong>Dla serwisanta:</strong> Wybierz kategorie usług, które zostały wykonane podczas realizacji zlecenia. 
                    Te informacje będą widoczne przy zamykaniu zlecenia.
                  </div>
                  
                  <!-- Przyciski podkategorii -->
                  <div v-if="form.main_category_id" class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div
                      v-for="category in getSubCategoriesForMain(form.main_category_id)"
                      :key="category.id"
                      @click="toggleServiceCategory(category.id)"
                      :class="[
                        'p-3 border rounded-lg cursor-pointer transition-colors text-sm',
                        (form.service_categories || []).includes(category.id)
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-semibold">{{ category.code }}</div>
                          <div class="text-xs">{{ category.name }}</div>
                        </div>
                        <i :class="[
                          'fas',
                          (form.service_categories || []).includes(category.id) ? 'fa-check-circle text-primary-600' : 'fa-circle text-secondary-400'
                        ]"></i>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Informacja gdy nie wybrano głównej kategorii -->
                  <div v-else class="text-sm text-secondary-500 bg-secondary-50 p-3 rounded-lg border border-secondary-200">
                    <i class="fas fa-info-circle text-secondary-400 mr-2"></i>
                    Najpierw wybierz typ zlecenia, aby zobaczyć dostępne kategorie usług.
                  </div>
                  
                  <!-- Podsumowanie wybranych kategorii -->
                  <div v-if="(form.service_categories || []).length > 0" class="text-sm text-secondary-600">
                    <strong>Wybrane kategorie ({{ (form.service_categories || []).length }}):</strong>
                    {{ (form.service_categories || []).sort().join(', ') }}
                  </div>
                </div>
              </div>

              <!-- Priorytet -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Priorytet
                </label>
                <select v-model="form.priority" class="input-field">
                  <option value="low">Niski</option>
                  <option value="medium">Średni</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilny</option>
                </select>
              </div>

              <!-- Status (tylko przy edycji) -->
              <div v-if="isEdit">
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <select v-model="form.status" class="input-field">
                  <option value="new">Nowe</option>
                  <option value="in_progress">W realizacji</option>
                  <option value="waiting_for_parts">Oczekuje na części</option>
                  <option value="completed">Ukończone</option>
                  <option value="cancelled">Anulowane</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Klient i urządzenie -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Klient i urządzenie</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Klient -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Klient *
                </label>
                <select
                  v-model="form.client_id"
                  required
                  @change="onClientChange"
                  class="input-field"
                  :class="{ 'border-red-300': errors.client_id }"
                >
                  <option value="">Wybierz klienta</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ getClientName(client) }}
                  </option>
                </select>
                <p v-if="errors.client_id" class="mt-1 text-sm text-red-600">{{ errors.client_id }}</p>
              </div>

              <!-- Urządzenie -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Urządzenie <span v-if="clientDevices.length > 0" class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.device_id"
                  class="input-field"
                  :class="{ 'border-red-300': errors.device_id }"
                  :required="clientDevices.length > 0"
                  :disabled="!form.client_id"
                >
                  <option value="">{{ clientDevices.length > 0 ? 'Wybierz urządzenie' : 'Brak urządzeń – pole opcjonalne' }}</option>
                  <option v-for="device in clientDevices" :key="device.id" :value="device.id">
                    {{ device.name }} ({{ device.manufacturer }} {{ device.model }})
                  </option>
                </select>
                <p v-if="errors.device_id" class="mt-1 text-sm text-red-600">{{ errors.device_id }}</p>
                <p v-else-if="!form.client_id" class="mt-1 text-xs text-secondary-500">
                  Najpierw wybierz klienta
                </p>
                <p v-else-if="clientDevices.length > 0" class="mt-1 text-xs text-secondary-500">
                  Klient ma urządzenia w systemie – wybór urządzenia jest wymagany
                </p>
              </div>
            </div>
          </div>

          <!-- Opis zlecenia -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Opis zlecenia</h4>
            <div class="space-y-4">
              <!-- Tytuł -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Tytuł zlecenia *
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="np. Awaria kotła - brak ogrzewania"
                  class="input-field"
                  :class="{ 'border-red-300': errors.title }"
                />
                <p v-if="errors.title" class="mt-1 text-sm text-red-600">{{ errors.title }}</p>
              </div>

              <!-- Opis -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Szczegółowy opis
                </label>
                <textarea
                  v-model="form.description"
                  rows="4"
                  placeholder="Opisz problem, objawy, wykonane czynności..."
                  class="input-field"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Terminy i czas -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Terminy i czas pracy</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Data planowana -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Data planowana
                </label>
                <input
                  v-model="form.scheduled_date"
                  type="datetime-local"
                  class="input-field"
                />
              </div>

              <!-- Szacowany czas -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Szacowany czas (godz.)
                </label>
                <input
                  v-model.number="form.estimated_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="2.5"
                  class="input-field"
                />
              </div>

              <!-- Rzeczywisty czas (tylko przy edycji) -->
              <div v-if="isEdit">
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Rzeczywisty czas (godz.)
                </label>
                <input
                  v-model.number="form.actual_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="3.0"
                  class="input-field"
                />
              </div>
            </div>
          </div>

          <!-- Koszty (tylko przy edycji - po wykonaniu zlecenia) -->
          <div v-if="isEdit">
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Rozliczenie kosztów</h4>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div class="flex items-center">
                <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                <p class="text-sm text-blue-700">
                  Koszty dodawane są po wykonaniu zlecenia. Części można dodać z magazynu, a system automatycznie obliczy koszt.
                </p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Koszt części -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Koszt części (zł)
                </label>
                <input
                  v-model.number="form.parts_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  @input="calculateTotalCost"
                  class="input-field"
                />
              </div>

              <!-- Koszt robocizny -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Koszt robocizny (zł)
                </label>
                <input
                  v-model.number="form.labor_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  @input="calculateTotalCost"
                  class="input-field"
                />
              </div>

              <!-- Koszt dojazdu -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Koszt dojazdu (zł)
                </label>
                <input
                  v-model.number="form.travel_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  @input="calculateTotalCost"
                  class="input-field"
                />
              </div>

              <!-- Całkowity koszt -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Całkowity koszt (zł)
                </label>
                <input
                  v-model.number="form.total_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  readonly
                  class="input-field bg-secondary-50"
                />
              </div>
            </div>
          </div>

          <!-- Notatki -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Dodatkowe informacje</h4>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Notatki serwisowe
              </label>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Uwagi techniczne, zalecenia, ostrzeżenia..."
                class="input-field"
              ></textarea>
            </div>
          </div>

          <!-- Błędy -->
          <div v-if="errors.general" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-red-400 mr-2 mt-0.5"></i>
              <div class="text-sm text-red-600">{{ errors.general }}</div>
            </div>
          </div>
        </form>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3 bg-secondary-50 rounded-b-xl">
        <button
          @click="$emit('close')"
          type="button"
          class="btn-secondary"
        >
          Anuluj
        </button>
        <button
          @click="saveOrder"
          :disabled="isLoading"
          class="btn-primary"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-save mr-2"></i>
          {{ isEdit ? 'Zaktualizuj' : 'Utwórz' }} zlecenie
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    default: null
  },
  clients: {
    type: Array,
    default: () => []
  },
  devices: {
    type: Array,
    default: () => []
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  prefill: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const isLoading = ref(false)
const errors = ref({})

const form = reactive({
  order_number: '',
  client_id: '',
  device_id: '',
  main_category_id: '', // Nowe pole dla głównej kategorii
  type: '', // Zachowujemy dla kompatybilności
  status: 'new',
  priority: 'medium',
  title: '',
  description: '',
  scheduled_date: '',
  estimated_hours: null,
  actual_hours: null,
  parts_cost: 0,
  labor_cost: 0,
  travel_cost: 0,
  total_cost: 0,
  notes: '',
  service_categories: []
})

// Kategorie usług z bazy danych
const serviceCategories = ref([])
const mainCategories = ref([]) // Główne kategorie (Typ zlecenia)
const subCategories = ref([]) // Podkategorie (Kategorie usług)
const isRefreshingCategories = ref(false)

// Ładowanie kategorii z API
const loadServiceCategories = async () => {
  try {
    isRefreshingCategories.value = true

    const cacheBust = `?t=${Date.now()}`
    let categories = []
    let localCategories = []

    // 1) Czytaj lokalną bazę (najświeższe zmiany wprowadzone w desktopie)
    try {
      const respLocal = await fetch(`http://localhost:5174/api/desktop/service-categories${cacheBust}`, { cache: 'no-store' })
      if (respLocal.ok) {
        const localJson = await respLocal.json()
        localCategories = Array.isArray(localJson?.data) ? localJson.data : (Array.isArray(localJson) ? localJson : [])
        categories = [...localCategories]
      }
    } catch (error) {
      console.warn('[OrderForm] Nie udało się pobrać kategorii lokalnie:', error)
    }

    // 2) Spróbuj nadpisać danymi z Railway (jeśli dostępne)
    try {
      const respRemote = await fetch(`https://web-production-fc58d.up.railway.app/api/service-categories${cacheBust}`, { cache: 'no-store' })
      if (respRemote.ok) {
        const remoteJson = await respRemote.json()
        const remoteCategories = Array.isArray(remoteJson?.data) ? remoteJson.data : []
        if (remoteCategories.length) {
          const mergedMap = new Map(remoteCategories.map(cat => [cat.id, cat]))
          if (localCategories.length) {
            for (const cat of localCategories) {
              mergedMap.set(cat.id, cat)
            }
          }
          categories = Array.from(mergedMap.values())
        }
      }
    } catch (error) {
      console.warn('[OrderForm] Nie udało się pobrać kategorii z Railway:', error)
    }

    categories = (categories || []).slice().sort((a, b) => {
      const sortA = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : 0
      const sortB = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : 0
      if (sortA !== sortB) return sortA - sortB
      const nameA = (a?.name || '').toString().toLowerCase()
      const nameB = (b?.name || '').toString().toLowerCase()
      return nameA.localeCompare(nameB)
    })

    serviceCategories.value = categories

    // Podziel na główne kategorie i podkategorie
    mainCategories.value = categories.filter(cat => !cat.parent_id)
    subCategories.value = categories.filter(cat => cat.parent_id)

    console.log('✅ Załadowano kategorie usług:', categories.length)
    console.log('📋 Główne kategorie:', mainCategories.value.length)
    console.log('📋 Podkategorie:', subCategories.value.length)
  } catch (error) {
    console.error('❌ Błąd ładowania kategorii usług:', error)
  } finally {
    isRefreshingCategories.value = false
  }
}

// Ręczne odświeżenie kategorii (przycisk w UI)
const refreshCategories = async () => {
  await loadServiceCategories()
}

// Pobierz podkategorie dla wybranej głównej kategorii
const getSubCategoriesForMain = (mainCategoryId) => {
  if (mainCategoryId == null || mainCategoryId === '') return []
  const mainIdNumeric = Number(mainCategoryId)
  return subCategories.value.filter(cat => Number(cat.parent_id) === mainIdNumeric)
}

// Computed properties
const clientDevices = computed(() => {
  if (!form.client_id) return []
  return props.devices.filter(device => device.client_id === parseInt(form.client_id))
})

// Helper methods
const getClientName = (client) => {
  if (!client || !client.id) {
    return 'Nieznany klient'
  }

  // 1) Firma ma pierwszeństwo tylko dla typu business
  if (client.type === 'business' && client.company_name) {
    return client.company_name
  }

  // 2) Osoba prywatna – imię i nazwisko, jeśli dostępne
  const first = (client.first_name || '').trim()
  const last = (client.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) {
    return full
  }

  // 3) Fallback: nazwa z e‑maila
  if (client.email) {
    const emailName = client.email.split('@')[0]
    return emailName
      .split('.')
      .map(part => part ? (part.charAt(0).toUpperCase() + part.slice(1)) : '')
      .filter(Boolean)
      .join(' ')
  }

  // 4) Ostateczny fallback: miasto lub Klient #id
  if (client.address_city) {
    return client.address_city
  }

  return `Klient #${client.id}`
}

const generateOrderNumber = () => {
  if (!props.isEdit && !form.order_number) {
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString().slice(-6)
    form.order_number = `SRV-${year}-${timestamp}`
  }
}

const applyPrefill = (prefill) => {
  if (!prefill || typeof prefill !== 'object') return
  if (!props.isEdit && !form.order_number) {
    generateOrderNumber()
  }
  const asString = (value) => (value == null ? '' : String(value))
  const numericKeys = new Set(['estimated_hours', 'actual_hours', 'parts_cost', 'labor_cost', 'travel_cost', 'total_cost'])
  const selectStringKeys = new Set(['client_id', 'device_id', 'main_category_id', 'priority', 'status', 'type'])

  Object.keys(form).forEach((key) => {
    if (!(key in prefill)) return
    const value = prefill[key]
    if (key === 'service_categories') {
      form[key] = Array.isArray(value) ? [...value] : []
    } else if (numericKeys.has(key)) {
      form[key] = value != null && value !== '' ? Number(value) : 0
    } else if (selectStringKeys.has(key)) {
      form[key] = value != null && value !== '' ? asString(value) : ''
    } else if (key === 'scheduled_date') {
      form[key] = value || ''
    } else if (key === 'order_number' && props.isEdit) {
      form[key] = asString(value)
    } else if (typeof form[key] === 'number') {
      form[key] = value != null && value !== '' ? Number(value) : 0
    } else {
      form[key] = asString(value)
    }
  })
}

// Generuj numer zlecenia natychmiast
onMounted(() => {
  generateOrderNumber()
  loadServiceCategories()
  if (!props.isEdit && props.prefill) {
    applyPrefill(props.prefill)
  }
})

const calculateTotalCost = () => {
  const parts = parseFloat(form.parts_cost) || 0
  const labor = parseFloat(form.labor_cost) || 0
  const travel = parseFloat(form.travel_cost) || 0
  form.total_cost = parts + labor + travel
}

const onClientChange = () => {
  // Reset urządzenia gdy zmienia się klient
  form.device_id = ''
}

const onMainCategoryChange = () => {
  // Reset wybranych kategorii usług gdy zmienia się główna kategoria
  form.service_categories = []
  
  // Ustaw typ zlecenia na podstawie wybranej kategorii (dla kompatybilności)
  if (form.main_category_id) {
    const selectedCategory = mainCategories.value.find(cat => Number(cat.id) === Number(form.main_category_id))
    if (selectedCategory) {
      form.type = selectedCategory.code.toLowerCase()
    }
  }
}

const toggleServiceCategory = (categoryId) => {
  // Ensure service_categories is initialized as array
  if (!form.service_categories) {
    form.service_categories = []
  }
  const index = form.service_categories.indexOf(categoryId)
  if (index > -1) {
    form.service_categories.splice(index, 1)
  } else {
    form.service_categories.push(categoryId)
  }
}

// Wypełnij formularz danymi zlecenia przy edycji
watch(() => props.order, (newOrder) => {
  if (newOrder && props.isEdit) {
    Object.keys(form).forEach(key => {
      if (newOrder[key] !== undefined) {
        if (key === 'service_categories') {
          // Parsuj JSON lub użyj pustej tablicy jako fallback
          try {
            form[key] = newOrder[key] ? JSON.parse(newOrder[key]) : []
          } catch (error) {
            console.error('Error parsing service_categories:', error)
            form[key] = []
          }
        } else {
          form[key] = newOrder[key]
        }
      }
    })
    
    // Konwertuj daty do formatu datetime-local (bez konwersji UTC)
    if (newOrder.scheduled_date) {
      const s = String(newOrder.scheduled_date).trim()
      // Jeśli już jest w formacie YYYY-MM-DDTHH:MM, użyj bezpośrednio
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
        form.scheduled_date = s.slice(0, 16) // YYYY-MM-DDTHH:MM
      } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        // Tylko data, bez czasu
        form.scheduled_date = s.slice(0, 10) + 'T00:00'
      } else {
        // Fallback: spróbuj z Date (ale to może mieć problemy z timezone)
        try {
          const date = new Date(s)
          if (!isNaN(date.getTime())) {
            // Użyj lokalnego czasu, nie UTC
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            form.scheduled_date = `${year}-${month}-${day}T${hours}:${minutes}`
          }
        } catch (_) {
          form.scheduled_date = ''
        }
      }
    }
  }
}, { immediate: true })

const addOrderToCalendar = async (order) => {
  if (!window.electronAPI || !order.scheduled_date) return

  try {
    // Znajdź klienta dla nazwy wydarzenia
    const client = props.clients.find(c => c.id === order.client_id)
    const clientName = client ? getClientName(client) : 'Nieznany klient'

    // Dodaj wydarzenie do kalendarza
    const eventData = {
      title: `${order.order_number}: ${order.title}`,
      description: `Zlecenie serwisowe dla ${clientName}\n\nOpis: ${order.description || 'Brak opisu'}`,
      start_date: order.scheduled_date,
      end_date: order.scheduled_date, // Można dodać szacowany czas zakończenia
      type: 'order',
      related_id: order.id,
      client_id: order.client_id,
      status: 'active'
    }

    await window.electronAPI.database.run(
      `INSERT INTO calendar_events 
       (title, description, start_date, end_date, type, related_id, client_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventData.title, eventData.description, eventData.start_date, eventData.end_date,
        eventData.type, eventData.related_id, eventData.client_id, eventData.status
      ]
    )

    console.log('Zlecenie automatycznie dodane do kalendarza')
  } catch (error) {
    console.error('Błąd podczas dodawania zlecenia do kalendarza:', error)
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.main_category_id) {
    errors.value.main_category_id = 'Wybór typu zlecenia jest wymagany'
  }

  if (!form.client_id) {
    errors.value.client_id = 'Wybór klienta jest wymagany'
  }

  // Wymagaj urządzenia, jeśli klient ma urządzenia w bazie
  try {
    const anyDevices = clientDevices.value && clientDevices.value.length > 0
    if (anyDevices && !form.device_id) {
      errors.value.device_id = 'Wybór urządzenia jest wymagany (klient ma urządzenia w systemie)'
    }
  } catch (_) { /* ignore */ }

  if (!form.title?.trim()) {
    errors.value.title = 'Tytuł zlecenia jest wymagany'
  }

  return Object.keys(errors.value).length === 0
}

const saveOrder = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    const orderData = {
      ...form,
      // Ujednolicenie typów ID
      client_id: form.client_id ? parseInt(form.client_id) : null,
      device_id: form.device_id ? parseInt(form.device_id) : null,
    // Konwertuj scheduled_date do formatu ISO bez konwersji UTC (zachowaj lokalny czas)
    // datetime-local zwraca format YYYY-MM-DDTHH:MM, dodajemy :00 dla sekund
    scheduled_date: form.scheduled_date 
      ? (form.scheduled_date.includes('T') 
          ? form.scheduled_date + (form.scheduled_date.length === 16 ? ':00' : '') 
          : form.scheduled_date)
      : null,
      // Konwertuj service_categories do JSON string
      service_categories: JSON.stringify(form.service_categories),
      // Zapewnij że koszty są liczbami
      parts_cost: parseFloat(form.parts_cost) || 0,
      labor_cost: parseFloat(form.labor_cost) || 0,
      travel_cost: parseFloat(form.travel_cost) || 0,
      total_cost: parseFloat(form.total_cost) || 0,
      estimated_hours: form.estimated_hours || null,
      actual_hours: form.actual_hours || null
    }

    let savedOrder

    if (window.electronAPI) {
      if (props.isEdit) {
        // Aktualizuj zlecenie
        await window.electronAPI.database.run(
          `UPDATE service_orders SET 
           client_id = ?, device_id = ?, type = ?, service_categories = ?, status = ?, priority = ?,
           title = ?, description = ?, scheduled_date = ?, estimated_hours = ?, actual_hours = ?,
           parts_cost = ?, labor_cost = ?, travel_cost = ?, total_cost = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            orderData.client_id, orderData.device_id, orderData.type, orderData.service_categories, orderData.status, orderData.priority,
            orderData.title, orderData.description, orderData.scheduled_date, orderData.estimated_hours, orderData.actual_hours,
            orderData.parts_cost, orderData.labor_cost, orderData.travel_cost, orderData.total_cost, orderData.notes,
            props.order.id
          ]
        )
        savedOrder = { ...orderData, id: props.order.id }
      } else {
        // Dodaj nowe zlecenie
        // Uzupełnij kolumny wyświetleniowe klienta, aby uniknąć "Klient bez nazwy" przy ewentualnym braku JOIN
        const selectedClient = props.clients.find(c => c.id === orderData.client_id)
        const displayClientName = (() => {
          if (!selectedClient) return null
          const company = (selectedClient.company_name || '').trim()
          if (company) return company
          const first = (selectedClient.first_name || '').trim()
          const last = (selectedClient.last_name || '').trim()
          const full = `${first} ${last}`.trim()
          if (full) return full
          if (selectedClient.email) return selectedClient.email.split('@')[0]
          return selectedClient.address_city || (selectedClient.id ? `Klient #${selectedClient.id}` : null)
        })()
        const displayPhone = selectedClient?.phone || null
        const displayEmail = selectedClient?.email || null
        const displayAddress = (() => {
          if (!selectedClient) return null
          const addr = (selectedClient.address || '').trim()
          if (addr) return addr
          const street = (selectedClient.address_street || '').trim()
          const city = (selectedClient.address_city || '').trim()
          const postal = (selectedClient.address_postal_code || '').trim()
          const parts = [street, [postal, city].filter(Boolean).join(' ')].filter(Boolean)
          return parts.length ? parts.join(', ') : null
        })()

        const result = await window.electronAPI.database.run(
          `INSERT INTO service_orders 
           (order_number, client_id, device_id, type, service_categories, status, priority, title, description, 
           scheduled_date, estimated_hours, parts_cost, labor_cost, travel_cost, total_cost, notes, client_name, client_phone, client_email, address, desktop_sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            orderData.order_number, orderData.client_id, orderData.device_id, orderData.type, orderData.service_categories, orderData.status, orderData.priority,
            orderData.title, orderData.description, orderData.scheduled_date, orderData.estimated_hours,
            orderData.parts_cost, orderData.labor_cost, orderData.travel_cost, orderData.total_cost, orderData.notes,
            displayClientName, displayPhone, displayEmail, displayAddress
          ]
        )
        // Dodatkowa gwarancja: uzupełnij pola wyświetleniowe klienta bezpośrednio z tabeli clients
        try {
          if (orderData.client_id && result?.id) {
            await window.electronAPI.database.run(
              `UPDATE service_orders SET
                 client_name = COALESCE((SELECT CASE 
                                                 WHEN c.company_name IS NOT NULL AND c.company_name <> '' THEN c.company_name 
                                                 ELSE TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) 
                                               END 
                                         FROM clients c WHERE c.id = ?), client_name),
                 client_phone = COALESCE((SELECT phone FROM clients WHERE id = ?), client_phone),
                 client_email = COALESCE((SELECT email FROM clients WHERE id = ?), client_email),
                 address = COALESCE((SELECT TRIM(
                                               COALESCE(c.address_street,'') ||
                                               CASE WHEN c.address_postal_code IS NOT NULL OR c.address_city IS NOT NULL THEN ', ' ELSE '' END ||
                                               COALESCE(c.address_postal_code,'') || ' ' || COALESCE(c.address_city,'')
                                             ) FROM clients c WHERE c.id = ?), address),
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [orderData.client_id, orderData.client_id, orderData.client_id, orderData.client_id, result.id]
            )
          }
        } catch (_) { /* soft-fail */ }
        savedOrder = { ...orderData, id: result.lastID, client_name: displayClientName, client_phone: displayPhone, client_email: displayEmail, address: displayAddress }
      }
    } else {
      // Fallback dla trybu przeglądarki
      savedOrder = {
        ...orderData,
        id: props.isEdit ? props.order.id : Date.now(),
        created_at: props.isEdit ? props.order.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    // AUTOMATYZACJA: Dodaj zlecenie do kalendarza
    await addOrderToCalendar(savedOrder)

    emit('saved', savedOrder)
  } catch (err) {
    console.error('Error saving order:', err)
    errors.value.general = 'Błąd podczas zapisywania zlecenia'
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (props.isEdit) return

  const hasPrefill = props.prefill && typeof props.prefill === 'object' && Object.keys(props.prefill).length > 0

  if (!hasPrefill) {
    // Nowe zlecenie bez prefillu — wyczyść formularz do wartości domyślnych
    Object.keys(form).forEach(key => {
      if (key === 'status') {
        form[key] = 'new'
      } else if (key === 'priority') {
        form[key] = 'medium'
      } else if (key === 'parts_cost' || key === 'labor_cost' || key === 'travel_cost' || key === 'total_cost') {
        form[key] = 0
      } else if (key === 'service_categories') {
        form[key] = []
      } else if (typeof form[key] === 'string') {
        form[key] = ''
      } else {
        form[key] = null
      }
    })
  } else {
    // Prefill już wstawiony – uzupełnij tylko brakujące wartości domyślne
    if (!form.status) form.status = 'new'
    if (!form.priority) form.priority = 'medium'
    if (!Array.isArray(form.service_categories)) form.service_categories = []
    form.parts_cost = Number.isFinite(Number(form.parts_cost)) ? Number(form.parts_cost) : 0
    form.labor_cost = Number.isFinite(Number(form.labor_cost)) ? Number(form.labor_cost) : 0
    form.travel_cost = Number.isFinite(Number(form.travel_cost)) ? Number(form.travel_cost) : 0
    form.total_cost = Number.isFinite(Number(form.total_cost)) ? Number(form.total_cost) : 0
  }

  if (!form.order_number) {
    generateOrderNumber()
  }
})

// Watchers
watch([() => form.parts_cost, () => form.labor_cost], () => {
  calculateTotalCost()
})

watch(() => props.prefill, (nextPrefill) => {
  if (!props.isEdit && nextPrefill) {
    applyPrefill(nextPrefill)
  }
})


</script> 