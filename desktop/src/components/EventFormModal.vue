<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-secondary-900">
          {{ isEdit ? 'Edytuj wydarzenie' : 'Nowe wydarzenie' }}
        </h2>
        <button 
          @click="closeModal" 
          class="text-secondary-400 hover:text-secondary-600"
        >
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Typ wydarzenia -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Typ wydarzenia *
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              v-for="type in eventTypes"
              :key="type.value"
              @click="form.type = type.value"
              class="flex items-center justify-center p-3 border-2 rounded-lg transition-colors"
              :class="form.type === type.value 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-secondary-200 hover:border-secondary-300'"
            >
              <i :class="type.icon" class="mr-2"></i>
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Tytuł -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Tytuł wydarzenia *
          </label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Wprowadź tytuł wydarzenia"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Data -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Data *
            </label>
            <input
              v-model="form.date"
              type="date"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- Godzina -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Godzina
            </label>
            <input
              v-model="form.time"
              type="time"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <!-- Klient (opcjonalnie) -->
        <div v-if="form.type !== 'other'">
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Klient
          </label>
          <select
            v-model="form.client_id"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Wybierz klienta (opcjonalne)</option>
            <option 
              v-for="client in clients" 
              :key="client.id" 
              :value="client.id"
            >
              {{ getClientName(client) }}
            </option>
          </select>
        </div>

        <!-- Zlecenie (dla typu 'orders') -->
        <div v-if="form.type === 'orders'">
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Powiąż ze zleceniem
          </label>
          <select
            v-model="form.order_id"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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

        <!-- Lokalizacja -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Lokalizacja
          </label>
          <input
            v-model="form.location"
            type="text"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Adres lub lokalizacja wydarzenia"
          />
        </div>

        <!-- Opis -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Opis
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Dodatkowe informacje o wydarzeniu"
          ></textarea>
        </div>

        <!-- Przypomnienie -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Przypomnienie
          </label>
          <select
            v-model="form.reminder"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Brak przypomnienia</option>
            <option value="15">15 minut wcześniej</option>
            <option value="30">30 minut wcześniej</option>
            <option value="60">1 godzinę wcześniej</option>
            <option value="1440">1 dzień wcześniej</option>
          </select>
        </div>

        <!-- Status (dla zleceń) -->
        <div v-if="form.type === 'orders'">
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Status
          </label>
          <select
            v-model="form.status"
            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="planned">Zaplanowane</option>
            <option value="confirmed">Potwierdzone</option>
            <option value="in_progress">W trakcie</option>
            <option value="completed">Ukończone</option>
            <option value="cancelled">Anulowane</option>
          </select>
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
            {{ isEdit ? 'Zapisz zmiany' : 'Utwórz wydarzenie' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  event: {
    type: Object,
    default: null
  },
  selectedDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'save'])

const loading = ref(false)
const clients = ref([])
const orders = ref([])

const isEdit = computed(() => !!props.event)

const eventTypes = [
  { value: 'orders', label: 'Zlecenie serwisowe', icon: 'fas fa-tools' },
  { value: 'meetings', label: 'Spotkanie', icon: 'fas fa-handshake' },
  { value: 'maintenance', label: 'Konserwacja', icon: 'fas fa-cog' },
  { value: 'other', label: 'Inne', icon: 'fas fa-calendar' }
]

const form = ref({
  type: 'orders',
  title: '',
  date: '',
  time: '09:00',
  client_id: '',
  order_id: '',
  location: '',
  description: '',
  reminder: '',
  status: 'planned'
})

const filteredOrders = computed(() => {
  if (!form.value.client_id) return orders.value
  return orders.value.filter(order => order.client_id == form.value.client_id)
})

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
      // Demo dane
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
      orders.value = result
    } else {
      // Demo dane
      orders.value = [
        { id: 1, order_number: 'SRV-2024-001', title: 'Przegląd kotła', client_id: 1 },
        { id: 2, order_number: 'SRV-2024-002', title: 'Naprawa pieca', client_id: 2 }
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
  loading.value = true
  
  try {
    const eventData = {
      ...form.value,
      id: isEdit.value ? props.event.id : Date.now() // Proste ID dla demo
    }

    if (window.electronAPI?.database) {
      // W Electron - zapisz do bazy danych
      if (form.value.type === 'orders' && form.value.order_id) {
        // Aktualizuj datę zlecenia
        await window.electronAPI.database.updateServiceOrder(form.value.order_id, {
          scheduled_date: `${form.value.date}T${form.value.time}:00`
        })
      }
      
      // TODO: Dodaj obsługę zapisywania innych typów wydarzeń
    }

    emit('save', eventData)
    closeModal()
  } catch (error) {
    console.error('Błąd podczas zapisywania wydarzenia:', error)
    alert('Wystąpił błąd podczas zapisywania wydarzenia')
  } finally {
    loading.value = false
  }
}

// Auto-wypełnienie na podstawie wybranego zlecenia
watch(() => form.value.order_id, async () => {
  if (form.value.order_id) {
    const selectedOrder = orders.value.find(o => o.id == form.value.order_id)
    if (selectedOrder) {
      form.value.title = selectedOrder.title
      form.value.client_id = selectedOrder.client_id
      form.value.description = selectedOrder.description
    }
  }
})

onMounted(async () => {
  await Promise.all([loadClients(), loadOrders()])
  
  if (props.selectedDate) {
    form.value.date = props.selectedDate
  }
  
  if (isEdit.value) {
    Object.assign(form.value, props.event)
  }
})
</script> 