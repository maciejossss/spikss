<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
      <div class="w-8 h-8 spinner"></div>
      <p class="text-sm text-gray-600">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: 'Ładowanie...'
  }
})
</script> 