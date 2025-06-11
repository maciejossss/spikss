<template>
  <div class="space-y-4">
    <div 
      v-for="activity in activities" 
      :key="activity.id"
      class="flex items-center p-4 bg-base-200 rounded-lg"
    >
      <!-- Ikona typu aktywności -->
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="{
          'bg-primary/10 text-primary': activity.type === 'service',
          'bg-secondary/10 text-secondary': activity.type === 'client',
          'bg-accent/10 text-accent': activity.type === 'device',
          'bg-info/10 text-info': activity.type === 'part',
          'bg-warning/10 text-warning': activity.type === 'invoice'
        }"
      >
        <component 
          :is="getActivityIcon(activity.type)"
          class="w-5 h-5"
        />
      </div>

      <!-- Treść aktywności -->
      <div class="ml-4 flex-grow">
        <p class="font-medium">{{ activity.description }}</p>
        <div class="flex items-center mt-1 text-sm text-base-content/70">
          <span>{{ activity.user }}</span>
          <span class="mx-2">•</span>
          <span>{{ formatDate(activity.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- Stan pusty -->
    <div 
      v-if="!activities.length"
      class="text-center py-8 text-base-content/50"
    >
      Brak aktywności do wyświetlenia
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  Wrench, 
  Users, 
  Tool, 
  Package, 
  FileText 
} from 'lucide-vue-next'

const props = defineProps({
  activities: {
    type: Array,
    required: true,
    default: () => []
  }
})

const getActivityIcon = (type) => {
  const icons = {
    service: Wrench,
    client: Users,
    device: Tool,
    part: Package,
    invoice: FileText
  }
  return icons[type] || Users
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}
</script> 