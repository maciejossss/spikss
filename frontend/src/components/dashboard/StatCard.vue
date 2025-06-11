<template>
  <div class="bg-base-100 rounded-lg p-6">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-medium text-base-content/70">{{ title }}</h3>
      <span 
        v-if="trend && percentage"
        class="flex items-center"
        :class="{
          'text-success': trend === 'up',
          'text-error': trend === 'down',
          'text-base-content/50': trend === 'neutral'
        }"
      >
        <component 
          :is="trendIcon" 
          class="w-4 h-4 mr-1"
        />
        {{ percentage }}%
      </span>
    </div>
    
    <div class="mt-4">
      <span class="text-3xl font-bold">{{ formattedValue }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  trend: {
    type: String,
    default: null,
    validator: (value) => ['up', 'down', 'neutral', null].includes(value)
  },
  percentage: {
    type: Number,
    default: null
  }
})

const trendIcon = computed(() => {
  switch (props.trend) {
    case 'up':
      return TrendingUp
    case 'down':
      return TrendingDown
    default:
      return Minus
  }
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return new Intl.NumberFormat('pl-PL').format(props.value)
  }
  return props.value
})
</script> 