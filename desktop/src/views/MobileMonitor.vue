<template>
  <div class="mobile-monitor">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Monitor Prac Mobilnych</h1>
          <p class="text-gray-600 mt-1">Rzeczywisty postęp techników w terenie</p>
        </div>
        <div class="flex items-center space-x-4">
          <div class="bg-green-100 px-3 py-2 rounded-lg">
            <span class="text-green-800 font-medium">{{ activeWorkCount }} aktywnych prac</span>
          </div>
          <button 
            @click="refreshData"
            :disabled="isLoading"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <i class="fas fa-sync-alt mr-2" :class="{ 'fa-spin': isLoading }"></i>
            Odśwież
          </button>
        </div>
      </div>
    </div>

    <!-- Statystyki -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="bg-blue-500 p-3 rounded-lg">
            <i class="fas fa-clock text-white"></i>
          </div>
          <div class="ml-4">
            <p class="text-blue-600 text-sm font-medium">Aktywne zlecenia</p>
            <p class="text-2xl font-bold text-blue-900">{{ stats.active }}</p>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="bg-yellow-500 p-3 rounded-lg">
            <i class="fas fa-users text-white"></i>
          </div>
          <div class="ml-4">
            <p class="text-yellow-600 text-sm font-medium">Pracujących techników</p>
            <p class="text-2xl font-bold text-yellow-900">{{ stats.activeTechnicians }}</p>
          </div>
        </div>
      </div>

      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="bg-green-500 p-3 rounded-lg">
            <i class="fas fa-check-circle text-white"></i>
          </div>
          <div class="ml-4">
            <p class="text-green-600 text-sm font-medium">Ukończone dzisiaj</p>
            <p class="text-2xl font-bold text-green-900">{{ stats.completedToday }}</p>
          </div>
        </div>
      </div>

      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="bg-purple-500 p-3 rounded-lg">
            <i class="fas fa-stopwatch text-white"></i>
          </div>
          <div class="ml-4">
            <p class="text-purple-600 text-sm font-medium">Średni czas pracy</p>
            <p class="text-2xl font-bold text-purple-900">{{ stats.averageTime }}h</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktywne prace z timerami -->
    <div class="bg-white rounded-lg shadow-sm border mb-6">
      <div class="px-6 py-4 border-b">
        <h2 class="text-xl font-semibold text-gray-900">Aktywne Prace (Real-time)</h2>
      </div>
      
      <div v-if="activeWorks.length === 0" class="p-8 text-center text-gray-500">
        <i class="fas fa-clock text-4xl mb-4 text-gray-300"></i>
        <p class="text-lg">Brak aktywnych prac</p>
        <p class="text-sm">Techników obecnie nie wykonują żadnych zleceń</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div 
          v-for="work in activeWorks" 
          :key="work.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-start justify-between">
            <!-- Informacje o zleceniu -->
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  W TRAKCIE
                </span>
                <span class="text-gray-500 text-sm font-mono">{{ work.order_number }}</span>
                <span 
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getPriorityClass(work.priority)"
                >
                  {{ getPriorityText(work.priority) }}
                </span>
              </div>
              
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                {{ work.title }}
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div class="space-y-1">
                  <div class="flex items-center">
                    <i class="fas fa-user w-4 mr-2"></i>
                    <span>{{ work.technician_name }}</span>
                  </div>
                  <div class="flex items-center">
                    <i class="fas fa-building w-4 mr-2"></i>
                    <span>{{ work.client_name }}</span>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="flex items-center">
                    <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                    <span>{{ work.address }}</span>
                  </div>
                  <div class="flex items-center">
                    <i class="fas fa-tools w-4 mr-2"></i>
                    <span>{{ work.device_name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Timer i kontrolki -->
            <div class="ml-6 text-right">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                <div class="text-2xl font-bold text-yellow-900 font-mono">
                  {{ formatElapsedTime(work.elapsed_time) }}
                </div>
                <div class="text-xs text-yellow-600">
                  Rozpoczęto: {{ formatTime(work.timer_started) }}
                </div>
              </div>
              
              <div class="space-y-2">
                <button
                  @click="viewWorkDetails(work)"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  <i class="fas fa-eye mr-1"></i>
                  Szczegóły
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ostatnio ukończone prace -->
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="px-6 py-4 border-b">
        <h2 class="text-xl font-semibold text-gray-900">Ostatnio Ukończone</h2>
      </div>
      
      <div class="divide-y divide-gray-200">
        <div 
          v-for="work in completedWorks" 
          :key="'completed-' + work.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  UKOŃCZONE
                </span>
                <span class="text-gray-500 text-sm font-mono">{{ work.order_number }}</span>
                <span class="text-gray-500 text-sm">
                  {{ formatDateTime(work.actual_end_date) }}
                </span>
              </div>
              
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                {{ work.title }}
              </h3>
              
              <div class="flex items-center space-x-6 text-sm text-gray-600">
                <div class="flex items-center">
                  <i class="fas fa-user w-4 mr-2"></i>
                  <span>{{ work.technician_name }}</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-building w-4 mr-2"></i>
                  <span>{{ work.client_name }}</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-clock w-4 mr-2"></i>
                  <span>{{ work.actual_hours }}h rzeczywistej pracy</span>
                </div>
              </div>

              <!-- Wykonane kategorie -->
              <div v-if="work.completed_categories" class="mt-3">
                <p class="text-sm font-medium text-gray-700 mb-1">Wykonane prace:</p>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="category in getCompletedCategories(work.completed_categories)"
                    :key="category"
                    class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                  >
                    {{ getCategoryName(category) }}
                  </span>
                </div>
              </div>

              <!-- Notatki -->
              <div v-if="work.completion_notes" class="mt-2">
                <p class="text-sm text-gray-600">
                  <i class="fas fa-sticky-note mr-1"></i>
                  {{ work.completion_notes }}
                </p>
              </div>
            </div>

            <div class="ml-6">
              <button
                @click="viewWorkDetails(work)"
                class="text-green-600 hover:text-green-800 text-sm"
              >
                <i class="fas fa-file-alt mr-1"></i>
                Raport
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal szczegółów pracy -->
    <div v-if="selectedWork" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold">Szczegóły Zlecenia</h3>
          <button @click="selectedWork = null" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <div class="space-y-4">
          <!-- Podstawowe info -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Numer zlecenia:</span>
              <span class="ml-2">{{ selectedWork.order_number }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Status:</span>
              <span class="ml-2 px-2 py-1 rounded text-xs" :class="getStatusClass(selectedWork.status)">
                {{ getStatusText(selectedWork.status) }}
              </span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Technik:</span>
              <span class="ml-2">{{ selectedWork.technician_name }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Klient:</span>
              <span class="ml-2">{{ selectedWork.client_name }}</span>
            </div>
          </div>

          <!-- Szczegóły czasowe -->
          <div v-if="selectedWork.status === 'in_progress' || selectedWork.status === 'completed'" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Informacje czasowe</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div v-if="selectedWork.actual_start_date">
                <span class="font-medium text-gray-700">Rozpoczęcie:</span>
                <span class="ml-2">{{ formatDateTime(selectedWork.actual_start_date) }}</span>
              </div>
              <div v-if="selectedWork.actual_end_date">
                <span class="font-medium text-gray-700">Zakończenie:</span>
                <span class="ml-2">{{ formatDateTime(selectedWork.actual_end_date) }}</span>
              </div>
              <div v-if="selectedWork.status === 'in_progress'">
                <span class="font-medium text-gray-700">Czas pracy:</span>
                <span class="ml-2 font-mono">{{ formatElapsedTime(selectedWork.elapsed_time) }}</span>
              </div>
              <div v-if="selectedWork.actual_hours">
                <span class="font-medium text-gray-700">Całkowity czas:</span>
                <span class="ml-2">{{ selectedWork.actual_hours }}h</span>
              </div>
            </div>
          </div>

          <!-- Wykonane prace -->
          <div v-if="selectedWork.completed_categories" class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Wykonane prace</h4>
            <div class="grid grid-cols-1 gap-2">
              <div 
                v-for="category in getCompletedCategories(selectedWork.completed_categories)"
                :key="category"
                class="flex items-center text-sm"
              >
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span>{{ getCategoryName(category) }}</span>
              </div>
            </div>
          </div>

          <!-- Notatki -->
          <div v-if="selectedWork.completion_notes" class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Notatki technika</h4>
            <p class="text-sm text-gray-700">{{ selectedWork.completion_notes }}</p>
          </div>

          <!-- Zdjęcia -->
          <div v-if="selectedWork.work_photos && getWorkPhotos(selectedWork.work_photos).length > 0" class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Dokumentacja zdjęciowa</h4>
            <div class="grid grid-cols-3 gap-2">
              <div 
                v-for="(photo, index) in getWorkPhotos(selectedWork.work_photos)"
                :key="index"
                class="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"
              >
                <i class="fas fa-image text-gray-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MobileMonitor',
  data() {
    return {
      isLoading: false,
      activeWorks: [],
      completedWorks: [],
      selectedWork: null,
      stats: {
        active: 0,
        activeTechnicians: 0,
        completedToday: 0,
        averageTime: 0
      },
      refreshInterval: null
    }
  },
  computed: {
    activeWorkCount() {
      return this.activeWorks.length;
    }
  },
  async mounted() {
    await this.refreshData();
    // Auto-refresh co 30 sekund
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 30000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async refreshData() {
      this.isLoading = true;
      try {
        // Pobierz aktywne prace z timerami
        const activeResponse = await fetch('http://localhost:5174/api/desktop/orders/active-timers');
        if (activeResponse.ok) {
          this.activeWorks = await activeResponse.json();
        }

        // Fallback: jeśli brak lokalnych timerów, pokaż zlecenia w realizacji z Railway
        if (!Array.isArray(this.activeWorks) || this.activeWorks.length === 0) {
          try {
            const r = await fetch(`http://localhost:5174/api/railway/desktop/orders`);
            if (r.ok) {
              const all = await r.json();
              const arr = Array.isArray(all) ? all : (all?.data || []);
              const now = Date.now();
              const twelveHoursMs = 12 * 60 * 60 * 1000;
              const inProgress = arr.filter(o => {
                const s = (o?.status || '').toString().toLowerCase();
                const startedRaw = o?.actual_start_date || o?.started_at || o?.actualStartDate;
                const startedOk = startedRaw ? (now - new Date(startedRaw).getTime()) < twelveHoursMs : false;
                return (s === 'in_progress' || s === 'w realizacji' || s === 'started') && startedOk;
              });
              console.log('📡 Monitor fallback – znaleziono in_progress:', inProgress.length);
              this.activeWorks = inProgress.map(o => ({
                id: o.id || o.order_id,
                title: o.title || o.description || `Zlecenie ${o.order_number || o.id || o.order_id}`,
                client_name: o.client_name || '-',
                assigned_user_id: o.assigned_user_id || o.technician_id || null,
                scheduled_date: o.scheduled_date || o.planned_date || null,
                elapsed_time: 0,
                status: 'in_progress'
              }));
            } else {
              console.warn('⚠️ Railway proxy status:', r.status);
            }
          } catch (e) {
            console.error('❌ Fallback fetch error:', e);
          }
        }

        // Pobierz ukończone prace z dzisiaj
        const today = new Date().toISOString().split('T')[0];
        const completedOrders = await window.electronAPI.database.query(
          `
            SELECT so.*, 
                   COALESCE(c.company_name, TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS client_name,
                   u.full_name AS technician_name
            FROM service_orders so
            LEFT JOIN clients c ON so.client_id = c.id
            LEFT JOIN users u ON so.assigned_user_id = u.id
            WHERE so.status = 'completed' 
              AND date(so.actual_end_date) = ?
            ORDER BY so.actual_end_date DESC
            LIMIT 10
          `,
          [today]
        );
        this.completedWorks = completedOrders;

        // Oblicz statystyki
        this.updateStats();
      } catch (error) {
        console.error('Błąd odświeżania danych:', error);
      } finally {
        this.isLoading = false;
      }
    },

    updateStats() {
      this.stats.active = Array.isArray(this.activeWorks) ? this.activeWorks.length : 0;
      this.stats.activeTechnicians = new Set((this.activeWorks || []).map(w => w.assigned_user_id)).size;
      this.stats.completedToday = this.completedWorks.length;
      
      if (this.completedWorks.length > 0) {
        const totalHours = this.completedWorks.reduce((sum, work) => sum + (work.actual_hours || 0), 0);
        this.stats.averageTime = Math.round((totalHours / this.completedWorks.length) * 10) / 10;
      }
    },

    formatElapsedTime(seconds) {
      if (!seconds) return '00:00:00';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatDateTime(dateString) {
      return new Date(dateString).toLocaleString('pl-PL', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    getPriorityClass(priority) {
      const classes = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
      };
      return classes[priority] || classes.medium;
    },

    getPriorityText(priority) {
      const texts = {
        high: 'PILNE',
        medium: 'NORMALNE',
        low: 'NISKIE'
      };
      return texts[priority] || 'NORMALNE';
    },

    getStatusClass(status) {
      const classes = {
        new: 'bg-blue-100 text-blue-800',
        in_progress: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800'
      };
      return classes[status] || classes.new;
    },

    getStatusText(status) {
      const texts = {
        new: 'NOWE',
        in_progress: 'W TRAKCIE',
        completed: 'UKOŃCZONE'
      };
      return texts[status] || 'NOWE';
    },

    getCompletedCategories(categoriesJson) {
      try {
        return JSON.parse(categoriesJson || '[]');
      } catch {
        return [];
      }
    },

    getWorkPhotos(photosJson) {
      try {
        return JSON.parse(photosJson || '[]');
      } catch {
        return [];
      }
    },

    getCategoryName(categoryCode) {
      const codeStr = String(categoryCode || '').trim()
      
      // Stary słownik (dla kompatybilności wstecznej)
      const oldCategories = {
        'A1': 'Czyszczenie palnika (mechaniczne)',
        'A2': 'Czyszczenie palnika (chemiczne)',
        'A3': 'Czyszczenie wymiennika (mechaniczne)',
        'A4': 'Czyszczenie wymiennika (chemiczne)',
        'A5': 'Wymiana filtrów paliwa (gaz)',
        'A6': 'Wymiana filtrów paliwa (olej)',
        'A10': 'Kontrola i wymiana uszczelek',
        'B4': 'Wymiana elektrody zapłonowej',
        'B5': 'Wymiana elektrody jonizacyjnej',
        'B6': 'Wymiana dyszy paliwowej (gaz)',
        'B7': 'Wymiana dyszy paliwowej (olej)',
        'B8': 'Wymiana czujnika temperatury',
        'B9': 'Wymiana czujnika ciśnienia',
        'B10': 'Wymiana zaworu bezpieczeństwa',
        'B12': 'Wymiana pompy obiegowej',
        'B13': 'Wymiana wentylatora palnika',
        'G1': 'Diagnoza usterki',
        'G5': 'Tymczasowa naprawa'
      }
      
      // Sprawdź stary słownik
      if (oldCategories[codeStr]) {
        return oldCategories[codeStr]
      }
      
      // Nowy słownik z mobile app (dla kodów typu "10", "1001")
      const MOBILE_SERVICE_CATEGORIES = {
        '02': { name: '02: AWARIA', subcategories: { '0201': '0201: Naprawa bez użycia części', '0202': '0202: Naprawa z użyciem części' } },
        '01': { name: '01: Diagnostyka', subcategories: { '0101': '0101: Diagnostyka awarii', '0102': '0102: Sprawdzenie parametrów' } },
        '04': { name: '04: Czyszczenie', subcategories: { '0401': '0401: Czyszczenie kotła', '0402': '0402: Czyszczenie palnika' } },
        '05': { name: '05: Regulacja', subcategories: { '0501': '0501: Regulacja palnika', '0502': '0502: Regulacja automatyki' } },
        '08': { name: '08: Przegląd i konserwacja', subcategories: { '0801': '0801: Przegląd okresowy', '0802': '0802: Konserwacja' } },
        '09': { name: '09: Remont i konserwacja', subcategories: { '0901': '0901: Remont kotła', '0902': '0902: Wymiana części' } },
        '06': { name: '06: Sprawdzenie szczelności gazu', subcategories: { '0601': '0601: Sprawdzenie szczelności' } },
        '07': { name: '07: Analiza spalin', subcategories: { '0701': '0701: Analiza spalin' } },
        '03': { name: '03: Przeszkolenie', subcategories: { '0301': '0301: Przeszkolenie użytkownika' } },
        '11': { name: '11: Uruchomienie', subcategories: { '1101': '1101: Uruchomienie urządzenia' } },
        '10': { name: '10: Usunięcie awarii', subcategories: { '1001': '1001: Usunięcie awarii' } }
      }
      
      // Sprawdź czy to główna kategoria (np. "10")
      if (MOBILE_SERVICE_CATEGORIES[codeStr]) {
        return MOBILE_SERVICE_CATEGORIES[codeStr].name
      }
      
      // Sprawdź czy to podkategoria (np. "1001") - szukaj w głównych kategoriach
      for (const [mainCode, mainCat] of Object.entries(MOBILE_SERVICE_CATEGORIES)) {
        if (mainCat.subcategories && mainCat.subcategories[codeStr]) {
          return mainCat.subcategories[codeStr]
        }
      }
      
      // Jeśli nie znaleziono, zwróć kod
      return codeStr
    },

    viewWorkDetails(work) {
      this.selectedWork = work;
    }
  }
}
</script>

<style scoped>
.mobile-monitor {
  @apply p-6 bg-gray-50 min-h-screen;
}
</style> 