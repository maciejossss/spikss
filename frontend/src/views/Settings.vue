<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        <Settings class="w-8 h-8 inline mr-3 text-blue-600" />
        Ustawienia Systemu
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Zarządzanie serwerem i monitorowanie stanu systemu
      </p>
    </div>

    <!-- System Status Card -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Status Overview -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            <Activity class="w-5 h-5 inline mr-2 text-green-500" />
            Status Systemu
          </h2>
          <button 
            @click="refreshStatus"
            :disabled="loading.status"
            class="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
          >
            <RefreshCw :class="['w-4 h-4 text-blue-600', { 'animate-spin': loading.status }]" />
          </button>
        </div>

        <div v-if="systemStatus" class="space-y-4">
          <!-- Server Status -->
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center">
              <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span class="font-medium text-gray-900 dark:text-white">Serwer</span>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ systemStatus.server.status }}</div>
              <div class="text-xs text-gray-500">Uptime: {{ systemStatus.server.uptime }}</div>
            </div>
          </div>

          <!-- Database Status -->
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center">
              <div :class="['w-3 h-3 rounded-full mr-3', systemStatus.database.status === 'healthy' ? 'bg-green-500' : 'bg-red-500']"></div>
              <span class="font-medium text-gray-900 dark:text-white">Baza Danych</span>
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {{ systemStatus.database.status === 'healthy' ? 'Połączona' : 'Błąd połączenia' }}
            </div>
          </div>

          <!-- Connections -->
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center">
              <div :class="['w-3 h-3 rounded-full mr-3', systemStatus.connections.active > 30 ? 'bg-yellow-500' : 'bg-green-500']"></div>
              <span class="font-medium text-gray-900 dark:text-white">Połączenia</span>
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {{ systemStatus.connections.active }} / {{ systemStatus.connections.max }}
            </div>
          </div>

          <!-- Memory Usage -->
          <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-900 dark:text-white">Pamięć</span>
              <span class="text-sm text-gray-500">{{ systemStatus.memory.used }} / {{ systemStatus.memory.total }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: memoryPercentage + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <Loader2 class="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
          <p class="text-gray-500">Ładowanie statusu systemu...</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          <Zap class="w-5 h-5 inline mr-2 text-yellow-500" />
          Szybkie Akcje
        </h2>

        <div class="space-y-3">
          <!-- Clear Memory -->
          <button
            @click="clearMemory"
            :disabled="loading.clearMemory"
            class="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg border border-green-200 dark:border-green-800 transition-colors"
          >
            <div class="flex items-center">
              <Trash2 class="w-5 h-5 mr-3 text-green-600" />
              <div class="text-left">
                <div class="font-medium text-green-800 dark:text-green-200">Wyczyść Pamięć Cache</div>
                <div class="text-sm text-green-600 dark:text-green-400">Bezpieczne czyszczenie bez wpływu na dane</div>
              </div>
            </div>
            <Loader2 v-if="loading.clearMemory" class="w-4 h-4 animate-spin text-green-600" />
            <ChevronRight v-else class="w-4 h-4 text-green-600" />
          </button>

          <!-- Cleanup Connections -->
          <button
            @click="cleanupConnections"
            :disabled="loading.cleanupConnections"
            class="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <div class="flex items-center">
              <Wifi class="w-5 h-5 mr-3 text-blue-600" />
              <div class="text-left">
                <div class="font-medium text-blue-800 dark:text-blue-200">Wyczyść Połączenia</div>
                <div class="text-sm text-blue-600 dark:text-blue-400">Usuń zawieszone połączenia HTTP</div>
              </div>
            </div>
            <Loader2 v-if="loading.cleanupConnections" class="w-4 h-4 animate-spin text-blue-600" />
            <ChevronRight v-else class="w-4 h-4 text-blue-600" />
          </button>

          <!-- Restart Server -->
          <button
            @click="showRestartConfirm = true"
            :disabled="loading.restart"
            class="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors"
          >
            <div class="flex items-center">
              <RotateCcw class="w-5 h-5 mr-3 text-orange-600" />
              <div class="text-left">
                <div class="font-medium text-orange-800 dark:text-orange-200">Restartuj Serwer</div>
                <div class="text-sm text-orange-600 dark:text-orange-400">Pełny restart aplikacji (10-15s przestoju)</div>
              </div>
            </div>
            <Loader2 v-if="loading.restart" class="w-4 h-4 animate-spin text-orange-600" />
            <ChevronRight v-else class="w-4 h-4 text-orange-600" />
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Actions Log -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        <ScrollText class="w-5 h-5 inline mr-2 text-purple-500" />
        Ostatnie Akcje
      </h2>

      <div v-if="actionLog.length > 0" class="space-y-3">
        <div 
          v-for="action in actionLog" 
          :key="action.id"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div class="flex items-center">
            <div :class="['w-2 h-2 rounded-full mr-3', getActionStatusColor(action.status)]"></div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">{{ action.message }}</div>
              <div class="text-sm text-gray-500">{{ formatTime(action.timestamp) }}</div>
            </div>
          </div>
          <span :class="['text-xs px-2 py-1 rounded-full', getActionBadgeClass(action.status)]">
            {{ getActionStatusText(action.status) }}
          </span>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <ScrollText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">Brak wykonanych akcji</p>
      </div>
    </div>

    <!-- Restart Confirmation Modal -->
    <div v-if="showRestartConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <AlertTriangle class="w-6 h-6 text-orange-500 mr-3" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Potwierdzenie Restartu</h3>
        </div>
        
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Czy na pewno chcesz zrestartować serwer? Operacja spowoduje krótkotrwałą niedostępność aplikacji (10-15 sekund).
          <strong class="text-orange-600 dark:text-orange-400">Dane w bazie danych pozostaną nienaruszone.</strong>
        </p>

        <div class="flex space-x-3">
          <button
            @click="showRestartConfirm = false"
            class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Anuluj
          </button>
          <button
            @click="confirmRestart"
            :disabled="loading.restart"
            class="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <Loader2 v-if="loading.restart" class="w-4 h-4 animate-spin mr-2" />
            Restartuj
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message.text" :class="['fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md', message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white']">
      <div class="flex items-center">
        <CheckCircle v-if="message.type === 'success'" class="w-5 h-5 mr-2" />
        <XCircle v-else class="w-5 h-5 mr-2" />
        <span>{{ message.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Settings, Activity, RefreshCw, Loader2, Zap, Trash2, ChevronRight,
  Wifi, RotateCcw, ScrollText, AlertTriangle, CheckCircle, XCircle
} from 'lucide-vue-next'
import { systemService } from '../services/systemService'

// Reactive data
const systemStatus = ref(null)
const actionLog = ref([])
const showRestartConfirm = ref(false)
const message = ref({ text: '', type: '' })

const loading = ref({
  status: false,
  clearMemory: false,
  cleanupConnections: false,
  restart: false
})

// Computed
const memoryPercentage = computed(() => {
  if (!systemStatus.value?.memory) return 0
  const used = parseFloat(systemStatus.value.memory.used)
  const total = parseFloat(systemStatus.value.memory.total)
  return Math.round((used / total) * 100)
})

// Methods
const refreshStatus = async () => {
  loading.value.status = true
  try {
    const response = await systemService.getStatus()
    systemStatus.value = response.data
  } catch (error) {
    showMessage('Błąd podczas pobierania statusu systemu', 'error')
  } finally {
    loading.value.status = false
  }
}

const clearMemory = async () => {
  loading.value.clearMemory = true
  try {
    const response = await systemService.clearMemory()
    addToActionLog('Wyczyszczenie pamięci cache', 'success', response.data)
    showMessage(response.message, 'success')
    await refreshStatus()
  } catch (error) {
    addToActionLog('Wyczyszczenie pamięci cache', 'error')
    showMessage('Błąd podczas czyszczenia pamięci', 'error')
  } finally {
    loading.value.clearMemory = false
  }
}

const cleanupConnections = async () => {
  loading.value.cleanupConnections = true
  try {
    const response = await systemService.cleanupConnections()
    addToActionLog('Wyczyszczenie połączeń', 'success', response.data)
    showMessage(response.message, 'success')
    await refreshStatus()
  } catch (error) {
    addToActionLog('Wyczyszczenie połączeń', 'error')
    showMessage('Błąd podczas czyszczenia połączeń', 'error')
  } finally {
    loading.value.cleanupConnections = false
  }
}

const confirmRestart = async () => {
  loading.value.restart = true
  showRestartConfirm.value = false
  
  try {
    const response = await systemService.restartServer()
    addToActionLog('Restart serwera', 'success')
    showMessage(response.message, 'success')
    
    // Show countdown message
    showMessage('Serwer zostanie zrestartowany za 3 sekundy...', 'success')
    
    // After restart, refresh the page
    setTimeout(() => {
      window.location.reload()
    }, 15000) // Wait 15 seconds for restart
    
  } catch (error) {
    addToActionLog('Restart serwera', 'error')
    showMessage('Błąd podczas restartu serwera', 'error')
  } finally {
    loading.value.restart = false
  }
}

const addToActionLog = (message, status, data = null) => {
  const action = {
    id: Date.now(),
    message,
    status,
    data,
    timestamp: new Date()
  }
  actionLog.value.unshift(action)
  
  // Keep only last 10 actions
  if (actionLog.value.length > 10) {
    actionLog.value = actionLog.value.slice(0, 10)
  }
}

const showMessage = (text, type) => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = { text: '', type: '' }
  }, 5000)
}

const getActionStatusColor = (status) => {
  switch (status) {
    case 'success': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'warning': return 'bg-yellow-500'
    default: return 'bg-gray-500'
  }
}

const getActionBadgeClass = (status) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getActionStatusText = (status) => {
  switch (status) {
    case 'success': return 'Sukces'
    case 'error': return 'Błąd'
    case 'warning': return 'Ostrzeżenie'
    default: return 'Nieznany'
  }
}

const formatTime = (date) => {
  return new Date(date).toLocaleString('pl-PL')
}

// Lifecycle
onMounted(() => {
  refreshStatus()
  
  // Auto-refresh status every 30 seconds
  setInterval(refreshStatus, 30000)
})
</script> 