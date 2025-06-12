<template>
  <div class="flex flex-col md:flex-row gap-4">
    <!-- Search -->
    <div class="form-control flex-1">
      <div class="input-group">
        <input 
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          class="input input-bordered w-full"
          @input="handleSearch"
        />
        <button class="btn btn-square">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Type Filter -->
    <select 
      v-model="selectedType"
      class="select select-bordered"
      @change="handleTypeChange"
    >
      <option value="all">Wszyscy klienci</option>
      <option value="individual">Osoby prywatne</option>
      <option value="business">Firmy</option>
    </select>

    <!-- Status Filter -->
    <select 
      v-model="selectedStatus"
      class="select select-bordered"
      @change="handleStatusChange"
    >
      <option value="all">Wszystkie statusy</option>
      <option value="active">Aktywni</option>
      <option value="inactive">Nieaktywni</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ClientFilters } from '../types/client.types'
import debounce from 'lodash/debounce'

const props = withDefaults(defineProps<{
  placeholder?: string
  initialFilters?: Partial<ClientFilters>
}>(), {
  placeholder: 'Szukaj klientów...',
  initialFilters: () => ({})
})

const emit = defineEmits<{
  (e: 'filter-change', filters: ClientFilters): void
}>()

// Local state
const searchQuery = ref(props.initialFilters.search || '')
const selectedType = ref(props.initialFilters.type || 'all')
const selectedStatus = ref(props.initialFilters.status || 'all')

// Debounced search
const debouncedEmit = debounce(() => {
  emitFilters()
}, 300)

// Watch for changes
watch([searchQuery, selectedType, selectedStatus], () => {
  debouncedEmit()
})

// Methods
const handleSearch = () => {
  debouncedEmit()
}

const handleTypeChange = () => {
  emitFilters()
}

const handleStatusChange = () => {
  emitFilters()
}

const emitFilters = () => {
  emit('filter-change', {
    search: searchQuery.value,
    type: selectedType.value,
    status: selectedStatus.value
  })
}
</script> 