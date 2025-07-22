const { createApp, ref, computed, onMounted } = Vue;

// API do komunikacji z serwerem desktop
const API = {
  // Pobierz listę dostępnych techników z desktop
  async getTechnicians() {
    try {
      console.log('👥 Ładuję listę techników z desktop...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('http://192.168.1.27:5174/api/technicians', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('⚠️ Błąd pobierania techników:', response.status);
        return [];
      }
      
      const technicians = await response.json();
      console.log('✅ Załadowano techników:', technicians);
      return technicians;
    } catch (error) {
      console.error('❌ Błąd połączenia z desktop:', error);
      return [];
    }
  },

  // Pobierz zlecenia przypisane do technika (TYLKO Z DESKTOP)
  async getMyOrders(userId) {
    try {
      console.log(`📋 Ładuję zlecenia dla technika ${userId} z desktop...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`http://192.168.1.27:5174/api/desktop/orders/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('⚠️ Błąd pobierania zleceń:', response.status);
        return [];
      }
      
      const orders = await response.json();
      console.log(`✅ Pobrano ${orders.length} zleceń dla technika ${userId}`);
      return orders;
    } catch (error) {
      console.error('❌ Błąd połączenia z desktop:', error);
      throw error; // Rzuć błąd - nie używaj demo
    }
  },

  // Aktualizuj status zlecenia
  async updateOrderStatus(orderId, updates) {
    try {
      console.log(`🔄 Aktualizuję zlecenie ${orderId}:`, updates);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`http://192.168.1.27:5174/api/desktop/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mobile Safari/537.36'
        },
        body: JSON.stringify(updates),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Zlecenie zaktualizowane:', result);
      return result;
    } catch (error) {
      console.error('❌ Błąd aktualizacji zlecenia:', error);
      throw error;
    }
  }
};

// Definicje kategorii usług (identyczne z systemem desktop)
const SERVICE_CATEGORIES = {
  'A1': { name: 'Czyszczenie palnika (mechaniczne)', group: 'Przeglądy' },
  'A2': { name: 'Czyszczenie palnika (chemiczne)', group: 'Przeglądy' },
  'A3': { name: 'Czyszczenie wymiennika (mechaniczne)', group: 'Przeglądy' },
  'A4': { name: 'Czyszczenie wymiennika (chemiczne)', group: 'Przeglądy' },
  'A5': { name: 'Wymiana filtrów paliwa (gaz)', group: 'Przeglądy' },
  'A6': { name: 'Wymiana filtrów paliwa (olej)', group: 'Przeglądy' },
  'A10': { name: 'Kontrola i wymiana uszczelek', group: 'Przeglądy' },
  'B4': { name: 'Wymiana elektrody zapłonowej', group: 'Wymiana części' },
  'B5': { name: 'Wymiana elektrody jonizacyjnej', group: 'Wymiana części' },
  'B6': { name: 'Wymiana dyszy paliwowej (gaz)', group: 'Wymiana części' },
  'B7': { name: 'Wymiana dyszy paliwowej (olej)', group: 'Wymiana części' },
  'B8': { name: 'Wymiana czujnika temperatury', group: 'Wymiana części' },
  'B9': { name: 'Wymiana czujnika ciśnienia', group: 'Wymiana części' },
  'B10': { name: 'Wymiana zaworu bezpieczeństwa', group: 'Wymiana części' },
  'B12': { name: 'Wymiana pompy obiegowej', group: 'Wymiana części' },
  'B13': { name: 'Wymiana wentylatora palnika', group: 'Wymiana części' },
  'G1': { name: 'Diagnoza usterki', group: 'Awarie' },
  'G5': { name: 'Tymczasowa naprawa', group: 'Awarie' }
};

// Komponent wyboru technika
const TechnicianSelectView = {
  props: ['technicians', 'isLoading', 'connectionError'],
  emits: ['technician-selected', 'retry'],
  
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="max-w-md w-full">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-user-hard-hat text-blue-600 text-3xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">System Serwisowy</h1>
          <p class="text-gray-600 mt-2">Wybierz technika aby rozpocząć pracę</p>
        </div>

        <!-- Ładowanie -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Łączenie z systemem desktop...</p>
        </div>

        <!-- Błąd połączenia -->
        <div v-else-if="connectionError" class="text-center py-8">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Brak połączenia</h3>
          <p class="text-gray-600 mb-4">Nie można połączyć się z aplikacją desktop</p>
          <button 
            @click="$emit('retry')" 
            class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <i class="fas fa-redo mr-2"></i>
            Spróbuj ponownie
          </button>
        </div>

        <!-- Lista techników -->
        <div v-else class="space-y-3">
          <button
            v-for="technician in technicians"
            :key="technician.id"
            @click="$emit('technician-selected', technician)"
            class="w-full p-4 bg-white rounded-lg shadow border-2 border-transparent hover:border-blue-500 transition-all duration-200"
          >
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-blue-600"></i>
              </div>
              <div class="text-left flex-1">
                <p class="font-semibold text-gray-900">{{ technician.full_name || technician.username }}</p>
                <p class="text-sm text-gray-600">ID: {{ technician.id }}</p>
                <span class="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 mt-1">
                  {{ technician.role === 'technician' ? 'Serwisant' : 'Instalator' }}
                </span>
              </div>
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </button>
          
          <div v-if="technicians.length === 0" class="text-center py-8">
            <i class="fas fa-users text-gray-400 text-4xl mb-4"></i>
            <p class="text-gray-600">Brak dostępnych techników</p>
          </div>
        </div>
      </div>
    </div>
  `
};

// Komponent listy zleceń
const OrdersView = {
  props: ['orders', 'isLoading', 'currentUser', 'connectionError'],
  emits: ['show-detail', 'refresh', 'logout'],
  
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b sticky top-0 z-10">
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-blue-600 text-sm"></i>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ currentUser?.full_name || currentUser?.username }}</p>
                <p class="text-xs text-gray-600">ID: {{ currentUser?.id }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="$emit('refresh')"
                class="p-2 text-gray-600 hover:text-gray-900"
                :disabled="isLoading"
                title="Odśwież"
              >
                <i class="fas fa-sync" :class="{'animate-spin': isLoading}"></i>
              </button>
              <button
                @click="$emit('logout')"
                class="p-2 text-gray-600 hover:text-gray-900"
                title="Zmień technika"
              >
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Zawartość -->
      <div class="p-4">
        <!-- Błąd połączenia -->
        <div v-if="connectionError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle text-red-500 mr-3"></i>
            <div>
              <p class="font-medium text-red-800">Brak połączenia z desktop</p>
              <p class="text-sm text-red-600">Sprawdź czy aplikacja desktop jest uruchomiona</p>
            </div>
          </div>
        </div>

        <!-- Ładowanie -->
        <div v-if="isLoading" class="text-center py-12">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Ładowanie zleceń...</p>
        </div>

        <!-- Brak zleceń -->
        <div v-else-if="orders.length === 0" class="text-center py-12">
          <i class="fas fa-clipboard-list text-gray-400 text-6xl mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Brak zleceń</h3>
          <p class="text-gray-600 mb-4">Nie masz przypisanych żadnych zleceń</p>
          <button 
            @click="$emit('refresh')" 
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Odśwież listę
          </button>
        </div>

        <!-- Lista zleceń -->
        <div v-else class="space-y-4">
          <div
            v-for="order in orders"
            :key="order.id"
            @click="$emit('show-detail', order)"
            class="bg-white rounded-lg shadow border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-semibold text-gray-900">{{ order.title || order.order_number }}</h3>
                <p class="text-sm text-gray-600">{{ order.client_name }}</p>
              </div>
              <span 
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-800': order.status === 'new',
                  'bg-blue-100 text-blue-800': order.status === 'in_progress',
                  'bg-green-100 text-green-800': order.status === 'completed',
                  'bg-red-100 text-red-800': order.status === 'cancelled'
                }"
              >
                {{ getStatusText(order.status) }}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 space-y-1">
              <div class="flex items-center">
                <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                <span>{{ order.address }}</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-tools w-4 mr-2"></i>
                <span>{{ order.device_name }}</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-clock w-4 mr-2"></i>
                <span>{{ formatDate(order.scheduled_date) }}</span>
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span class="text-xs text-gray-500">#{{ order.order_number }}</span>
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  
  methods: {
    getStatusText(status) {
      const statusMap = {
        'new': 'Nowe',
        'in_progress': 'W trakcie',
        'completed': 'Zakończone',
        'cancelled': 'Anulowane'
      };
      return statusMap[status] || status;
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateString;
      }
    }
  }
};

// Komponent szczegółów zlecenia
const OrderDetailView = {
  props: ['order', 'currentUser'],
  emits: ['back', 'order-updated'],
  
  data() {
    return {
      isLoading: false,
      completedCategories: new Set(),
      workNotes: '',
      photos: []
    };
  },
  
  computed: {
    serviceCategories() {
      try {
        const categories = JSON.parse(this.order.service_categories || '[]');
        return categories.map(cat => ({
          code: cat,
          name: SERVICE_CATEGORIES[cat]?.name || cat,
          group: SERVICE_CATEGORIES[cat]?.group || 'Inne'
        }));
      } catch {
        return [];
      }
    },
    
    groupedCategories() {
      const groups = {};
      this.serviceCategories.forEach(cat => {
        if (!groups[cat.group]) {
          groups[cat.group] = [];
        }
        groups[cat.group].push(cat);
      });
      return groups;
    },
    
    canComplete() {
      return this.completedCategories.size > 0;
    }
  },
  
  methods: {
    async startWork() {
      if (this.order.status !== 'new') return;
      
      try {
        this.isLoading = true;
        await API.updateOrderStatus(this.order.id, {
          status: 'in_progress',
          completedCategories: [],
          notes: 'Rozpoczęcie pracy'
        });
        this.$emit('order-updated');
      } catch (error) {
        alert('Błąd rozpoczęcia pracy: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },
    
    async completeWork() {
      if (!this.canComplete) return;
      
      try {
        this.isLoading = true;
        await API.updateOrderStatus(this.order.id, {
          status: 'completed',
          completedCategories: Array.from(this.completedCategories),
          notes: this.workNotes,
          photos: this.photos
        });
        this.$emit('order-updated');
      } catch (error) {
        alert('Błąd zakończenia pracy: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },
    
    toggleCategory(categoryCode) {
      if (this.completedCategories.has(categoryCode)) {
        this.completedCategories.delete(categoryCode);
      } else {
        this.completedCategories.add(categoryCode);
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateString;
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        'new': 'Nowe',
        'in_progress': 'W trakcie',
        'completed': 'Zakończone',
        'cancelled': 'Anulowane'
      };
      return statusMap[status] || status;
    }
  },
  
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b sticky top-0 z-10">
        <div class="px-4 py-3">
          <div class="flex items-center space-x-3">
            <button
              @click="$emit('back')"
              class="p-2 text-gray-600 hover:text-gray-900"
            >
              <i class="fas fa-arrow-left"></i>
            </button>
            <div class="flex-1">
              <h1 class="font-semibold text-gray-900">Szczegóły zlecenia</h1>
              <p class="text-sm text-gray-600">#{{ order.order_number }}</p>
            </div>
            <span 
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="{
                'bg-yellow-100 text-yellow-800': order.status === 'new',
                'bg-blue-100 text-blue-800': order.status === 'in_progress',
                'bg-green-100 text-green-800': order.status === 'completed',
                'bg-red-100 text-red-800': order.status === 'cancelled'
              }"
            >
              {{ getStatusText(order.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Zawartość -->
      <div class="p-4 space-y-6">
        <!-- Informacje podstawowe -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ order.title }}</h2>
          
          <div class="space-y-3">
            <div class="flex items-center">
              <i class="fas fa-user w-5 mr-3 text-gray-400"></i>
              <div>
                <p class="font-medium text-gray-900">{{ order.client_name }}</p>
                <p class="text-sm text-gray-600">{{ order.client_phone }}</p>
              </div>
            </div>
            
            <div class="flex items-center">
              <i class="fas fa-map-marker-alt w-5 mr-3 text-gray-400"></i>
              <p class="text-gray-700">{{ order.address }}</p>
            </div>
            
            <div class="flex items-center">
              <i class="fas fa-tools w-5 mr-3 text-gray-400"></i>
              <p class="text-gray-700">{{ order.device_name }}</p>
            </div>
            
            <div class="flex items-center">
              <i class="fas fa-clock w-5 mr-3 text-gray-400"></i>
              <p class="text-gray-700">{{ formatDate(order.scheduled_date) }}</p>
            </div>
          </div>
          
          <div v-if="order.description" class="mt-4 pt-4 border-t border-gray-100">
            <p class="text-sm text-gray-600">{{ order.description }}</p>
          </div>
        </div>

        <!-- Kategorie serwisowe -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Czynności do wykonania</h3>
          
          <div v-for="(categories, group) in groupedCategories" :key="group" class="mb-6">
            <h4 class="text-md font-medium text-gray-800 mb-3">{{ group }}</h4>
            <div class="space-y-2">
              <div
                v-for="category in categories"
                :key="category.code"
                @click="toggleCategory(category.code)"
                class="flex items-center p-3 border rounded-lg cursor-pointer transition-colors"
                :class="{
                  'border-green-300 bg-green-50': completedCategories.has(category.code),
                  'border-gray-200 bg-white hover:bg-gray-50': !completedCategories.has(category.code)
                }"
              >
                <div
                  class="w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center"
                  :class="{
                    'border-green-500 bg-green-500': completedCategories.has(category.code),
                    'border-gray-300': !completedCategories.has(category.code)
                  }"
                >
                  <i v-if="completedCategories.has(category.code)" class="fas fa-check text-white text-xs"></i>
                </div>
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ category.name }}</p>
                  <p class="text-sm text-gray-600">{{ category.code }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notatki -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Notatki z pracy</h3>
          <textarea
            v-model="workNotes"
            class="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows="4"
            placeholder="Dodaj notatki z wykonanej pracy..."
          ></textarea>
        </div>

        <!-- Akcje -->
        <div class="space-y-3">
          <button
            v-if="order.status === 'new'"
            @click="startWork"
            :disabled="isLoading"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <i class="fas fa-play mr-2"></i>
            {{ isLoading ? 'Rozpoczynanie...' : 'Rozpocznij pracę' }}
          </button>
          
          <button
            v-if="order.status === 'in_progress'"
            @click="completeWork"
            :disabled="!canComplete || isLoading"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <i class="fas fa-check mr-2"></i>
            {{ isLoading ? 'Kończenie...' : 'Zakończ pracę' }}
          </button>
          
          <div v-if="order.status === 'in_progress' && !canComplete" class="text-center text-sm text-gray-500">
            Wybierz wykonane czynności aby zakończyć pracę
          </div>
        </div>
      </div>
    </div>
  `
};

// Główny komponent aplikacji
const MobileApp = {
  setup() {
    const currentView = ref('technician-select'); 
    const currentUser = ref(null); // Wymaga wyboru technika
    const availableTechnicians = ref([]);
    const orders = ref([]);
    const selectedOrder = ref(null);
    const isLoading = ref(false);
    const connectionError = ref(false);

    // Nawigacja
    const showOrders = () => {
      currentView.value = 'orders';
      selectedOrder.value = null;
    };

    const showOrderDetail = (order) => {
      selectedOrder.value = order;
      currentView.value = 'order-detail';
    };

    const showTechnicianSelect = () => {
      currentView.value = 'technician-select';
      currentUser.value = null;
      localStorage.removeItem('selected_technician');
    };

    // Wybór technika
    const selectTechnician = async (technician) => {
      try {
        isLoading.value = true;
        currentUser.value = technician;
        localStorage.setItem('selected_technician', JSON.stringify(technician));
        
        console.log(`👤 Wybrano technika: ${technician.username} (ID: ${technician.id})`);
        currentView.value = 'orders';
        
        // Załaduj zlecenia dla wybranego technika
        await loadOrders();
      } catch (error) {
        console.error('❌ Błąd wyboru technika:', error);
        connectionError.value = true;
      } finally {
        isLoading.value = false;
      }
    };

    // Ładowanie techników z desktop
    const loadTechnicians = async () => {
      try {
        isLoading.value = true;
        connectionError.value = false;
        
        const technicians = await API.getTechnicians();
        if (technicians.length === 0) {
          throw new Error('Brak dostępnych techników');
        }
        
        availableTechnicians.value = technicians;
        console.log('✅ Załadowano techników:', technicians);
      } catch (error) {
        console.error('❌ Błąd ładowania techników:', error);
        connectionError.value = true;
      } finally {
        isLoading.value = false;
      }
    };

    // Ładowanie zleceń TYLKO z desktop
    const loadOrders = async () => {
      if (!currentUser.value) {
        console.log('⚠️ Brak wybranego technika');
        return;
      }
      
      try {
        isLoading.value = true;
        connectionError.value = false;
        
        const ordersList = await API.getMyOrders(currentUser.value.id);
        orders.value = ordersList;
        
        console.log(`✅ Załadowano ${ordersList.length} zleceń dla ${currentUser.value.username}`);
      } catch (error) {
        console.error('❌ Błąd ładowania zleceń:', error);
        connectionError.value = true;
        orders.value = []; // Brak demo - pusta lista
      } finally {
        isLoading.value = false;
      }
    };

    // Auto-ładowanie przy starcie
    onMounted(() => {
      // Sprawdź czy jest zapisany technik
      const savedTechnician = localStorage.getItem('selected_technician');
      if (savedTechnician) {
        try {
          currentUser.value = JSON.parse(savedTechnician);
          currentView.value = 'orders';
          loadOrders();
        } catch (error) {
          console.log('⚠️ Błąd odczytu zapisanego technika');
          loadTechnicians();
        }
      } else {
        loadTechnicians();
      }
    });

    return {
      currentView,
      currentUser,
      availableTechnicians,
      orders,
      selectedOrder,
      isLoading,
      connectionError,
      showOrders,
      showOrderDetail,
      showTechnicianSelect,
      selectTechnician,
      loadTechnicians,
      loadOrders
    };
  },

  template: `
    <div class="mobile-app">
      <!-- Wybór technika -->
      <technician-select-view
        v-if="currentView === 'technician-select'"
        :technicians="availableTechnicians"
        :is-loading="isLoading"
        :connection-error="connectionError"
        @technician-selected="selectTechnician"
        @retry="loadTechnicians"
      />
      
      <!-- Lista zleceń -->
      <orders-view
        v-if="currentView === 'orders'"
        :orders="orders"
        :is-loading="isLoading"
        :current-user="currentUser"
        :connection-error="connectionError"
        @show-detail="showOrderDetail"
        @refresh="loadOrders"
        @logout="showTechnicianSelect"
      />
      
      <!-- Szczegóły zlecenia -->
      <order-detail-view
        v-if="currentView === 'order-detail' && selectedOrder"
        :order="selectedOrder"
        :current-user="currentUser"
        @back="showOrders"
        @order-updated="loadOrders"
      />
    </div>
  `
};

// Rejestracja komponentów
const app = createApp(MobileApp);

app.component('technician-select-view', TechnicianSelectView);
app.component('orders-view', OrdersView);
app.component('order-detail-view', OrderDetailView);

// Mount aplikacji
app.mount('#app'); 