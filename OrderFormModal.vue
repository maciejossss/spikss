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

              <!-- Typ zlecenia -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Typ zlecenia *
                </label>
                <select 
                  v-model="form.type" 
                  required 
                  class="input-field"
                  :class="{ 'border-red-300': errors.type }"
                >
                  <option value="">Wybierz typ zlecenia</option>
                  <option value="breakdown">Awaria</option>
                  <option value="maintenance">Konserwacja</option>
                  <option value="installation">Instalacja</option>
                  <option value="inspection">Przegląd</option>
                </select>
                <p v-if="errors.type" class="mt-1 text-sm text-red-600">{{ errors.type }}</p>
              </div>

              <!-- Kategorie usług -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Kategorie usług *
                </label>
                <div class="space-y-3">
                  <!-- Info o wyborze kategorii -->
                  <div class="text-sm text-secondary-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                    Wybierz kategorie usług, które będą wykonywane w ramach tego zlecenia. Możesz wybrać kilka kategorii naraz.
                  </div>
                  
                  <!-- Przyciski kategorii -->
                  <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div
                      v-for="category in serviceCategories"
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
                          <div class="font-semibold">{{ category.id }}</div>
                          <div class="text-xs">{{ category.name }}</div>
                        </div>
                        <i :class="[
                          'fas',
                          (form.service_categories || []).includes(category.id) ? 'fa-check-circle text-primary-600' : 'fa-circle text-secondary-400'
                        ]"></i>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Podsumowanie wybranych kategorii -->
                  <div v-if="(form.service_categories || []).length > 0" class="text-sm text-secondary-600">
                    <strong>Wybrane kategorie ({{ (form.service_categories || []).length }}):</strong>
                    {{ (form.service_categories || []).sort().join(', ') }}
                  </div>
                  
                  <!-- Błąd walidacji -->
                  <p v-if="errors.service_categories" class="text-sm text-red-600">{{ errors.service_categories }}</p>
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
                  Urządzenie
                </label>
                <select
                  v-model="form.device_id"
                  class="input-field"
                  :disabled="!form.client_id"
                >
                  <option value="">Wybierz urządzenie (opcjonalne)</option>
                  <option v-for="device in clientDevices" :key="device.id" :value="device.id">
                    {{ device.name }} ({{ device.manufacturer }} {{ device.model }})
                  </option>
                </select>
                <p v-if="!form.client_id" class="mt-1 text-xs text-secondary-500">
                  Najpierw wybierz klienta
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
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
  }
})

const emit = defineEmits(['close', 'saved'])

const isLoading = ref(false)
const errors = ref({})

const form = reactive({
  order_number: '',
  client_id: '',
  device_id: '',
  type: '',
  status: 'new',
  priority: 'medium',
  title: '',
  description: '',
  scheduled_date: '',
  estimated_hours: null,
  actual_hours: null,
  parts_cost: 0,
  labor_cost: 0,
  total_cost: 0,
  notes: '',
  service_categories: []
})

// Kategorie usług A-I
const serviceCategories = ref([
  { id: 'A', name: 'Przeglądy i konserwacje' },
  { id: 'B', name: 'Diagnostyka i naprawy' },
  { id: 'C', name: 'Pomiary i regulacje' },
  { id: 'D', name: 'Stacje uzdatniania wody i badania' },
  { id: 'E', name: 'Usługi hydrauliczne' },
  { id: 'F', name: 'Serwis przemysłowy' },
  { id: 'G', name: 'Pogotowie serwisowe' },
  { id: 'H', name: 'Części i materiały' },
  { id: 'I', name: 'Usługi specjalistyczne i techniczne' }
])

// Computed properties
const clientDevices = computed(() => {
  if (!form.client_id) return []
  return props.devices.filter(device => device.client_id === parseInt(form.client_id))
})

// Helper methods
const getClientName = (client) => {
  return client.type === 'business' 
    ? client.company_name 
    : `${client.first_name} ${client.last_name}`
}

const generateOrderNumber = () => {
  if (!props.isEdit && !form.order_number) {
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString().slice(-6)
    form.order_number = `SRV-${year}-${timestamp}`
  }
}

// Generuj numer zlecenia natychmiast
onMounted(() => {
  generateOrderNumber()
})

const calculateTotalCost = () => {
  const parts = parseFloat(form.parts_cost) || 0
  const labor = parseFloat(form.labor_cost) || 0
  form.total_cost = parts + labor
}

const onClientChange = () => {
  // Reset urządzenia gdy zmienia się klient
  form.device_id = ''
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
    
    // Konwertuj daty do formatu datetime-local
    if (newOrder.scheduled_date) {
      const date = new Date(newOrder.scheduled_date)
      form.scheduled_date = date.toISOString().slice(0, 16)
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

  if (!form.type) {
    errors.value.type = 'Wybór typu zlecenia jest wymagany'
  }

  if (!form.service_categories || form.service_categories.length === 0) {
    errors.value.service_categories = 'Wybierz przynajmniej jedną kategorię usług'
  }

  if (!form.client_id) {
    errors.value.client_id = 'Wybór klienta jest wymagany'
  }

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
      // Konwertuj device_id na null jeśli puste
      device_id: form.device_id || null,
      // Konwertuj scheduled_date do ISO string lub null
      scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null,
      // Konwertuj service_categories do JSON string
      service_categories: JSON.stringify(form.service_categories),
      // Zapewnij że koszty są liczbami
      parts_cost: parseFloat(form.parts_cost) || 0,
      labor_cost: parseFloat(form.labor_cost) || 0,
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
           parts_cost = ?, labor_cost = ?, total_cost = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            orderData.client_id, orderData.device_id, orderData.type, orderData.service_categories, orderData.status, orderData.priority,
            orderData.title, orderData.description, orderData.scheduled_date, orderData.estimated_hours, orderData.actual_hours,
            orderData.parts_cost, orderData.labor_cost, orderData.total_cost, orderData.notes,
            props.order.id
          ]
        )
        savedOrder = { ...orderData, id: props.order.id }
      } else {
        // Dodaj nowe zlecenie
        const result = await window.electronAPI.database.run(
          `INSERT INTO service_orders 
           (order_number, client_id, device_id, type, service_categories, status, priority, title, description, 
            scheduled_date, estimated_hours, parts_cost, labor_cost, total_cost, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderData.order_number, orderData.client_id, orderData.device_id, orderData.type, orderData.service_categories, orderData.status, orderData.priority,
            orderData.title, orderData.description, orderData.scheduled_date, orderData.estimated_hours,
            orderData.parts_cost, orderData.labor_cost, orderData.total_cost, orderData.notes
          ]
        )
        savedOrder = { ...orderData, id: result.lastID }
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
  if (!props.isEdit) {
    // Reset formularza dla nowego zlecenia
    Object.keys(form).forEach(key => {
      if (key === 'status') {
        form[key] = 'new'
      } else if (key === 'priority') {
        form[key] = 'medium'
      } else if (key === 'parts_cost' || key === 'labor_cost' || key === 'total_cost') {
        form[key] = 0
      } else if (typeof form[key] === 'string') {
        form[key] = ''
      } else {
        form[key] = null
      }
    })
    
    // Generuj numer zlecenia
    generateOrderNumber()
  }
})

// Watchers
watch([() => form.parts_cost, () => form.labor_cost], () => {
  calculateTotalCost()
})


</script> 