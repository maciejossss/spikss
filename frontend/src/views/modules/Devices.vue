<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Urządzenia</h1>
        <p class="text-sm text-gray-600">Katalog i historia urządzeń</p>
      </div>
      <button
        v-if="canWrite"
        class="btn-primary"
      >
        <Plus class="w-4 h-4 mr-2" />
        Dodaj
      </button>
    </div>

    <!-- Coming soon -->
    <div class="card text-center py-12">
      <Settings class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Moduł w przygotowaniu</h3>
      <p class="text-gray-600 mb-4">
        Moduł zarządzania urządzeniami będzie dostępny wkrótce
      </p>
      <div class="text-sm text-gray-500">
        Funkcje: katalog urządzeń, historia serwisów, dokumentacja techniczna
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Plus, Settings } from 'lucide-vue-next'

const authStore = useAuthStore()

const canWrite = computed(() => 
  authStore.hasModulePermission('devices', 'write')
)
</script> 