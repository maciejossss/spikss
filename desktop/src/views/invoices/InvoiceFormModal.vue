<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-secondary-900">
          {{ isEdit ? 'Edytuj fakturę' : 'Nowa faktura' }}
        </h2>
        <button 
          @click="closeModal" 
          class="text-secondary-400 hover:text-secondary-600"
        >
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Podstawowe informacje -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Numer faktury *
            </label>
            <input
              v-model="form.invoice_number"
              type="text"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              :readonly="isEdit"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Klient *
            </label>
            <select
              v-model="form.client_id"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Wybierz klienta</option>
              <option 
                v-for="client in clients" 
                :key="client.id" 
                :value="client.id"
              >
                {{ getClientName(client) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Zlecenie serwisowe
            </label>
            <select
              v-model="form.order_id"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              @change="onOrderChange"
            >
              <option value="">Wybierz zlecenie (opcjonalne)</option>
              <option 
                v-for="order in filteredOrders" 
                :key="order.id" 
                :value="order.id"
              >
                {{ order.order_number }} - {{ order.title }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Status
            </label>
            <select
              v-model="form.status"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="draft">Projekt</option>
              <option value="sent">Wysłana</option>
              <option value="paid">Opłacona</option>
              <option value="overdue">Przeterminowana</option>
              <option value="cancelled">Anulowana</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Data wystawienia *
            </label>
            <input
              v-model="form.issue_date"
              type="date"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Termin płatności *
            </label>
            <input
              v-model="form.due_date"
              type="date"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Sposób płatności
            </label>
            <select
              v-model="form.payment_method"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Wybierz sposób płatności</option>
              <option value="cash">Gotówka</option>
              <option value="transfer">Przelew bankowy</option>
              <option value="card">Karta płatnicza</option>
              <option value="check">Czek</option>
            </select>
          </div>

          <div v-if="form.status === 'paid'">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Data płatności
            </label>
            <input
              v-model="form.paid_date"
              type="date"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Pozycje faktury -->
        <div class="border-t pt-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-secondary-900">Pozycje faktury</h3>
            <button
              type="button"
              @click="addInvoiceItem"
              class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Dodaj pozycję
            </button>
          </div>

          <div class="space-y-3">
            <div 
              v-for="(item, index) in form.items" 
              :key="index"
              class="bg-secondary-50 p-4 rounded-lg"
            >
              <div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-secondary-700 mb-1">
                    Opis
                  </label>
                  <input
                    v-model="item.description"
                    type="text"
                    required
                    placeholder="Opis usługi/towaru"
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">
                    Ilość
                  </label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    @input="calculateItemTotal(item)"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">
                    Cena netto
                  </label>
                  <input
                    v-model.number="item.unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    @input="calculateItemTotal(item)"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-1">
                    VAT %
                  </label>
                  <select
                    v-model.number="item.tax_rate"
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    @change="calculateItemTotal(item)"
                  >
                    <option :value="0">0%</option>
                    <option :value="5">5%</option>
                    <option :value="8">8%</option>
                    <option :value="23">23%</option>
                  </select>
                </div>

                <div class="flex items-center space-x-2">
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-secondary-700 mb-1">
                      Wartość brutto
                    </label>
                    <input
                      :value="item.gross_amount?.toFixed(2) || '0.00'"
                      type="text"
                      readonly
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-100"
                    />
                  </div>
                  <button
                    type="button"
                    @click="removeInvoiceItem(index)"
                    class="text-red-600 hover:text-red-700 p-2"
                    title="Usuń pozycję"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Podsumowanie -->
          <div class="mt-6 bg-secondary-100 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="text-center">
                <div class="font-medium text-secondary-700">Suma netto</div>
                <div class="text-lg font-bold text-secondary-900">
                  {{ totals.net.toFixed(2) }} zł
                </div>
              </div>
              <div class="text-center">
                <div class="font-medium text-secondary-700">VAT</div>
                <div class="text-lg font-bold text-secondary-900">
                  {{ totals.tax.toFixed(2) }} zł
                </div>
              </div>
              <div class="text-center">
                <div class="font-medium text-secondary-700">Suma brutto</div>
                <div class="text-xl font-bold text-primary-600">
                  {{ totals.gross.toFixed(2) }} zł
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notatki -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Notatki
          </label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Dodatkowe informacje..."
          ></textarea>
        </div>

        <!-- Przyciski -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            {{ isEdit ? 'Zapisz zmiany' : 'Utwórz fakturę' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  invoice: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const loading = ref(false)
const clients = ref([])
const orders = ref([])

const isEdit = computed(() => !!props.invoice)

const form = ref({
  invoice_number: '',
  client_id: '',
  order_id: '',
  status: 'draft',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  payment_method: '',
  paid_date: '',
  notes: '',
  items: []
})

const filteredOrders = computed(() => {
  if (!form.value.client_id) return []
  return orders.value.filter(order => order.client_id == form.value.client_id)
})

const totals = computed(() => {
  const net = form.value.items.reduce((sum, item) => sum + (item.net_amount || 0), 0)
  const tax = form.value.items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
  const gross = form.value.items.reduce((sum, item) => sum + (item.gross_amount || 0), 0)
  
  return { net, tax, gross }
})

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear()
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `FV-${year}-${month}-${random}`
}

const calculateDueDate = () => {
  const issueDate = new Date(form.value.issue_date)
  issueDate.setDate(issueDate.getDate() + 14) // 14 dni na płatność
  form.value.due_date = issueDate.toISOString().split('T')[0]
}

const addInvoiceItem = () => {
  form.value.items.push({
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 23,
    net_amount: 0,
    tax_amount: 0,
    gross_amount: 0
  })
}

const removeInvoiceItem = (index) => {
  form.value.items.splice(index, 1)
}

const calculateItemTotal = (item) => {
  const quantity = parseFloat(item.quantity) || 0
  const unitPrice = parseFloat(item.unit_price) || 0
  const taxRate = parseFloat(item.tax_rate) || 0
  
  item.net_amount = quantity * unitPrice
  item.tax_amount = item.net_amount * (taxRate / 100)
  item.gross_amount = item.net_amount + item.tax_amount
}

const onOrderChange = async () => {
  if (!form.value.order_id) return
  
  const selectedOrder = orders.value.find(o => o.id == form.value.order_id)
  if (selectedOrder) {
    // Automatycznie dodaj pozycje na podstawie zlecenia
    form.value.items = []
    
    if (selectedOrder.parts_cost > 0) {
      form.value.items.push({
        description: 'Części zamienne',
        quantity: 1,
        unit_price: selectedOrder.parts_cost,
        tax_rate: 23,
        net_amount: selectedOrder.parts_cost,
        tax_amount: selectedOrder.parts_cost * 0.23,
        gross_amount: selectedOrder.parts_cost * 1.23
      })
    }
    
    if (selectedOrder.labor_cost > 0) {
      form.value.items.push({
        description: 'Robocizna',
        quantity: 1,
        unit_price: selectedOrder.labor_cost,
        tax_rate: 23,
        net_amount: selectedOrder.labor_cost,
        tax_amount: selectedOrder.labor_cost * 0.23,
        gross_amount: selectedOrder.labor_cost * 1.23
      })
    }
  }
}

const getClientName = (client) => {
  if (client.type === 'business') {
    return client.company_name
  }
  return `${client.first_name} ${client.last_name}`
}

const loadClients = async () => {
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.getClients()
      clients.value = result.filter(client => client.is_active)
    } else {
      // Demo dane dla przeglądarki
      clients.value = [
        { id: 1, type: 'individual', first_name: 'Jan', last_name: 'Kowalski', is_active: 1 },
        { id: 2, type: 'business', company_name: 'ABC Sp. z o.o.', is_active: 1 }
      ]
    }
  } catch (error) {
    console.error('Błąd podczas ładowania klientów:', error)
  }
}

const loadOrders = async () => {
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.getServiceOrders()
      orders.value = result.filter(order => order.status === 'completed')
    } else {
      // Demo dane dla przeglądarki
      orders.value = [
        { id: 1, order_number: 'SRV-2024-001', title: 'Przegląd kotła', client_id: 1, status: 'completed', parts_cost: 150, labor_cost: 200 }
      ]
    }
  } catch (error) {
    console.error('Błąd podczas ładowania zleceń:', error)
  }
}

const closeModal = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (form.value.items.length === 0) {
    alert('Dodaj przynajmniej jedną pozycję do faktury')
    return
  }

  loading.value = true
  
  try {
    const invoiceData = {
      ...form.value,
      net_amount: totals.value.net,
      tax_amount: totals.value.tax,
      gross_amount: totals.value.gross
    }

    if (window.electronAPI?.database) {
      if (isEdit.value) {
        await window.electronAPI.database.updateInvoice(props.invoice.id, invoiceData)
      } else {
        await window.electronAPI.database.createInvoice(invoiceData)
      }
    }

    emit('save', invoiceData)
    closeModal()
  } catch (error) {
    console.error('Błąd podczas zapisywania faktury:', error)
    alert('Wystąpił błąd podczas zapisywania faktury')
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => form.value.issue_date, calculateDueDate)

onMounted(async () => {
  await Promise.all([loadClients(), loadOrders()])
  
  if (isEdit.value) {
    Object.assign(form.value, props.invoice)
  } else {
    form.value.invoice_number = generateInvoiceNumber()
    calculateDueDate()
    addInvoiceItem() // Dodaj pierwszą pozycję
  }
})
</script> 