<template>
  <Card :variant="variant" :hover="hover" :clickable="clickable" @click="$emit('click', $event)">
    <div class="flex flex-col items-center justify-center text-center">
      <!-- Icon or Chart -->
      <div v-if="type === 'chart'" class="relative mb-4">
        <svg class="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
          <!-- Background circle -->
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            stroke="#e5e7eb" 
            stroke-width="6" 
            fill="none"
          />
          <!-- Progress circle -->
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            :stroke="chartColor" 
            stroke-width="6" 
            fill="none"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
            class="transition-all duration-1000 ease-out"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-2xl font-bold text-gray-900">{{ displayValue }}</span>
        </div>
      </div>

      <div v-else-if="type === 'icon'" class="mb-4">
        <div :class="iconContainerClasses">
          <component v-if="icon" :is="icon" :class="iconClasses" />
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-sm font-medium text-gray-600 mb-2">{{ title }}</h3>

      <!-- Value (for non-chart types) -->
      <div v-if="type !== 'chart'" class="mb-2">
        <div class="text-3xl font-bold text-gray-900">{{ displayValue }}</div>
        <div v-if="subtitle" class="text-xs text-gray-500 mt-1">{{ subtitle }}</div>
      </div>

      <!-- Change indicator -->
      <div v-if="change !== undefined" class="flex items-center justify-center">
        <component 
          :is="changeIcon" 
          :class="changeIconClasses"
        />
        <span :class="changeTextClasses">
          {{ Math.abs(change) }}{{ changeUnit }}
        </span>
      </div>

      <!-- Status indicator -->
      <div v-if="status" :class="statusClasses">
        {{ status }}
      </div>

      <!-- Additional info -->
      <div v-if="info" class="text-xs text-gray-500 mt-2">
        {{ info }}
      </div>
    </div>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import Card from './Card.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  subtitle: String,
  type: {
    type: String,
    default: 'simple',
    validator: (value) => ['simple', 'chart', 'icon'].includes(value)
  },
  variant: {
    type: String,
    default: 'default'
  },
  color: {
    type: String,
    default: 'blue',
    validator: (value) => ['blue', 'green', 'yellow', 'red', 'purple', 'indigo'].includes(value)
  },
  percentage: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  },
  change: Number,
  changeUnit: {
    type: String,
    default: '%'
  },
  status: String,
  info: String,
  icon: [String, Object],
  hover: {
    type: Boolean,
    default: true
  },
  clickable: Boolean,
  loading: Boolean
})

const emit = defineEmits(['click'])

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  indigo: '#6366f1'
}

const chartColor = computed(() => colorMap[props.color])

const circumference = 251.2 // 2 * π * 40

const strokeDashoffset = computed(() => {
  const progress = props.percentage / 100
  return circumference - (circumference * progress)
})

const iconContainerClasses = computed(() => {
  const colorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
    purple: 'bg-purple-100',
    indigo: 'bg-indigo-100'
  }

  return [
    'w-16 h-16 rounded-2xl flex items-center justify-center',
    colorClasses[props.color]
  ].join(' ')
})

const iconClasses = computed(() => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600'
  }

  return [
    'w-8 h-8',
    colorClasses[props.color]
  ].join(' ')
})

const changeIcon = computed(() => {
  if (props.change === undefined) return null
  if (props.change > 0) return TrendingUp
  if (props.change < 0) return TrendingDown
  return Minus
})

const changeIconClasses = computed(() => {
  if (props.change === undefined) return ''
  
  const baseClasses = 'w-4 h-4 mr-1'
  
  if (props.change > 0) return `${baseClasses} text-green-600`
  if (props.change < 0) return `${baseClasses} text-red-600`
  return `${baseClasses} text-gray-500`
})

const changeTextClasses = computed(() => {
  if (props.change === undefined) return ''
  
  const baseClasses = 'text-sm font-medium'
  
  if (props.change > 0) return `${baseClasses} text-green-600`
  if (props.change < 0) return `${baseClasses} text-red-600`
  return `${baseClasses} text-gray-500`
})

const statusClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2'
  
  // You can customize this based on status values
  if (props.status?.toLowerCase().includes('online') || props.status?.toLowerCase().includes('running')) {
    return `${baseClasses} bg-green-100 text-green-800`
  }
  if (props.status?.toLowerCase().includes('offline') || props.status?.toLowerCase().includes('stopped')) {
    return `${baseClasses} bg-red-100 text-red-800`
  }
  if (props.status?.toLowerCase().includes('warning') || props.status?.toLowerCase().includes('pending')) {
    return `${baseClasses} bg-yellow-100 text-yellow-800`
  }
  
  return `${baseClasses} bg-gray-100 text-gray-800`
})
</script> 