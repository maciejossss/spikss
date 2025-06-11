<template>
  <div 
    class="group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300 cursor-pointer touch-manipulation"
    :class="{ 'opacity-50': status === 'disabled' }"
    @click="handleClick"
  >
    <!-- Background gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    <div class="relative p-6 flex flex-col items-center space-y-4">
      <!-- Icon with animated background -->
      <div class="relative">
        <div class="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
          <component :is="icon" class="w-8 h-8 text-primary-600 group-hover:text-primary-700 transition-colors duration-300" />
        </div>
        <!-- Pulse effect -->
        <div class="absolute inset-0 w-16 h-16 bg-primary-200 rounded-2xl opacity-0 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500"></div>
      </div>
      
      <!-- Title -->
      <h3 class="text-base font-bold text-gray-900 text-center group-hover:text-primary-700 transition-colors duration-300">
        {{ title }}
      </h3>
      
      <!-- Description -->
      <p class="text-sm text-gray-600 text-center leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
        {{ description }}
      </p>
      
      <!-- Status indicator with better styling -->
      <div class="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-50 group-hover:bg-white transition-colors duration-300">
        <div 
          class="w-2.5 h-2.5 rounded-full shadow-sm"
          :class="statusColor"
        ></div>
        <span class="text-xs font-medium text-gray-600">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Hover arrow indicator -->
    <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div class="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: Object,
    required: true
  },
  route: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'active',
    validator: (value) => ['active', 'disabled', 'maintenance'].includes(value)
  }
})

const emit = defineEmits(['click'])

const statusColor = computed(() => {
  switch (props.status) {
    case 'active':
      return 'bg-emerald-500 shadow-emerald-200'
    case 'disabled':
      return 'bg-gray-400 shadow-gray-200'
    case 'maintenance':
      return 'bg-amber-500 shadow-amber-200'
    default:
      return 'bg-gray-400 shadow-gray-200'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'active':
      return 'Aktywny'
    case 'disabled':
      return 'Wyłączony'
    case 'maintenance':
      return 'Konserwacja'
    default:
      return 'Nieznany'
  }
})

function handleClick() {
  if (props.status !== 'disabled') {
    emit('click', props.route)
  }
}
</script> 