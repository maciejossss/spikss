<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-secondary-200">
        <h3 class="text-lg font-semibold text-secondary-900">{{ title }}</h3>
      </div>
      
      <!-- Body -->
      <div class="px-6 py-4">
        <p class="text-secondary-600">{{ message }}</p>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3">
        <button
          @click="$emit('cancel')"
          class="btn-secondary"
        >
          {{ cancelText }}
        </button>
        <button
          @click="$emit('confirm')"
          :class="confirmClass"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Potwierdź'
  },
  cancelText: {
    type: String,
    default: 'Anuluj'
  },
  confirmClass: {
    type: String,
    default: 'btn-primary'
  }
})

defineEmits(['confirm', 'cancel'])
</script> 