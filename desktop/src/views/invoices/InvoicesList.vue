<template>
  <div class="p-6">
    <!-- Nagłówek -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-secondary-900">Faktury</h1>
      <div class="text-sm text-secondary-600">
        Prosty system dodawania faktur do zakończonych zleceń
      </div>
    </div>

    <!-- Lista zakończonych zleceń bez faktury -->
    <div class="bg-white rounded-lg shadow mb-6">
      <div class="px-6 py-4 border-b border-secondary-200">
        <h2 class="text-lg font-semibold text-secondary-900">
          <i class="fas fa-clock mr-2 text-orange-500"></i>
          Zlecenia do zafakturowania ({{ completedOrdersWithoutInvoice.length }})
        </h2>
      </div>
      
      <div v-if="completedOrdersWithoutInvoice.length === 0" class="p-6 text-center text-secondary-500">
        <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
        <p>Wszystkie zakończone zlecenia mają przypisane faktury</p>
      </div>
      
      <div v-else class="divide-y divide-secondary-200">
        <div
          v-for="order in completedOrdersWithoutInvoice"
          :key="order.id"
          class="p-4 hover:bg-secondary-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {{ order.order_number }}
                </span>
                <span class="font-medium text-secondary-900">{{ order.title }}</span>
                <span class="text-sm text-secondary-600">{{ order.client_name }}</span>
              </div>
              <div class="mt-1 text-sm text-secondary-500">
                Zakończono: {{ formatDate(order.completed_at) }}
                <span v-if="order.total_cost" class="ml-3">
                  Wartość: {{ formatCurrency(order.total_cost) }}
                </span>
              </div>
            </div>
            <button
              @click="showAddInvoiceModal(order)"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Dodaj fakturę
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista istniejących faktur -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-secondary-200">
        <h2 class="text-lg font-semibold text-secondary-900">
          <i class="fas fa-file-invoice mr-2 text-green-500"></i>
          Dodane faktury ({{ invoices.length }})
        </h2>
      </div>
      
      <div v-if="invoices.length === 0" class="p-6 text-center text-secondary-500">
        <i class="fas fa-file-invoice text-secondary-300 text-3xl mb-2"></i>
        <p>Brak dodanych faktur</p>
      </div>
      
      <div v-else class="divide-y divide-secondary-200">
        <div
          v-for="invoice in invoices"
          :key="invoice.id"
          class="p-4 hover:bg-secondary-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <span class="font-mono text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  {{ invoice.invoice_number }}
                </span>
                <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  Zlecenie: {{ invoice.order_number }}
                </span>
                <span class="text-sm text-secondary-600">{{ invoice.client_name }}</span>
              </div>
              <div class="mt-1 text-sm text-secondary-500">
                Dodano: {{ formatDate(invoice.created_at) }}
                <span v-if="invoice.amount" class="ml-3">
                  Kwota: {{ formatCurrency(invoice.amount) }}
                </span>
              </div>
            </div>
            <div class="flex space-x-2">
              <button
                v-if="invoice.file_path"
                @click="viewInvoiceFile(invoice)"
                class="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors"
                title="Podgląd faktury"
              >
                <i class="fas fa-eye"></i>
              </button>
              <button
                @click="deleteInvoice(invoice)"
                class="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors"
                title="Usuń"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania faktury -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          Dodaj fakturę do zlecenia
        </h3>
        
        <div class="space-y-4">
          <div class="bg-gray-50 p-3 rounded">
            <p class="text-sm text-secondary-600">Zlecenie:</p>
            <p class="font-semibold">{{ selectedOrder?.order_number }} - {{ selectedOrder?.title }}</p>
            <p class="text-sm text-secondary-600">Klient: {{ selectedOrder?.client_name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Numer faktury *
            </label>
            <input
              v-model="invoiceForm.invoice_number"
              type="text"
              required
              placeholder="np. FV/2025/001"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kwota faktury
            </label>
            <input
              v-model="invoiceForm.amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Plik faktury (JPG, PNG, PDF)
            </label>
            <input
              ref="fileInput"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              @change="handleFileSelect"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p class="text-xs text-secondary-500 mt-1">Maksymalny rozmiar: 10MB</p>
          </div>

          <div v-if="selectedFile" class="bg-blue-50 p-3 rounded">
            <p class="text-sm text-blue-800">
              <i class="fas fa-file mr-2"></i>
              Wybrany plik: {{ selectedFile.name }}
              ({{ formatFileSize(selectedFile.size) }})
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button
            @click="closeModal"
            type="button"
            class="px-4 py-2 text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 transition-colors"
          >
            Anuluj
          </button>
          <button
            @click="saveInvoice"
            :disabled="!invoiceForm.invoice_number || isSaving"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-save mr-2"></i>
            {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal podglądu faktury -->
    <div v-if="showPreviewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-secondary-900">
            Podgląd faktury: {{ previewInvoice?.invoice_number }}
          </h3>
          <button
            @click="showPreviewModal = false"
            class="text-secondary-500 hover:text-secondary-700"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="text-center">
          <img
            v-if="previewInvoice?.file_path && isImageFile(previewInvoice.file_path)"
            :src="previewInvoice.file_path"
            :alt="previewInvoice.invoice_number"
            class="max-w-full max-h-96 mx-auto rounded-lg shadow"
          />
          <iframe
            v-else-if="previewInvoice?.file_path && isPdfFile(previewInvoice.file_path)"
            :src="previewInvoice.file_path"
            class="w-full h-96 border rounded-lg"
          ></iframe>
          <div v-else class="p-8 text-secondary-500">
            <i class="fas fa-file text-4xl mb-4"></i>
            <p>Nie można wyświetlić podglądu pliku</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { config } from '../../../env-config.js'

// Reactive data
const completedOrdersWithoutInvoice = ref([])
const invoices = ref([])
const showModal = ref(false)
const showPreviewModal = ref(false)
const selectedOrder = ref(null)
const previewInvoice = ref(null)
const selectedFile = ref(null)
const fileInput = ref(null)
const isSaving = ref(false)

const invoiceForm = reactive({
  invoice_number: '',
  amount: '',
  notes: ''
})

// Computed
const isLoading = computed(() => isSaving.value)

// Methods
const loadData = async () => {
  try {
    // Pobierz zakończone zlecenia bez faktury
    const completedOrders = await window.electronAPI.database.query(`
      SELECT o.*, 
             c.first_name, c.last_name, c.company_name, c.type as client_type,
             d.name as device_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN simple_invoices si ON o.id = si.order_id
      WHERE o.status = 'completed' 
        AND si.id IS NULL
      ORDER BY o.completed_at DESC
    `)
    
    completedOrdersWithoutInvoice.value = (completedOrders || []).map(order => ({
      ...order,
      client_name: order.company_name || `${order.first_name} ${order.last_name}` || 'Nieznany klient'
    }))

    // Pobierz istniejące faktury
    const existingInvoices = await window.electronAPI.database.query(`
      SELECT si.*, 
             o.order_number, o.title as order_title,
             c.first_name, c.last_name, c.company_name, c.type as client_type
      FROM simple_invoices si
      LEFT JOIN service_orders o ON si.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY si.created_at DESC
    `)
    
    invoices.value = (existingInvoices || []).map(invoice => ({
      ...invoice,
      client_name: invoice.company_name || `${invoice.first_name} ${invoice.last_name}` || 'Nieznany klient'
    }))
    
  } catch (error) {
    console.error('Błąd podczas ładowania danych:', error)
    alert('Wystąpił błąd podczas ładowania danych')
  }
}

const showAddInvoiceModal = (order) => {
  selectedOrder.value = order
  invoiceForm.invoice_number = ''
  invoiceForm.amount = order.total_cost || ''
  invoiceForm.notes = ''
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedOrder.value = null
  selectedFile.value = null
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Sprawdź rozmiar pliku (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Plik jest za duży. Maksymalny rozmiar to 10MB.')
      event.target.value = ''
      return
    }
    
    // Sprawdź typ pliku
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Nieprawidłowy typ pliku. Dozwolone są tylko JPG, PNG i PDF.')
      event.target.value = ''
      return
    }
    
    selectedFile.value = file
  }
}

const saveInvoice = async () => {
  if (!invoiceForm.invoice_number.trim()) {
    alert('Numer faktury jest wymagany!')
    return
  }

  isSaving.value = true

  try {
    // Walidacja podstawowa numeru faktury
    if (!invoiceForm.invoice_number || !invoiceForm.invoice_number.toString().trim()) {
      alert('Podaj numer faktury')
      isSaving.value = false
      return
    }

    // Sprawdź duplikaty numeru faktury
    const dup = await window.electronAPI.database.query('SELECT id FROM simple_invoices WHERE invoice_number = ?', [invoiceForm.invoice_number])
    if (Array.isArray(dup) && dup.length > 0) {
      alert('Faktura o tym numerze już istnieje. Zmień numer lub użyj innego prefiksu.')
      isSaving.value = false
      return
    }

    // Zapis pliku (opcjonalny)
    let filePath = null
    if (selectedFile.value) {
      filePath = await saveInvoiceFile(selectedFile.value, invoiceForm.invoice_number)
    }

    // Zapisz fakturę w bazie
    await window.electronAPI.database.run(`
      INSERT INTO simple_invoices (
        invoice_number, order_id, amount, file_path, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      invoiceForm.invoice_number,
      selectedOrder.value.id,
      invoiceForm.amount ? parseFloat(invoiceForm.amount) : null,
      filePath,
      invoiceForm.notes
    ])

    // Ustaw sygnał archiwizacji (pomaga w natychmiastowym przeniesieniu do zakładki Archiwum)
    let hasInvoiceColumn = false
    try {
      const columns = await window.electronAPI.database.query('PRAGMA table_info(service_orders)')
      if (Array.isArray(columns)) {
        hasInvoiceColumn = columns.some(col => {
          const name = col?.name ?? col?.Name
          return typeof name === 'string' && name.toLowerCase() === 'has_invoice'
        })
      }
      if (!hasInvoiceColumn) {
        await window.electronAPI.database.run('ALTER TABLE service_orders ADD COLUMN has_invoice INTEGER DEFAULT 0')
        hasInvoiceColumn = true
      }
    } catch (alterError) {
      console.warn('[Invoices] Nie udało się dodać kolumny has_invoice:', alterError?.message || alterError)
    }

    if (hasInvoiceColumn) {
      try {
        await window.electronAPI.database.run('UPDATE service_orders SET has_invoice = 1 WHERE id = ?', [selectedOrder.value.id])
      } catch (updateError) {
        console.warn('[Invoices] Nie udało się zaktualizować flagi has_invoice:', updateError?.message || updateError)
      }
    }

    // Dodaj do historii klienta na Railway (jako wpis typu "invoice")
    try {
      const response = await fetch(`${config.RAILWAY_API_BASE}/clients/${selectedOrder.value.client_id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedOrder.value.device_id,
          service_type: 'invoice',
          description: `Wystawiono fakturę ${invoiceForm.invoice_number} za zlecenie ${selectedOrder.value.order_number}`,
          service_date: new Date().toISOString().slice(0, 10)
        })
      })
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.warn('[Invoices] Nie udało się zapisać historii klienta:', response.status, errorText)
      }
    } catch (_) {}

    closeModal()
    await loadData()
    
    alert('Faktura została dodana pomyślnie!')
    
  } catch (error) {
    console.error('Błąd podczas zapisywania faktury:', error)
    alert('Wystąpił błąd podczas zapisywania faktury')
  } finally {
    isSaving.value = false
  }
}

const saveInvoiceFile = async (file, invoiceNumber) => {
  try {
    // Konwertuj plik na base64
    const base64 = await fileToBase64(file)
    
    // Generuj bezpieczną nazwę pliku
    const extension = file.name.split('.').pop()
    const safeFileName = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`
    
    // Zapisz jako data URL (base64)
    return `data:${file.type};base64,${base64}`
    
  } catch (error) {
    console.error('Błąd podczas zapisywania pliku:', error)
    throw error
  }
}

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

const viewInvoiceFile = (invoice) => {
  previewInvoice.value = invoice
  showPreviewModal.value = true
}

const deleteInvoice = async (invoice) => {
  if (!confirm(`Czy na pewno chcesz usunąć fakturę ${invoice.invoice_number}?`)) {
    return
  }

  try {
    await window.electronAPI.database.run('DELETE FROM simple_invoices WHERE id = ?', [invoice.id])
    await loadData()
    alert('Faktura została usunięta')
  } catch (error) {
    console.error('Błąd podczas usuwania faktury:', error)
    alert('Wystąpił błąd podczas usuwania faktury')
  }
}

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pl-PL')
}

const formatCurrency = (amount) => {
  if (!amount) return '-'
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(amount)
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isImageFile = (filePath) => {
  return filePath && (filePath.includes('image/') || filePath.match(/\.(jpg|jpeg|png)$/i))
}

const isPdfFile = (filePath) => {
  return filePath && (filePath.includes('application/pdf') || filePath.match(/\.pdf$/i))
}

// Lifecycle
onMounted(async () => {
  // Utwórz tabelę simple_invoices jeśli nie istnieje
  try {
    await window.electronAPI.database.run(`
      CREATE TABLE IF NOT EXISTS simple_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        order_id INTEGER NOT NULL,
        amount REAL,
        file_path TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES service_orders (id)
      )
    `)
  } catch (error) {
    console.error('Błąd podczas tworzenia tabeli simple_invoices:', error)
  }
  
  await loadData()
})
</script> 