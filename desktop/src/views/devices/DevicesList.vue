<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Urządzenia</h1>
        <p class="text-secondary-600">Zarządzaj bazą urządzeń</p>
      </div>
      <button
        @click="showAddModal = true"
        class="btn-primary"
      >
        <i class="fas fa-plus mr-2"></i>
        Dodaj urządzenie
      </button>
    </div>

    <!-- Filtry i wyszukiwanie -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Wyszukiwanie -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Szukaj
          </label>
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nazwa, model, numer seryjny..."
              class="input-field pl-10"
            />
          </div>
        </div>

        <!-- Filtr kategorii -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Kategoria
          </label>
          <select v-model="filterCategory" class="input-field">
            <option value="">Wszystkie</option>
            <option value="heating">Ogrzewanie</option>
            <option value="ventilation">Wentylacja</option>
            <option value="air_conditioning">Klimatyzacja</option>
            <option value="other">Inne</option>
          </select>
        </div>

        <!-- Filtr klienta -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Klient
          </label>
          <select v-model="filterClient" class="input-field">
            <option value="">Wszyscy klienci</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.type === 'business' ? client.company_name : `${client.first_name} ${client.last_name}` }}
            </option>
          </select>
        </div>

        <!-- Filtr statusu -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Status
          </label>
          <select v-model="filterActive" class="input-field">
            <option value="">Wszystkie</option>
            <option value="1">Aktywne</option>
            <option value="0">Nieaktywne</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista urządzeń -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200">
      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-2xl text-primary-600 mb-4"></i>
        <p class="text-secondary-600">Ładowanie urządzeń...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-8 text-center">
        <i class="fas fa-exclamation-triangle text-2xl text-red-500 mb-4"></i>
        <p class="text-red-600">{{ error }}</p>
        <button @click="loadDevices" class="btn-secondary mt-4">
          <i class="fas fa-redo mr-2"></i>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="paginatedDevices.length === 0" class="p-8 text-center">
        <i class="fas fa-tools text-4xl text-secondary-300 mb-4"></i>
        <p class="text-secondary-600 mb-4">
          {{ searchQuery || filterCategory || filterClient || filterActive !== '' ? 'Brak urządzeń spełniających kryteria' : 'Brak urządzeń w systemie' }}
        </p>
        <button v-if="!searchQuery && !filterCategory && !filterClient && filterActive === ''" @click="showAddModal = true" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj pierwsze urządzenie
        </button>
      </div>

      <!-- Tabela urządzeń -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200">
          <thead class="bg-secondary-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Urządzenie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Klient
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Model/S.N.
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Ostatni serwis
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-secondary-200">
            <tr v-for="device in paginatedDevices" :key="device.id" class="hover:bg-secondary-50">
              <!-- ID -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {{ device.id }}
              </td>
              <!-- Urządzenie -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <i class="fas fa-tools text-primary-600"></i>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-secondary-900">
                      {{ device.name }}
                    </div>
                    <div class="text-sm text-secondary-500">
                      {{ device.manufacturer }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Klient -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">
                  {{ getClientName(device.client_id) }}
                </div>
              </td>

              <!-- Model/Serial -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">{{ device.model || '-' }}</div>
                <div class="text-sm text-secondary-500">S.N: {{ device.serial_number || '-' }}</div>
              </td>

              <!-- Ostatni serwis -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">
                  {{ device.last_service_date ? formatDate(device.last_service_date) : 'Brak danych' }}
                </div>
                <div v-if="device.next_service_date" class="text-sm text-secondary-500">
                  Następny: {{ formatDate(device.next_service_date) }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ device.is_active ? 'Aktywne' : 'Nieaktywne' }}
                </span>
              </td>

              <!-- Akcje -->
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewDevice(device.id)"
                    class="text-primary-600 hover:text-primary-900"
                    title="Zobacz szczegóły"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button
                    @click="editDevice(device)"
                    class="text-secondary-600 hover:text-secondary-900"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="deleteDevice(device)"
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

      <!-- Paginacja -->
      <div v-if="totalPages > 1" class="bg-white px-4 py-3 border-t border-secondary-200 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="currentPage > 1 && (currentPage--)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <button
              @click="currentPage < totalPages && (currentPage++)"
              :disabled="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-secondary-700">
                Pokazano
                <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                do
                <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredDevices.length) }}</span>
                z
                <span class="font-medium">{{ filteredDevices.length }}</span>
                wyników
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="currentPage > 1 && (currentPage--)"
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="typeof page === 'number' && (currentPage = page)"
                  :class="[
                    page === currentPage
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-secondary-300 text-secondary-500 hover:bg-secondary-50',
                    typeof page === 'number' ? 'cursor-pointer' : 'cursor-default'
                  ]"
                  class="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                >
                  {{ page }}
                </button>
                
                <button
                  @click="currentPage < totalPages && (currentPage++)"
                  :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania/edycji urządzenia -->
    <DeviceFormModal
      v-if="showAddModal || showEditModal"
      :device="editingDevice"
      :clients="clients"
      :is-edit="showEditModal"
      @close="closeModal"
      @saved="onDeviceSaved"
    />

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń urządzenie"
      :message="`Czy na pewno chcesz usunąć urządzenie ${deletingDevice?.name}?`"
      confirm-text="Usuń"
      confirm-class="btn-danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import DeviceFormModal from './DeviceFormModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'

const router = useRouter()

// Reactive data
const devices = ref([])
const clients = ref([])
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const filterCategory = ref('')
const filterClient = ref('')
const filterActive = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingDevice = ref(null)
const deletingDevice = ref(null)

// Computed properties
const filteredDevices = computed(() => {
  let filtered = devices.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(device => {
      const name = device.name?.toLowerCase() || ''
      const manufacturer = device.manufacturer?.toLowerCase() || ''
      const model = device.model?.toLowerCase() || ''
      const serialNumber = device.serial_number?.toLowerCase() || ''
      
      return name.includes(query) || manufacturer.includes(query) || model.includes(query) || serialNumber.includes(query)
    })
  }

  // Category filter (placeholder - można rozbudować gdy dodamy kategorie)
  if (filterCategory.value) {
    // Implementacja filtra kategorii
    filtered = filtered.filter(device => device.category === filterCategory.value)
  }

  // Client filter
  if (filterClient.value) {
    filtered = filtered.filter(device => device.client_id === parseInt(filterClient.value))
  }

  // Active filter
  if (filterActive.value !== '') {
    filtered = filtered.filter(device => device.is_active === parseInt(filterActive.value))
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredDevices.value.length / itemsPerPage.value))

const paginatedDevices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredDevices.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...', total)
    }
  }

  return pages.filter(page => page !== '...' || pages.indexOf(page) === pages.lastIndexOf(page))
})

// Methods
const loadDevices = async () => {
  isLoading.value = true
  error.value = ''

  try {
    // Sprawdź dostępność Electron API
    if (!window.electronAPI) {
      // Fallback - demo data dla przeglądarki
      devices.value = [
        {
          id: 1,
          client_id: 1,
          name: 'Kocioł gazowy',
          manufacturer: 'Viessmann',
          model: 'Vitopend 100-W',
          serial_number: 'VIT2024001',
          production_year: 2020,
          power_rating: '24 kW',
          fuel_type: 'Gaz ziemny',
          installation_date: '2020-03-15',
          last_service_date: '2024-01-15',
          next_service_date: '2025-01-15',
          warranty_end_date: '2025-03-15',
          technical_data: 'Sprawność 92%, klasa energetyczna A',
          notes: 'Regularny serwis co 12 miesięcy',
          is_active: 1,
          created_at: '2020-03-15T10:30:00Z'
        },
        {
          id: 2,
          client_id: 2,
          name: 'Klimatyzator',
          manufacturer: 'Daikin',
          model: 'FTXM35N',
          serial_number: 'DAI2024002',
          production_year: 2023,
          power_rating: '3.5 kW',
          fuel_type: 'Elektryczny',
          installation_date: '2023-06-20',
          last_service_date: '2024-06-20',
          next_service_date: '2025-06-20',
          warranty_end_date: '2028-06-20',
          technical_data: 'Inverter, R32, klasa A+++',
          notes: 'Serwis co 12 miesięcy, wymiana filtrów co 3 miesiące',
          is_active: 1,
          created_at: '2023-06-20T14:15:00Z'
        }
      ]
      return
    }

    // Pobierz urządzenia z bazy danych
    const result = await window.electronAPI.database.query(
      `SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type
       FROM devices d
       LEFT JOIN clients c ON d.client_id = c.id
       ORDER BY d.created_at DESC`
    )

    devices.value = result || []
  } catch (err) {
    console.error('Error loading devices:', err)
    error.value = 'Błąd podczas ładowania urządzeń'
  } finally {
    isLoading.value = false
  }
}

const loadClients = async () => {
  try {
    if (!window.electronAPI) {
      // Demo data dla przeglądarki
      clients.value = [
        {
          id: 1,
          type: 'individual',
          first_name: 'Jan',
          last_name: 'Kowalski'
        },
        {
          id: 2,
          type: 'business',
          company_name: 'ABC Sp. z o.o.'
        }
      ]
      return
    }

    const result = await window.electronAPI.database.query(
      'SELECT id, type, first_name, last_name, company_name FROM clients WHERE is_active = 1 ORDER BY created_at DESC'
    )
    clients.value = result || []
  } catch (err) {
    console.error('Error loading clients:', err)
  }
}

const getClientName = (clientId) => {
  const client = clients.value.find(c => c.id === clientId)
  if (!client) return 'Nieznany klient'
  
  return client.type === 'business' 
    ? client.company_name 
    : `${client.first_name} ${client.last_name}`
}

const viewDevice = (deviceId) => {
  router.push(`/devices/${deviceId}`)
}

const editDevice = (device) => {
  editingDevice.value = { ...device }
  showEditModal.value = true
}

const deleteDevice = (device) => {
  deletingDevice.value = device
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    if (window.electronAPI) {
      await window.electronAPI.database.run(
        'UPDATE devices SET is_active = 0 WHERE id = ?',
        [deletingDevice.value.id]
      )
    }

    // Usuń z lokalnej listy lub oznacz jako nieaktywny
    const index = devices.value.findIndex(d => d.id === deletingDevice.value.id)
    if (index !== -1) {
      devices.value[index].is_active = 0
    }

    showDeleteModal.value = false
    deletingDevice.value = null
  } catch (err) {
    console.error('Error deleting device:', err)
    error.value = 'Błąd podczas usuwania urządzenia'
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingDevice.value = null
}

const onDeviceSaved = (savedDevice) => {
  if (showEditModal.value) {
    // Aktualizuj istniejące urządzenie
    const index = devices.value.findIndex(d => d.id === savedDevice.id)
    if (index !== -1) {
      devices.value[index] = savedDevice
    }
  } else {
    // Dodaj nowe urządzenie
    devices.value.unshift(savedDevice)
  }
  closeModal()
}

// Watch for modal opening to refresh clients
watch(showAddModal, (newValue) => {
  if (newValue) {
    loadClients() // Odśwież klientów przed otwarciem formularza
  }
})

watch(showEditModal, (newValue) => {
  if (newValue) {
    loadClients() // Odśwież klientów przed otwarciem formularza
  }
})

// Watchers
watch([searchQuery, filterCategory, filterClient, filterActive], () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadClients()
  loadDevices()
  
  // Odśwież klientów przy focus okna (gdy użytkownik wraca do aplikacji)
  window.addEventListener('focus', loadClients)
})

// Odświeżaj klientów przy każdej aktywacji strony (np. gdy użytkownik wraca z zakładki Klientów)
onActivated(() => {
  loadClients()
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('focus', loadClients)
})
</script> 