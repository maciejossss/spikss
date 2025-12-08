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
    <div v-else-if="invoice">
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
              <h1 class="text-2xl font-bold text-secondary-900">{{ invoice.invoice_number }}</h1>
              <div class="flex items-center space-x-4 mt-2">
                <span
                  :class="getStatusClass(invoice.status)"
                  class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
                >
                  {{ getStatusText(invoice.status) }}
                </span>
                <span class="text-sm text-secondary-500">
                  {{ formatDate(invoice.issue_date) }}
                </span>
                <span class="text-lg font-bold text-primary-600">
                  {{ invoice.gross_amount?.toFixed(2) }} zł
                </span>
              </div>
            </div>
          </div>
          <div class="flex space-x-3">
            <button
              v-if="invoice.status === 'draft'"
              @click="sendInvoice"
              class="btn-primary"
            >
              <i class="fas fa-paper-plane mr-2"></i>
              Wyślij
            </button>
            <button
              v-if="invoice.status === 'sent'"
              @click="markAsPaid"
              class="btn-success"
            >
              <i class="fas fa-check mr-2"></i>
              Oznacz jako opłacona
            </button>
            <button
              @click="downloadPDF"
              class="btn-secondary"
            >
              <i class="fas fa-download mr-2"></i>
              PDF
            </button>
            <button
              @click="editInvoice"
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

      <!-- Alert dla przeterminowanych faktur -->
      <div v-if="isOverdue" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
          <div>
            <h3 class="text-sm font-medium text-red-800">Faktura przeterminowana</h3>
            <p class="text-sm text-red-700 mt-1">
              Termin płatności minął {{ daysPastDue }} dni temu ({{ formatDate(invoice.due_date) }})
            </p>
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
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Podgląd faktury -->
          <div v-if="activeTab === 'preview'">
            <div class="max-w-4xl mx-auto bg-white border border-secondary-200 rounded-lg p-8">
              <!-- Header faktury -->
              <div class="flex justify-between items-start mb-8">
                <div>
                  <h2 class="text-2xl font-bold text-secondary-900">FAKTURA</h2>
                  <p class="text-sm text-secondary-600 mt-1">{{ invoice.invoice_number }}</p>
                </div>
                <div class="text-right">
                  <div class="text-sm text-secondary-600">
                    <p>Data wystawienia: {{ formatDate(invoice.issue_date) }}</p>
                    <p>Termin płatności: {{ formatDate(invoice.due_date) }}</p>
                    <p v-if="invoice.order_number">Zlecenie: {{ invoice.order_number }}</p>
                  </div>
                </div>
              </div>

              <!-- Dane sprzedawcy i kupującego -->
              <div class="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 class="text-sm font-medium text-secondary-500 mb-2">SPRZEDAWCA</h3>
                  <div class="text-sm text-secondary-900">
                    <p class="font-medium">{{ companyInfo.name }}</p>
                    <p>{{ companyInfo.address }}</p>
                    <p>{{ companyInfo.postal_code }} {{ companyInfo.city }}</p>
                    <p>NIP: {{ companyInfo.nip }}</p>
                    <p v-if="companyInfo.regon">REGON: {{ companyInfo.regon }}</p>
                  </div>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-secondary-500 mb-2">NABYWCA</h3>
                  <div class="text-sm text-secondary-900">
                    <p class="font-medium">{{ invoice.client_name }}</p>
                    <p v-if="invoice.client_address">{{ invoice.client_address }}</p>
                    <p v-if="invoice.client_postal_code">{{ invoice.client_postal_code }} {{ invoice.client_city }}</p>
                    <p v-if="invoice.client_nip">NIP: {{ invoice.client_nip }}</p>
                  </div>
                </div>
              </div>

              <!-- Pozycje faktury -->
              <div class="mb-8">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="border-b-2 border-secondary-200">
                      <th class="text-left py-2 text-sm font-medium text-secondary-500">Lp.</th>
                      <th class="text-left py-2 text-sm font-medium text-secondary-500">Nazwa</th>
                      <th class="text-right py-2 text-sm font-medium text-secondary-500">Ilość</th>
                      <th class="text-right py-2 text-sm font-medium text-secondary-500">Cena netto</th>
                      <th class="text-right py-2 text-sm font-medium text-secondary-500">VAT</th>
                      <th class="text-right py-2 text-sm font-medium text-secondary-500">Wartość brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, index) in invoiceItems"
                      :key="item.id"
                      class="border-b border-secondary-100"
                    >
                      <td class="py-2 text-sm text-secondary-900">{{ index + 1 }}</td>
                      <td class="py-2 text-sm text-secondary-900">
                        {{ item.name }}
                        <p v-if="item.description" class="text-xs text-secondary-500 mt-1">
                          {{ item.description }}
                        </p>
                      </td>
                      <td class="py-2 text-sm text-secondary-900 text-right">{{ item.quantity }}</td>
                      <td class="py-2 text-sm text-secondary-900 text-right">{{ item.unit_price.toFixed(2) }} zł</td>
                      <td class="py-2 text-sm text-secondary-900 text-right">{{ (item.vat_rate * 100).toFixed(0) }}%</td>
                      <td class="py-2 text-sm text-secondary-900 text-right font-medium">
                        {{ (item.quantity * item.unit_price * (1 + item.vat_rate)).toFixed(2) }} zł
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Podsumowanie -->
              <div class="flex justify-end mb-8">
                <div class="w-64">
                  <div class="border-t border-secondary-200 pt-4">
                    <div class="flex justify-between py-1">
                      <span class="text-sm text-secondary-600">Wartość netto:</span>
                      <span class="text-sm text-secondary-900">{{ invoice.net_amount?.toFixed(2) }} zł</span>
                    </div>
                    <div class="flex justify-between py-1">
                      <span class="text-sm text-secondary-600">VAT:</span>
                      <span class="text-sm text-secondary-900">{{ invoice.vat_amount?.toFixed(2) }} zł</span>
                    </div>
                    <div class="flex justify-between py-2 border-t border-secondary-200">
                      <span class="text-base font-medium text-secondary-900">Wartość brutto:</span>
                      <span class="text-base font-bold text-secondary-900">{{ invoice.gross_amount?.toFixed(2) }} zł</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Informacje dodatkowe -->
              <div class="text-sm text-secondary-600">
                <p>Sposób płatności: {{ getPaymentMethodText(invoice.payment_method) }}</p>
                <p v-if="invoice.payment_method === 'transfer' && companyInfo.bank_account">
                  Numer konta: {{ companyInfo.bank_account }}
                </p>
                <p v-if="invoice.notes" class="mt-2">{{ invoice.notes }}</p>
              </div>
            </div>
          </div>

          <!-- Tab: Informacje -->
          <div v-if="activeTab === 'info'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Podstawowe informacje -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-info-circle mr-2"></i>
                  Podstawowe informacje
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Numer faktury</dt>
                    <dd class="text-sm text-secondary-900 font-mono">{{ invoice.invoice_number }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Data wystawienia</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(invoice.issue_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Termin płatności</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(invoice.due_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Sposób płatności</dt>
                    <dd class="text-sm text-secondary-900">{{ getPaymentMethodText(invoice.payment_method) }}</dd>
                  </div>
                  <div v-if="invoice.order_number">
                    <dt class="text-sm font-medium text-secondary-500">Zlecenie</dt>
                    <dd class="text-sm text-secondary-900">
                      <router-link 
                        v-if="invoice.order_id"
                        :to="`/orders/${invoice.order_id}`"
                        class="text-primary-600 hover:text-primary-900"
                      >
                        {{ invoice.order_number }}
                      </router-link>
                      <span v-else>{{ invoice.order_number }}</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Klient -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-user mr-2"></i>
                  Klient
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Nazwa</dt>
                    <dd class="text-sm text-secondary-900">
                      <router-link 
                        :to="`/clients/${invoice.client_id}`"
                        class="text-primary-600 hover:text-primary-900"
                      >
                        {{ invoice.client_name }}
                      </router-link>
                    </dd>
                  </div>
                  <div v-if="invoice.client_nip">
                    <dt class="text-sm font-medium text-secondary-500">NIP</dt>
                    <dd class="text-sm text-secondary-900">{{ invoice.client_nip }}</dd>
                  </div>
                  <div v-if="invoice.client_address">
                    <dt class="text-sm font-medium text-secondary-500">Adres</dt>
                    <dd class="text-sm text-secondary-900">
                      {{ invoice.client_address }}<br>
                      {{ invoice.client_postal_code }} {{ invoice.client_city }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Kwoty -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-euro-sign mr-2"></i>
                  Kwoty
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Wartość netto</dt>
                    <dd class="text-sm text-secondary-900">{{ invoice.net_amount?.toFixed(2) }} zł</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">VAT</dt>
                    <dd class="text-sm text-secondary-900">{{ invoice.vat_amount?.toFixed(2) }} zł</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Wartość brutto</dt>
                    <dd class="text-sm text-secondary-900 font-bold text-lg">{{ invoice.gross_amount?.toFixed(2) }} zł</dd>
                  </div>
                </dl>
              </div>

              <!-- Status płatności -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-credit-card mr-2"></i>
                  Status płatności
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Status</dt>
                    <dd class="text-sm text-secondary-900">
                      <span
                        :class="getStatusClass(invoice.status)"
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      >
                        {{ getStatusText(invoice.status) }}
                      </span>
                    </dd>
                  </div>
                  <div v-if="invoice.payment_date">
                    <dt class="text-sm font-medium text-secondary-500">Data płatności</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(invoice.payment_date) }}</dd>
                  </div>
                  <div v-if="isOverdue">
                    <dt class="text-sm font-medium text-secondary-500">Dni po terminie</dt>
                    <dd class="text-sm text-red-600 font-medium">{{ daysPastDue }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Notatki -->
            <div v-if="invoice.notes" class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-sticky-note mr-2"></i>
                Notatki
              </h3>
              <p class="text-sm text-secondary-700 whitespace-pre-wrap">{{ invoice.notes }}</p>
            </div>
          </div>

          <!-- Tab: Pozycje -->
          <div v-if="activeTab === 'items'">
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Pozycje faktury ({{ invoiceItems.length }})
                </h3>
                <button @click="addItem" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Dodaj pozycję
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-secondary-200 rounded-lg">
                  <thead class="bg-secondary-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Lp.</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nazwa</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Ilość</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cena netto</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">VAT</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Wartość brutto</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Akcje</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-200">
                    <tr v-for="(item, index) in invoiceItems" :key="item.id">
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ index + 1 }}</td>
                      <td class="px-4 py-3 text-sm text-secondary-900">
                        {{ item.name }}
                        <p v-if="item.description" class="text-xs text-secondary-500 mt-1">
                          {{ item.description }}
                        </p>
                      </td>
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ item.quantity }}</td>
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ item.unit_price.toFixed(2) }} zł</td>
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ (item.vat_rate * 100).toFixed(0) }}%</td>
                      <td class="px-4 py-3 text-sm text-secondary-900 font-medium">
                        {{ (item.quantity * item.unit_price * (1 + item.vat_rate)).toFixed(2) }} zł
                      </td>
                      <td class="px-4 py-3 text-sm">
                        <button
                          @click="editItem(item)"
                          class="text-secondary-600 hover:text-secondary-900 mr-2"
                          title="Edytuj"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button
                          @click="removeItem(item)"
                          class="text-red-600 hover:text-red-900"
                          title="Usuń"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab: Historia -->
          <div v-if="activeTab === 'history'">
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-secondary-900">Historia faktury</h3>
              
              <div class="space-y-4">
                <div
                  v-for="event in invoiceHistory"
                  :key="event.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4"
                >
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <div
                        :class="[
                          getEventTypeClass(event.type),
                          'w-8 h-8 rounded-full flex items-center justify-center'
                        ]"
                      >
                        <i :class="getEventTypeIcon(event.type)" class="text-white text-sm"></i>
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-secondary-900">{{ event.title }}</h4>
                        <span class="text-xs text-secondary-500">{{ formatDate(event.date) }}</span>
                      </div>
                      <p v-if="event.description" class="text-sm text-secondary-600 mt-1">
                        {{ event.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoice not found -->
    <div v-else class="text-center py-12">
      <i class="fas fa-file-invoice text-6xl text-secondary-300 mb-4"></i>
      <h2 class="text-xl font-medium text-secondary-900 mb-2">Faktura nie została znaleziona</h2>
      <p class="text-secondary-600 mb-6">Faktura o podanym ID nie istnieje lub została usunięta.</p>
      <router-link to="/invoices" class="btn-primary">
        <i class="fas fa-arrow-left mr-2"></i>
        Powrót do listy faktur
      </router-link>
    </div>

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń fakturę"
      :message="`Czy na pewno chcesz usunąć fakturę ${invoice.invoice_number}? Ta operacja jest nieodwracalna.`"
      confirm-text="Usuń fakturę"
      confirm-class="btn-danger"
      @confirm="deleteInvoice"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import ConfirmModal from '../../components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()

// Reactive data
const invoice = ref(null)
const invoiceItems = ref([])
const invoiceHistory = ref([])
const isLoading = ref(false)
const error = ref('')
const activeTab = ref('preview')
const showDeleteModal = ref(false)

// Company info (would be loaded from settings)
const companyInfo = ref({
  name: 'Firma Serwisowa Sp. z o.o.',
  address: 'ul. Przykładowa 123',
  postal_code: '00-001',
  city: 'Warszawa',
  nip: '1234567890',
  regon: '123456789',
  bank_account: '12 1234 5678 9012 3456 7890 1234'
})

// Computed properties
const tabs = computed(() => [
  { id: 'preview', name: 'Podgląd', icon: 'fas fa-eye' },
  { id: 'info', name: 'Informacje', icon: 'fas fa-info-circle' },
  { id: 'items', name: 'Pozycje', icon: 'fas fa-list' },
  { id: 'history', name: 'Historia', icon: 'fas fa-history' }
])

const isOverdue = computed(() => {
  if (!invoice.value?.due_date || invoice.value.status === 'paid') return false
  return new Date(invoice.value.due_date) < new Date()
})

const daysPastDue = computed(() => {
  if (!isOverdue.value) return 0
  const dueDate = new Date(invoice.value.due_date)
  const today = new Date()
  return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
})

// Helper methods
const getStatusClass = (status) => {
  const classes = {
    draft: 'bg-secondary-100 text-secondary-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getStatusText = (status) => {
  const texts = {
    draft: 'Projekt',
    sent: 'Wysłana',
    paid: 'Opłacona',
    overdue: 'Przeterminowana',
    cancelled: 'Anulowana'
  }
  return texts[status] || status
}

const getPaymentMethodText = (method) => {
  const texts = {
    cash: 'Gotówka',
    transfer: 'Przelew',
    card: 'Karta',
    online: 'Płatność online'
  }
  return texts[method] || method
}

const getEventTypeClass = (type) => {
  const classes = {
    created: 'bg-blue-500',
    sent: 'bg-green-500',
    viewed: 'bg-yellow-500',
    paid: 'bg-green-600',
    overdue: 'bg-red-500',
    cancelled: 'bg-red-600'
  }
  return classes[type] || 'bg-secondary-500'
}

const getEventTypeIcon = (type) => {
  const icons = {
    created: 'fas fa-plus',
    sent: 'fas fa-paper-plane',
    viewed: 'fas fa-eye',
    paid: 'fas fa-check',
    overdue: 'fas fa-exclamation-triangle',
    cancelled: 'fas fa-times'
  }
  return icons[type] || 'fas fa-info'
}

// Data loading methods
const loadInvoice = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const invoiceId = parseInt(route.params.id)
    
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        `SELECT i.*, c.first_name, c.last_name, c.company_name, c.type as client_type, c.nip as client_nip,
                c.address_street as client_address, c.address_postal_code as client_postal_code, c.address_city as client_city,
                so.order_number
         FROM invoices i 
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN service_orders so ON i.order_id = so.id
         WHERE i.id = ?`,
        [invoiceId]
      )
      
      if (result && result.length > 0) {
        invoice.value = {
          ...result[0],
          client_name: result[0].client_type === 'business' 
            ? result[0].company_name 
            : `${result[0].first_name} ${result[0].last_name}`
        }
      } else {
        invoice.value = null
      }
    } else {
      // Demo data fallback
      const demoInvoices = [
        { 
          id: 1,
          invoice_number: 'FV-2024-06-001',
          client_id: 1,
          client_name: 'Jan Kowalski',
          client_address: 'ul. Przykładowa 123',
          client_postal_code: '00-001',
          client_city: 'Warszawa',
          order_id: 1,
          order_number: 'SRV-2024-001',
          issue_date: '2024-06-15',
          due_date: '2024-07-15',
          status: 'paid',
          payment_method: 'transfer',
          payment_date: '2024-06-20',
          net_amount: 450.00,
          vat_amount: 103.50,
          gross_amount: 553.50,
          notes: 'Przegląd roczny kotła gazowego',
          created_at: '2024-06-15T08:00:00Z'
        },
        { 
          id: 2,
          invoice_number: 'FV-2024-07-008',
          client_id: 2,
          client_name: 'ABC Sp. z o.o.',
          client_nip: '1234567890',
          client_address: 'ul. Biznesowa 456',
          client_postal_code: '30-001',
          client_city: 'Kraków',
          order_id: 2,
          order_number: 'SRV-2024-015',
          issue_date: '2024-07-10',
          due_date: '2024-08-10',
          status: 'sent',
          payment_method: 'transfer',
          net_amount: 800.00,
          vat_amount: 184.00,
          gross_amount: 984.00,
          notes: 'Naprawa klimatyzacji',
          created_at: '2024-07-10T10:00:00Z'
        }
      ]
      invoice.value = demoInvoices.find(i => i.id === invoiceId) || null
    }
  } catch (err) {
    console.error('Error loading invoice:', err)
    error.value = 'Błąd podczas ładowania danych faktury'
  } finally {
    isLoading.value = false
  }
}

const loadInvoiceItems = async () => {
  if (!invoice.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id',
        [invoice.value.id]
      )
      invoiceItems.value = result || []
    } else {
      // Demo data
      const demoItems = [
        {
          id: 1,
          invoice_id: 1,
          name: 'Przegląd roczny kotła gazowego',
          description: 'Kompleksowy przegląd kotła, sprawdzenie wszystkich podzespołów',
          quantity: 1,
          unit_price: 300.00,
          vat_rate: 0.23
        },
        {
          id: 2,
          invoice_id: 1,
          name: 'Filtr powietrza',
          description: 'Wymiana filtra powietrza w kotle',
          quantity: 1,
          unit_price: 45.00,
          vat_rate: 0.23
        },
        {
          id: 3,
          invoice_id: 1,
          name: 'Uszczelka komory spalania',
          description: 'Wymiana uszczelki komory spalania',
          quantity: 1,
          unit_price: 25.00,
          vat_rate: 0.23
        }
      ]
      invoiceItems.value = demoItems.filter(item => item.invoice_id === invoice.value.id)
    }
  } catch (err) {
    console.error('Error loading invoice items:', err)
  }
}

const loadInvoiceHistory = async () => {
  if (!invoice.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM invoice_history WHERE invoice_id = ? ORDER BY date DESC',
        [invoice.value.id]
      )
      invoiceHistory.value = result || []
    } else {
      // Demo data
      const demoHistory = [
        {
          id: 1,
          invoice_id: 1,
          type: 'created',
          title: 'Faktura utworzona',
          description: 'Faktura została utworzona w systemie',
          date: '2024-06-15T08:00:00Z'
        },
        {
          id: 2,
          invoice_id: 1,
          type: 'sent',
          title: 'Faktura wysłana',
          description: 'Faktura została wysłana do klienta',
          date: '2024-06-15T10:00:00Z'
        },
        {
          id: 3,
          invoice_id: 1,
          type: 'paid',
          title: 'Płatność otrzymana',
          description: 'Płatność została zaksięgowana',
          date: '2024-06-20T14:30:00Z'
        }
      ]
      invoiceHistory.value = demoHistory.filter(h => h.invoice_id === invoice.value.id)
    }
  } catch (err) {
    console.error('Error loading invoice history:', err)
  }
}

// Action methods
const editInvoice = () => {
  router.push({ name: 'InvoicesList', query: { edit_id: invoice.value.id } })
}

const deleteInvoice = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'DELETE FROM invoices WHERE id = ?',
        [invoice.value.id]
      )
    }
    router.push('/invoices')
  } catch (err) {
    console.error('Error deleting invoice:', err)
    error.value = 'Błąd podczas usuwania faktury'
  }
  showDeleteModal.value = false
}

const sendInvoice = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE invoices SET status = ? WHERE id = ?',
        ['sent', invoice.value.id]
      )
    }
    invoice.value.status = 'sent'
    // Add to history
    invoiceHistory.value.unshift({
      id: Date.now(),
      invoice_id: invoice.value.id,
      type: 'sent',
      title: 'Faktura wysłana',
      description: 'Faktura została wysłana do klienta',
      date: new Date().toISOString()
    })
  } catch (err) {
    console.error('Error sending invoice:', err)
    error.value = 'Błąd podczas wysyłania faktury'
  }
}

const markAsPaid = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE invoices SET status = ?, payment_date = ? WHERE id = ?',
        ['paid', new Date().toISOString(), invoice.value.id]
      )
    }
    invoice.value.status = 'paid'
    invoice.value.payment_date = new Date().toISOString()
    // Add to history
    invoiceHistory.value.unshift({
      id: Date.now(),
      invoice_id: invoice.value.id,
      type: 'paid',
      title: 'Płatność otrzymana',
      description: 'Płatność została zaksięgowana',
      date: new Date().toISOString()
    })
  } catch (err) {
    console.error('Error marking invoice as paid:', err)
    error.value = 'Błąd podczas oznaczania faktury jako opłacona'
  }
}

const downloadPDF = () => {
  console.log('Download PDF for invoice:', invoice.value.id)
  // TODO: Implement PDF generation
}

// Placeholder methods for future implementation
const addItem = () => {
  console.log('Add item to invoice:', invoice.value.id)
  // TODO: Implement item management
}

const editItem = (item) => {
  console.log('Edit item:', item.id)
  // TODO: Implement item management
}

const removeItem = (item) => {
  console.log('Remove item:', item.id)
  // TODO: Implement item management
}

// Watchers
watch(() => route.params.id, () => {
  loadInvoice()
}, { immediate: true })

watch(invoice, () => {
  if (invoice.value) {
    Promise.all([
      loadInvoiceItems(),
      loadInvoiceHistory()
    ])
  }
})

// Lifecycle
onMounted(() => {
  loadInvoice()
})
</script> 