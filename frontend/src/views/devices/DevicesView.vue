<template>
  <div class="devices-view">
    <!-- Header -->
    <div class="devices-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <i class="fas fa-cogs"></i>
            Urządzenia
          </h1>
          <p class="page-subtitle">
            Zarządzanie urządzeniami serwisowymi
          </p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="showCreateModal = true"
            class="btn btn-primary"
          >
            <i class="fas fa-plus"></i>
            Dodaj urządzenie
          </button>
          
          <button 
            @click="showFilters = !showFilters"
            class="btn btn-outline-secondary"
            :class="{ 'active': hasActiveFilters }"
          >
            <i class="fas fa-filter"></i>
            Filtry
          </button>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="statistics-grid" v-if="!deviceStore.loading">
      <div class="stat-card total">
        <div class="stat-icon">
          <i class="fas fa-cogs"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStore.statistics.total_devices }}</div>
          <div class="stat-label">Wszystkie urządzenia</div>
        </div>
      </div>
      
      <div class="stat-card active">
        <div class="stat-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStore.statistics.active_devices }}</div>
          <div class="stat-label">Aktywne</div>
          <div class="stat-percentage">{{ deviceStore.statistics.active_percentage }}%</div>
        </div>
      </div>
      
      <div class="stat-card overdue">
        <div class="stat-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStore.statistics.overdue_services }}</div>
          <div class="stat-label">Zaległe serwisy</div>
          <div class="stat-percentage">{{ deviceStore.statistics.overdue_percentage }}%</div>
        </div>
      </div>
      
      <div class="stat-card upcoming">
        <div class="stat-icon">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStore.statistics.upcoming_services }}</div>
          <div class="stat-label">Nadchodzące serwisy</div>
        </div>
      </div>
    </div>

    <!-- Filters Panel -->
    <div class="filters-panel" v-show="showFilters">
      <div class="filters-content">
        <div class="filter-group">
          <label>Wyszukaj</label>
          <input
            type="text"
            v-model="searchQuery"
            @input="debouncedSearch"
            placeholder="Marka, model, numer seryjny, klient..."
            class="form-control"
          >
        </div>
        
        <div class="filter-group">
          <label>Typ urządzenia</label>
          <select v-model="filters.device_type" @change="applyFilters" class="form-control">
            <option value="">Wszystkie typy</option>
            <option 
              v-for="type in deviceStore.deviceConfig.device_types" 
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filters.status" @change="applyFilters" class="form-control">
            <option value="">Wszystkie statusy</option>
            <option 
              v-for="status in deviceStore.deviceConfig.status_options" 
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Marka</label>
          <input
            type="text"
            v-model="filters.brand"
            @input="debouncedBrandFilter"
            placeholder="Wprowadź markę..."
            class="form-control"
          >
        </div>
        
        <div class="filter-group">
          <label>Klient</label>
          <input
            type="text"
            v-model="filters.client_search"
            @input="debouncedClientFilter"
            placeholder="Imię i nazwisko klienta..."
            class="form-control"
          >
        </div>
        
        <div class="filter-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="filters.next_service_overdue"
              @change="applyFilters"
            >
            Tylko zaległe serwisy
          </label>
        </div>
        
        <div class="filter-actions">
          <button @click="resetFilters" class="btn btn-outline-secondary">
            <i class="fas fa-times"></i>
            Wyczyść filtry
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="deviceStore.error" class="alert alert-danger">
      <i class="fas fa-exclamation-circle"></i>
      {{ deviceStore.error }}
      <button @click="deviceStore.clearError()" class="btn-close"></button>
    </div>

    <!-- Loading State -->
    <div v-if="deviceStore.loading" class="loading-container">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Ładowanie urządzeń...</span>
      </div>
    </div>

    <!-- Devices Table -->
    <div v-else-if="deviceStore.hasDevices" class="devices-table-container">
      <div class="table-controls">
        <div class="table-info">
          Znaleziono {{ deviceStore.pagination.total }} urządzeń
        </div>
        
        <div class="table-actions">
          <select 
            v-model="pageSize" 
            @change="changePageSize"
            class="form-control page-size-select"
          >
            <option value="10">10 na stronę</option>
            <option value="20">20 na stronę</option>
            <option value="50">50 na stronę</option>
          </select>
          
          <button 
            v-if="selectedDevices.length > 0"
            @click="showBatchActions = true"
            class="btn btn-outline-primary"
          >
            <i class="fas fa-tasks"></i>
            Akcje grupowe ({{ selectedDevices.length }})
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="devices-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  @change="toggleSelectAll"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                >
              </th>
              <th @click="sortBy('device_type')" class="sortable">
                Typ
                <i class="fas fa-sort" :class="getSortIcon('device_type')"></i>
              </th>
              <th @click="sortBy('brand')" class="sortable">
                Marka/Model
                <i class="fas fa-sort" :class="getSortIcon('brand')"></i>
              </th>
              <th>Klient</th>
              <th>Numer seryjny</th>
              <th @click="sortBy('installation_date')" class="sortable">
                Data instalacji
                <i class="fas fa-sort" :class="getSortIcon('installation_date')"></i>
              </th>
              <th @click="sortBy('next_service_date')" class="sortable">
                Następny serwis
                <i class="fas fa-sort" :class="getSortIcon('next_service_date')"></i>
              </th>
              <th @click="sortBy('status')" class="sortable">
                Status
                <i class="fas fa-sort" :class="getSortIcon('status')"></i>
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="device in deviceStore.devices" 
              :key="device.id"
              :class="{ 'overdue': device.service_overdue }"
            >
              <td>
                <input
                  type="checkbox"
                  :value="device.id"
                  v-model="selectedDevices"
                >
              </td>
              <td>
                <div class="device-type">
                  <i :class="getDeviceIcon(device.device_type)"></i>
                  {{ device.device_type_label }}
                </div>
              </td>
              <td>
                <div class="device-brand">
                  <strong>{{ device.brand || 'Brak marki' }}</strong>
                  <div class="device-model">{{ device.model || 'Brak modelu' }}</div>
                </div>
              </td>
              <td>
                <div class="client-info">
                  <strong>{{ device.company_name || device.contact_person }}</strong>
                  <div class="client-contact">{{ device.client_phone }}</div>
                </div>
              </td>
              <td>
                <code class="serial-number">{{ device.serial_number || 'Brak' }}</code>
              </td>
              <td>
                <span v-if="device.installation_date">
                  {{ formatDate(device.installation_date) }}
                </span>
                <span v-else class="text-muted">Brak daty</span>
              </td>
              <td>
                <div class="service-info">
                  <span 
                    v-if="device.next_service_date"
                    :class="getServiceStatusClass(device)"
                  >
                    {{ formatDate(device.next_service_date) }}
                  </span>
                  <span v-else class="text-muted">Brak harmonogramu</span>
                  
                  <div 
                    v-if="device.service_overdue" 
                    class="service-badge overdue"
                  >
                    <i class="fas fa-exclamation-triangle"></i>
                    Zaległość
                  </div>
                  <div 
                    v-else-if="device.service_status === 'due_soon'" 
                    class="service-badge due-soon"
                  >
                    <i class="fas fa-clock"></i>
                    Wkrótce
                  </div>
                </div>
              </td>
              <td>
                <span 
                  class="status-badge"
                  :class="'status-' + device.status"
                >
                  {{ device.status_label }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    @click="viewDevice(device)"
                    class="btn btn-sm btn-outline-primary"
                    title="Szczegóły"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  
                  <button
                    @click="editDevice(device)"
                    class="btn btn-sm btn-outline-success"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  
                  <button
                    @click="deleteDevice(device)"
                    class="btn btn-sm btn-outline-danger"
                    title="Usuń"
                    :disabled="device.status === 'active'"
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
      <div class="pagination-container" v-if="deviceStore.pagination.totalPages > 1">
        <div class="pagination-info">
          Strona {{ deviceStore.pagination.page }} z {{ deviceStore.pagination.totalPages }}
          ({{ deviceStore.pagination.total }} urządzeń)
        </div>
        
        <div class="pagination-controls">
          <button
            @click="changePage(deviceStore.pagination.page - 1)"
            :disabled="deviceStore.isFirstPage"
            class="btn btn-outline-secondary"
          >
            <i class="fas fa-chevron-left"></i>
            Poprzednia
          </button>
          
          <button
            v-for="page in paginationPages"
            :key="page"
            @click="changePage(page)"
            class="btn"
            :class="page === deviceStore.pagination.page ? 'btn-primary' : 'btn-outline-secondary'"
          >
            {{ page }}
          </button>
          
          <button
            @click="changePage(deviceStore.pagination.page + 1)"
            :disabled="deviceStore.isLastPage"
            class="btn btn-outline-secondary"
          >
            Następna
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-cogs"></i>
      </div>
      <h3>Brak urządzeń</h3>
      <p>Nie znaleziono urządzeń spełniających kryteria wyszukiwania.</p>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <i class="fas fa-plus"></i>
        Dodaj pierwsze urządzenie
      </button>
    </div>

    <!-- Device Modal -->
    <DeviceModal
      :visible="showCreateModal || showEditModal"
      :device="editingDevice"
      :clients="clients"
      @close="closeModal"
      @saved="handleSave"
    />

    <!-- Device Details Modal -->
    <DeviceDetailsModal
      :visible="showDetailsModal"
      :device="viewingDevice"
      @close="showDetailsModal = false"
      @edit="editDevice"
    />

    <!-- Batch Actions Modal -->
    <BatchActionsModal
      :visible="showBatchActions"
      :selected-devices="selectedDevices"
      @close="showBatchActions = false"
      @action-complete="handleBatchActionComplete"
    />

    <!-- Delete Confirmation -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="Usuń urządzenie"
      :message="`Czy na pewno chcesz usunąć urządzenie ${deletingDevice?.brand} ${deletingDevice?.model}?`"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import DeviceModal from '@/components/devices/DeviceModal.vue'
import DeviceDetailsModal from '@/components/devices/DeviceDetailsModal.vue'
import BatchActionsModal from '@/components/devices/BatchActionsModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { debounce } from 'lodash'
import api from '@/services/api'

export default {
  name: 'DevicesView',
  components: {
    DeviceModal,
    DeviceDetailsModal,
    BatchActionsModal,
    ConfirmDialog
  },
  setup() {
    const deviceStore = useDeviceStore()
    
    // Modal states
    const showCreateModal = ref(false)
    const showEditModal = ref(false)
    const showDetailsModal = ref(false)
    const showBatchActions = ref(false)
    const showDeleteConfirm = ref(false)
    const showFilters = ref(false)
    
    // Current objects
    const editingDevice = ref(null)
    const viewingDevice = ref(null)
    const deletingDevice = ref(null)
    
    // Selection
    const selectedDevices = ref([])
    
    // Search and filters
    const searchQuery = ref('')
    const pageSize = ref(20)
    
    // Clients data
    const clients = ref([])
    
    const filters = reactive({
      device_type: '',
      status: '',
      brand: '',
      client_search: '',
      next_service_overdue: false
    })

    // Computed properties
    const hasActiveFilters = computed(() => {
      return searchQuery.value || 
             filters.device_type || 
             filters.status || 
             filters.brand || 
             filters.client_search ||
             filters.next_service_overdue
    })

    const allSelected = computed(() => {
      return selectedDevices.value.length === deviceStore.devices.length &&
             deviceStore.devices.length > 0
    })

    const someSelected = computed(() => {
      return selectedDevices.value.length > 0 && 
             selectedDevices.value.length < deviceStore.devices.length
    })

    const paginationPages = computed(() => {
      const total = deviceStore.pagination.totalPages
      const current = deviceStore.pagination.page
      const pages = []
      
      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i)
        }
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(total)
        } else if (current >= total - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = total - 4; i <= total; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(total)
        }
      }
      
      return pages
    })

    // Methods
    const debouncedSearch = debounce(() => {
      applyFilters()
    }, 300)

    const debouncedBrandFilter = debounce(() => {
      applyFilters()
    }, 300)
    
    const debouncedClientFilter = debounce(() => {
      applyFilters()
    }, 300)

    const applyFilters = async () => {
      const filterParams = {
        search: searchQuery.value,
        ...filters,
        page: 1 // Reset to first page when filtering
      }
      
      deviceStore.setFilters(filterParams)
      await deviceStore.fetchDevices(filterParams)
      selectedDevices.value = [] // Clear selection
    }

    const resetFilters = async () => {
      searchQuery.value = ''
      Object.assign(filters, {
        device_type: '',
        status: '',
        brand: '',
        client_search: '',
        next_service_overdue: false
      })
      
      deviceStore.resetFilters()
      await deviceStore.fetchDevices()
      selectedDevices.value = []
    }

    const sortBy = async (field) => {
      const currentSort = deviceStore.filters.sortBy
      const currentOrder = deviceStore.filters.sortOrder
      
      let newOrder = 'ASC'
      if (currentSort === field && currentOrder === 'ASC') {
        newOrder = 'DESC'
      }
      
      const sortParams = {
        sortBy: field,
        sortOrder: newOrder
      }
      
      deviceStore.setFilters(sortParams)
      await deviceStore.fetchDevices(sortParams)
    }

    const getSortIcon = (field) => {
      const currentSort = deviceStore.filters.sortBy
      const currentOrder = deviceStore.filters.sortOrder
      
      if (currentSort !== field) return ''
      return currentOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down'
    }

    const changePage = async (page) => {
      if (page < 1 || page > deviceStore.pagination.totalPages) return
      
      deviceStore.setPage(page)
      await deviceStore.fetchDevices({ page })
      selectedDevices.value = []
    }

    const changePageSize = async () => {
      deviceStore.setPageSize(pageSize.value)
      await deviceStore.fetchDevices()
      selectedDevices.value = []
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedDevices.value = []
      } else {
        selectedDevices.value = deviceStore.devices.map(d => d.id)
      }
    }

    const viewDevice = (device) => {
      viewingDevice.value = device
      showDetailsModal.value = true
    }

    const editDevice = (device) => {
      editingDevice.value = device
      showEditModal.value = true
    }

    const deleteDevice = (device) => {
      deletingDevice.value = device
      showDeleteConfirm.value = true
    }

    const confirmDelete = async () => {
      try {
        await deviceStore.deleteDevice(deletingDevice.value.id)
        showDeleteConfirm.value = false
        deletingDevice.value = null
        
        // Refresh list if needed
        if (deviceStore.devices.length === 0 && deviceStore.pagination.page > 1) {
          await changePage(deviceStore.pagination.page - 1)
        }
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }

    const closeModal = () => {
      showCreateModal.value = false
      showEditModal.value = false
      editingDevice.value = null
    }

    const handleSave = async () => {
      closeModal()
      await deviceStore.fetchDevices()
      await deviceStore.loadStatistics()
    }

    const handleBatchActionComplete = async () => {
      showBatchActions.value = false
      selectedDevices.value = []
      await deviceStore.fetchDevices()
    }

    const getDeviceIcon = (type) => {
      const icons = {
        burner: 'fas fa-fire',
        boiler: 'fas fa-fire-flame-curved',
        controller: 'fas fa-microchip',
        pump: 'fas fa-tint',
        valve: 'fas fa-grip-lines',
        sensor: 'fas fa-thermometer-half'
      }
      return icons[type] || 'fas fa-cog'
    }

    const getServiceStatusClass = (device) => {
      if (device.service_overdue) return 'service-overdue'
      if (device.service_status === 'due_soon') return 'service-due-soon'
      return 'service-ok'
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString('pl-PL')
    }

    const loadClients = async () => {
      try {
        const response = await api.get('/clients')
        if (response.data.success) {
          clients.value = response.data.data
        }
      } catch (error) {
        console.error('Failed to load clients:', error)
        // Set empty array if failed
        clients.value = []
      }
    }

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        deviceStore.initialize(),
        deviceStore.fetchDevices(),
        deviceStore.loadStatistics(),
        loadClients()
      ])
    })

    // Watch for filter changes
    watch(pageSize, (newSize) => {
      deviceStore.setPageSize(newSize)
    })

    return {
      // Store
      deviceStore,
      
      // Modal states
      showCreateModal,
      showEditModal,
      showDetailsModal,
      showBatchActions,
      showDeleteConfirm,
      showFilters,
      
      // Current objects
      editingDevice,
      viewingDevice,
      deletingDevice,
      
      // Data
      clients,
      
      // Selection
      selectedDevices,
      allSelected,
      someSelected,
      
      // Search and filters
      searchQuery,
      pageSize,
      filters,
      hasActiveFilters,
      
      // Computed
      paginationPages,
      
      // Methods
      debouncedSearch,
      debouncedBrandFilter,
      debouncedClientFilter,
      applyFilters,
      resetFilters,
      sortBy,
      getSortIcon,
      changePage,
      changePageSize,
      toggleSelectAll,
      viewDevice,
      editDevice,
      deleteDevice,
      confirmDelete,
      closeModal,
      handleSave,
      handleBatchActionComplete,
      loadClients,
      getDeviceIcon,
      getServiceStatusClass,
      formatDate
    }
  }
}
</script>

<style scoped>
.devices-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.devices-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.title-section h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.title-section .page-subtitle {
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Statistics Grid */
.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 4px solid #e5e7eb;
}

.stat-card.total { border-left-color: #3b82f6; }
.stat-card.active { border-left-color: #10b981; }
.stat-card.overdue { border-left-color: #ef4444; }
.stat-card.upcoming { border-left-color: #f59e0b; }

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-card.total .stat-icon { background: #dbeafe; color: #3b82f6; }
.stat-card.active .stat-icon { background: #d1fae5; color: #10b981; }
.stat-card.overdue .stat-icon { background: #fee2e2; color: #ef4444; }
.stat-card.upcoming .stat-icon { background: #fef3c7; color: #f59e0b; }

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.stat-percentage {
  color: #9ca3af;
  font-size: 0.75rem;
}

/* Filters Panel */
.filters-panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
  overflow: hidden;
}

.filters-content {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

/* Table */
.table-controls {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 16px;
  gap: 20px;
}

.table-info {
  color: #6b7280;
}

.table-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-size-select {
  width: auto;
  min-width: 140px;
}

.devices-table-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.devices-table {
  width: 100%;
  border-collapse: collapse;
}

.devices-table th,
.devices-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.devices-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.devices-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.devices-table th.sortable:hover {
  background: #f3f4f6;
}

.devices-table tbody tr:hover {
  background: #f9fafb;
}

.devices-table tbody tr.overdue {
  background: #fef2f2;
}

.device-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-brand strong {
  color: #1f2937;
}

.device-model {
  color: #6b7280;
  font-size: 0.875rem;
}

.client-info strong {
  color: #1f2937;
}

.client-contact {
  color: #6b7280;
  font-size: 0.875rem;
}

.serial-number {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #374151;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-overdue { color: #dc2626; }
.service-due-soon { color: #d97706; }
.service-ok { color: #059669; }

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.service-badge.overdue {
  background: #fee2e2;
  color: #dc2626;
}

.service-badge.due-soon {
  background: #fef3c7;
  color: #d97706;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-inactive {
  background: #f3f4f6;
  color: #374151;
}

.status-decommissioned {
  background: #fee2e2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.empty-icon {
  font-size: 4rem;
  color: #d1d5db;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #374151;
  margin: 0 0 12px 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 24px 0;
}

/* Loading */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.loading-spinner i {
  font-size: 2rem;
  color: #3b82f6;
}

/* Responsive */
@media (max-width: 768px) {
  .devices-view {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-content {
    grid-template-columns: 1fr;
  }
  
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
  }
}
</style> 
