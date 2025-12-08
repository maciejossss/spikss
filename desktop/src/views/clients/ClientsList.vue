<template>
  <div class="p-6 h-full overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Klienci</h1>
        <p class="text-secondary-600">Zarządzaj bazą klientów</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="showDeviceModal = true"
          class="btn-secondary"
        >
          <i class="fas fa-tools mr-2"></i>
          Dodaj urządzenie
        </button>
        <button
          @click="showAddModal = true"
          class="btn-primary"
        >
          <i class="fas fa-plus mr-2"></i>
          Dodaj klienta
        </button>
      </div>
    </div>

    <!-- Filtry i wyszukiwanie -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="form-label">Szukaj</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nazwa, telefon, email..."
            class="form-input"
          />
        </div>
        <div>
          <label class="form-label">Typ klienta</label>
          <select v-model="filterType" class="form-input">
            <option value="">Wszystkie</option>
            <option value="individual">Klient prywatny</option>
            <option value="business">Firma</option>
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filterActive" class="form-input">
            <option value="">Wszystkie</option>
            <option value="1">Aktywne</option>
            <option value="0">Nieaktywne</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabela klientów -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-3xl text-primary-600 mb-4"></i>
        <p class="text-secondary-600">Ładowanie klientów...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-8 text-center">
        <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-4"></i>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="loadClients" class="btn-primary">
          <i class="fas fa-redo mr-2"></i>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredClients.length === 0 && !searchQuery" class="p-12 text-center">
        <i class="fas fa-users text-6xl text-secondary-300 mb-4"></i>
        <h3 class="text-lg font-medium text-secondary-900 mb-2">Brak klientów</h3>
        <p class="text-secondary-600 mb-4">Dodaj pierwszego klienta do systemu</p>
        <button @click="showAddModal = true" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj klienta
        </button>
      </div>

      <!-- No results -->
      <div v-else-if="filteredClients.length === 0" class="p-8 text-center">
        <i class="fas fa-search text-4xl text-secondary-300 mb-4"></i>
        <p class="text-secondary-600">Brak wyników dla "{{ searchQuery }}"</p>
      </div>

      <!-- Tabela z danymi -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-secondary-50 border-b border-secondary-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Klient
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Kontakt
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Adres
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Urządzenia
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer select-none"
                  @click="toggleSort('next_service_days')">
                Następny serwis
                <span v-if="sortBy === 'next_service_days'" class="ml-1">
                  <i :class="sortDir === 'asc' ? 'fas fa-sort-amount-up-alt' : 'fas fa-sort-amount-down' "></i>
                </span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Utworzono
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-secondary-200">
            <tr
              v-for="client in paginatedClients"
              :key="client.id"
              class="hover:bg-secondary-50 cursor-pointer"
              @click="viewClient(client.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {{ client.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-user text-primary-600"></i>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-secondary-900">
                      <template v-if="client.type === 'business'">
                        {{ client.company_name }}
                      </template>
                      <template v-else>
                        {{ client.first_name }} {{ client.last_name }}
                      </template>
                    </div>
                    <div class="text-sm text-secondary-500">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            :class="client.type === 'business' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'">
                        {{ client.type === 'business' ? 'Firma' : 'Prywatny' }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">{{ client.phone || '-' }}</div>
                <div class="text-sm text-secondary-500">{{ client.email || '-' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">
                  <template v-if="client.address_street">
                    {{ client.address_street }}
                  </template>
                  <template v-else>-</template>
                </div>
                <div class="text-sm text-secondary-500">
                  <template v-if="client.address_city">
                    {{ client.address_postal_code }} {{ client.address_city }}
                  </template>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="clientDevices[client.id] && clientDevices[client.id].length > 0" class="space-y-2">
                  <div v-for="device in clientDevices[client.id].slice(0, 2)" :key="device.id" 
                       class="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div class="text-sm font-medium text-blue-900">{{ device.name }}</div>
                    <div class="text-xs text-blue-700">
                      {{ device.model }} • {{ device.fuel_type }}
                    </div>
                    <div class="text-xs text-blue-600 mt-1">
                      <i class="fas fa-tools mr-1"></i>
                      Ostatni przegląd: {{ formatDate(device.last_service_date) }}
                    </div>
                  </div>
                  <div v-if="clientDevices[client.id].length > 2" 
                       class="text-xs text-secondary-500 text-center">
                    +{{ clientDevices[client.id].length - 2 }} więcej urządzeń
                  </div>
                </div>
                <div v-else class="text-xs text-secondary-400 italic text-center py-2">
                  Brak urządzeń
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ client.is_active ? 'Aktywny' : 'Nieaktywny' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <template v-if="clientNextServiceInfo(client.id)">
                  <span>{{ formatDate(clientNextServiceInfo(client.id).date) }}</span>
                  <span class="text-secondary-500 ml-1"
                        v-if="clientNextServiceInfo(client.id).days >= 0">(za {{ clientNextServiceInfo(client.id).days }} dni)</span>
                  <span class="text-red-600 ml-1" v-else>(po terminie)</span>
                </template>
                <template v-else>
                  <span class="text-secondary-400">—</span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {{ formatDate(client.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <button
                    @click.stop="addDeviceForClient(client)"
                    class="text-green-600 hover:text-green-900"
                    title="Dodaj urządzenie"
                  >
                    <i class="fas fa-plus"></i>
                  </button>
                  <button
                    @click.stop="editClient(client)"
                    class="text-primary-600 hover:text-primary-900"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click.stop="deleteClient(client)"
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
          <div class="flex justify-between flex-1 sm:hidden">
            <button
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 disabled:opacity-50"
            >
              Poprzednia
            </button>
            <button
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 disabled:opacity-50"
            >
              Następna
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-secondary-700">
                Wyniki <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                do <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredClients.length) }}</span>
                z <span class="font-medium">{{ filteredClients.length }}</span>
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="currentPage = Math.max(1, currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="currentPage = page"
                  :class="[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-secondary-300 text-secondary-500 hover:bg-secondary-50'
                  ]"
                >
                  {{ page }}
                </button>
                <button
                  @click="currentPage = Math.min(totalPages, currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania/edycji klienta -->
    <ClientFormModal
      v-if="showAddModal || showEditModal"
      :client="editingClient"
      :is-edit="showEditModal"
      @close="closeModal"
      @saved="onClientSaved"
    />

    <!-- Modal dodawania urządzenia -->
    <DeviceFormModal
      v-if="showDeviceModal"
      :device="null"
      :clients="clients"
      :is-edit="false"
      :default-client-id="selectedClientIdForDevice"
      @close="closeDeviceModal"
      @saved="onDeviceSaved"
    />

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń klienta"
      :message="`Czy na pewno chcesz usunąć klienta ${deletingClient?.first_name} ${deletingClient?.last_name || deletingClient?.company_name}?`"
      confirm-text="Usuń"
      confirm-class="btn-danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import ClientFormModal from './ClientFormModal.vue'
import DeviceFormModal from '../devices/DeviceFormModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'

const router = useRouter()

// Reactive data
const clients = ref([])
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const filterType = ref('')
const filterActive = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref('')
const sortDir = ref('asc')

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showDeviceModal = ref(false)
const editingClient = ref(null)
const deletingClient = ref(null)
const selectedClientIdForDevice = ref(null)

// Client devices data
const clientDevices = ref({})

// Computed properties
const filteredClients = computed(() => {
  let filtered = clients.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(client => {
      const name = client.type === 'business' 
        ? client.company_name?.toLowerCase() || ''
        : `${client.first_name} ${client.last_name}`.toLowerCase()
      const phone = client.phone?.toLowerCase() || ''
      const email = client.email?.toLowerCase() || ''
      
      return name.includes(query) || phone.includes(query) || email.includes(query)
    })
  }

  // Type filter
  if (filterType.value) {
    filtered = filtered.filter(client => client.type === filterType.value)
  }

  // Active filter
  if (filterActive.value !== '') {
    filtered = filtered.filter(client => client.is_active === parseInt(filterActive.value))
  }

  // Sorting
  if (sortBy.value === 'next_service_days') {
    const info = buildNextServiceIndex()
    filtered = [...filtered].sort((a,b) => {
      const aa = info[a.id]?.days
      const bb = info[b.id]?.days
      const va = (aa === undefined || aa === null) ? Number.POSITIVE_INFINITY : aa
      const vb = (bb === undefined || bb === null) ? Number.POSITIVE_INFINITY : bb
      return sortDir.value === 'asc' ? (va - vb) : (vb - va)
    })
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredClients.value.length / itemsPerPage.value))

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredClients.value.slice(start, end)
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
const loadClients = async () => {
  isLoading.value = true
  error.value = ''

  try {
    // UPROSZCZENIE: Najpierw sprawdź czy jest Electron, jeśli nie - natychmiast demo dane
    if (!window.electronAPI) {
      // Demo dane - ładują się natychmiast
      clients.value = [
        {
          id: 1,
          type: 'private',
          first_name: 'Jan',
          last_name: 'Kowalski',
          email: 'jan.kowalski@email.com',
          phone: '123-456-789',
          address_city: 'Warszawa',
          address_street: 'ul. Przykładowa 1',
          address_postal_code: '00-001',
          is_active: 1,
          created_at: '2024-07-01T10:00:00Z'
        },
        {
          id: 2,
          type: 'business',
          company_name: 'ABC Sp. z o.o.',
          nip: '1234567890',
          email: 'kontakt@abc.pl',
          phone: '987-654-321',
          address_city: 'Kraków',
          address_street: 'ul. Biznesowa 10',
          address_postal_code: '30-001',
          is_active: 1,
          created_at: '2024-07-02T09:30:00Z'
        },
        {
          id: 3,
          type: 'individual',
          first_name: 'Anna',
          last_name: 'Nowak',
          email: 'anna.nowak@email.com',
          phone: '555-666-777',
          address_city: 'Gdańsk',
          address_street: 'ul. Morska 5',
          address_postal_code: '80-001',
          is_active: 1,
          created_at: '2024-07-03T14:15:00Z'
        }
      ]
      
      // Demo urządzenia
      clientDevices.value = {
        1: [
          { 
            id: 1, 
            name: 'Kocioł gazowy Viessmann', 
            model: 'Vitopend 111',
            fuel_type: 'Gaz ziemny',
            last_service_date: '2024-06-15',
            client_id: 1 
          },
          { 
            id: 2, 
            name: 'Pompa ciepła LG', 
            model: 'Therma V 12kW',
            fuel_type: 'Energia elektryczna',
            last_service_date: '2024-05-20',
            client_id: 1 
          }
        ],
        2: [
          { 
            id: 3, 
            name: 'System grzewczy przemysłowy', 
            model: 'Bosch UNI 350',
            fuel_type: 'Olej opałowy',
            last_service_date: '2024-04-10',
            client_id: 2 
          }
        ],
        3: []
      }
      
      isLoading.value = false
      return
    }

    // Tylko jeśli jest Electron - próbuj bazę danych
    const result = await window.electronAPI.database.query(
      'SELECT * FROM clients ORDER BY created_at DESC'
    )
    clients.value = result || []
    
    // Załaduj urządzenia dla każdego klienta
    await loadClientDevices()
  } catch (err) {
    console.error('Error loading clients:', err)
    error.value = 'Błąd podczas ładowania klientów'
    
    // Fallback na demo dane nawet przy błędzie
    clients.value = [
      {
        id: 1,
        type: 'individual',
        first_name: 'Jan',
        last_name: 'Kowalski',
        email: 'jan.kowalski@email.com',
        phone: '123-456-789',
        address_city: 'Warszawa',
        is_active: 1,
        created_at: '2024-07-01T10:00:00Z'
      }
    ]
    clientDevices.value = {}
  } finally {
    isLoading.value = false
  }
}

const loadClientDevices = async () => {
  try {
    if (!window.electronAPI) return
    
    const devices = await window.electronAPI.database.query(
      'SELECT * FROM devices WHERE is_active = 1 ORDER BY name'
    )
    
    // Grupuj urządzenia według klienta
    const devicesByClient = {}
    devices.forEach(device => {
      if (!devicesByClient[device.client_id]) {
        devicesByClient[device.client_id] = []
      }
      devicesByClient[device.client_id].push(device)
    })
    
    clientDevices.value = devicesByClient
  } catch (err) {
    console.error('Error loading client devices:', err)
  }
}

const viewClient = (clientId) => {
  router.push(`/clients/${clientId}`)
}

const editClient = (client) => {
  editingClient.value = { ...client }
  showEditModal.value = true
}

const deleteClient = (client) => {
  deletingClient.value = client
  showDeleteModal.value = true
}

// Usuwanie przez endpoint API (bez surowego SQL po stronie UI)
const confirmDelete = async () => {
  try {
    const clientId = deletingClient.value?.id
    if (!clientId) return

    // 1) Spróbuj usunąć także na Railway
    let resp = await fetch(`http://localhost:5174/api/desktop/clients/${clientId}?confirm=1&alsoRailway=1`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }
    }).catch(() => null)
    let json = resp ? await resp.json().catch(() => ({})) : null

    if (!resp || resp.status === 502 || (json && json.success === false && /Railway/.test(String(json.error||'')))) {
      // 2) Jeśli chmura niedostępna lub odrzuca, zapytaj o lokalne usunięcie bez Railway
      const proceedLocal = confirm('Nie udało się usunąć danych na Railway (502 lub błąd połączenia).\nCzy chcesz kontynuować i usunąć klienta tylko lokalnie?')
      if (!proceedLocal) {
        showDeleteModal.value = false
        deletingClient.value = null
        return
      }
      resp = await fetch(`http://localhost:5174/api/desktop/clients/${clientId}?confirm=1&alsoRailway=0`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }
      }).catch(() => null)
      json = resp ? await resp.json().catch(() => ({})) : null
    }

    if (!resp || !resp.ok || (json && json.success === false)) {
      alert(`Usuwanie nie powiodło się: ${(json && json.error) || (resp && resp.status) || 'unknown'}`)
      showDeleteModal.value = false
      deletingClient.value = null
      return
    }

    // 3) Sukces – usuń z listy w UI
    const index = clients.value.findIndex(c => c.id === clientId)
    if (index !== -1) clients.value.splice(index, 1)
    showDeleteModal.value = false
    deletingClient.value = null
  } catch (err) {
    console.error('Error deleting client:', err)
    alert('Wystąpił błąd podczas usuwania klienta')
    showDeleteModal.value = false
    deletingClient.value = null
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingClient.value = null
}

const onClientSaved = (savedClient) => {
  if (showEditModal.value) {
    // Aktualizuj istniejącego klienta
    const index = clients.value.findIndex(c => c.id === savedClient.id)
    if (index !== -1) {
      clients.value[index] = savedClient
    }
  } else {
    // Dodaj nowego klienta
    clients.value.unshift(savedClient)
  }
  closeModal()
}

// Device modal functions
const addDeviceForClient = (client) => {
  selectedClientIdForDevice.value = client?.id ?? null
  showDeviceModal.value = true
}

const closeDeviceModal = () => {
  showDeviceModal.value = false
  selectedClientIdForDevice.value = null
}

const onDeviceSaved = (savedDevice) => {
  // Zamknij modal
  showDeviceModal.value = false
  selectedClientIdForDevice.value = null
  
  // Pokaż komunikat
  alert(`Urządzenie "${savedDevice.name}" zostało dodane pomyślnie!`)
  
  // Odśwież listę urządzeń
  if (window.electronAPI) {
    loadClientDevices()
  }
}

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortDir.value = 'asc'
  }
}

const buildNextServiceIndex = () => {
  // Wyznacz dla każdego klienta najbliższą datę next_service_date spośród jego urządzeń
  const map = {}
  const now = new Date().setHours(0,0,0,0)
  const devicesByClient = clientDevices.value || {}
  for (const [clientIdStr, devs] of Object.entries(devicesByClient)) {
    const clientId = parseInt(clientIdStr)
    let best = null
    for (const d of (devs || [])) {
      const raw = d.next_service_date || d.next_service || null
      if (!raw) continue
      const ds = new Date(raw)
      if (isNaN(ds.getTime())) continue
      if (!best || ds < best) best = ds
    }
    if (best) {
      const days = Math.round((best.setHours(0,0,0,0) - now) / 86400000)
      map[clientId] = { date: best.toISOString().slice(0,10), days }
    }
  }
  return map
}

const clientNextServiceInfo = (clientId) => {
  const idx = buildNextServiceIndex()
  return idx[clientId]
}

// Watchers
watch([searchQuery, filterType, filterActive], () => {
  currentPage.value = 1
})

watch(showDeviceModal, (newValue) => {
  if (newValue) {
    loadClients()
  } else {
    selectedClientIdForDevice.value = null
  }
})

// Lifecycle
onMounted(() => {
  loadClients()
})
</script> 