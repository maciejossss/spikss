<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-secondary-900">
          Wydarzenia - {{ formatDate(date) }}
        </h2>
        <button 
          @click="closeModal" 
          class="text-secondary-400 hover:text-secondary-600"
        >
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <!-- Przycisk dodawania wydarzenia -->
      <div class="mb-6">
        <button
          @click="$emit('addEvent')"
          class="w-full bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>
          Dodaj nowe wydarzenie
        </button>
      </div>

      <!-- Lista wydarzeń -->
      <div v-if="events.length === 0" class="text-center py-8">
        <i class="fas fa-calendar-day text-4xl text-secondary-300 mb-4"></i>
        <p class="text-secondary-600">Brak wydarzeń w tym dniu</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="event in sortedEvents"
          :key="event.id"
          class="border border-secondary-200 rounded-lg p-4 hover:bg-secondary-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3 flex-1">
              <!-- Typ wydarzenia (kolorowy wskaźnik) -->
              <div class="flex flex-col items-center">
                <div
                  class="w-4 h-4 rounded-full mt-1"
                  :class="getEventColor(event.type)"
                ></div>
                <div class="w-px h-8 bg-secondary-200 mt-1"></div>
              </div>

              <!-- Szczegóły wydarzenia -->
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <h3 class="font-semibold text-secondary-900">{{ event.title }}</h3>
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    :class="getEventTypeClass(event.type)"
                  >
                    {{ getEventTypeName(event.type) }}
                  </span>
                </div>

                <!-- Godzina -->
                <div class="flex items-center text-sm text-secondary-600 mb-2">
                  <i class="fas fa-clock mr-2"></i>
                  {{ event.time || 'Cały dzień' }}
                </div>

                <!-- Klient -->
                <div v-if="event.client" class="flex items-center text-sm text-secondary-600 mb-2">
                  <i class="fas fa-user mr-2"></i>
                  {{ event.client }}
                </div>

                <!-- Lokalizacja -->
                <div v-if="event.location" class="flex items-center text-sm text-secondary-600 mb-2">
                  <i class="fas fa-map-marker-alt mr-2"></i>
                  {{ event.location }}
                </div>

                <!-- Opis -->
                <div v-if="event.description" class="text-sm text-secondary-700 mt-2">
                  {{ event.description }}
                </div>

                <!-- Status (dla zleceń) -->
                <div v-if="event.type === 'orders' && event.status" class="mt-2">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="getStatusClass(event.status)"
                  >
                    {{ getStatusText(event.status) }}
                  </span>
                </div>

                <!-- Zlecenie powiązane -->
                <div v-if="event.orderId" class="mt-2">
                  <button
                    @click="goToOrder(event.orderId)"
                    class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    <i class="fas fa-external-link-alt mr-1"></i>
                    Zobacz zlecenie
                  </button>
                </div>
              </div>
            </div>

            <!-- Akcje -->
            <div class="flex space-x-2 ml-4">
              <button
                @click="$emit('editEvent', event)"
                class="text-secondary-400 hover:text-secondary-600 p-1"
                title="Edytuj"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                @click="$emit('deleteEvent', event)"
                class="text-red-400 hover:text-red-600 p-1"
                title="Usuń"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Podsumowanie dnia -->
      <div v-if="events.length > 0" class="mt-6 p-4 bg-secondary-50 rounded-lg">
        <h4 class="font-medium text-secondary-900 mb-2">Podsumowanie dnia</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-secondary-600">Liczba wydarzeń:</span>
            <span class="font-medium text-secondary-900 ml-2">{{ events.length }}</span>
          </div>
          <div v-if="hasTimeEvents">
            <span class="text-secondary-600">Pierwszy/Ostatni:</span>
            <span class="font-medium text-secondary-900 ml-2">
              {{ firstEventTime }} - {{ lastEventTime }}
            </span>
          </div>
        </div>
        
        <!-- Podział na typy -->
        <div class="mt-3 flex flex-wrap gap-2">
          <div
            v-for="type in eventTypesSummary"
            :key="type.type"
            class="flex items-center space-x-1"
          >
            <div
              class="w-2 h-2 rounded-full"
              :class="getEventColor(type.type)"
            ></div>
            <span class="text-xs text-secondary-600">
              {{ getEventTypeName(type.type) }}: {{ type.count }}
            </span>
          </div>
        </div>
      </div>

      <!-- Przycisk zamknięcia -->
      <div class="flex justify-end mt-6 pt-4 border-t">
        <button
          @click="closeModal"
          class="px-4 py-2 text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50 transition-colors"
        >
          Zamknij
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  date: {
    type: String,
    required: true
  },
  events: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'addEvent', 'editEvent', 'deleteEvent'])

const router = useRouter()

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })
})

const hasTimeEvents = computed(() => {
  return props.events.some(event => event.time)
})

const firstEventTime = computed(() => {
  const timeEvents = props.events.filter(event => event.time)
  if (timeEvents.length === 0) return ''
  
  const sorted = timeEvents.sort((a, b) => a.time.localeCompare(b.time))
  return sorted[0].time
})

const lastEventTime = computed(() => {
  const timeEvents = props.events.filter(event => event.time)
  if (timeEvents.length === 0) return ''
  
  const sorted = timeEvents.sort((a, b) => b.time.localeCompare(a.time))
  return sorted[0].time
})

const eventTypesSummary = computed(() => {
  const summary = {}
  props.events.forEach(event => {
    summary[event.type] = (summary[event.type] || 0) + 1
  })
  
  return Object.entries(summary).map(([type, count]) => ({ type, count }))
})

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (dateStr === formatDateStr(today)) {
    return 'Dziś'
  } else if (dateStr === formatDateStr(tomorrow)) {
    return 'Jutro'
  } else if (dateStr === formatDateStr(yesterday)) {
    return 'Wczoraj'
  } else {
    return date.toLocaleDateString('pl-PL', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }
}

const formatDateStr = (date) => {
  return date.toISOString().split('T')[0]
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

const getEventTypeClass = (type) => {
  const classes = {
    orders: 'bg-blue-100 text-blue-800',
    meetings: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    other: 'bg-purple-100 text-purple-800'
  }
  return classes[type] || classes.other
}

const getEventTypeName = (type) => {
  const names = {
    orders: 'Zlecenie',
    meetings: 'Spotkanie',
    maintenance: 'Konserwacja',
    other: 'Inne'
  }
  return names[type] || 'Inne'
}

const getStatusClass = (status) => {
  const classes = {
    planned: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || classes.planned
}

const getStatusText = (status) => {
  const texts = {
    planned: 'Zaplanowane',
    confirmed: 'Potwierdzone',
    in_progress: 'W trakcie',
    completed: 'Ukończone',
    cancelled: 'Anulowane'
  }
  return texts[status] || 'Zaplanowane'
}

const goToOrder = (orderId) => {
  router.push(`/orders/${orderId}`)
  closeModal()
}

const closeModal = () => {
  emit('close')
}
</script> 