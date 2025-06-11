<template>
  <div 
    class="bg-base-100 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    @click="$emit('click')"
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <component 
            :is="iconComponent" 
            class="w-6 h-6 text-primary"
          />
        </div>
        <h3 class="text-xl font-semibold ml-4">{{ title }}</h3>
      </div>
      <span 
        class="badge"
        :class="{
          'badge-success': status === 'active',
          'badge-warning': status === 'warning',
          'badge-error': status === 'error'
        }"
      >
        {{ statusText }}
      </span>
    </div>

    <div class="mt-4">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'active',
    validator: (value) => ['active', 'warning', 'error'].includes(value)
  },
  route: {
    type: String,
    required: true
  }
})

const iconComponent = computed(() => {
  const iconName = props.icon.charAt(0).toUpperCase() + props.icon.slice(1)
  return LucideIcons[iconName]
})

const statusText = computed(() => {
  const statusMap = {
    active: 'Aktywny',
    warning: 'Uwaga',
    error: 'Błąd'
  }
  return statusMap[props.status]
})

defineEmits(['click'])
</script> 