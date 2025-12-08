<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-secondary-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-secondary-900">
            Edytuj plik
          </h3>
          <button
            @click="$emit('close')"
            class="text-secondary-400 hover:text-secondary-600"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="px-6 py-4">
        <form @submit.prevent="saveFile" class="space-y-4">
          <!-- Podgląd pliku -->
          <div class="text-center">
            <div v-if="file.file_type === 'image'" class="mb-4">
              <img
                v-if="file.thumbnail"
                :src="file.thumbnail"
                :alt="file.title || file.file_name"
                class="w-24 h-24 object-cover rounded-lg mx-auto"
              />
            </div>
            <div v-else class="mb-4">
              <i :class="getFileIcon(file.mime_type)" class="text-4xl text-secondary-400"></i>
            </div>
            <p class="text-sm text-secondary-600">{{ file.file_name }}</p>
          </div>
          
          <!-- Tytuł -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Tytuł
            </label>
            <input
              v-model="form.title"
              type="text"
              placeholder="Nadaj nazwę plikowi"
              class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <!-- Opis -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Opis
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Dodaj opis pliku"
              class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            ></textarea>
          </div>

          <!-- Kategoria -->
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Kategoria
            </label>
            <select
              v-model="form.file_category"
              class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option v-if="file.file_type === 'image'" value="photo">Zdjęcie urządzenia</option>
              <option v-if="file.file_type === 'image'" value="installation">Zdjęcie instalacji</option>
              <option v-if="file.file_type === 'image'" value="room">Zdjęcie kotłowni</option>
              <option v-if="file.file_type === 'image'" value="diagram">Schemat/diagram</option>
              <option v-if="file.file_type === 'document'" value="manual">Instrukcja obsługi</option>
              <option v-if="file.file_type === 'document'" value="certificate">Certyfikat</option>
              <option v-if="file.file_type === 'document'" value="warranty">Gwarancja</option>
              <option v-if="file.file_type === 'document'" value="technical">Dokumentacja techniczna</option>
              <option value="other">Inne</option>
            </select>
          </div>

          <!-- Główne zdjęcie -->
          <div v-if="file.file_type === 'image'" class="flex items-center">
            <input
              v-model="form.is_primary"
              type="checkbox"
              id="file_primary"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
            <label for="file_primary" class="ml-2 block text-sm text-secondary-900">
              Ustaw jako główne zdjęcie urządzenia
            </label>
          </div>
        </form>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          type="button"
          class="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50"
        >
          Anuluj
        </button>
        <button
          @click="saveFile"
          :disabled="isLoading"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          Zapisz
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'saved'])

const isLoading = ref(false)

const form = reactive({
  title: '',
  description: '',
  file_category: '',
  is_primary: false
})

// Wypełnij formularz
onMounted(() => {
  form.title = props.file.title || props.file.file_name
  form.description = props.file.description || ''
  form.file_category = props.file.file_category || 'other'
  form.is_primary = Boolean(props.file.is_primary)
})

const saveFile = async () => {
  isLoading.value = true
  
  try {
    await window.electronAPI.fileManager.updateDeviceFile(props.file.id, {
      title: form.title,
      description: form.description,
      file_category: form.file_category,
      is_primary: form.is_primary
    })
    
    // Jeśli ustawiono jako główne, ustaw to w bazie
    if (form.is_primary && props.file.file_type === 'image') {
      await window.electronAPI.fileManager.setPrimaryFile(props.file.device_id, props.file.id)
    }
    
    emit('saved')
  } catch (error) {
    console.error('Błąd zapisywania pliku:', error)
  } finally {
    isLoading.value = false
  }
}

const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return 'fas fa-file-pdf text-red-500'
  if (mimeType?.includes('word')) return 'fas fa-file-word text-blue-500'
  if (mimeType?.includes('text')) return 'fas fa-file-alt text-secondary-500'
  return 'fas fa-file text-secondary-500'
}
</script> 