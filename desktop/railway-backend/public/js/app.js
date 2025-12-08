const { createApp, ref, computed, onMounted } = Vue;

// API do komunikacji z serwerem - używa globalnego API_CONFIG
const API = {
  // Pobierz listę dostępnych techników
  async getTechnicians() {
    try {
      console.log('👥 Ładuję listę techników...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(window.API_CONFIG.technicians, {
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

  // Pobierz zlecenia przypisane do technika
  async getMyOrders(userId) {
    try {
      console.log(`📋 Ładuję zlecenia dla technika ${userId}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(window.API_CONFIG.orders(userId), {
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
      
      const response = await fetch(window.API_CONFIG.updateOrder(orderId), {
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
const DEFAULT_SERVICE_CATEGORIES = {
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
  emits: ['technician-selected', 'retry', 'pin-login'],
  
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
            @click="$emit('pin-login', technician)"
            class="w-full p-4 bg-white rounded-lg shadow border-2 border-transparent hover:border-blue-500 transition-all duration-200"
          >
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-blue-600"></i>
              </div>
              <div class="text-left flex-1">
                <p class="font-semibold text-gray-900">{{ technician.full_name || technician.username }}</p>
                <p class="text-sm text-gray-600">{{ technician.phone || 'Brak telefonu' }}</p>
                <span class="text-xs text-gray-500">Zleceń: {{ technician.order_count ?? 0 }}</span>
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
                <i class="fas fa-tags w-4 mr-2"></i>
                <span>{{ order.type_label || formatType(order.type) }}</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-clock w-4 mr-2"></i>
                <span>{{ formatDate(order.scheduled_datetime || order.scheduled_date) }}</span>
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
    
    formatType(type) {
      const typeMap = {
        maintenance: 'Konserwacja',
        installation: 'Instalacja',
        inspection: 'Przegląd',
        breakdown: 'Awaria'
      };
      if (!type) return '';
      return typeMap[type] || String(type);
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      try {
        const s = String(dateString);
        // Jeśli mamy pełny zapis z godziną (YYYY-MM-DDTHH:MM), pokaż dokładną HH:MM bez przesunięć TZ
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
          const d = new Date(s);
          const date = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const time = s.slice(11, 16);
          return `${date} ${time}`;
        }
        // Jeśli tylko data, pokaż samą datę (bez sztucznego 00:00)
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return s;
      } catch {
        return String(dateString);
      }
    }
  }
};

// Komponent szczegółów zlecenia
const OrderDetailView = {
  props: ['order', 'currentUser', 'categoryDictionary'],
  emits: ['back', 'order-updated'],
  
  data() {
    return {
      isLoading: false,
      completedCategories: new Set(),
      workNotes: '',
      manualWorkNotes: false,
      activeOrderId: null,
      photos: [],
      deviceFiles: { photos: [], files: [] },
      loadingFiles: false,
      filesError: null,
      // Historia serwisów urządzenia (PWA)
      deviceHistory: [],
      historyError: null,
      loadingHistory: false,
      showAllHistory: false,
      showHistoryModal: false,
      selectedHistory: null
    };
  },
  
  computed: {
    serviceCategories() {
      try {
        const raw = this.order?.service_categories;
        const categories = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
        const combinedDict = {
          ...(this.categoryDictionary || {}),
          ...(this.order?.category_dictionary || {})
        };
        return categories.map(cat => {
          const key = String(cat);
          const entry = combinedDict[key] || combinedDict[String(cat)];
          if (entry) {
            return {
              id: key,
              code: entry.code || key,
              name: entry.displayName || entry.name || key,
              group: entry.group || 'Inne'
            };
          }
          if (DEFAULT_SERVICE_CATEGORIES[key]) {
            return {
              id: key,
              code: key,
              name: DEFAULT_SERVICE_CATEGORIES[key].name || key,
              group: DEFAULT_SERVICE_CATEGORIES[key].group || 'Inne'
            };
          }
          return {
            id: key,
            code: key,
            name: key,
            group: 'Inne'
          };
        });
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
    },

    typeLabel() {
      if (this.order?.primary_category_label) return this.order.primary_category_label;
      if (this.order?.type_label) return this.order.type_label;
      const map = {
        maintenance: 'Konserwacja',
        installation: 'Instalacja',
        inspection: 'Przegląd',
        breakdown: 'Awaria'
      };
      const raw = this.order?.type;
      if (!raw) return '';
      return map[raw] || String(raw);
    }
  },

  watch: {
    order: {
      immediate: true,
      handler(newOrder) {
        this.resetCompletionState(newOrder);
      }
    },
    categoryDictionary: {
      handler() {
        this.updateAutoWorkNotes();
      }
    }
  },
  
  methods: {
    resetCompletionState(order) {
      const nextOrderId = order ? (order.id != null ? order.id : (order.order_number || null)) : null;
      if (this.activeOrderId === nextOrderId && nextOrderId !== null) {
        if (!this.manualWorkNotes) this.updateAutoWorkNotes();
        return;
      }
      this.activeOrderId = nextOrderId;
      const existingCodes = this.parseCompletedCategoryList(order?.completed_categories);
      this.completedCategories = new Set(existingCodes);
      if (order && order.completion_notes) {
        this.workNotes = String(order.completion_notes);
        this.manualWorkNotes = true;
      } else {
        this.workNotes = '';
        this.manualWorkNotes = false;
        this.updateAutoWorkNotes(true);
      }
    },

    parseCompletedCategoryList(rawValue) {
      if (!rawValue) return [];
      if (Array.isArray(rawValue)) return rawValue.map(val => String(val));
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) return parsed.map(val => String(val));
      } catch (_) {}
      return String(rawValue)
        .split(',')
        .map(val => val.trim())
        .filter(Boolean);
    },

    getCategoryLabel(code) {
      if (!code) return '';
      const categories = Array.isArray(this.serviceCategories) ? this.serviceCategories : [];
      const match = categories.find(cat => cat.code === code || String(cat.id) === String(code));
      if (match) return match.name || match.displayName || match.code || String(code);
      const dict = this.categoryDictionary || {};
      const dictEntry = dict[String(code)];
      if (dictEntry) return dictEntry.displayName || dictEntry.name || dictEntry.code || String(code);
      if (DEFAULT_SERVICE_CATEGORIES[String(code)]) return DEFAULT_SERVICE_CATEGORIES[String(code)].name || String(code);
      return String(code);
    },

    generateAutoWorkNotes() {
      const codes = Array.from(this.completedCategories || []);
      if (!codes.length) return '';
      const uniqueLabels = Array.from(new Set(codes.map(code => this.getCategoryLabel(code)).filter(Boolean)));
      if (!uniqueLabels.length) return '';
      const dateLabel = new Date().toLocaleDateString('pl-PL');
      const lines = uniqueLabels.map(label => `- ${label}`);
      return [`W dniu ${dateLabel} wykonano:`, ...lines].join('\n');
    },

    updateAutoWorkNotes(force = false) {
      if (force) this.manualWorkNotes = false;
      if (this.manualWorkNotes) return;
      const autoText = this.generateAutoWorkNotes();
      this.workNotes = autoText;
    },

    // === Historia serwisów urządzenia ===
    async loadDeviceHistory() {
      try {
        this.loadingHistory = true;
        this.historyError = null;
        const deviceId = this.order?.device_id;
        if (!deviceId) { this.deviceHistory = []; return; }
        const url = `${window.location.origin}/api/devices/${deviceId}/orders`;
        let r = null;
        try { r = await fetch(url); } catch (_) { r = null; }
        if (!r || !r.ok) { this.deviceHistory = []; return; }
        const items = await r.json().catch(()=>([]));
        this.deviceHistory = Array.isArray(items?.items || items) ? (items.items || items) : [];
      } catch (e) {
        this.historyError = e?.message || 'Błąd pobierania historii';
        this.deviceHistory = [];
      } finally {
        this.loadingHistory = false;
      }
    },
    toggleHistory() { this.showAllHistory = !this.showAllHistory; },
    openHistoryDetail(item) { this.selectedHistory = item; this.showHistoryModal = true; },
    closeHistoryDetail() { this.showHistoryModal = false; this.selectedHistory = null; },
    parsedHistoryCategories(item) {
      try {
        const raw = item?.completed_categories;
        const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
        return (arr || []).map(x => String(x));
      } catch (_) { return []; }
    },
    resolveHistoryPhotoSrc(ph) {
      const val = typeof ph === 'string' ? ph : (ph?.public_url || ph?.url || ph?.path || '');
      if (!val) return '';
      const v = String(val);
      if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v;
      // Jeśli ścieżka jest lokalna do desktopu, przepisz na adres desktop (konfig w API_CONFIG.desktop)
      if (v.startsWith('/uploads') || v.startsWith('uploads/')) {
        const pathOnly = v.startsWith('/') ? v : `/${v}`;
        const base = (window.API_CONFIG && window.API_CONFIG.desktop) ? String(window.API_CONFIG.desktop).replace(/\/$/, '') : '';
        return base ? `${base}${pathOnly}` : v;
      }
      return v;
    },
    async loadDeviceFiles() {
      try {
        this.loadingFiles = true;
        this.filesError = null;
        const deviceId = this.order?.device_id;
        if (!deviceId) {
          this.deviceFiles = { photos: [], files: [] };
          return;
        }
        console.log('📷 Loading device files for device_id=', deviceId, 'url=', window.API_CONFIG.deviceFiles(deviceId));
        const r = await fetch(window.API_CONFIG.deviceFiles(deviceId));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(() => ({}));
        const photosRaw = Array.isArray(j?.photos) ? j.photos : [];
        const filesRaw = Array.isArray(j?.files || j?.items) ? (j.files || j.items) : [];
        console.log('📷 Device files response:', {
          photos: Array.isArray(photosRaw) ? photosRaw.length : 'n/a',
          files: Array.isArray(filesRaw) ? filesRaw.length : 'n/a'
        });
        // Helpery
        const basename = (u) => {
          const s = String(u || '');
          const q = s.split('?')[0];
          const p = q.split('#')[0];
          return p.substring(p.lastIndexOf('/') + 1).toLowerCase();
        };
        const isImageFileRow = (f) => {
          const t = String(f?.mime_type || f?.file_type || '').toLowerCase();
          const n = String(f?.file_name || '').toLowerCase();
          return t.startsWith('image/') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.webp');
        };
        const isPdfRow = (f) => {
          const t = String(f?.mime_type || f?.file_type || '').toLowerCase();
          const n = String(f?.file_name || '').toLowerCase();
          return t.includes('pdf') || n.endsWith('.pdf');
        };
        // Preferuj tylko pliki z files/items. photos traktuj jako fallback gdy brak files.
        const imagesFromFiles = (filesRaw || []).filter(isImageFileRow).map(f => ({
          public_url: f.public_url || f.url || f.file_path,
          file_name: f.file_name || basename(f.public_url || f.url || f.file_path)
        }));
        let photosFinal = imagesFromFiles;
        if (photosFinal.length === 0 && Array.isArray(photosRaw) && photosRaw.length) {
          photosFinal = photosRaw.map(ph => ({
            public_url: ph.public_url || ph.url || ph.path,
            file_name: basename(ph.public_url || ph.url || ph.path)
          }));
        }
        // Dedup po basename/url
        const uniqPhotos = [];
        const seen = new Set();
        for (const ph of (photosFinal || [])) {
          const key = basename(ph.public_url || ph.url || ph.path);
          if (key && !seen.has(key)) { seen.add(key); uniqPhotos.push(ph); }
        }
        // Pliki: zostaw wszystkie, ale usuń te, które są obrazami jeśli już trafiły do photos
        const photoNames = new Set(uniqPhotos.map(ph => basename(ph.public_url || ph.url || ph.path)));
        const filesFinal = (filesRaw || []).filter(f => !isImageFileRow(f) || !photoNames.has(basename(f.public_url || f.url || f.file_path)));
        this.deviceFiles = { photos: uniqPhotos, files: filesFinal };
      } catch (e) {
        this.filesError = e?.message || 'Błąd pobierania plików';
        this.deviceFiles = { photos: [], files: [] };
      } finally {
        this.loadingFiles = false;
      }
    },
    async startWork() {
      if (this.order.status !== 'new') return;
      
      try {
        this.isLoading = true;
        await API.updateOrderStatus(this.order.id, {
          status: 'in_progress',
          completedCategories: [],
          notes: 'Rozpoczęcie pracy'
        });
        this.$emit('order-updated', { id: this.order.id, status: 'in_progress' });
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
        // Jeśli brak realnego uploadu, dołącz zdjęcia jako base64, aby trafiły do work_photos
        const payload = {
          status: 'completed',
          completedCategories: Array.from(this.completedCategories),
          notes: this.workNotes,
          photos: this.photos
        }
        await API.updateOrderStatus(this.order.id, payload);
        // Nie chowaj zlecenia – pokaż stan completed i czekaj na wysłanie do firmy
        this.$emit('order-updated', { id: this.order.id, status: 'completed', payload });
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
      this.updateAutoWorkNotes();
    },

    onWorkNotesInput() {
      this.manualWorkNotes = true;
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      try {
        const s = String(dateString);
        if (s.includes('T')) return s.slice(0,10) + ', ' + s.slice(11,16);
        return s.slice(0,10);
      } catch {
        return String(dateString);
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
  mounted() {
    // Załaduj pliki urządzenia po wejściu w szczegóły
    this.loadDeviceFiles();
    // Załaduj historię urządzenia (zwinieta domyślnie)
    this.loadDeviceHistory();
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
          <h2 class="text-lg font-semibold text-gray-900">{{ order.title }}</h2>
          <p v-if="typeLabel" class="text-sm text-indigo-600 font-medium mt-1">{{ typeLabel }}</p>
          <hr class="my-4 border-gray-100" />
          
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
              <p class="text-gray-700">{{ formatDate(order.scheduled_datetime || order.scheduled_date) }}</p>
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

      <!-- Dokumentacja zdjęciowa i PDF urządzenia -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-gray-900">Dokumentacja urządzenia</h3>
          <button @click="loadDeviceFiles" class="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" :disabled="loadingFiles">
            {{ loadingFiles ? 'Odświeżanie...' : 'Odśwież' }}
          </button>
        </div>
        <div v-if="filesError" class="text-sm text-red-600 mb-2">{{ filesError }}</div>

        <div class="mb-4">
          <h4 class="font-medium text-gray-800 mb-2">Zdjęcia</h4>
          <div v-if="deviceFiles.photos.length === 0" class="text-sm text-gray-500">Brak zdjęć</div>
          <div v-else class="grid grid-cols-3 gap-2">
            <a v-for="(ph, idx) in deviceFiles.photos" :key="idx" :href="ph.public_url || ph.url || ph.path" target="_blank" rel="noopener" class="block">
              <img :src="ph.public_url || ph.url || ph.path" class="w-full h-24 object-cover rounded" />
            </a>
          </div>
        </div>

        <div>
          <h4 class="font-medium text-gray-800 mb-2">Dokumenty (PDF)</h4>
          <div v-if="deviceFiles.files.filter(f => String(f.mime_type||f.file_type||'').includes('pdf') || String(f.file_name||'').toLowerCase().endsWith('.pdf')).length === 0" class="text-sm text-gray-500">Brak dokumentów</div>
          <ul class="list-disc list-inside space-y-1">
            <li 
              v-for="file in (deviceFiles.files || []).filter(f => {
                const mt = String(f?.mime_type || f?.file_type || '').toLowerCase();
                const name = String(f?.file_name || '').toLowerCase();
                return mt.includes('pdf') || name.endsWith('.pdf');
              })"
              :key="file.id"
            >
              <a :href="file.public_url || file.url || file.file_path" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
                {{ file.file_name || 'Dokument' }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Historia serwisów urządzenia (zwinięta domyślnie) -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-gray-900">Historia serwisów</h3>
          <div class="space-x-2">
            <button @click="toggleHistory" class="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" :disabled="loadingHistory">
              <i :class="showAllHistory ? 'fas fa-compress mr-1' : 'fas fa-expand mr-1'"></i>
              {{ showAllHistory ? 'Zwiń' : 'Pokaż całą' }}
            </button>
          </div>
        </div>
        <div v-if="historyError" class="text-sm text-red-600 mb-2">{{ historyError }}</div>
        <div v-if="loadingHistory" class="text-sm text-gray-500">Ładowanie historii...</div>
        <div v-else>
          <div v-if="deviceHistory.length === 0" class="text-sm text-gray-500">Brak historii</div>
          <div v-else class="divide-y">
            <div
              v-for="(h, idx) in (showAllHistory ? deviceHistory : deviceHistory.slice(0,1))"
              :key="h.id || idx"
              class="py-3 cursor-pointer hover:bg-gray-50 rounded"
              @click="openHistoryDetail(h)"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <div class="font-medium text-gray-900 truncate">{{ h.order_number }} — {{ h.title }}</div>
                  <div class="text-xs text-gray-500 mt-0.5">
                    <span>{{ (h.completed_at || h.created_at) && new Date(h.completed_at||h.created_at).toLocaleDateString('pl-PL') }}</span>
                    <span v-if="h.status" class="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{{ h.status }}</span>
                  </div>
                </div>
                <i class="fas fa-chevron-right text-gray-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal szczegóły historii -->
      <div v-if="showHistoryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 m-3">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-900">Szczegóły serwisu</h3>
            <button @click="closeHistoryDetail" class="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <div v-if="selectedHistory">
            <div class="text-sm text-gray-700">
              <div class="font-medium text-gray-900">{{ selectedHistory.order_number }} — {{ selectedHistory.title }}</div>
              <div class="text-xs text-gray-500 mb-2">{{ (selectedHistory.completed_at || selectedHistory.created_at) && new Date(selectedHistory.completed_at||selectedHistory.created_at).toLocaleString('pl-PL') }}</div>
              <div v-if="parsedHistoryCategories(selectedHistory).length" class="mb-2">
                <div class="text-xs text-gray-500 mb-1">Wykonane czynności:</div>
                <ul class="list-disc list-inside">
                  <li v-for="c in parsedHistoryCategories(selectedHistory)" :key="c" class="text-sm">{{ c }}</li>
                </ul>
              </div>
              <div v-if="selectedHistory.completion_notes" class="mb-2">
                <div class="text-xs text-gray-500 mb-1">Notatki:</div>
                <div class="whitespace-pre-wrap text-sm">{{ selectedHistory.completion_notes }}</div>
              </div>
              <div v-if="selectedHistory.work_photos && (Array.isArray(selectedHistory.work_photos) ? selectedHistory.work_photos.length : String(selectedHistory.work_photos||'').length)" class="mt-2">
                <div class="text-xs text-gray-500 mb-1">Zdjęcia:</div>
                <div class="grid grid-cols-3 gap-2">
                  <img v-for="(ph, i) in (Array.isArray(selectedHistory.work_photos) ? selectedHistory.work_photos : [])" :key="i" :src="resolveHistoryPhotoSrc(ph)" class="w-full h-20 object-cover rounded" />
                </div>
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
            @input="onWorkNotesInput"
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
    const serviceCategoryDictionary = ref({});

    const fallbackTypeLabel = (rawType) => {
      const map = {
        maintenance: 'Konserwacja',
        installation: 'Instalacja',
        inspection: 'Przegląd',
        breakdown: 'Awaria',
        urgent: 'Pilne',
        medium: 'Średni',
        low: 'Niski'
      };
      if (!rawType) return '';
      return map[rawType] || String(rawType);
    };

    const parseCategoriesValue = (value) => {
      try {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        const text = String(value).trim();
        if (!text) return [];
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        return [];
      } catch (_) {
        return [];
      }
    };

    const buildDictionaryFromItems = (items = []) => {
      const dict = {};
      const source = Array.isArray(items) ? items : [];
      source.forEach(item => {
        if (!item) return;
        const rawId = item.id != null ? item.id : item.code;
        if (rawId == null) return;
        const id = String(rawId);
        const parentId = item.parent_id != null ? String(item.parent_id) : null;
        const entry = {
          id,
          code: item.code || id,
          name: item.name || item.title || id,
          description: item.description || null,
          parent_id: parentId,
          sort_order: item.sort_order != null ? Number(item.sort_order) : 0,
          is_active: item.is_active === undefined ? true : !!item.is_active
        };
        dict[id] = entry;
        if (entry.code && entry.code !== id) {
          dict[String(entry.code)] = entry;
        }
      });
      Object.values(dict).forEach(entry => {
        if (!entry || !entry.id) return;
        const parent =
          entry.parent_id && dict[entry.parent_id] && dict[entry.parent_id] !== entry
            ? dict[entry.parent_id]
            : null;
        entry.group = parent ? parent.name : 'Inne';
        entry.displayName = parent ? `${parent.name} > ${entry.name}` : entry.name;
      });
      return dict;
    };

    const loadDictionaryFromCache = () => {
      try {
        const cached = localStorage.getItem('serviceCategoriesCache');
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (!parsed || !Array.isArray(parsed.items)) return null;
        return buildDictionaryFromItems(parsed.items);
      } catch (_) {
        return null;
      }
    };

    const storeDictionaryCache = (items) => {
      try {
        localStorage.setItem('serviceCategoriesCache', JSON.stringify({
          updated: Date.now(),
          items: items || []
        }));
      } catch (_) {
        // ignore quota errors
      }
    };

    const loadServiceCategoryDictionary = async () => {
      const endpoint = window.API_CONFIG?.serviceCategories;
      if (!endpoint) {
        serviceCategoryDictionary.value = buildDictionaryFromItems([]);
        return;
      }
      try {
        const response = await fetch(endpoint, { headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json().catch(() => ({}));
        const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
        if (items.length) {
          serviceCategoryDictionary.value = buildDictionaryFromItems(items);
          storeDictionaryCache(items);
          orders.value = orders.value.map(decorateOrder);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać kategorii usług z Railway:', error?.message || error);
      }
      const cached = loadDictionaryFromCache();
      if (cached) {
        serviceCategoryDictionary.value = cached;
        orders.value = orders.value.map(decorateOrder);
        return;
      }
      const fallbackItems = Object.entries(DEFAULT_SERVICE_CATEGORIES).map(([code, value]) => ({
        id: code,
        code,
        name: value?.name || code,
        parent_id: null,
        sort_order: 0,
        is_active: true,
        description: null
      }));
      serviceCategoryDictionary.value = buildDictionaryFromItems(fallbackItems);
      orders.value = orders.value.map(decorateOrder);
    };

    const decorateOrder = (order) => {
      if (!order) return order;
      const parsed = parseCategoriesValue(order.service_categories);
      const dict = serviceCategoryDictionary.value || {};
      const labels = [];
      const detailDict = {};
      parsed.forEach(identifier => {
        const key = String(identifier);
        const entry = dict[key];
        if (entry && entry.displayName) {
          labels.push(entry.displayName);
          detailDict[String(entry.id)] = entry;
        } else if (entry) {
          labels.push(entry.name);
          detailDict[String(entry.id)] = entry;
        }
      });
      const primary = labels.length ? labels[0] : fallbackTypeLabel(order.type);
      return {
        ...order,
        category_labels: labels,
        primary_category_label: primary,
        type_label: primary || fallbackTypeLabel(order.type),
        category_dictionary: detailDict
      };
    };

    // Nawigacja
    const showOrders = () => {
      currentView.value = 'orders';
      selectedOrder.value = null;
    };

    const showOrderDetail = (order) => {
      selectedOrder.value = decorateOrder(order);
      currentView.value = 'order-detail';
    };

    const showTechnicianSelect = () => {
      currentView.value = 'technician-select';
      // Nie czyść currentUser – w trybie produkcyjnym pracujemy na zalogowanym użytkowniku
    };

    // Wybór technika
    const pinInput = ref('');
    const pinModalVisible = ref(false);
    const pinTarget = ref(null);

    const selectTechnician = async (_technician) => {
      // Otwórz modal PIN dla wybranego technika
      pinTarget.value = _technician;
      pinInput.value = '';
      pinModalVisible.value = true;
    };

    const submitPin = async () => {
      if (!pinTarget.value) return;
      const pin = String(pinInput.value || '').trim();
      if (!/^\d{4,8}$/.test(pin)) {
        alert('PIN powinien mieć 4-8 cyfr');
        return;
      }
      try {
        isLoading.value = true;
        const resp = await fetch(window.API_CONFIG.health.replace('/api/health','/api/auth/pin-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: pinTarget.value.id, pin })
        });
        const j = await resp.json();
        if (!resp.ok || !j.success) throw new Error(j.error || 'Błąd logowania');
        currentUser.value = j.user;
        pinModalVisible.value = false;
        await loadOrders();
        currentView.value = 'orders';
      } catch (e) {
        alert(e.message || 'Błąd logowania PIN');
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
        // Pokaż tylko zalogowanego użytkownika
        if (currentUser.value) {
          availableTechnicians.value = technicians.filter(t => t.id === currentUser.value.id);
        } else {
          availableTechnicians.value = technicians;
        }
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
      console.log('🔄 loadOrders() wywołane');
      console.log('👤 currentUser.value:', currentUser.value);
      
      if (!currentUser.value) {
        console.log('⚠️ Brak wybranego technika - nie mogę załadować zleceń');
        return;
      }
      
      console.log(`📋 Próbuję załadować zlecenia dla technika ID: ${currentUser.value.id}`);
      console.log(`🔗 API URL: ${window.API_CONFIG.orders(currentUser.value.id)}`);
      
      try {
        isLoading.value = true;
        connectionError.value = false;
        
        console.log('🌐 Wysyłam żądanie do API...');
        await loadServiceCategoryDictionary();
        const ordersList = await API.getMyOrders(currentUser.value.id);
        // Nie usuwaj zlecenia z widoku po zakończeniu – pozostaw je do czasu przejścia do innej zakładki
        orders.value = Array.isArray(ordersList) ? ordersList.map(decorateOrder) : [];
        
        console.log(`✅ Załadowano ${ordersList.length} zleceń dla ${currentUser.value.username}`);
        console.log('📋 Zlecenia:', ordersList);
      } catch (error) {
        console.error('❌ Błąd ładowania zleceń:', error);
        console.error('❌ Szczegóły błędu:', error.message);
        connectionError.value = true;
        orders.value = []; // Brak demo - pusta lista
      } finally {
        isLoading.value = false;
      }
    };

    // Auto-ładowanie przy starcie
    onMounted(async () => {
      console.log('🚀 Aplikacja mobilna startuje...');
      console.log('📍 URL:', window.location.href);
      console.log('🌍 Environment:', window.API_CONFIG.environment);
      
      // Pobierz zalogowanego użytkownika z /api/auth/me
      await loadServiceCategoryDictionary();

      try {
        const me = await fetch(window.API_CONFIG.health.replace('/api/health','/api/auth/me'), { credentials: 'include' });
        const j = await me.json().catch(()=>({}));
        if (j && j.authenticated && j.user) {
          currentUser.value = j.user;
          currentView.value = 'orders';
          await loadOrders();
        }
      } catch (_) {}
      await loadTechnicians();
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
      loadOrders,
      pinModalVisible,
      pinInput,
      submitPin,
      serviceCategoryDictionary
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
        @pin-login="selectTechnician"
        @retry="loadTechnicians"
      />

      <!-- Modal PIN -->
      <div v-if="pinModalVisible" class="fixed inset-0 bg-black bg-opacity-40 flex items-end sm:items-center justify-center z-50">
        <div class="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-xl p-4">
          <h3 class="text-lg font-semibold mb-2">Podaj PIN</h3>
          <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" v-model="pinInput"
            class="w-full border rounded px-3 py-2 mb-4 tracking-widest text-center text-xl" placeholder="••••" />
          <div class="flex gap-2">
            <button class="flex-1 bg-gray-200 rounded py-2" @click="pinModalVisible=false">Anuluj</button>
            <button class="flex-1 bg-blue-600 text-white rounded py-2" @click="submitPin">Zaloguj</button>
          </div>
        </div>
      </div>
      
      <!-- Lista zleceń -->
      <orders-view
        v-if="currentView === 'orders'"
        :orders="orders"
        :is-loading="isLoading"
        :current-user="currentUser"
        :connection-error="connectionError"
        @show-detail="showOrderDetail"
        @refresh="loadOrders"
        @logout="async () => { try { await fetch(window.API_CONFIG.health.replace('/api/health','/api/auth/logout'), { method: 'POST', credentials: 'include' }); } catch(_) {}; currentUser=null; showTechnicianSelect(); }"
      />
      
      <!-- Szczegóły zlecenia -->
      <order-detail-view
        v-if="currentView === 'order-detail' && selectedOrder"
        :order="selectedOrder"
        :current-user="currentUser"
        :category-dictionary="serviceCategoryDictionary"
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