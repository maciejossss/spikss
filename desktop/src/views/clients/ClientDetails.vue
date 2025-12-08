<template>
  <div class="p-6">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-primary-600"></i>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex">
        <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
        <div>
          <h3 class="text-sm font-medium text-red-800">Błąd ładowania danych</h3>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Główna zawartość -->
    <div v-else-if="client">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.go(-1)"
              class="flex items-center text-secondary-600 hover:text-secondary-900"
            >
              <i class="fas fa-arrow-left mr-2"></i>
              Powrót
            </button>
            <div class="h-6 border-l border-secondary-300"></div>
            <div>
              <h1 class="text-2xl font-bold text-secondary-900">
                {{ getClientName(client) }}
              </h1>
              <div class="flex items-center space-x-4 mt-1">
                <span
                  :class="client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ client.is_active ? 'Aktywny' : 'Nieaktywny' }}
                </span>
                <span class="text-sm text-secondary-500">
                  {{ client.type === 'business' ? 'Firma' : 'Klient prywatny' }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex space-x-3">
            <button
              @click="editClient"
              class="btn-secondary"
            >
              <i class="fas fa-edit mr-2"></i>
              Edytuj
            </button>
            <button
              @click="showDeleteModal = true"
              class="btn-danger"
            >
              <i class="fas fa-trash mr-2"></i>
              Usuń
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 mb-6">
        <div class="border-b border-secondary-200">
          <nav class="flex space-x-8 px-6">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              <i :class="tab.icon" class="mr-2"></i>
              {{ tab.name }}
              <span v-if="tab.count !== undefined" class="ml-2 bg-secondary-100 text-secondary-600 py-1 px-2 rounded-full text-xs">
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Informacje -->
          <div v-if="activeTab === 'info'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Dane podstawowe -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-user mr-2"></i>
                  Dane {{ client.type === 'business' ? 'firmy' : 'osobowe' }}
                </h3>
                <dl class="space-y-3">
                  <div v-if="client.type === 'business'">
                    <dt class="text-sm font-medium text-secondary-500">Nazwa firmy</dt>
                    <dd class="text-sm text-secondary-900">{{ client.company_name }}</dd>
                  </div>
                  <div v-else>
                    <dt class="text-sm font-medium text-secondary-500">Imię i nazwisko</dt>
                    <dd class="text-sm text-secondary-900">{{ client.first_name }} {{ client.last_name }}</dd>
                  </div>
                  
                  <div v-if="client.type === 'business' && client.nip">
                    <dt class="text-sm font-medium text-secondary-500">NIP</dt>
                    <dd class="text-sm text-secondary-900">{{ client.nip }}</dd>
                  </div>
                  
                  <div v-if="client.type === 'business' && client.regon">
                    <dt class="text-sm font-medium text-secondary-500">REGON</dt>
                    <dd class="text-sm text-secondary-900">{{ client.regon }}</dd>
                  </div>
                  
                  <div v-if="client.created_at">
                    <dt class="text-sm font-medium text-secondary-500">Data dodania</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(client.created_at) }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Kontakt -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-phone mr-2"></i>
                  Kontakt
                </h3>
                <dl class="space-y-3">
                  <div v-if="client.email">
                    <dt class="text-sm font-medium text-secondary-500">Email</dt>
                    <dd class="text-sm text-secondary-900">
                      <a :href="`mailto:${client.email}`" class="text-primary-600 hover:text-primary-900">
                        {{ client.email }}
                      </a>
                    </dd>
                  </div>
                  
                  <div v-if="client.phone">
                    <dt class="text-sm font-medium text-secondary-500">Telefon</dt>
                    <dd class="text-sm text-secondary-900">
                      <a :href="`tel:${client.phone}`" class="text-primary-600 hover:text-primary-900">
                        {{ client.phone }}
                      </a>
                    </dd>
                  </div>
                  
                  <div v-if="hasAddress">
                    <dt class="text-sm font-medium text-secondary-500">Adres</dt>
                    <dd class="text-sm text-secondary-900">
                      <div v-if="client.address_street">{{ client.address_street }}</div>
                      <div v-if="client.address_postal_code || client.address_city">
                        {{ client.address_postal_code }} {{ client.address_city }}
                      </div>
                      <div v-if="client.address_country">{{ client.address_country }}</div>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Notatki -->
            <div v-if="client.notes" class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-sticky-note mr-2"></i>
                Notatki
              </h3>
              <p class="text-sm text-secondary-700 whitespace-pre-wrap">{{ client.notes }}</p>
            </div>

			<!-- Galeria zdjęć z ostatnich zleceń (skrót) -->
			<div v-if="activeTab === 'info'" class="mt-6 bg-secondary-50 rounded-lg p-4">
				<h3 class="text-lg font-medium text-secondary-900 mb-3">
					<i class="fas fa-images mr-2"></i>
					Ostatnie zdjęcia z realizacji
				</h3>
				<div v-if="recentPhotos.length" class="grid grid-cols-2 md:grid-cols-4 gap-2">
					<div v-for="(ph, idx) in recentPhotos" :key="idx" class="aspect-square bg-white border border-secondary-200 rounded overflow-hidden">
						<img :src="resolvePhotoSrc(ph)" alt="photo" class="w-full h-full object-cover" />
					</div>
				</div>
				<div v-else class="text-sm text-secondary-600">Brak zdjęć w ostatnich realizacjach</div>
			</div>
          </div>

          <!-- Tab: Urządzenia -->
          <div v-if="activeTab === 'devices'">
            <div v-if="clientDevices.length === 0" class="text-center py-8">
              <i class="fas fa-tools text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak urządzeń przypisanych do tego klienta</p>
              <button @click="addDevice" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Dodaj pierwsze urządzenie
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Urządzenia klienta ({{ clientDevices.length }})
                </h3>
                <button @click="addDevice" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Dodaj urządzenie
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="device in clientDevices"
                  :key="device.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-secondary-900">{{ device.name }}</h4>
                      <p v-if="device.manufacturer" class="text-sm text-secondary-600">{{ device.manufacturer }}</p>
                      <p v-if="device.model" class="text-sm text-secondary-500">Model: {{ device.model }}</p>
                      <div v-if="device.last_service_date" class="mt-2">
                        <span class="text-xs text-secondary-500">Ostatni serwis:</span>
                        <span class="text-xs text-secondary-700 ml-1">{{ formatDate(device.last_service_date) }}</span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="$router.push(`/devices/${device.id}`)"
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Zlecenia -->
          <div v-if="activeTab === 'orders'">
            <div v-if="clientOrders.length === 0" class="text-center py-8">
              <i class="fas fa-clipboard-list text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak zleceń dla tego klienta</p>
              <button @click="addOrder" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Utwórz pierwsze zlecenie
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Historia zleceń ({{ clientOrders.length }})
                </h3>
                <button @click="addOrder" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Nowe zlecenie
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="order in clientOrders"
                  :key="order.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <h4 class="font-medium text-secondary-900">{{ order.order_number }}</h4>
                        <span
                          :class="getStatusClass(order.status)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getStatusText(order.status) }}
                        </span>
                        <span
                          :class="getPriorityClass(order.priority)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getPriorityText(order.priority) }}
                        </span>
                      </div>
                      <p class="text-sm text-secondary-600 mt-1">{{ order.title }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span>{{ formatDate(order.created_at) }}</span>
                        <span v-if="order.total_cost">{{ order.total_cost.toFixed(2) }} zł</span>
                        <span v-if="order.device_name">{{ order.device_name }}</span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="$router.push(`/orders/${order.id}`)"
                        class="text-primary-600 hover:text-primary-900"
                        title="Zobacz szczegóły"
                      >
                        <i class="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Faktury -->
          <div v-if="activeTab === 'invoices'">
            <div v-if="clientInvoices.length === 0" class="text-center py-8">
              <i class="fas fa-file-invoice text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak faktur dla tego klienta</p>
              <button @click="addInvoice" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Utwórz pierwszą fakturę
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Faktury ({{ clientInvoices.length }})
                </h3>
                <button @click="addInvoice" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Nowa faktura
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="invoice in clientInvoices"
                  :key="invoice.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <h4 class="font-medium text-secondary-900">{{ invoice.invoice_number }}</h4>
                        <span
                          :class="getInvoiceStatusClass(invoice.status)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getInvoiceStatusText(invoice.status) }}
                        </span>
                      </div>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span>{{ formatDate(invoice.issue_date) }}</span>
                        <span class="font-medium">{{ invoice.gross_amount?.toFixed(2) }} zł</span>
                        <span v-if="invoice.order_number">Zlecenie: {{ invoice.order_number }}</span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="$router.push(`/invoices/${invoice.id}`)"
                        class="text-primary-600 hover:text-primary-900"
                        title="Zobacz szczegóły"
                      >
                        <i class="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client not found -->
    <div v-else class="text-center py-12">
      <i class="fas fa-user-slash text-6xl text-secondary-300 mb-4"></i>
      <h2 class="text-xl font-medium text-secondary-900 mb-2">Klient nie został znaleziony</h2>
      <p class="text-secondary-600 mb-6">Klient o podanym ID nie istnieje lub został usunięty.</p>
      <router-link to="/clients" class="btn-primary">
        <i class="fas fa-arrow-left mr-2"></i>
        Powrót do listy klientów
      </router-link>
    </div>

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń klienta"
      :message="`Czy na pewno chcesz usunąć klienta ${getClientName(client)}? Ta operacja jest nieodwracalna.`"
      confirm-text="Usuń klienta"
      confirm-class="btn-danger"
      @confirm="deleteClient"
      @cancel="showDeleteModal = false"
    />

    <!-- Modals for adding/editing related entities -->
    <ClientFormModal
      v-if="showClientModal"
      :client="client"
      :is-edit="true"
      @close="showClientModal = false"
      @saved="onClientUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import ConfirmModal from '../../components/ConfirmModal.vue'
import config from '../../../env-config.js'
import ClientFormModal from './ClientFormModal.vue'

const route = useRoute()
const router = useRouter()

// Reactive data
const client = ref(null)
const clientDevices = ref([])
const clientOrders = ref([])
const clientInvoices = ref([])
const isLoading = ref(false)
const error = ref('')
const activeTab = ref('info')
const showDeleteModal = ref(false)
const showClientModal = ref(false)

// Computed properties
const tabs = computed(() => [
  { id: 'info', name: 'Informacje', icon: 'fas fa-info-circle' },
  { id: 'devices', name: 'Urządzenia', icon: 'fas fa-tools', count: clientDevices.value.length },
  { id: 'orders', name: 'Zlecenia', icon: 'fas fa-clipboard-list', count: clientOrders.value.length },
  { id: 'invoices', name: 'Faktury', icon: 'fas fa-file-invoice', count: clientInvoices.value.length }
])

const hasAddress = computed(() => {
  return client.value?.address_street || client.value?.address_city || client.value?.address_postal_code
})

// Helper methods
const getClientName = (client) => {
  if (!client) return ''
  return client.type === 'business' 
    ? client.company_name 
    : `${client.first_name} ${client.last_name}`
}

const getStatusClass = (status) => {
  const classes = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_for_parts: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getStatusText = (status) => {
  const texts = {
    new: 'Nowe',
    in_progress: 'W realizacji',
    waiting_for_parts: 'Oczekuje na części',
    completed: 'Ukończone',
    cancelled: 'Anulowane'
  }
  return texts[status] || status
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

const getPriorityText = (priority) => {
  const texts = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny'
  }
  return texts[priority] || priority
}

const getInvoiceStatusClass = (status) => {
  const classes = {
    draft: 'bg-secondary-100 text-secondary-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getInvoiceStatusText = (status) => {
  const texts = {
    draft: 'Projekt',
    sent: 'Wysłana',
    paid: 'Opłacona',
    overdue: 'Przeterminowana',
    cancelled: 'Anulowana'
  }
  return texts[status] || status
}

// Data loading methods
const loadClient = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const clientId = parseInt(route.params.id)
    
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM clients WHERE id = ?',
        [clientId]
      )
      client.value = result?.[0] || null
    } else {
      // Demo data fallback
      const demoClients = [
        { 
          id: 1, 
          type: 'individual', 
          first_name: 'Jan', 
          last_name: 'Kowalski',
          email: 'jan.kowalski@email.com',
          phone: '+48 123 456 789',
          address_street: 'ul. Przykładowa 123',
          address_city: 'Warszawa',
          address_postal_code: '00-001',
          address_country: 'Polska',
          notes: 'Stały klient, preferuje kontakt telefoniczny.',
          is_active: 1,
          created_at: '2024-01-15T10:00:00Z'
        },
        { 
          id: 2, 
          type: 'business', 
          company_name: 'ABC Sp. z o.o.',
          nip: '1234567890',
          regon: '123456789',
          email: 'kontakt@abc.pl',
          phone: '+48 22 123 45 67',
          address_street: 'ul. Biznesowa 456',
          address_city: 'Kraków',
          address_postal_code: '30-001',
          address_country: 'Polska',
          is_active: 1,
          created_at: '2024-02-20T14:30:00Z'
        }
      ]
      client.value = demoClients.find(c => c.id === clientId) || null
    }
  } catch (err) {
    console.error('Error loading client:', err)
    error.value = 'Błąd podczas ładowania danych klienta'
  } finally {
    isLoading.value = false
  }
}

const loadClientDevices = async () => {
  if (!client.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM devices WHERE client_id = ? AND is_active = 1 ORDER BY name',
        [client.value.id]
      )
      clientDevices.value = result || []
    } else {
      // Demo data
      const demoDevices = [
        { 
          id: 1, 
          client_id: 1, 
          name: 'Kocioł gazowy Viessmann', 
          manufacturer: 'Viessmann',
          model: 'Vitopend 100',
          last_service_date: '2024-06-15'
        },
        { 
          id: 2, 
          client_id: 2, 
          name: 'Klimatyzator Daikin', 
          manufacturer: 'Daikin',
          model: 'Sensira FTXC25B',
          last_service_date: '2024-05-20'
        }
      ]
      clientDevices.value = demoDevices.filter(d => d.client_id === client.value.id)
    }
  } catch (err) {
    console.error('Error loading client devices:', err)
  }
}

const loadClientOrders = async () => {
  if (!client.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        `SELECT so.*, d.name as device_name 
         FROM service_orders so 
         LEFT JOIN devices d ON so.device_id = d.id 
         WHERE so.client_id = ? 
         ORDER BY so.created_at DESC`,
        [client.value.id]
      )
      clientOrders.value = result || []
    } else {
      // Demo data
      const demoOrders = [
        {
          id: 1,
          order_number: 'SRV-2024-001',
          client_id: 1,
          title: 'Przegląd roczny kotła',
          status: 'completed',
          priority: 'medium',
          total_cost: 450,
          device_name: 'Kocioł gazowy Viessmann',
          created_at: '2024-06-01T09:00:00Z'
        },
        {
          id: 2,
          order_number: 'SRV-2024-015',
          client_id: 2,
          title: 'Naprawa klimatyzacji - brak chłodzenia',
          status: 'in_progress',
          priority: 'high',
          total_cost: 800,
          device_name: 'Klimatyzator Daikin',
          created_at: '2024-07-05T14:30:00Z'
        }
      ]
      clientOrders.value = demoOrders.filter(o => o.client_id === client.value.id)
    }
  } catch (err) {
    console.error('Error loading client orders:', err)
  }
}

const loadClientInvoices = async () => {
  if (!client.value) return
  
  try {
    if (window.electronAPI?.database) {
      // Złącz dane z invoices i simple_invoices
      const result = await window.electronAPI.database.query(
        `SELECT i.id, i.invoice_number, i.client_id, i.order_id, i.gross_amount, i.issue_date, i.status, so.order_number
         FROM invoices i LEFT JOIN service_orders so ON i.order_id = so.id WHERE i.client_id = ?
         UNION ALL
         SELECT si.id, si.invoice_number, so.client_id, si.order_id, si.amount as gross_amount, si.created_at as issue_date, 'saved' as status, so.order_number
         FROM simple_invoices si LEFT JOIN service_orders so ON si.order_id = so.id WHERE so.client_id = ?
         ORDER BY issue_date DESC`,
        [client.value.id, client.value.id]
      )
      clientInvoices.value = result || []
    } else {
      // Demo fallback pozostaje bez zmian
    }
  } catch (err) {
    console.error('Error loading client invoices:', err)
  }
}

// Action methods
const editClient = () => {
  showClientModal.value = true
}

const deleteClient = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE clients SET is_active = 0 WHERE id = ?',
        [client.value.id]
      )
    }
    router.push('/clients')
  } catch (err) {
    console.error('Error deleting client:', err)
    error.value = 'Błąd podczas usuwania klienta'
  }
  showDeleteModal.value = false
}

const addDevice = () => {
  router.push({ name: 'DevicesList', query: { client_id: client.value.id, add: 'true' } })
}

const editDevice = (device) => {
  router.push({ name: 'DevicesList', query: { edit_id: device.id } })
}

const addOrder = () => {
  router.push({ name: 'OrdersList', query: { client_id: client.value.id, add: 'true' } })
}

const addInvoice = () => {
  router.push({ name: 'InvoicesList', query: { client_id: client.value.id, add: 'true' } })
}

const onClientUpdated = (updatedClient) => {
  client.value = { ...client.value, ...updatedClient }
  showClientModal.value = false
}

// Watchers
watch(() => route.params.id, () => {
  loadClient()
}, { immediate: true })

watch(client, () => {
  if (client.value) {
    Promise.all([
      loadClientDevices(),
      loadClientOrders(),
      loadClientInvoices()
    ])
  }
})

// Lifecycle
onMounted(() => {
  loadClient()
})

const parsePhotos = (wp) => {
  try { const arr = typeof wp === 'string' ? JSON.parse(wp) : (Array.isArray(wp) ? wp : []); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

const recentPhotos = computed(() => {
  const photos = []
  for (const o of clientOrders.value || []) {
    if (o?.work_photos) photos.push(...parsePhotos(o.work_photos))
    if (photos.length >= 8) break
  }
  return photos.slice(0, 8)
})

const resolvePhotoSrc = (ph) => {
  const val = typeof ph === 'string' ? ph : (ph?.path || ph?.url || '')
  if (!val) return ''
  const v = String(val)
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v
  const railway = config.RAILWAY_URL || 'https://web-production-fc58d.up.railway.app'
  if (v.startsWith('/uploads')) return `${railway.replace(/\/$/, '')}${v}`
  if (v.startsWith('uploads/')) return `${railway.replace(/\/$/, '')}/${v}`
  if (window?.electronAPI && /^[A-Za-z]:\\/.test(v)) return 'file:///' + v.replace(/\\/g, '/')
  return v
}
</script> 