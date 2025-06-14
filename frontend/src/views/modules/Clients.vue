<template>
  <div class="p-4 space-y-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Klienci</h1>
        <p class="text-sm text-gray-600 mt-1">Zarządzanie bazą klientów</p>
      </div>
      <button
        v-if="canWrite"
        @click="showAddModal = true"
        class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
      >
        <Plus class="w-5 h-5" />
        <span>Dodaj</span>
      </button>
    </div>

    <!-- Search and filters -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Szukaj klientów po nazwie, telefonie, email, mieście, adresie..."
            class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
          />
        </div>
        <div class="relative">
          <select 
            v-model="filterType" 
            class="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 font-medium"
          >
            <option value="">Wszystkie typy</option>
            <option value="business">Firmy</option>
            <option value="individual">Osoby prywatne</option>
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown class="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div 
        @click="clearFilters()"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105"
        :class="{ 'ring-2 ring-blue-300 bg-blue-50': !filterType && !filterPriority && !searchQuery }"
      >
        <div class="text-2xl font-bold text-primary-600 mb-1">{{ stats.total }}</div>
        <div class="text-xs text-gray-600 font-medium">{{ (!filterType && !filterPriority && !searchQuery) ? '✓ Wszyscy' : 'Wszyscy' }}</div>
        <div class="w-full bg-primary-100 rounded-full h-1.5 mt-2">
          <div class="bg-primary-500 h-1.5 rounded-full transition-all duration-500 w-full"></div>
        </div>
      </div>
      <div 
        @click="toggleTypeFilter('business')"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105"
        :class="{ 'ring-2 ring-blue-300 bg-blue-50': filterType === 'business' }"
      >
        <div class="text-2xl font-bold text-blue-600 mb-1">{{ stats.business }}</div>
        <div class="text-xs text-gray-600 font-medium">{{ filterType === 'business' ? '✓ Firmy' : 'Firmy' }}</div>
        <div class="w-full bg-blue-100 rounded-full h-1.5 mt-2">
          <div class="bg-blue-500 h-1.5 rounded-full transition-all duration-500" :style="`width: ${stats.total > 0 ? (stats.business / stats.total * 100) : 0}%`"></div>
        </div>
      </div>
      <div 
        @click="toggleTypeFilter('individual')"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105"
        :class="{ 'ring-2 ring-emerald-300 bg-emerald-50': filterType === 'individual' }"
      >
        <div class="text-2xl font-bold text-emerald-600 mb-1">{{ stats.individual }}</div>
        <div class="text-xs text-gray-600 font-medium">{{ filterType === 'individual' ? '✓ Prywatni' : 'Prywatni' }}</div>
        <div class="w-full bg-emerald-100 rounded-full h-1.5 mt-2">
          <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" :style="`width: ${stats.total > 0 ? (stats.individual / stats.total * 100) : 0}%`"></div>
        </div>
      </div>
      <div 
        @click="togglePriorityFilter()"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105"
        :class="{ 'ring-2 ring-red-300 bg-red-50': filterPriority }"
      >
        <div class="text-2xl font-bold text-red-600 mb-1">{{ stats.high_priority }}</div>
        <div class="text-xs text-gray-600 font-medium">{{ getPriorityFilterLabel() }}</div>
        <div class="w-full bg-red-100 rounded-full h-1.5 mt-2">
          <div class="bg-red-500 h-1.5 rounded-full transition-all duration-500" :style="`width: ${stats.total > 0 ? (stats.high_priority / stats.total * 100) : 0}%`"></div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <th class="pb-3 pr-4">ID / Notatki</th>
            <th class="pb-3 pr-4">Klient</th>
            <th class="pb-3 pr-4">Kontakt</th>
            <th class="pb-3 pr-4">Lokalizacja</th>
            <th class="pb-3 pr-4">Status</th>
            <th class="pb-3">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr 
            v-for="client in clients" 
            :key="client.id"
            class="hover:bg-gray-50 transition-colors duration-200"
          >
            <td class="py-4 pr-4">
              <div class="space-y-1">
                <button
                  @click="showNotes(client.id)"
                  class="text-xs font-mono text-gray-500 hover:text-primary-600 transition-colors duration-200 cursor-pointer"
                  :title="`Pokaż notatki dla klienta ${client.id}`"
                >
                  {{ client.id.slice(0, 8) }}...
                </button>
                <div class="flex items-center gap-1 text-xs">
                  <span v-if="client.notes_count > 0" class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                    📝 {{ client.notes_count }}
                  </span>
                  <span v-if="client.service_records_count > 0" class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                    🔧 {{ client.service_records_count }}
                  </span>
                </div>
              </div>
            </td>
            <td class="py-4 pr-4">
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {{ client.company_name ? client.company_name.charAt(0).toUpperCase() : 'N' }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ client.company_name || 'Brak nazwy' }}
                  </div>
                  <div class="text-sm text-gray-500 truncate">
                    {{ client.contact_person || 'Brak kontaktu' }}
                  </div>
                  <div class="flex items-center space-x-2 mt-1">
                    <span 
                      :class="client.client_type === 'business' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ client.client_type === 'business' ? '🏢 Firma' : '👤 Prywatny' }}
                    </span>
                    <span 
                      :class="getPriorityBadgeClass(client.priority_level)"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ getPriorityText(client.priority_level) }}
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td class="py-4 pr-4">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <Phone class="w-4 h-4 text-gray-400" />
                  <a 
                    :href="`tel:${client.phone}`"
                    class="text-sm text-gray-900 hover:text-primary-600 transition-colors duration-200"
                  >
                    {{ client.phone || 'Brak telefonu' }}
                  </a>
                </div>
                <div class="flex items-center space-x-2">
                  <Mail class="w-4 h-4 text-gray-400" />
                  <a 
                    :href="`mailto:${client.email}`"
                    class="text-sm text-primary-600 hover:text-primary-800 transition-colors duration-200 cursor-pointer"
                    :title="`Wyślij email do ${client.email}`"
                  >
                    {{ client.email || 'Brak email' }}
                  </a>
                </div>
              </div>
            </td>
            <td class="py-4 pr-4">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <MapPin class="w-4 h-4 text-gray-400" />
                  <span class="text-sm font-medium text-gray-900">
                    {{ client.address_city || 'Brak miasta' }}
                  </span>
                </div>
                <button
                  v-if="client.address_street && client.address_city"
                  @click="openInGoogleMaps(client)"
                  class="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200 cursor-pointer underline decoration-dotted"
                  :title="`Otwórz w Google Maps: ${getFullAddress(client)}`"
                >
                  {{ getFullAddress(client) }}
                </button>
                <span v-else class="text-sm text-gray-400">
                  Brak pełnego adresu
                </span>
              </div>
            </td>
            <td class="py-4 pr-4">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <div class="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                Aktywny
              </span>
            </td>
            <td class="py-4">
              <div class="flex items-center space-x-2">
                <button
                  @click="editClient(client)"
                  class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                  title="Edytuj klienta"
                >
                  <Edit2 class="w-4 h-4" />
                </button>
                <button
                  @click="deleteClient(client)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Usuń klienta"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-if="clients.length === 0 && !isLoading" class="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
      <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Users class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-3">
        {{ searchQuery ? 'Brak wyników' : 'Brak klientów' }}
      </h3>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        {{ searchQuery ? 'Nie znaleziono klientów spełniających kryteria wyszukiwania' : 'Dodaj pierwszego klienta do systemu' }}
      </p>
      <button
        v-if="canWrite && !searchQuery"
        @click="showAddModal = true"
        class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
      >
        Dodaj pierwszego klienta
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
      <div class="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
      <p class="text-gray-600 font-medium">Ładowanie klientów...</p>
    </div>

    <!-- Client Modal -->
    <ClientModal
      :is-open="showAddModal"
      :client="selectedClient"
      @close="handleCloseModal"
      @saved="handleClientSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronRight, 
  Users,
  Search,
  ChevronDown,
  Building,
  Edit2,
  Trash2
} from 'lucide-vue-next'
import api from '@/services/api'
import ClientModal from '@/components/modals/ClientModal.vue'

const authStore = useAuthStore()

const clients = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const filterType = ref('')
const filterPriority = ref('')
const showAddModal = ref(false)
const selectedClient = ref(null)

const stats = ref({
  total: 0,
  business: 0,
  individual: 0,
  high_priority: 0
})

// Watch for search changes
watch([searchQuery, filterType, filterPriority], () => {
  loadClients()
}, { debounce: 300 })

const canWrite = computed(() => 
  authStore.hasModulePermission('clients', 'write')
)

async function loadClients() {
  try {
    isLoading.value = true
    const params = new URLSearchParams()
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }
    if (filterType.value) {
      params.append('client_type', filterType.value)
    }
    if (filterPriority.value) {
      params.append('priority_level', filterPriority.value)
    }
    
    const response = await api.get(`/clients?${params.toString()}`)
    
    if (response.data.success) {
      clients.value = response.data.data || []
      
      // Calculate stats from real data
      stats.value = {
        total: clients.value.length,
        business: clients.value.filter(c => c.client_type === 'business').length,
        individual: clients.value.filter(c => c.client_type === 'individual').length,
        high_priority: clients.value.filter(c => c.priority_level === 'high' || c.priority_level === 'urgent').length
      }
    }
  } catch (error) {
    console.error('Failed to load clients:', error)
    // Show error message or fallback to empty state
    clients.value = []
    stats.value = {
      total: 0,
      business: 0,
      individual: 0,
      high_priority: 0
    }
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    const response = await api.get('/clients/stats')
    if (response.data.success) {
      stats.value = response.data.data
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

function selectClient(client) {
  selectedClient.value = client
  showAddModal.value = true
}

function handleCloseModal() {
  showAddModal.value = false
  selectedClient.value = null
}

function handleClientSaved(client) {
  if (selectedClient.value) {
    // Update existing client
    const index = clients.value.findIndex(c => c.id === client.id)
    if (index !== -1) {
      clients.value[index] = client
    }
  } else {
    // Add new client
    clients.value.unshift(client)
  }
  
  // Recalculate stats
  stats.value = {
    total: clients.value.length,
    business: clients.value.filter(c => c.client_type === 'business').length,
    individual: clients.value.filter(c => c.client_type === 'individual').length,
    high_priority: clients.value.filter(c => c.priority_level === 'high' || c.priority_level === 'urgent').length
  }
}

// Filtering methods
function clearFilters() {
  searchQuery.value = ''
  filterType.value = ''
  filterPriority.value = ''
  loadClients()
}

function filterByType(type) {
  filterType.value = type
  searchQuery.value = ''
  filterPriority.value = ''
  loadClients()
}

function filterByPriority(priority) {
  filterPriority.value = priority
  searchQuery.value = ''
  filterType.value = ''
  loadClients()
}

// Interactive methods
function openInGoogleMaps(client) {
  const address = getFullAddress(client)
  const encodedAddress = encodeURIComponent(address)
  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
  window.open(url, '_blank')
}

function getFullAddress(client) {
  const parts = []
  if (client.address_street) parts.push(client.address_street)
  if (client.address_city) parts.push(client.address_city)
  if (client.address_postal_code) parts.push(client.address_postal_code)
  return parts.join(', ')
}

function showNotes(clientId) {
  // Tutaj można dodać modal z notatkami lub przekierowanie
  console.log('Pokazuj notatki dla:', clientId)
  // this.$router.push(`/clients/${clientId}/notes`)
}

function editClient(client) {
  selectedClient.value = client
  showAddModal.value = true
}

function deleteClient(client) {
  if (confirm(`Czy na pewno chcesz usunąć klienta: ${client.company_name}?`)) {
    handleDeleteClient(client.id)
  }
}

async function handleDeleteClient(clientId) {
  try {
    await api.delete(`/clients/${clientId}`)
    loadClients() // Refresh list
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error)
    alert('Wystąpił błąd podczas usuwania klienta')
  }
}

function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800'
    case 'urgent':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'standard':
      return 'bg-blue-100 text-blue-800'
    case 'low':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getPriorityText(priority) {
  switch (priority) {
    case 'high':
      return '🔴 Wysoki'
    case 'urgent':
      return '🟠 Pilny'
    case 'medium':
      return '🟡 Średni'
    case 'standard':
      return '🔵 Standard'
    case 'low':
      return '🟢 Niski'
    default:
      return '⚪ Brak'
  }
}

function togglePriorityFilter() {
  // Cykliczne przełączanie między priorytetami: brak → high → urgent → standard → brak
  if (!filterPriority.value) {
    filterPriority.value = 'high'
  } else if (filterPriority.value === 'high') {
    filterPriority.value = 'urgent'
  } else if (filterPriority.value === 'urgent') {
    filterPriority.value = 'standard'
  } else {
    filterPriority.value = ''
  }
  searchQuery.value = ''
  filterType.value = ''
  loadClients()
}

function getPriorityFilterLabel() {
  if (filterPriority.value === 'high') {
    return 'Filtr: Wysoki'
  } else if (filterPriority.value === 'urgent') {
    return 'Filtr: Pilny'
  } else if (filterPriority.value === 'standard') {
    return 'Filtr: Standard'
  }
  return 'Wszystkie priorytety'
}

function toggleTypeFilter(type) {
  if (filterType.value === type) {
    // Jeśli ten sam typ jest już włączony, wyłącz filtr
    filterType.value = ''
  } else {
    // Włącz filtr dla tego typu
    filterType.value = type
  }
  searchQuery.value = ''
  filterPriority.value = ''
  loadClients()
}

onMounted(async () => {
  await Promise.all([
    loadClients(),
    loadStats()
  ])
})
</script> 