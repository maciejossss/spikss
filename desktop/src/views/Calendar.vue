<template>
  <div class="p-6">
    <!-- Nagłówek -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-secondary-900">Kalendarz</h1>
      <div class="flex items-center space-x-4">
        <!-- Filtry -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-secondary-700">Pokaż:</label>
          <select
            v-model="eventFilter"
            class="px-3 py-1 border border-secondary-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Wszystko</option>
            <option value="orders">Zlecenia</option>
            <option value="meetings">Spotkania</option>
            <option value="maintenance">Konserwacje</option>
          </select>
        </div>
        
        <!-- Przycisk dodawania -->
        <button
          @click="showCreateEventModal = true"
          class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>
          Nowe wydarzenie
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Kalendarz główny -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow">
          <!-- Nawigacja kalendarza -->
          <div class="flex items-center justify-between p-4 border-b border-secondary-200">
            <button
              @click="previousMonth"
              class="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-md"
            >
              <i class="fas fa-chevron-left"></i>
            </button>
            
            <h2 class="text-lg font-semibold text-secondary-900">
              {{ formatMonthYear(currentDate) }}
            </h2>
            
            <button
              @click="nextMonth"
              class="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-md"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>

          <!-- Dni tygodnia -->
          <div class="grid grid-cols-7 border-b border-secondary-200">
            <div
              v-for="day in weekDays"
              :key="day"
              class="p-3 text-center text-sm font-medium text-secondary-700 bg-secondary-50"
            >
              {{ day }}
            </div>
          </div>

          <!-- Kalendarz -->
          <div class="grid grid-cols-7">
            <div
              v-for="day in calendarDays"
              :key="day.date"
              class="min-h-[120px] border-b border-r border-secondary-100 p-2"
              :class="{
                'bg-secondary-50': !day.inCurrentMonth,
                'bg-blue-50': day.isToday,
                'cursor-pointer hover:bg-secondary-50': day.inCurrentMonth
              }"
              @click="selectDay(day)"
            >
              <!-- Numer dnia -->
              <div class="flex justify-between items-start mb-2">
                <span
                  class="text-sm font-medium"
                  :class="{
                    'text-secondary-400': !day.inCurrentMonth,
                    'text-primary-600 font-bold': day.isToday,
                    'text-secondary-900': day.inCurrentMonth && !day.isToday
                  }"
                >
                  {{ day.day }}
                </span>
                
                <!-- Licznik wydarzeń -->
                <span
                  v-if="getEventsForDay(day.date).length > 0"
                  class="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {{ getEventsForDay(day.date).length }}
                </span>
              </div>

              <!-- Wydarzenia -->
              <div class="space-y-1">
                <div
                  v-for="event in getEventsForDay(day.date).slice(0, 3)"
                  :key="event.id"
                  class="text-xs p-1 rounded truncate"
                  :class="getEventClassWithAssignee(event)"
                  :title="event.title"
                >
                  {{ event.title }}
                </div>
                
                <!-- Więcej wydarzeń -->
                <div
                  v-if="getEventsForDay(day.date).length > 3"
                  class="text-xs text-secondary-500 font-medium"
                >
                  +{{ getEventsForDay(day.date).length - 3 }} więcej
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel boczny -->
      <div class="space-y-6">
        <!-- Dzisiejsze zadania -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-clock mr-2 text-primary-600"></i>
            Dzisiaj
          </h3>
          
          <div v-if="todayEvents.length === 0" class="text-center py-4">
            <p class="text-secondary-500 text-sm">Brak wydarzeń na dziś</p>
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="event in todayEvents"
              :key="event.id"
              class="border border-secondary-200 rounded-lg p-3"
            >
              <div class="flex items-start space-x-3">
                <div
                  class="w-3 h-3 rounded-full mt-1"
                  :class="getEventDotColorWithAssignee(event)"
                ></div>
                <div class="flex-1">
                  <h4 class="font-medium text-secondary-900 text-sm">{{ event.title }}</h4>
                  <p class="text-xs text-secondary-600 mt-1">{{ event.time }}</p>
                  <p v-if="event.client" class="text-xs text-secondary-500 mt-1">
                    <i class="fas fa-user mr-1"></i>
                    {{ event.client }}
                  </p>
                </div>
                <div class="flex space-x-1">
                  <button
                    @click="editEvent(event)"
                    class="text-secondary-400 hover:text-secondary-600"
                  >
                    <i class="fas fa-edit text-xs"></i>
                  </button>
                  <button
                    @click="deleteEvent(event)"
                    class="text-red-400 hover:text-red-600"
                  >
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Nadchodzące wydarzenia -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-calendar-alt mr-2 text-orange-600"></i>
            Nadchodzące
          </h3>
          
          <div v-if="upcomingEvents.length === 0" class="text-center py-4">
            <p class="text-secondary-500 text-sm">Brak nadchodzących wydarzeń</p>
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="event in upcomingEvents.slice(0, 5)"
              :key="event.id"
              class="border border-secondary-200 rounded-lg p-3"
            >
              <div class="flex items-start space-x-3">
                <div
                  class="w-3 h-3 rounded-full mt-1"
                  :class="getEventColor(event.type)"
                ></div>
                <div class="flex-1">
                  <h4 class="font-medium text-secondary-900 text-sm">{{ event.title }}</h4>
                  <p class="text-xs text-secondary-600 mt-1">
                    {{ formatEventDate(event.date) }}
                  </p>
                  <p v-if="event.client" class="text-xs text-secondary-500 mt-1">
                    <i class="fas fa-user mr-1"></i>
                    {{ event.client }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legenda -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-info-circle mr-2 text-blue-600"></i>
            Legenda
          </h3>
          
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span class="text-sm text-secondary-700">Zlecenia serwisowe</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-sm text-secondary-700">Spotkania</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span class="text-sm text-secondary-700">Konserwacje</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span class="text-sm text-secondary-700">Inne</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal tworzenia wydarzenia -->
    <EventFormModal
      v-if="showCreateEventModal"
      @close="showCreateEventModal = false"
      @save="handleEventSaved"
      :selectedDate="selectedDate"
    />

    <!-- Modal edycji wydarzenia -->
    <EventFormModal
      v-if="showEditEventModal"
      :event="selectedEvent"
      @close="showEditEventModal = false"
      @save="handleEventSaved"
    />

    <!-- Modal szczegółów dnia -->
    <DayDetailsModal
      v-if="showDayDetailsModal"
      :date="selectedDate"
      :events="getEventsForDay(selectedDate)"
      @close="showDayDetailsModal = false"
      @addEvent="showCreateEventModal = true"
      @editEvent="editEvent"
      @deleteEvent="deleteEvent"
    />

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń wydarzenie"
      :message="`Czy na pewno chcesz usunąć wydarzenie '${eventToDelete?.title}'?`"
      confirm-text="Usuń"
      confirm-class="bg-red-600 hover:bg-red-700"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EventFormModal from '../components/EventFormModal.vue'
import DayDetailsModal from '../components/DayDetailsModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const currentDate = ref(new Date())
const selectedDate = ref('')
const eventFilter = ref('all')

const showCreateEventModal = ref(false)
const showEditEventModal = ref(false)
const showDayDetailsModal = ref(false)
const showDeleteModal = ref(false)

const selectedEvent = ref(null)
const eventToDelete = ref(null)

const events = ref([])

// Demo wydarzenia
const demoEvents = ref([
  {
    id: 1,
    title: 'Serwis kotła - Jan Kowalski',
    type: 'orders',
    date: '2024-07-07',
    time: '09:00',
    client: 'Jan Kowalski',
    description: 'Przegląd roczny kotła gazowego'
  },
  {
    id: 2,
    title: 'Spotkanie z klientem',
    type: 'meetings',
    date: '2024-07-07',
    time: '14:00',
    client: 'ABC Sp. z o.o.',
    description: 'Omówienie nowej instalacji'
  },
  {
    id: 3,
    title: 'Konserwacja - Instalacja przemysłowa',
    type: 'maintenance',
    date: '2024-07-08',
    time: '08:00',
    client: 'Fabryka XYZ',
    description: 'Przegląd miesięczny systemu grzewczego'
  },
  {
    id: 4,
    title: 'Naprawa awaryjna',
    type: 'orders',
    date: '2024-07-09',
    time: '10:30',
    client: 'Maria Nowak',
    description: 'Awaria pieca'
  },
  {
    id: 5,
    title: 'Szkolenie techniczne',
    type: 'other',
    date: '2024-07-10',
    time: '13:00',
    description: 'Szkolenie z nowych technologii'
  }
])

const weekDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // Pierwszy dzień miesiąca
  const firstDay = new Date(year, month, 1)
  
  // Ostatni dzień miesiąca
  const lastDay = new Date(year, month + 1, 0)
  
  // Dzień tygodnia pierwszego dnia (0 = niedziela, przekształć na 0 = poniedziałek)
  let firstDayOfWeek = firstDay.getDay()
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  
  const days = []
  const today = new Date()
  
  // Dni z poprzedniego miesiąca
  const prevMonth = new Date(year, month - 1, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i
    const date = new Date(year, month - 1, day)
    days.push({
      day,
      date: formatDate(date),
      inCurrentMonth: false,
      isToday: false
    })
  }
  
  // Dni bieżącego miesiąca
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const isToday = 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    
    days.push({
      day,
      date: formatDate(date),
      inCurrentMonth: true,
      isToday
    })
  }
  
  // Dni z następnego miesiąca (aby wypełnić ostatni tydzień)
  const remainingDays = 42 - days.length // 6 tygodni po 7 dni
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    days.push({
      day,
      date: formatDate(date),
      inCurrentMonth: false,
      isToday: false
    })
  }
  
  return days
})

const filteredEvents = computed(() => {
  if (eventFilter.value === 'all') {
    return events.value
  }
  return events.value.filter(event => event.type === eventFilter.value)
})

const todayEvents = computed(() => {
  const today = formatDate(new Date())
  return filteredEvents.value
    .filter(event => event.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
})

const upcomingEvents = computed(() => {
  const today = formatDate(new Date())
  return filteredEvents.value
    .filter(event => event.date > today)
    .sort((a, b) => {
      if (a.date === b.date) {
        return a.time.localeCompare(b.time)
      }
      return a.date.localeCompare(b.date)
    })
})

const formatDate = (date) => {
  return date.toISOString().split('T')[0]
}

const formatMonthYear = (date) => {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

const formatEventDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (dateStr === formatDate(today)) {
    return 'Dziś'
  } else if (dateStr === formatDate(tomorrow)) {
    return 'Jutro'
  } else {
    return date.toLocaleDateString('pl-PL', { 
      day: 'numeric', 
      month: 'short' 
    })
  }
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const selectDay = (day) => {
  if (!day.inCurrentMonth) return
  
  selectedDate.value = day.date
  const dayEvents = getEventsForDay(day.date)
  
  if (dayEvents.length > 0) {
    showDayDetailsModal.value = true
  } else {
    showCreateEventModal.value = true
  }
}

const getEventsForDay = (date) => {
  return filteredEvents.value.filter(event => event.date === date)
}

const getEventClass = (type) => {
  const classes = {
    orders: 'bg-blue-100 text-blue-800',
    meetings: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    other: 'bg-purple-100 text-purple-800'
  }
  return classes[type] || classes.other
}

// Kolory per-serwisant (stabilne hash → kolor)
function colorByAssignee(userId) {
  const palette = [
    ['bg-blue-100 text-blue-800','bg-blue-500'],
    ['bg-green-100 text-green-800','bg-green-500'],
    ['bg-orange-100 text-orange-800','bg-orange-500'],
    ['bg-purple-100 text-purple-800','bg-purple-500'],
    ['bg-pink-100 text-pink-800','bg-pink-500'],
    ['bg-teal-100 text-teal-800','bg-teal-500'],
    ['bg-amber-100 text-amber-800','bg-amber-500']
  ]
  if (!userId && userId !== 0) return null
  const idx = Math.abs(parseInt(userId, 10) || 0) % palette.length
  return palette[idx]
}

function getEventClassWithAssignee(event) {
  if (event.type === 'orders' && event.assigned_user_id != null) {
    const c = colorByAssignee(event.assigned_user_id)
    if (c) return c[0]
  }
  return getEventClass(event.type)
}

function getEventDotColorWithAssignee(event) {
  if (event.type === 'orders' && event.assigned_user_id != null) {
    const c = colorByAssignee(event.assigned_user_id)
    if (c) return c[1]
  }
  return getEventColor(event.type)
}

const getEventColor = (type) => {
  const colors = {
    orders: 'bg-blue-500',
    meetings: 'bg-green-500',
    maintenance: 'bg-orange-500',
    other: 'bg-purple-500'
  }
  return colors[type] || colors.other
}

const editEvent = (event) => {
  selectedEvent.value = event
  showEditEventModal.value = true
}

const deleteEvent = (event) => {
  eventToDelete.value = event
  showDeleteModal.value = true
}

const confirmDelete = () => {
  events.value = events.value.filter(e => e.id !== eventToDelete.value.id)
  showDeleteModal.value = false
  eventToDelete.value = null
}

const handleEventSaved = (eventData) => {
  loadEvents() // Przeładuj wydarzenia
}

const loadEvents = async () => {
  try {
    if (window.electronAPI?.database) {
      // W Electron - pobierz z bazy danych
      const orders = await window.electronAPI.database.query(
        `SELECT so.*, c.first_name, c.last_name, c.company_name, c.type as client_type
         FROM service_orders so
         LEFT JOIN clients c ON so.client_id = c.id
         WHERE so.scheduled_date IS NOT NULL
         ORDER BY so.scheduled_date ASC`
      )
      
      // Mapuj zlecenia na wydarzenia kalendarzowe
      const orderEvents = orders
        .filter(order => order.scheduled_date)
        .map(order => ({
          id: `order-${order.id}`,
          title: `${order.title} - ${getClientName(order)}`,
          type: 'orders',
          date: order.scheduled_date.split('T')[0],
          time: order.scheduled_date.split('T')[1]?.substring(0, 5) || '09:00',
          client: getClientName(order),
          description: order.description,
          assigned_user_id: order.assigned_user_id,
          orderId: order.id
        }))
      
      events.value = orderEvents
    } else {
      // Demo dane dla przeglądarki
      events.value = demoEvents.value
    }
  } catch (error) {
    console.error('Błąd podczas ładowania wydarzeń:', error)
    events.value = demoEvents.value
  }
}

const getClientName = (order) => {
  if (order.client_type === 'business') {
    return order.company_name
  }
  return `${order.first_name} ${order.last_name}`
}

onMounted(() => {
  loadEvents()
})
</script> 