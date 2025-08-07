<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Zlecenia serwisowe</h1>
        <p class="text-secondary-600">Zarządzaj zleceniami i serwisami</p>
        <!-- DEBUG INFO -->
        <p class="text-xs text-blue-600 mt-1">
          DEBUG: showAddModal={{ showAddModal }}, showEditModal={{ showEditModal }}
        </p>
      </div>
              <button
          @click="openAddModal"
          class="btn-primary"
          id="test-new-order-btn"
        >
          <i class="fas fa-plus mr-2"></i>
          Nowe zlecenie
        </button>
    </div>

    <!-- Statystyki -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-clock text-blue-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.new }}</div>
            <div class="text-sm text-secondary-600">Nowe</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-tools text-yellow-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.in_progress }}</div>
            <div class="text-sm text-secondary-600">W realizacji</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-red-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.urgent }}</div>
            <div class="text-sm text-secondary-600">Pilne</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.completed }}</div>
            <div class="text-sm text-secondary-600">Ukończone</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtry i wyszukiwanie -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              placeholder="Numer, tytuł, klient..."
              class="input-field pl-10"
            />
          </div>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Status
          </label>
          <select v-model="filterStatus" class="input-field">
            <option value="">Wszystkie</option>
            <option value="new">Nowe</option>
            <option value="assigned">Przypisane</option>
            <option value="in_progress">W realizacji</option>
            <option value="waiting_for_parts">Oczekuje na części</option>
            <option value="completed">Ukończone</option>
            <option value="cancelled">Anulowane</option>
          </select>
        </div>

        <!-- Typ -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Typ
          </label>
          <select v-model="filterType" class="input-field">
            <option value="">Wszystkie</option>
            <option value="breakdown">Awaria</option>
            <option value="maintenance">Konserwacja</option>
            <option value="installation">Instalacja</option>
            <option value="inspection">Przegląd</option>
          </select>
        </div>

        <!-- Priorytet -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Priorytet
          </label>
          <select v-model="filterPriority" class="input-field">
            <option value="">Wszystkie</option>
            <option value="low">Niski</option>
            <option value="medium">Średni</option>
            <option value="high">Wysoki</option>
            <option value="urgent">Pilny</option>
          </select>
        </div>

        <!-- Klient -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Klient
          </label>
          <select v-model="filterClient" class="input-field">
            <option value="">Wszyscy klienci</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ getClientName(client) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista zleceń -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200">
      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-2xl text-primary-600 mb-4"></i>
        <p class="text-secondary-600">Ładowanie zleceń...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-8 text-center">
        <i class="fas fa-exclamation-triangle text-2xl text-red-500 mb-4"></i>
        <p class="text-red-600">{{ error }}</p>
        <button @click="loadOrders" class="btn-secondary mt-4">
          <i class="fas fa-redo mr-2"></i>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="paginatedOrders.length === 0" class="p-8 text-center">
        <i class="fas fa-clipboard-list text-4xl text-secondary-300 mb-4"></i>
        <p class="text-secondary-600 mb-4">
          {{ hasFilters ? 'Brak zleceń spełniających kryteria' : 'Brak zleceń w systemie' }}
        </p>
        <button v-if="!hasFilters" @click="openAddModal" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj pierwsze zlecenie
        </button>
      </div>

      <!-- Tabela zleceń -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200">
          <thead class="bg-secondary-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Zlecenie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Klient/Urządzenie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Typ/Priorytet
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Railway
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Terminy
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Koszty
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-secondary-200">
            <tr v-for="order in paginatedOrders" :key="order.id" class="hover:bg-secondary-50">
              <!-- Zlecenie -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div 
                      :class="getTypeIcon(order.type).color"
                      class="h-10 w-10 rounded-lg flex items-center justify-center"
                    >
                      <i :class="getTypeIcon(order.type).icon" class="text-white"></i>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-secondary-900">
                      {{ order.order_number }}
                    </div>
                    <div class="text-sm text-secondary-500">
                      {{ order.title }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Klient/Urządzenie -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">
                  {{ getClientName(getClientById(order.client_id)) }}
                </div>
                <div class="text-sm text-secondary-500">
                  {{ getDeviceName(order.device_id) }}
                </div>
              </td>

              <!-- Typ/Priorytet -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-secondary-900">{{ getTypeName(order.type) }}</div>
                <span 
                  :class="getPriorityClass(order.priority)"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getPriorityName(order.priority) }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="getStatusClass(order.status)"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getStatusName(order.status) }}
                </span>
              </td>

              <!-- Railway Status -->
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span 
                  :class="order.railway_synced ? 'text-green-600' : 'text-gray-400'"
                  :title="order.railway_synced ? 'Wysłane do Railway' : 'Nie wysłane do Railway'"
                >
                  <i :class="order.railway_synced ? 'fas fa-cloud-check' : 'fas fa-cloud'"></i>
                </span>
              </td>

              <!-- Terminy -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                <div v-if="order.scheduled_date">
                  Planowane: {{ formatDate(order.scheduled_date) }}
                </div>
                <div v-if="order.started_at" class="text-secondary-500">
                  Rozpoczęte: {{ formatDate(order.started_at) }}
                </div>
                <div v-if="order.completed_at" class="text-green-600">
                  Ukończone: {{ formatDate(order.completed_at) }}
                </div>
              </td>

              <!-- Koszty -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                <div v-if="order.total_cost > 0">
                  {{ order.total_cost.toFixed(2) }} zł
                </div>
                <div v-else class="text-secondary-400">
                  Nie ustalono
                </div>
                <div v-if="order.estimated_hours" class="text-xs text-secondary-500">
                  {{ order.estimated_hours }}h szacowane
                </div>
              </td>

              <!-- Akcje -->
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewOrder(order.id)"
                    class="text-primary-600 hover:text-primary-900"
                    title="Zobacz szczegóły"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button
                    @click="editOrder(order)"
                    class="text-secondary-600 hover:text-secondary-900"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    v-if="order.status === 'new' && !order.railway_synced"
                    @click="syncOrderToRailway(order)"
                    class="text-green-600 hover:text-green-900"
                    title="Wyślij do Railway"
                  >
                    <i class="fas fa-cloud-upload-alt"></i>
                  </button>
                  <button
                    v-if="order.status === 'new'"
                    @click="startOrder(order)"
                    class="text-blue-600 hover:text-blue-900"
                    title="Wyślij do technika"
                  >
                    <i class="fas fa-paper-plane"></i>
                  </button>
                  <button
                    v-if="order.status === 'in_progress'"
                    @click="completeOrder(order)"
                    class="text-blue-600 hover:text-blue-900"
                    title="Oznacz jako ukończone"
                  >
                    <i class="fas fa-check"></i>
                  </button>
                  <button
                    @click="deleteOrder(order)"
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
                <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredOrders.length) }}</span>
                z
                <span class="font-medium">{{ filteredOrders.length }}</span>
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

    <!-- Modal dodawania/edycji zlecenia -->
    <!-- DEBUG: showAddModal={{ showAddModal }}, showEditModal={{ showEditModal }} -->
    
    <OrderFormModal
      v-if="showAddModal || showEditModal"
      :order="editingOrder"
      :clients="clients"
      :devices="devices"
      :is-edit="showEditModal"
      @close="closeModal"
      @saved="onOrderSaved"
    />

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń zlecenie"
      :message="`Czy na pewno chcesz usunąć zlecenie ${deletingOrder?.order_number}?`"
      confirm-text="Usuń"
      confirm-class="btn-danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Modal rozliczenia zlecenia -->
    <OrderBillingModal
      v-if="showBillingModal"
      :order="billingOrder"
      @close="closeBillingModal"
      @completed="onOrderBillingCompleted"
    />

    <!-- Modal wyboru technika -->
    <AssignTechnicianModal
      v-if="showAssignModal"
      :order="assigningOrder"
      :technicians="technicians"
      @close="showAssignModal = false"
      @assigned="assignOrderToTechnician"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import OrderFormModal from './OrderFormModal.vue'
import OrderBillingModal from '../../components/OrderBillingModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import AssignTechnicianModal from './AssignTechnicianModal.vue'

const router = useRouter()

// Reactive data
const orders = ref([])
const clients = ref([])
const devices = ref([])
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const filterStatus = ref('')
const filterType = ref('')
const filterPriority = ref('')
const filterClient = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showBillingModal = ref(false)
const showAssignModal = ref(false) // Nowy modal do wyboru technika
const editingOrder = ref(null)
const deletingOrder = ref(null)
const billingOrder = ref(null)
const assigningOrder = ref(null) // Zlecenie do przypisania

// Dodaj techników do reactive data
const technicians = ref([])

// Computed properties
const orderStats = computed(() => {
  return {
    new: orders.value.filter(o => o.status === 'new').length,
    in_progress: orders.value.filter(o => o.status === 'in_progress').length,
    urgent: orders.value.filter(o => o.priority === 'urgent').length,
    completed: orders.value.filter(o => o.status === 'completed').length
  }
})

const hasFilters = computed(() => {
  return searchQuery.value || filterStatus.value || filterType.value || filterPriority.value || filterClient.value
})

const filteredOrders = computed(() => {
  let filtered = orders.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order => {
      const orderNumber = order.order_number?.toLowerCase() || ''
      const title = order.title?.toLowerCase() || ''
      const clientName = getClientName(getClientById(order.client_id))?.toLowerCase() || ''
      
      return orderNumber.includes(query) || title.includes(query) || clientName.includes(query)
    })
  }

  // Status filter
  if (filterStatus.value) {
    filtered = filtered.filter(order => order.status === filterStatus.value)
  }

  // Type filter
  if (filterType.value) {
    filtered = filtered.filter(order => order.type === filterType.value)
  }

  // Priority filter
  if (filterPriority.value) {
    filtered = filtered.filter(order => order.priority === filterPriority.value)
  }

  // Client filter
  if (filterClient.value) {
    filtered = filtered.filter(order => order.client_id === parseInt(filterClient.value))
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage.value))

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredOrders.value.slice(start, end)
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

// Helper methods
const getTypeIcon = (type) => {
  const icons = {
    breakdown: { icon: 'fas fa-exclamation-triangle', color: 'bg-red-500' },
    maintenance: { icon: 'fas fa-tools', color: 'bg-blue-500' },
    installation: { icon: 'fas fa-wrench', color: 'bg-green-500' },
    inspection: { icon: 'fas fa-search', color: 'bg-yellow-500' }
  }
  return icons[type] || { icon: 'fas fa-clipboard-list', color: 'bg-secondary-500' }
}

const getTypeName = (type) => {
  const names = {
    breakdown: 'Awaria',
    maintenance: 'Konserwacja', 
    installation: 'Instalacja',
    inspection: 'Przegląd'
  }
  return names[type] || type
}

const getPriorityName = (priority) => {
  const names = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny'
  }
  return names[priority] || priority
}

const getPriorityClass = (priority) => {
  const classes = {
    low: 'bg-secondary-100 text-secondary-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }
  return classes[priority] || 'bg-secondary-100 text-secondary-800'
}

const getStatusName = (status) => {
  const names = {
    new: 'Nowe',
    in_progress: 'W realizacji',
    waiting_for_parts: 'Oczekuje na części',
    completed: 'Ukończone',
    cancelled: 'Anulowane',
    assigned: 'Przypisane'
  }
  return names[status] || status
}

const getStatusClass = (status) => {
  const classes = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_for_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    assigned: 'bg-purple-100 text-purple-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getClientById = (clientId) => {
  return clients.value.find(c => c.id === clientId) || {}
}

const getClientName = (client) => {
  if (!client || !client.id) return 'Nieznany klient'
  
  return client.type === 'business' 
    ? client.company_name 
    : `${client.first_name} ${client.last_name}`
}

const getDeviceName = (deviceId) => {
  if (!deviceId) return 'Brak urządzenia'
  
  const device = devices.value.find(d => d.id === deviceId)
  return device ? device.name : 'Nieznane urządzenie'
}

// Methods
const loadOrders = async () => {
  isLoading.value = true
  error.value = ''

  try {
    if (!window.electronAPI) {
      // Demo data dla przeglądarki
      orders.value = [
        {
          id: 1,
          order_number: 'SRV-2024-001',
          client_id: 1,
          device_id: 1,
          assigned_user_id: 1,
          type: 'breakdown',
          status: 'in_progress',
          priority: 'high',
          title: 'Awaria kotła - brak ogrzewania',
          description: 'Klient zgłasza brak ciepłej wody i ogrzewania. Kocioł nie odpala.',
          scheduled_date: '2024-07-07T09:00:00Z',
          started_at: '2024-07-07T09:15:00Z',
          completed_at: null,
          estimated_hours: 3,
          actual_hours: 2.5,
          parts_cost: 150.00,
          labor_cost: 200.00,
          total_cost: 350.00,
          notes: 'Wymiana uszkodzonego termostatu',
          created_at: '2024-07-05T14:30:00Z'
        },
        {
          id: 2,
          order_number: 'SRV-2024-002',
          client_id: 2,
          device_id: 2,
          assigned_user_id: 1,
          type: 'maintenance',
          status: 'new',
          priority: 'medium',
          title: 'Przegląd okresowy klimatyzacji',
          description: 'Standardowy przegląd roczny klimatyzatora zgodnie z harmonogramem.',
          scheduled_date: '2024-07-10T10:00:00Z',
          started_at: null,
          completed_at: null,
          estimated_hours: 2,
          actual_hours: null,
          parts_cost: 0,
          labor_cost: 150.00,
          total_cost: 150.00,
          notes: 'Wymiana filtrów, czyszczenie jednostek',
          created_at: '2024-07-06T11:20:00Z'
        },
        {
          id: 3,
          order_number: 'SRV-2024-003',
          client_id: 1,
          device_id: null,
          assigned_user_id: 1,
          type: 'installation',
          status: 'completed',
          priority: 'low',
          title: 'Instalacja nowego termostatu',
          description: 'Montaż i konfiguracja programowanego termostatu pokojowego.',
          scheduled_date: '2024-07-01T14:00:00Z',
          started_at: '2024-07-01T14:00:00Z',
          completed_at: '2024-07-01T16:30:00Z',
          estimated_hours: 2,
          actual_hours: 2.5,
          parts_cost: 250.00,
          labor_cost: 150.00,
          total_cost: 400.00,
          notes: 'Instalacja zakończona pomyślnie, klient przeszkolony',
          created_at: '2024-06-28T09:15:00Z'
        }
      ]
      return
    }

    // Pobierz zlecenia z bazy danych
    const result = await window.electronAPI.database.query(`
      SELECT o.*, 
             c.first_name, c.last_name, c.company_name, c.type as client_type,
             d.name as device_name,
             u.full_name as assigned_user_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      ORDER BY o.created_at DESC
    `)

    orders.value = result || []
  } catch (err) {
    console.error('Error loading orders:', err)
    error.value = 'Błąd podczas ładowania zleceń'
  } finally {
    isLoading.value = false
  }
}

const loadClients = async () => {
  try {
    if (!window.electronAPI) {
      clients.value = [
        { id: 1, type: 'individual', first_name: 'Jan', last_name: 'Kowalski' },
        { id: 2, type: 'business', company_name: 'ABC Sp. z o.o.' }
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

const loadDevices = async () => {
  try {
    if (!window.electronAPI) {
      devices.value = [
        { id: 1, name: 'Kocioł gazowy', client_id: 1 },
        { id: 2, name: 'Klimatyzator', client_id: 2 }
      ]
      return
    }

    const result = await window.electronAPI.database.query(
      'SELECT id, name, client_id FROM devices WHERE is_active = 1 ORDER BY name ASC'
    )
    devices.value = result || []
  } catch (err) {
    console.error('Error loading devices:', err)
  }
}

const loadTechnicians = async () => {
  try {
    if (!window.electronAPI) {
      technicians.value = [
        { id: 2, username: 'technik1', full_name: 'Jan Technik', email: 'technik1@serwis.pl' },
        { id: 3, username: 'technik2', full_name: 'Anna Serwis', email: 'technik2@serwis.pl' }
      ]
      return
    }

    const result = await window.electronAPI.database.query(
      'SELECT id, username, full_name, email FROM users WHERE role = ? AND is_active = 1 ORDER BY full_name ASC',
      ['technician']
    )
    technicians.value = result || []
  } catch (err) {
    console.error('Error loading technicians:', err)
  }
}

const viewOrder = (orderId) => {
  router.push(`/orders/${orderId}`)
}

const editOrder = (order) => {
  editingOrder.value = { ...order }
  showEditModal.value = true
}

const startOrder = async (order) => {
  // Zamiast od razu rozpoczynać pracę, otwórz modal wyboru technika
  assigningOrder.value = order
  showAssignModal.value = true
}

const assignOrderToTechnician = async (technicianId, notes = '') => {
  try {
    // Sprawdź czy zlecenie zostało już wysłane do Railway
    if (!assigningOrder.value.railway_synced) {
      const confirmSync = confirm(
        `⚠️ Zlecenie ${assigningOrder.value.order_number} nie zostało jeszcze wysłane do Railway.\n\n` +
        `Czy chcesz je najpierw wysłać do Railway przed przypisaniem do technika?\n\n` +
        `(Bez tego technik nie zobaczy zlecenia w aplikacji mobilnej)`
      )
      
      if (confirmSync) {
        try {
          // Najpierw wyślij zlecenie do Railway (bez alertu)
          await syncOrderToRailway(assigningOrder.value, false)
          // Aktualizuj status w lokalnej zmiennej
          assigningOrder.value.railway_synced = true
        } catch (syncError) {
          alert(`❌ Nie udało się wysłać zlecenia do Railway: ${syncError.message}\n\nSpróbuj ponownie później.`)
          return
        }
      } else {
        alert('❌ Anulowano przypisywanie zlecenia. Najpierw wyślij zlecenie do Railway.')
        return
      }
    }

    // Wywołaj API do przypisania zlecenia do technika
    const response = await fetch(`http://localhost:5174/api/desktop/orders/${assigningOrder.value.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: technicianId,
        priority: assigningOrder.value.priority || 'medium',
        notes: notes
      })
    })

    if (response.ok) {
      const result = await response.json()
      
      // Aktualizuj lokalnie
      const index = orders.value.findIndex(o => o.id === assigningOrder.value.id)
      if (index !== -1) {
        orders.value[index].assigned_user_id = technicianId
        orders.value[index].status = 'new' // Status dla technika
        orders.value[index].railway_synced = true // Upewnij się że jest oznaczone jako wysłane
      }

      // 🚀 SYNC: Wyślij update do Railway PostgreSQL
      await syncAssignmentToRailway(assigningOrder.value.id, technicianId, notes)

      // Znajdź technika
      const technician = technicians.value.find(t => t.id === technicianId)
      
      // Zamknij modal
      showAssignModal.value = false
      
      // Pokaż komunikat
      alert(`✅ Zlecenie ${assigningOrder.value.order_number} zostało wysłane do technika ${technician?.full_name}!\n\n📱 Technik zobaczy zlecenie w aplikacji mobilnej na adresie:\nhttps://web-production-310c4.up.railway.app`)
      
      // Wyczyść
      assigningOrder.value = null
      
    } else {
      throw new Error('Błąd podczas przypisywania zlecenia')
    }
  } catch (err) {
    console.error('Error assigning order:', err)
    error.value = 'Błąd podczas wysyłania zlecenia do technika'
  }
}

// 🚀 SYNC: Ręczne wysyłanie zlecenia do Railway  
const syncOrderToRailway = async (order, showAlert = true) => {
  try {
    console.log(`🌐 Wysyłanie zlecenia ${order.order_number} do Railway...`)
    
    // Przygotuj dane zlecenia
    const orderData = {
      ...order,
      // Parsuj service_categories jeśli to string
      service_categories: typeof order.service_categories === 'string' 
        ? JSON.parse(order.service_categories) 
        : order.service_categories || []
    }
    
    const response = await fetch('https://web-production-310c4.up.railway.app/api/sync/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Zlecenie ${order.order_number} wysłane do Railway:`, result)
      
      // Oznacz jako wysłane do Railway
      const index = orders.value.findIndex(o => o.id === order.id)
      if (index !== -1) {
        orders.value[index].railway_synced = true
      }
      
      // Pokaż potwierdzenie
      if (showAlert) {
        alert(`✅ Zlecenie ${order.order_number} zostało wysłane do Railway!\n\n📱 Będzie dostępne w aplikacji mobilnej na:\nhttps://web-production-310c4.up.railway.app`)
      }
      
    } else {
      const error = await response.text()
      console.error(`❌ Błąd wysyłania zlecenia do Railway:`, error)
      if (showAlert) {
        alert(`❌ Błąd podczas wysyłania zlecenia do Railway:\n${error}`)
      }
      throw new Error(`Railway sync failed: ${error}`)
    }
  } catch (error) {
    console.error(`❌ Nie udało się wysłać zlecenia do Railway:`, error.message)
    if (showAlert) {
      alert(`❌ Nie udało się połączyć z Railway:\n${error.message}`)
    }
    throw error
  }
}

// 🚀 SYNC: Synchronizacja przypisania zlecenia z Railway
const syncAssignmentToRailway = async (orderId, technicianId, notes) => {
  try {
    console.log(`🌐 Wysyłanie przypisania zlecenia ${orderId} do technika ${technicianId} na Railway...`)
    
    const response = await fetch('https://web-production-310c4.up.railway.app/api/sync/assign', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: orderId,
        technicianId: technicianId,
        notes: notes,
        status: 'new',
        assignedAt: new Date().toISOString()
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Przypisanie zlecenia ${orderId} wysłane do Railway:`, result)
    } else {
      const error = await response.text()
      console.warn(`⚠️ Błąd wysyłania przypisania do Railway:`, error)
    }
  } catch (error) {
    console.warn(`⚠️ Nie udało się wysłać przypisania do Railway:`, error.message)
  }
}

const completeOrder = async (order) => {
  // Otwórz modal rozliczenia zlecenia
  billingOrder.value = order
  showBillingModal.value = true
}

const generateInvoiceForOrder = async (order) => {
  if (!window.electronAPI) return

  try {
    // Sprawdź czy faktury dla tego zlecenia już nie ma
    const existingInvoice = await window.electronAPI.database.get(
      'SELECT id FROM invoices WHERE order_id = ?',
      [order.id]
    )

    if (existingInvoice) {
      console.log('Faktura dla tego zlecenia już istnieje')
      return
    }

    // Generuj numer faktury
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-4)
    const invoiceNumber = `FV-${year}-${month}-${timestamp}`

    // Przygotuj dane faktury
    const netAmount = order.total_cost || 0
    const taxRate = 0.23 // 23% VAT
    const taxAmount = netAmount * taxRate
    const grossAmount = netAmount + taxAmount

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14) // 14 dni na płatność

    // Zapisz fakturę
    const invoiceResult = await window.electronAPI.database.run(
      `INSERT INTO invoices 
       (invoice_number, order_id, client_id, issue_date, due_date, status, net_amount, tax_amount, gross_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber, order.id, order.client_id, now.toISOString(), dueDate.toISOString(),
        'draft', netAmount, taxAmount, grossAmount, 'transfer'
      ]
    )

    // Dodaj pozycje faktury
    if (order.labor_cost > 0) {
      const laborNet = order.labor_cost
      const laborTax = laborNet * taxRate
      const laborGross = laborNet + laborTax

      await window.electronAPI.database.run(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, net_amount, tax_rate, tax_amount, gross_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceResult.lastID, 'Robocizna - ' + order.title, 1, laborNet,
          laborNet, taxRate, laborTax, laborGross
        ]
      )
    }

    if (order.parts_cost > 0) {
      const partsNet = order.parts_cost
      const partsTax = partsNet * taxRate
      const partsGross = partsNet + partsTax

      await window.electronAPI.database.run(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, net_amount, tax_rate, tax_amount, gross_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceResult.lastID, 'Części zamienne', 1, partsNet,
          partsNet, taxRate, partsTax, partsGross
        ]
      )
    }

    console.log(`Faktura ${invoiceNumber} została automatycznie wygenerowana dla zlecenia ${order.order_number}`)
    
    // Pokaż powiadomienie użytkownikowi
    alert(`✅ Zlecenie zakończone!\n\nAutomatycznie wygenerowano fakturę: ${invoiceNumber}\nMożesz ją znaleźć w zakładce "Faktury".`)

  } catch (error) {
    console.error('Błąd podczas generowania faktury:', error)
    alert('⚠️ Zlecenie zostało zakończone, ale wystąpił błąd podczas generowania faktury.')
  }
}

const deleteOrder = (order) => {
  deletingOrder.value = order
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    if (window.electronAPI) {
      await window.electronAPI.database.run(
        'DELETE FROM service_orders WHERE id = ?',
        [deletingOrder.value.id]
      )
    }

    // Usuń z lokalnej listy
    const index = orders.value.findIndex(o => o.id === deletingOrder.value.id)
    if (index !== -1) {
      orders.value.splice(index, 1)
    }

    showDeleteModal.value = false
    deletingOrder.value = null
  } catch (err) {
    console.error('Error deleting order:', err)
    error.value = 'Błąd podczas usuwania zlecenia'
  }
}

const openAddModal = () => {
  console.log('🔵 Przycisk "Nowe zlecenie" został kliknięty!')
  console.log('🔵 Przed: showAddModal =', showAddModal.value)
  console.log('🔵 Przed: showEditModal =', showEditModal.value)
  
  showAddModal.value = true
  editingOrder.value = null
  
  console.log('🔵 Po: showAddModal =', showAddModal.value)
  console.log('🔵 Po: showEditModal =', showEditModal.value)
  console.log('🔵 Modal warunek (showAddModal || showEditModal):', showAddModal.value || showEditModal.value)
  console.log('🔵 Ilość klientów:', clients.value.length)
  console.log('🔵 Ilość urządzeń:', devices.value.length)
  
  // Test czy modal się renderuje
  setTimeout(() => {
    const modal = document.querySelector('.fixed.inset-0.bg-black')
    console.log('🔵 Modal DOM element:', modal)
    if (modal) {
      console.log('🔵 Modal style:', window.getComputedStyle(modal).display)
    }
  }, 100)
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingOrder.value = null
}

const closeBillingModal = () => {
  showBillingModal.value = false
  billingOrder.value = null
}

const onOrderBillingCompleted = async (billingData) => {
  try {
    // Aktualizuj status zlecenia lokalnie
    const index = orders.value.findIndex(o => o.id === billingData.orderId)
    if (index !== -1) {
      orders.value[index].status = 'completed'
      orders.value[index].completed_at = new Date().toISOString()
      orders.value[index].total_cost = billingData.totals.gross
    }

    // Zamknij modal
    closeBillingModal()

    // Pokaż powiadomienie
    alert(`✅ Zlecenie zostało pomyślnie rozliczone!\n\nWygenerowano fakturę na kwotę ${billingData.totals.gross.toFixed(2)} zł\nMożesz ją znaleźć w zakładce "Faktury".`)

  } catch (error) {
    console.error('Error handling billing completion:', error)
    alert('❌ Wystąpił błąd podczas finalizacji rozliczenia')
  }
}

const onOrderSaved = (savedOrder) => {
  if (showEditModal.value) {
    // Aktualizuj istniejące zlecenie
    const index = orders.value.findIndex(o => o.id === savedOrder.id)
    if (index !== -1) {
      orders.value[index] = savedOrder
    }
  } else {
    // Dodaj nowe zlecenie
    orders.value.unshift(savedOrder)
  }
  closeModal()
}

// Watchers
watch([searchQuery, filterStatus, filterType, filterPriority, filterClient], () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadClients()
  loadDevices()
  loadOrders()
  loadTechnicians()
})
</script> 