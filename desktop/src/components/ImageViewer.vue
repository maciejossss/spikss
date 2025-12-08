<template>
  <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" @click="$emit('close')">
    <div class="max-w-screen-lg max-h-screen-lg w-full h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 text-white">
        <div>
          <h3 class="text-lg font-medium">{{ file.title || file.file_name }}</h3>
          <p v-if="file.description" class="text-sm text-gray-300 mt-1">{{ file.description }}</p>
          <p class="text-xs text-gray-400 mt-1">
            <i class="fas fa-mouse-pointer mr-1"></i>Kółko myszy: zoom 
            <span class="mx-2">•</span>
            <i class="fas fa-hand-paper mr-1"></i>Przeciągnij: przewijanie
            <span class="mx-2">•</span>
            <i class="fas fa-keyboard mr-1"></i>+/- : zoom, 0: reset, Esc: zamknij
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-white hover:text-gray-300 text-2xl"
          @click.stop
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- Obraz -->
      <div class="flex-1 overflow-auto p-4" @click.stop>
        <div class="min-h-full flex items-center justify-center">
          <img
            v-if="file.thumbnail"
            :src="file.thumbnail"
            :alt="file.title || file.file_name"
            class="cursor-move transition-transform duration-200"
            :style="imageStyle"
            @click.stop
            @wheel="handleWheel"
          />
          <div v-else class="text-white text-center">
            <i class="fas fa-image text-6xl mb-4"></i>
            <p>Nie można załadować obrazu</p>
          </div>
        </div>
      </div>
      
      <!-- Footer z informacjami -->
      <div class="p-4 text-white text-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <span>{{ formatFileSize(file.file_size) }}</span>
            <span>{{ formatDate(file.created_at) }}</span>
            <span v-if="file.file_category" class="bg-white bg-opacity-20 px-2 py-1 rounded">
              {{ getCategoryName(file.file_category) }}
            </span>
          </div>
          <div class="flex items-center space-x-4">
            <!-- Kontrolki zoom -->
            <div class="flex items-center space-x-2 bg-white bg-opacity-20 rounded px-2 py-1">
              <button
                @click="zoomOut"
                class="hover:bg-white hover:bg-opacity-20 p-1 rounded"
                @click.stop
                :disabled="zoom <= minZoom"
              >
                <i class="fas fa-search-minus"></i>
              </button>
              <span class="text-xs min-w-[3rem] text-center">{{ Math.round(zoom * 100) }}%</span>
              <button
                @click="zoomIn"
                class="hover:bg-white hover:bg-opacity-20 p-1 rounded"
                @click.stop
                :disabled="zoom >= maxZoom"
              >
                <i class="fas fa-search-plus"></i>
              </button>
              <button
                @click="resetZoom"
                class="hover:bg-white hover:bg-opacity-20 p-1 rounded text-xs"
                @click.stop
              >
                Reset
              </button>
            </div>
            <button
              @click="openFile"
              class="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm"
              @click.stop
            >
              <i class="fas fa-external-link-alt mr-1"></i>
              Otwórz w aplikacji
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

// Zoom functionality
const zoom = ref(1)
const minZoom = 0.1
const maxZoom = 5

const imageStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  maxWidth: zoom.value <= 1 ? '100%' : 'none',
  maxHeight: zoom.value <= 1 ? '100%' : 'none',
  width: zoom.value <= 1 ? 'auto' : `${zoom.value * 100}%`,
  height: zoom.value <= 1 ? 'auto' : `${zoom.value * 100}%`
}))

const handleWheel = (event) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom.value + delta))
  zoom.value = newZoom
}

const zoomIn = () => {
  zoom.value = Math.min(maxZoom, zoom.value + 0.2)
}

const zoomOut = () => {
  zoom.value = Math.max(minZoom, zoom.value - 0.2)
}

const resetZoom = () => {
  zoom.value = 1
}

// Keyboard shortcuts
const handleKeydown = (event) => {
  switch (event.key) {
    case 'Escape':
      emit('close')
      break
    case '+':
    case '=':
      event.preventDefault()
      zoomIn()
      break
    case '-':
      event.preventDefault()
      zoomOut()
      break
    case '0':
      event.preventDefault()
      resetZoom()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const openFile = async () => {
  try {
    await window.electronAPI.fileManager.openFile(props.file.file_path)
  } catch (error) {
    console.error('Błąd otwierania pliku:', error)
  }
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

const getCategoryName = (category) => {
  const categories = {
    photo: 'Zdjęcie urządzenia',
    installation: 'Zdjęcie instalacji',
    room: 'Zdjęcie kotłowni',
    diagram: 'Schemat/diagram',
    other: 'Inne'
  }
  return categories[category] || category
}
</script> 