<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">
          <i class="fas fa-paper-plane mr-2 text-blue-500"></i>
          Wyślij zlecenie do technika
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Informacje o zleceniu -->
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 class="font-medium text-gray-900 mb-2">Zlecenie do wysłania:</h4>
        <div class="text-sm text-gray-600">
          <div><strong>Numer:</strong> {{ order?.order_number }}</div>
          <div><strong>Tytuł:</strong> {{ order?.title }}</div>
          <div><strong>Priorytet:</strong> 
            <span :class="getPriorityClass(order?.priority)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-1">
              {{ getPriorityName(order?.priority) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Lista techników -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-medium text-gray-900">Wybierz technika:</h4>
          <button
            @click="refreshTechnicians"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            :disabled="isRefreshing"
          >
            <i :class="['fas', 'fa-sync-alt', 'mr-1', { 'fa-spin': isRefreshing }]"></i>
            {{ isRefreshing ? 'Odświeżanie...' : 'Odśwież listę' }}
          </button>
        </div>
        
        <!-- Loading state -->
        <div v-if="!technicians || technicians.length === 0" class="text-center py-4">
          <i class="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
          <span class="text-gray-500">Ładowanie techników...</span>
        </div>

        <!-- Lista techników -->
        <div v-else class="space-y-2">
          <div
            v-for="technician in technicians"
            :key="technician.id"
            @click="selectedTechnician = technician.id"
            :class="[
              'border rounded-lg p-3 cursor-pointer transition-colors',
              selectedTechnician === technician.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-center">
              <div 
                :class="[
                  'w-4 h-4 rounded-full border-2 mr-3',
                  selectedTechnician === technician.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                ]"
              >
                <div v-if="selectedTechnician === technician.id" class="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ technician.full_name }}</div>
                <div class="text-sm text-gray-500">{{ technician.email }}</div>
                <div class="text-xs text-blue-600 font-mono">ID: {{ technician.id }}</div>
              </div>
              <div class="ml-auto">
                <i class="fas fa-user-wrench text-blue-500"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Uwagi (opcjonalne) -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Uwagi dla technika (opcjonalne):
        </label>
        <textarea
          v-model="notes"
          rows="3"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Dodatkowe informacje dla technika..."
        ></textarea>
      </div>

      <!-- Przyciski -->
      <div class="flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Anuluj
        </button>
        <button
          @click="assignOrder"
          :disabled="!selectedTechnician"
          :class="[
            'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
            selectedTechnician
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          ]"
        >
          <i class="fas fa-paper-plane mr-2"></i>
          Wyślij zlecenie
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props
const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  technicians: {
    type: Array,
    required: true
  }
})

// Emits
const emit = defineEmits(['close', 'assigned', 'refresh-technicians'])

// Reactive data
const selectedTechnician = ref(null)
const notes = ref('')
const isRefreshing = ref(false)

// Helper methods
const getPriorityClass = (priority) => {
  const classes = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }
  return classes[priority] || 'bg-gray-100 text-gray-800'
}

const getPriorityName = (priority) => {
  const names = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny'
  }
  return names[priority] || 'Nieznany'
}

const refreshTechnicians = async () => {
  isRefreshing.value = true
  try {
    await emit('refresh-technicians')
    console.log('🔄 Lista techników odświeżona')
  } catch (error) {
    console.error('❌ Błąd odświeżania listy techników:', error)
  } finally {
    isRefreshing.value = false
  }
}

const assignOrder = () => {
  if (selectedTechnician.value) {
    emit('assigned', selectedTechnician.value, notes.value)
  }
}
</script>

<style scoped>
/* Style dla radio button effect */
.border-blue-500 {
  box-shadow: 0 0 0 1px #3b82f6;
}
</style> 