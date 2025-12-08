<template>
  <div class="space-y-4">
    <!-- Upload przyciski -->
    <div v-if="!readonly" class="flex flex-wrap gap-3">
      <button
        @click="selectFiles('images')"
        type="button"
        class="btn-secondary text-sm"
        :disabled="isUploading"
      >
        <i class="fas fa-image mr-2"></i>
        Dodaj zdjęcia
      </button>
      <button
        @click="selectFiles('documents')"
        type="button"
        class="btn-secondary text-sm"
        :disabled="isUploading"
      >
        <i class="fas fa-file-pdf mr-2"></i>
        Dodaj dokumenty
      </button>
      <button
        @click="syncToRailway"
        type="button"
        class="btn-secondary text-sm"
        :disabled="isUploading"
        title="Wyślij wszystkie pliki urządzenia na Railway (dla PWA)"
      >
        <i class="fas fa-cloud-upload-alt mr-2"></i>
        Synchronizuj pliki
      </button>
    </div>

    <!-- Loader podczas uploadu -->
    <div v-if="isUploading" class="flex items-center justify-center py-8 bg-secondary-50 rounded-lg">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-3xl text-primary-600 mb-2"></i>
        <p class="text-sm text-secondary-600">Przesyłanie plików...</p>
      </div>
    </div>

    <!-- Lista plików -->
    <div v-if="files.length > 0" class="space-y-4">
      <!-- Zdjęcia -->
      <div v-if="imageFiles.length > 0">
        <h5 class="text-sm font-medium text-secondary-900 mb-3 flex items-center">
          <i class="fas fa-image mr-2"></i>
          Zdjęcia ({{ imageFiles.length }})
        </h5>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="file in imageFiles"
            :key="file.id"
            class="relative group bg-white rounded-lg border border-secondary-200 overflow-hidden"
          >
            <!-- Miniaturka -->
            <div class="aspect-square bg-secondary-100 flex items-center justify-center">
              <img
                v-if="file.thumbnail"
                :src="file.thumbnail"
                :alt="file.title || file.file_name"
                class="w-full h-full object-cover"
                @click="viewFile(file)"
              />
              <i v-else class="fas fa-image text-4xl text-secondary-400"></i>
            </div>
            
            <!-- Badge głównego zdjęcia -->
            <div
              v-if="file.is_primary"
              class="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded"
            >
              Główne
            </div>
            
            <!-- Overlay z akcjami -->
            <div v-if="!readonly" class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              <button
                @click="viewFile(file)"
                class="p-2 bg-white text-secondary-600 rounded-full hover:bg-secondary-100"
                title="Pokaż"
              >
                <i class="fas fa-eye"></i>
              </button>
              <button
                @click="editFile(file)"
                class="p-2 bg-white text-secondary-600 rounded-full hover:bg-secondary-100"
                title="Edytuj"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                v-if="!file.is_primary"
                @click="setPrimary(file)"
                class="p-2 bg-white text-secondary-600 rounded-full hover:bg-secondary-100"
                title="Ustaw jako główne"
              >
                <i class="fas fa-star"></i>
              </button>
              <button
                @click="deleteFile(file)"
                class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                title="Usuń"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
            
            <!-- Opis -->
            <div class="p-2">
              <p class="text-xs text-secondary-600 truncate" :title="file.title || file.file_name">
                {{ file.title || file.file_name }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Dokumenty -->
      <div v-if="documentFiles.length > 0">
        <h5 class="text-sm font-medium text-secondary-900 mb-3 flex items-center">
          <i class="fas fa-file-pdf mr-2"></i>
          Dokumenty ({{ documentFiles.length }})
        </h5>
        <div class="space-y-2">
          <div
            v-for="file in documentFiles"
            :key="file.id"
            class="flex items-center justify-between p-3 bg-white border border-secondary-200 rounded-lg hover:bg-secondary-50"
          >
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <i :class="getFileIcon(file.mime_type)" class="text-2xl text-secondary-400"></i>
              </div>
              <div>
                <p class="text-sm font-medium text-secondary-900">
                  {{ file.title || file.file_name }}
                </p>
                <p class="text-xs text-secondary-500">
                  {{ formatFileSize(file.file_size) }} • {{ formatDate(file.created_at) }}
                </p>
                <p v-if="file.description" class="text-xs text-secondary-600 mt-1">
                  {{ file.description }}
                </p>
              </div>
            </div>
            <div v-if="!readonly" class="flex items-center space-x-2">
              <button
                @click="openFile(file)"
                class="p-2 text-secondary-600 hover:text-primary-600 rounded-full hover:bg-secondary-100"
                title="Otwórz"
              >
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button
                @click="editFile(file)"
                class="p-2 text-secondary-600 hover:text-primary-600 rounded-full hover:bg-secondary-100"
                title="Edytuj"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                @click="deleteFile(file)"
                class="p-2 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50"
                title="Usuń"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stan pusty -->
    <div v-else class="text-center py-8 bg-secondary-50 rounded-lg">
      <i class="fas fa-folder-open text-4xl text-secondary-400 mb-4"></i>
      <p class="text-sm text-secondary-600">
        {{ readonly ? 'Brak plików dla tego urządzenia' : 'Dodaj zdjęcia i dokumenty do tego urządzenia' }}
      </p>
    </div>

    <!-- Modal edycji pliku -->
    <FileEditModal
      v-if="editingFile"
      :file="editingFile"
      @close="editingFile = null"
      @saved="onFileSaved"
    />

    <!-- Modal podglądu obrazu -->
    <ImageViewer
      v-if="viewingFile"
      :file="viewingFile"
      @close="viewingFile = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import FileEditModal from './FileEditModal.vue'
import ImageViewer from './ImageViewer.vue'

const props = defineProps({
  deviceId: {
    type: Number,
    required: true
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const files = ref([])
const isUploading = ref(false)
const editingFile = ref(null)
const viewingFile = ref(null)

const imageFiles = computed(() => 
  files.value.filter(f => f.file_type === 'image').sort((a, b) => b.is_primary - a.is_primary)
)

const documentFiles = computed(() => 
  files.value.filter(f => f.file_type === 'document')
)

// Załaduj pliki urządzenia
const loadFiles = async () => {
  try {
    if (window.electronAPI?.fileManager) {
      const deviceFiles = await window.electronAPI.fileManager.getDeviceFiles(props.deviceId)
      
      // Wczytaj miniaturki dla obrazów
      for (const file of deviceFiles) {
        if (file.file_type === 'image') {
          try {
            const result = await window.electronAPI.fileManager.getFile(file.file_path)
            if (result.success) {
              file.thumbnail = `data:${result.mimeType};base64,${result.data}`
            }
          } catch (error) {
            console.warn('Nie można wczytać miniaturki:', error)
          }
        }
      }
      
      files.value = deviceFiles
    }
  } catch (error) {
    console.error('Błąd ładowania plików:', error)
  }
}

// Wybór plików
const selectFiles = async (type) => {
  try {
    const filters = type === 'images' 
      ? { name: 'Obrazy', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
      : { name: 'Dokumenty', extensions: ['pdf', 'doc', 'docx', 'txt'] }

    const result = await window.electronAPI.fileManager.selectFiles({
      filters: [filters, { name: 'Wszystkie pliki', extensions: ['*'] }]
    })

    if (result.success && result.files.length > 0) {
      await uploadFiles(result.files, type)
    }
  } catch (error) {
    console.error('Błąd wyboru plików:', error)
  }
}

// Upload plików
const uploadFiles = async (filePaths, type) => {
  isUploading.value = true
  
  try {
    for (const filePath of filePaths) {
      // Zapisz plik
      const saveResult = await window.electronAPI.fileManager.saveDeviceFile(props.deviceId, filePath)
      
      if (saveResult.success) {
        // Dodaj do bazy danych
        const fileData = {
          device_id: props.deviceId,
          file_name: saveResult.file.file_name,
          file_path: saveResult.file.file_path,
          file_type: type === 'images' ? 'image' : 'document',
          file_category: type === 'images' ? 'photo' : 'manual',
          file_size: saveResult.file.file_size,
          mime_type: saveResult.file.mime_type,
          title: saveResult.file.original_name,
          description: '',
          is_primary: files.value.filter(f => f.file_type === 'image').length === 0 && type === 'images' ? 1 : 0
        }
        
        await window.electronAPI.fileManager.addDeviceFile(fileData)

        // Best-effort: prześlij również na Railway (HTTPS dla PWA)
        try {
          await fetch('http://localhost:5174/api/railway/device-files/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: props.deviceId,
              filePath: saveResult.file.file_path,
              fileName: saveResult.file.file_name,
              mimeType: saveResult.file.mime_type,
              fileType: fileData.file_type
            })
          })
        } catch (_) { /* ignore when offline */ }
      }
    }
    
    // Odśwież listę
    await loadFiles()
  } catch (error) {
    console.error('Błąd uploadu plików:', error)
  } finally {
    isUploading.value = false
  }
}

// Ręczna synchronizacja wszystkich plików urządzenia do Railway (HTTPS dla PWA)
const syncToRailway = async () => {
  try {
    if (!props.deviceId) return
    const r = await fetch(`http://localhost:5174/api/railway/device-files/sync/${props.deviceId}`, { method: 'POST' })
    if (!r.ok) { alert('Nie udało się zsynchronizować plików z Railway'); return }
    alert('Zsynchronizowano pliki urządzenia z Railway. W aplikacji mobilnej użyj „Odśwież zdjęcia”.')
  } catch (e) {
    alert('Błąd synchronizacji plików: ' + (e?.message || ''))
  }
}

// Ustaw jako główne zdjęcie
const setPrimary = async (file) => {
  try {
    await window.electronAPI.fileManager.setPrimaryFile(props.deviceId, file.id)
    await loadFiles()
  } catch (error) {
    console.error('Błąd ustawiania głównego zdjęcia:', error)
  }
}

// Edytuj plik
const editFile = (file) => {
  editingFile.value = file
}

// Podgląd pliku
const viewFile = (file) => {
  if (file.file_type === 'image') {
    viewingFile.value = file
  } else {
    openFile(file)
  }
}

// Otwórz plik w aplikacji systemowej
const openFile = async (file) => {
  try {
    await window.electronAPI.fileManager.openFile(file.file_path)
  } catch (error) {
    console.error('Błąd otwierania pliku:', error)
  }
}

// Usuń plik
const deleteFile = async (file) => {
  if (confirm('Czy na pewno chcesz usunąć ten plik?')) {
    try {
      // Usuń z bazy danych
      await window.electronAPI.fileManager.deleteDeviceFile(file.id)
      
      // Usuń plik fizyczny
      await window.electronAPI.fileManager.deleteFile(file.file_path)
      
      // Odśwież listę
      await loadFiles()
    } catch (error) {
      console.error('Błąd usuwania pliku:', error)
    }
  }
}

// Po zapisaniu edycji pliku
const onFileSaved = async () => {
  editingFile.value = null
  await loadFiles()
}

// Pomocnicze funkcje
const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return 'fas fa-file-pdf text-red-500'
  if (mimeType?.includes('word')) return 'fas fa-file-word text-blue-500'
  if (mimeType?.includes('text')) return 'fas fa-file-alt text-secondary-500'
  return 'fas fa-file text-secondary-500'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pl-PL')
}

onMounted(() => {
  loadFiles()
})
</script> 