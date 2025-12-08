const API_BASE_URL = (() => {
  try {
    if (window.API_CONFIG && typeof window.API_CONFIG.baseUrl === 'string') {
      return window.API_CONFIG.baseUrl;
    }
    if (typeof window.__SERWIS_API_BASE__ === 'string') {
      return window.__SERWIS_API_BASE__;
    }
  } catch (_) {
    // ignoruj i przejdź do fallbacku
  }
  try {
    const origin = window.location.origin;
    if (origin && origin !== 'null') return origin;
    const { protocol, hostname, port } = window.location;
    if (protocol && hostname) {
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
  } catch (_) {
    // ostateczny fallback niżej
  }
  return 'http://localhost:5174';
})();

const FORM_ONLY_MODE = (() => {
  try {
    if (typeof window !== 'undefined') {
      if (window.__PWA_FORM_ONLY__ != null) {
        return !!window.__PWA_FORM_ONLY__;
      }
      return /instalacjeserwis\.pl$/i.test(String(window.location.hostname || ''));
    }
  } catch (_) {}
  return false;
})();

const API = {
  baseUrl: API_BASE_URL,
  
  // Pobierz techników
  async getTechnicians() {
    try {
      const response = await fetch(`${this.baseUrl}/api/technicians`);
      if (!response.ok) throw new Error('Failed to fetch technicians');
      return await response.json();
    } catch (error) {
      console.error('❌ Błąd pobierania techników:', error);
      return [];
    }
  },

  // Pobierz zlecenia dla technika
  async getMyOrders(userId) {
    try {
      console.log(`📋 Pobieranie zleceń dla technika ID: ${userId}`);
      // Prefer new endpoint; fallback to legacy if not found (404)
      let response = await fetch(`${this.baseUrl}/api/orders/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        // Zawsze fallback do desktop bez przerywania, nawet jeśli nie 404
        try {
          const fallback = await fetch(`${this.baseUrl}/api/desktop/orders/${userId}`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: AbortSignal.timeout(10000)
          });
          if (fallback.ok) {
            const orders = await fallback.json();
            console.log(`✅ Pobrano ${orders.length} zleceń z desktop`);
            return orders;
          }
        } catch (_) {}
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const orders = await response.json();
      console.log(`✅ Pobrano ${orders.length} zleceń z desktop`);
      return orders;
    } catch (error) {
      console.error('❌ Błąd pobierania zleceń z desktop:', error);
      if (error && /401|Unauthorized/i.test(String(error))) {
        // trigger login modal by throwing special code
        const e = new Error('AUTH_REQUIRED'); e.code = 'AUTH_REQUIRED'; throw e;
      }
      throw error;
    }
  },

  // Wyślij zgłoszenie serwisowe
  async submitServiceRequest(formData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/service-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to submit service request');
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Błąd wysyłania zgłoszenia:', error);
      throw error;
    }
  },

  // Zakończ zlecenie
  async startOrder(orderId) {
    try {
      // Auto-pauza wszystkich innych otwartych sesji tego technika
      try { await fetch(`${this.baseUrl}/api/time/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ orderId, technicianId: (this.auth && this.auth.user ? this.auth.user.id : null) }) }) } catch (_) {}
      const resp = await fetch(`${this.baseUrl}/api/desktop/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'in_progress' })
      });
      const raw = await resp.text();
      let result = null; try { result = raw ? JSON.parse(raw) : null; } catch (_) {}
      if (!resp.ok) {
        const message = (result && (result.error || result.message)) || raw || `HTTP ${resp.status}`;
        throw new Error(message);
      }
      // Fire-and-forget: start work session on backend (safe, additive)
      try { await fetch(`${this.baseUrl}/api/time/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ orderId }) }) } catch (_) {}
      return result;
    } catch (e) {
      console.error('❌ Błąd rozpoczęcia zlecenia:', e);
      throw e;
    }
  },

  // Zakończ zlecenie
  async completeOrder(orderId, completionData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/desktop/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(completionData)
      });
      
      if (!response.ok) throw new Error('Failed to complete order');
      
      // Ensure any open session is closed on completion (best-effort)
      try { await fetch(`${this.baseUrl}/api/time/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ orderId }) }) } catch (_) {}
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Błąd zakończenia zlecenia:', error);
      throw error;
    }
  }
};

// Kategorie usług
const SERVICE_CATEGORIES = {
  '02': {
    name: '02: AWARIA',
    subcategories: {
      '0201': '0201: Naprawa bez użycia części',
      '0202': '0202: Naprawa z użyciem części'
    }
  },
  '01': {
    name: '01: Diagnostyka',
    subcategories: {
      '0101': '0101: Diagnostyka awarii',
      '0102': '0102: Sprawdzenie parametrów'
    }
  },
  '04': {
    name: '04: Czyszczenie',
    subcategories: {
      '0401': '0401: Czyszczenie kotła',
      '0402': '0402: Czyszczenie palnika'
    }
  },
  '05': {
    name: '05: Regulacja',
    subcategories: {
      '0501': '0501: Regulacja palnika',
      '0502': '0502: Regulacja automatyki'
    }
  },
  '08': {
    name: '08: Przegląd i konserwacja',
    subcategories: {
      '0801': '0801: Przegląd okresowy',
      '0802': '0802: Konserwacja'
    }
  },
  '09': {
    name: '09: Remont i konserwacja',
    subcategories: {
      '0901': '0901: Remont kotła',
      '0902': '0902: Wymiana części'
    }
  },
  '06': {
    name: '06: Sprawdzenie szczelności gazu',
    subcategories: {
      '0601': '0601: Sprawdzenie szczelności'
    }
  },
  '07': {
    name: '07: Analiza spalin',
    subcategories: {
      '0701': '0701: Analiza spalin'
    }
  },
  '03': {
    name: '03: Przeszkolenie',
    subcategories: {
      '0301': '0301: Przeszkolenie użytkownika'
    }
  },
  '11': {
    name: '11: Uruchomienie',
    subcategories: {
      '1101': '1101: Uruchomienie urządzenia'
    }
  },
  '10': {
    name: '10: Usunięcie awarii',
    subcategories: {
      '1001': '1001: Usunięcie awarii'
    }
  }
};

// Główna aplikacja Vue
const app = Vue.createApp({
  data() {
    return {
      formOnly: FORM_ONLY_MODE,
      // Auth
      auth: { authenticated: false, user: null },
      showLoginModal: false,
      showPinModal: false,
      pinInput: '',
      pinTarget: null,
      loginForm: { username: '', password: '' },
      // UI state
      initializing: true,
      showServiceForm: FORM_ONLY_MODE ? true : false,
      // Formularz zgłoszenia serwisowego
      form: {
        serviceType: 'awaria',
        contactName: '',
        phone: '',
        email: '',
        nip: '',
        // New UX fields
        street: '', // Ulica, numer budynku
        postalCity: '', // Kod pocztowy, miejscowość
        // Backward-compatible fields (kept for safety)
        address: '',
        city: '',
        directions: '',
        deviceType: '',
        deviceTypeOther: '',
        deviceModel: '',
        deviceYear: '',
        previousService: '',
        description: '',
        preferredDate: '',
        preferredTime: '',
        isUrgent: false,
        privacyPolicy: false,
        emailCopy: false,
        deviceServiced: '' // Czy było serwisowane
      },
      attachments: [],
      
      // Panel technika
      isTechnicianPanelVisible: false,
      technicians: [],
      selectedTechnician: null,
      orders: [],
      currentView: FORM_ONLY_MODE ? 'service-form' : 'technicians',
      companyProfile: null,
      // Kalendarz mobilny
      currentCalendarDate: new Date(),
      calendarWeekDays: ['Pon','Wt','Śr','Czw','Pt','Sob','Nie'],
      calendarDays: [],
      selectedOrder: null,
      // Raport czasu pracy (read-only)
      timeSummary: null,
      timeSummaryLoading: false,
      timeSummaryError: null,
      // Słowniki
      clientsById: {},
      devicesById: {},
      // Files related to selected order
      selectedOrderDocuments: [],
      // Device history
      deviceHistory: [],
      showAllHistory: false,
      showHistoryModal: false,
      selectedHistory: null,
      
      // Zakończenie zlecenia
      isCompletionModalVisible: false,
      uploadingPhotos: false,
      completionData: {
        mainCategory: '',
        selectedSubCategories: [],
        workDescription: '',
        partsUsed: '',
        hoursWorked: '',
        completionDate: '',
        notes: '',
        selectedParts: []
      },
      manualWorkDescription: false,
      partsCatalog: [],
      completionPhotos: [],
      completionPhotoPreviews: [],
      // Photo viewer modal
      showPhotoModal: false,
      photoModalIndex: 0,
      photoModalSources: [],
      // Edycja klienta
      showEditClientModal: false,
      editClient: { phone: '', email: '', address: '' },
      // Edycja urządzenia
      showEditDeviceModal: false,
      editDevice: { manufacturer: '', serial_number: '', fuel_type: '', installation_date: '', warranty_end_date: '', last_service_date: '', next_service_date: '' },
      // Przypięcie urządzenia
      showAttachDeviceModal: false,
      clientDevices: [],
      attachDeviceId: null,
      
      showSuccessModal: false,
      referenceNumber: '',
      submitting: false,
      
      // Kategorie usług
      serviceCategories: SERVICE_CATEGORIES,
      serviceCategoriesLoaded: false,
      
      // Kategorie części (Railway)
      partCategories: [],
      partMainCatId: null,
      partSubCatId: null,
      // Guard: identyfikator ostatniego żądania listy zleceń
      _ordersReqId: 0
    };
  },

  computed: {
    canSubmit() {
      return this.form.contactName && 
             this.form.phone && 
             this.form.email && 
             (this.form.street || this.form.address) &&
             (this.form.postalCity || this.form.city) &&
             this.form.deviceType &&
             this.form.privacyPolicy;
    },

    

    canCompleteOrder() {
      const subs = Array.isArray(this.completionData.selectedSubCategories) ? this.completionData.selectedSubCategories : [];
      const hasDescription = this.completionData.workDescription && String(this.completionData.workDescription).trim().length > 0;
      return !!this.completionData.mainCategory && subs.length > 0 && hasDescription;
    },

    availableSubCategories() {
      if (!this.completionData.mainCategory) return [];
      const entry = this.serviceCategories[this.completionData.mainCategory] || SERVICE_CATEGORIES[this.completionData.mainCategory];
      const subs = entry && entry.subcategories ? entry.subcategories : {};
      return Object.entries(subs).map(([code, label]) => ({
        code,
        label: label || code
      }));
    },
    
    // Part categories helpers for cascading selects
    partMainCategories() {
      return (this.partCategories || [])
        .filter(c => !c.parent_id)
        .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
    },
    partSubCategories() {
      if (!this.partMainCatId) return []
      return (this.partCategories || [])
        .filter(c => c.parent_id === this.partMainCatId)
        .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
    },
    
    filteredPartsCatalog() {
      if (!Array.isArray(this.partsCatalog) || this.partsCatalog.length === 0) return []
      const parts = this.partsCatalog
      if (!this.partMainCatId && !this.partSubCatId) return parts
      // Build child sets
      const children = this.partCategories.filter(c => c.parent_id === this.partMainCatId)
      const childIds = new Set(children.map(c => c.id))
      // Normalize helper
      const norm = (s)=> (s||'').toString().trim().toLowerCase()
      return parts.filter(p => {
        const catName = norm(p.category)
        const match = this.partCategories.find(c => norm(c.name) === catName)
        if (!match) return false
        if (this.partSubCatId) return match.id === this.partSubCatId
        if (this.partMainCatId) return match.parent_id == null ? match.id === this.partMainCatId : childIds.has(match.id)
        return true
      })
    }
    ,
    // Chronologiczna lista części użytych w ramach historii urządzenia
    devicePartsTimeline() {
      try {
        const items = []
        const hist = Array.isArray(this.deviceHistory) ? this.deviceHistory : []
        for (const h of hist) {
          try {
            const partsRaw = (h && h.parts_used) ? String(h.parts_used).trim() : ''
            const parts = partsRaw ? this.mapPartsTextToCatalog(partsRaw) : ''
            if (!parts) continue
            const date = h.completed_at || h.started_at || h.scheduled_date || h.created_at || ''
            const orderNo = h.order_number || (h.id ? ('Z-' + h.id) : '')
            items.push({ date, order_number: orderNo, parts_used: parts })
          } catch (_) {}
        }
        // Dołącz bieżące zlecenie, jeśli posiada części, a nie ma go jeszcze w historii
        try {
          if (this.selectedOrder && this.selectedOrder.parts_used) {
            const on = this.selectedOrder.order_number || (this.selectedOrder.id ? ('Z-' + this.selectedOrder.id) : '')
            const exists = items.some(x => String(x.order_number||'') === String(on||''))
            if (!exists) {
              const d = this.selectedOrder.completed_at || this.selectedOrder.started_at || this.selectedOrder.scheduled_datetime || this.selectedOrder.scheduled_date || this.selectedOrder.created_at || ''
              const mapped = this.mapPartsTextToCatalog(String(this.selectedOrder.parts_used).trim())
              items.push({ date: d, order_number: on, parts_used: mapped })
            }
          }
        } catch (_) {}
        // Sortuj od najnowszych do najstarszych; nieparsowalne daty trafiają na koniec
        items.sort((a, b) => {
          const ta = Date.parse(a.date || '') || 0
          const tb = Date.parse(b.date || '') || 0
          return tb - ta
        })
        return items
      } catch (_) { return [] }
    }
  },

  async mounted() {
    // Dodaj obsługę klawisza ESC
    document.addEventListener('keydown', this.handleKeydown);
    console.log('🚀 Aplikacja uruchomiona');
    if (this.formOnly) {
      this.showServiceForm = true;
      this.isTechnicianPanelVisible = false;
      this.selectedTechnician = null;
      try { await this.loadCompanyProfile(); } catch (_) {}
      this.initializing = false;
      return;
    }
    // Check session
    try {
      const r = await fetch(`${API.baseUrl}/api/auth/me`, { credentials: 'include' });
      const j = await r.json().catch(()=>({}));
      if (j && j.authenticated) { this.auth.authenticated = true; this.auth.user = j.user; }
    } catch (_) {}

    try {
      await this.showTechnicianPanel();
    } catch (e) {
      console.warn('⚠️ showTechnicianPanel init failed:', e?.message || e);
      this.isTechnicianPanelVisible = true;
    } finally {
      this.showServiceForm = false;
      this.initializing = false;
    }

    try { await this.loadCompanyProfile(); } catch (_) {}

    // Live updates z Railway (SSE). Na każde powiadomienie odśwież listy/zamówione dane.
    try {
      const source = new EventSource(`${API.baseUrl}/api/events`);
      source.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}');
          if (!msg || !msg.type) return;
          // Minimalna logika: odśwież techników/zlecenia/ widok szczegółów, gdy coś się zmieniło
          if (msg.type === 'order.updated' || msg.type === 'client.updated' || msg.type === 'device.updated') {
            // Jeśli jesteśmy na widoku zleceń i mamy zalogowanego usera — odśwież listę
            if (this.isTechnicianPanelVisible && this.auth && this.auth.user) {
              await this.loadOrders(this.auth.user.id);
            }
            // Odśwież dane klienta/urządzenia jeśli otwarty panel szczegółów
            await this.ensureDeviceDetailsLoaded();
            // Jeśli trzymamy otwarte konkretne zlecenie – zmerguj świeże dane z listy (np. estimated_cost_note)
            try {
              const oid = (msg.data && (msg.data.orderId || msg.data.id)) || (msg.payload && (msg.payload.orderId || msg.payload.id)) || null
              if (this.selectedOrder && (!oid || Number(this.selectedOrder.id) === Number(oid))) {
                const fresh = (this.orders || []).find(o => Number(o.id) === Number(this.selectedOrder.id))
                if (fresh) Object.assign(this.selectedOrder, fresh)
                // Best-effort: dociągnij szczegóły pojedynczego zlecenia z Railway, aby mieć 100% świeże pola
                try {
                  const rid = oid || this.selectedOrder.id
                  if (rid) {
                    const r = await fetch(`${API.baseUrl}/api/orders/${rid}`)
                    const j = await r.json().catch(()=>({}))
                    const o = (j && (j.order || j.data)) || null
                    if (o && Number(o.id) === Number(this.selectedOrder.id)) {
                      // Zmerguj kluczowe pola, nie ruszając zdjęć itp.
                      const keys = ['status','priority','title','description','scheduled_date','total_cost','estimated_cost_note']
                      keys.forEach(k => { if (o[k] !== undefined && o[k] !== null) this.selectedOrder[k] = o[k] })
                    }
                  }
                } catch (_) {}
                // Krótkie oznaczenie, że dane zostały zaktualizowane (opcjonalny baner w UI)
                try { this.selectedOrder._justUpdated = true; setTimeout(()=>{ if (this.selectedOrder) this.selectedOrder._justUpdated = false }, 4000) } catch (_) {}
              }
            } catch (_) {}
          }
          if (msg.type === 'company.updated') {
            await this.loadCompanyProfile().catch(()=>{})
          }
        } catch (_) {}
      };
      source.onerror = () => {
        try { source.close(); } catch (_) {}
        // cichy fallback — następne wejście na stronę znów połączy SSE
      };
    } catch (_) { /* ignore if blocked */ }
  },

  beforeUnmount() {
    // Usuń obsługę klawisza ESC
    document.removeEventListener('keydown', this.handleKeydown);
  },

  methods: {
    async loadTimeSummary() {
      try {
        if (!this.selectedOrder?.id) { this.timeSummary = null; return }
        this.timeSummaryLoading = true
        this.timeSummaryError = null
        const r = await fetch(`${API.baseUrl}/api/time/summary/${this.selectedOrder.id}`)
        const j = await r.json().catch(()=>({}))
        if (!r.ok || !j.success) throw new Error(j.error || `HTTP ${r.status}`)
        const sessions = Array.isArray(j.sessions) ? j.sessions : []
        const firstStart = (sessions[0] && sessions[0].start_at) ? String(sessions[0].start_at) : null
        const lastEnd = (sessions[sessions.length-1] && sessions[sessions.length-1].end_at) ? String(sessions[sessions.length-1].end_at) : null
        const totalSec = Number(j.total_seconds||0)
        const hours = Math.round((totalSec/3600)*10)/10
        let pauseCount = 0
        let pauseTotalSec = 0
        for (let i=1;i<sessions.length;i++) {
          try {
            const prevEnd = sessions[i-1].end_at ? new Date(sessions[i-1].end_at).getTime() : null
            const curStart = sessions[i].start_at ? new Date(sessions[i].start_at).getTime() : null
            if (prevEnd && curStart && curStart>prevEnd) {
              pauseCount += 1
              pauseTotalSec += Math.floor((curStart - prevEnd)/1000)
            }
          } catch (_) {}
        }
        this.timeSummary = {
          ...j,
          firstStart,
          lastEnd,
          worked_hours: hours,
          pause_count: pauseCount,
          pause_seconds: pauseTotalSec
        }
      } catch (e) {
        this.timeSummaryError = e && e.message ? e.message : 'Błąd raportu czasu'
        this.timeSummary = null
      } finally {
        this.timeSummaryLoading = false
      }
    },
    _allowDesktopFallback() {
      try { return /^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname||'')) } catch (_) { return false }
    },
    // Pauza lokalna (bez zmian w backendzie) — przechowywana w localStorage per order+user
    _pauseKey(order) {
      try {
        const oid = (order && (order.id || order.order_number)) || (this.selectedOrder && (this.selectedOrder.id || this.selectedOrder.order_number)) || ''
        const uid = (this.auth && this.auth.user && this.auth.user.id) ? this.auth.user.id : 'anon'
        return `serwis_pause_${uid}_${oid}`
      } catch (_) { return 'serwis_pause_unknown' }
    },
    isOrderPaused(order) {
      try { return localStorage.getItem(this._pauseKey(order)) === '1' } catch (_) { return false }
    },
    setOrderPaused(order, paused) {
      try {
        const key = this._pauseKey(order)
        if (paused) localStorage.setItem(key, '1'); else localStorage.removeItem(key)
      } catch (_) {}
    },
    async togglePauseSelectedOrder() {
      try {
        if (!this.selectedOrder) return
        const next = !this.isOrderPaused(this.selectedOrder)
        this.setOrderPaused(this.selectedOrder, next)
        // Oznacz w obiekcie, żeby UI zareagował natychmiast
        this.selectedOrder._paused = next
        // Fire-and-forget to backend to persist session stop/start
        try {
          if (next) {
            await fetch(`${API.baseUrl}/api/time/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ orderId: this.selectedOrder.id }) })
          } else {
            await fetch(`${API.baseUrl}/api/time/resume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ orderId: this.selectedOrder.id, technicianId: (this.auth && this.auth.user ? this.auth.user.id : null) }) })
          }
        } catch (_) {}
        this.showNotification(next ? 'Zlecenie zawieszone (pauza)' : 'Wznówiono zlecenie', 'success')
      } catch (_) {}
    },
    // Legacy login (admin); technicy używają PIN
    async doLogin() {
      try {
        const resp = await fetch(`${API.baseUrl}/api/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'include', body: JSON.stringify(this.loginForm)
        });
        const j = await resp.json().catch(()=>({}));
        if (!resp.ok || !j.success) { alert('Błędny login lub hasło'); return; }
        this.auth.authenticated = true; this.auth.user = j.user; this.showLoginModal = false; this.loginForm = { username: '', password: '' };
        // Po zalogowaniu od razu otwórz panel i załaduj zlecenia/logikę
        await this.showTechnicianPanel();
      } catch (_) { alert('Błąd logowania'); }
    },
    // PIN login flow
    openPinForTechnician(technician) {
      this.pinTarget = technician || (this.auth && this.auth.user ? { id: this.auth.user.id, name: this.auth.user.full_name || this.auth.user.username } : null)
      this.pinInput = ''
      this.showPinModal = true
    },
    async submitPin() {
      try {
        const targetId = this.pinTarget && this.pinTarget.id ? this.pinTarget.id : (this.auth && this.auth.user ? this.auth.user.id : null)
        const pin = String(this.pinInput || '').trim()
        if (!/^\d{4,8}$/.test(pin)) { alert('PIN powinien mieć 4-8 cyfr'); return }
        const url = `${API.baseUrl}/api/auth/pin-login`
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId: targetId, pin }) })
        const j = await r.json().catch(()=>({}))
        if (!r.ok || !j.success) { alert(j.error || 'Błąd logowania PIN'); return }
        this.auth = { authenticated: true, user: j.user }
        this.showPinModal = false; this.pinInput = ''; this.pinTarget = null
        await this.showTechnicianPanel()
      } catch (e) { alert('Błąd logowania PIN') }
    },
    async doLogout() {
      try { await fetch(`${API.baseUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (_) {}
      this.auth = { authenticated: false, user: null };
    },
    // Format ISO/Date-like string to PL date without time suffix
    formatDateLocal(value) {
      try {
        if (!value) return 'Brak danych';
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString('pl-PL');
      } catch (_) { return value || 'Brak danych'; }
    },
    // Format daty/czasu bez przesunięć strefowych
    // Jeśli mamy string ISO bezpośrednio z backendu (np. 2025-09-18T10:00:00.000Z lub 2025-09-18T10:00:00)
    // to wyświetl dokładnie HH:MM z tej wartości, bez tworzenia obiektu Date
    formatDateTimeLocal(value) {
      try {
        if (!value) return 'Brak danych';
        const s = String(value);
        // Wzorzec z T na pozycji 10 – traktuj jako lokalny zapis i wytnij HH:MM
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
          const d = s.slice(0, 10);
          const t = s.slice(11, 16);
          return `${d} ${t}`;
        }
        // Sam dzień bez czasu
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // Fallback: spróbuj z Date dla innych formatów
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const date = d.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          return `${date} ${time}`;
        }
        return s;
      } catch (_) { return value || 'Brak danych'; }
    },

    // Resolve photo src from object/string
    resolvePhotoSrc(ph) {
      try {
        if (!ph) return '';
        const raw = typeof ph === 'string' ? ph : (ph.path || ph.url || '');
        if (!raw) return '';
        if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
        const withSlash = raw.startsWith('/') ? raw : ('/' + raw);
        return `${API.baseUrl}${withSlash}`;
      } catch (_) { return ''; }
    },
    // Build photo source list for current order
    buildPhotoSources(order) {
      try {
        const o = order || this.selectedOrder
        const list = this.getWorkPhotos(o?.work_photos)
        const urls = (list || []).map(ph => this.resolvePhotoSrc(ph)).filter(Boolean)
        return urls
      } catch (_) { return [] }
    },
    async ensurePartsCatalogLoaded() {
      try {
        if (Array.isArray(this.partsCatalog) && this.partsCatalog.length > 0) return
        const r = await fetch(`${API.baseUrl}/api/parts`)
        const j = await r.json().catch(()=>({}))
        if (r.ok && Array.isArray(j.items)) this.partsCatalog = j.items
      } catch (_) { /* soft fail */ }
    },
    _normText(s) {
      try { return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim() } catch (_) { return String(s||'').toLowerCase().trim() }
    },
    _displayPartName(p) {
      try {
        if (!p) return ''
        const sku = p.part_number || p.sku || ''
        return `${p.name}${sku ? ' ' + sku : ''}`.trim()
      } catch(_) { return '' }
    },
    _bestCatalogMatch(token, opts = {}) {
      try {
        const q = this._normText(token)
        if (!q || q.length < 3) return null
        let list = Array.isArray(this.partsCatalog) ? this.partsCatalog : []
        const ctxBrand = this._normText(opts.brand || this.selectedOrder?.device_brand || '')
        if (ctxBrand) {
          const filtered = list.filter(it => {
            const man = this._normText(it.manufacturer || it.brand)
            return man && (man.includes(ctxBrand) || ctxBrand.includes(man))
          })
          if (filtered && filtered.length) list = filtered
        }
        let best = null; let score = 0
        for (const it of list) {
          const name = this._normText(it.name)
          const sku = this._normText(it.sku || it.part_number)
          let sc = 0
          if (q === name || (sku && q === sku) || (q === `${name} (${sku})`)) sc = 100
          else if (name.includes(q)) sc = q.length + 10
          else {
            const words = q.split(' ').filter(w => w.length >= 3)
            if (words.length) {
              const hits = words.reduce((acc, w)=> acc + (name.includes(w) ? 1 : 0), 0)
              if (hits) sc = hits * 5 + Math.min(q.length, name.length)
            }
          }
          if (sc > score) { score = sc; best = it }
        }
        return score >= 12 ? best : null
      } catch (_) { return null }
    },
    mapPartsTextToCatalog(raw) {
      try {
        const parts = String(raw||'')
          .split(/[,;\n]/)
          .map(s=>s.trim())
          .filter(Boolean)
        if (!parts.length) return ''
        const mapped = parts.map(t => {
          // Jeśli tekst jest tylko cyfrą (1-5 znaków) - prawdopodobnie ID części
          // Spróbuj znaleźć część po ID w katalogu
          if (/^\d{1,5}$/.test(t.trim())) {
            const catalog = Array.isArray(this.partsCatalog) ? this.partsCatalog : []
            const byId = catalog.find(p => String(p.id) === t.trim())
            if (byId) return this._displayPartName(byId)
          }
          // Standardowe mapowanie po nazwie/SKU
          const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
          return m ? this._displayPartName(m) : t
        })
        // Deduplicate while preserving order
        const seen = new Set();
        const uniq = mapped.filter(x => { const k = this._normText(x); if (seen.has(k)) return false; seen.add(k); return true })
        return uniq.join(', ')
      } catch (_) { return String(raw||'') }
    },
    exportPartsTimelinePdf() {
      try {
        const items = Array.isArray(this.devicePartsTimeline) ? this.devicePartsTimeline : []
        const rows = [
          [{ text: 'Data', style: 'th' }, { text: 'Nr zlecenia', style: 'th' }, { text: 'Części', style: 'th' }]
        ]
        for (const it of items) {
          rows.push([
            this.formatDateTimeLocal(it.date || ''),
            String(it.order_number || ''),
            String(it.parts_used || '')
          ])
        }
        const doc = {
          defaultStyle: { font: 'Roboto', fontSize: 10 },
          pageMargins: [24, 28, 24, 28],
          content: [
            { text: 'Użyte części — historia urządzenia', style: 'h1', margin: [0,0,0,8] },
            { text: (this.selectedOrder?.device_name || '') + (this.selectedOrder?.device_serial ? `, SN: ${this.selectedOrder.device_serial}` : ''), margin: [0,0,0,12] },
            { table: { headerRows: 1, widths: ['auto','*','*'], body: rows }, layout: 'lightHorizontalLines' }
          ],
          styles: { h1: { fontSize: 14, bold: true }, th: { bold: true } }
        }
        if (window.pdfMake) window.pdfMake.createPdf(doc).download('uzyte-czesci.pdf')
        else alert('Generator PDF jest niedostępny')
      } catch (_) { alert('Nie udało się wygenerować PDF') }
    },
    openPhotoViewer(startIndex = 0) {
      try {
        const urls = this.buildPhotoSources()
        if (!urls || urls.length === 0) return
        this.photoModalSources = urls
        this.photoModalIndex = Math.min(Math.max(0, Number(startIndex)||0), urls.length-1)
        this.showPhotoModal = true
      } catch (_) {}
    },
    closePhotoViewer() {
      this.showPhotoModal = false
      this.photoModalSources = []
      this.photoModalIndex = 0
    },
    prevPhoto() {
      if (!this.photoModalSources || this.photoModalSources.length === 0) return
      this.photoModalIndex = (this.photoModalIndex - 1 + this.photoModalSources.length) % this.photoModalSources.length
    },
    nextPhoto() {
      if (!this.photoModalSources || this.photoModalSources.length === 0) return
      this.photoModalIndex = (this.photoModalIndex + 1) % this.photoModalSources.length
    },
    openInMaps(address) {
      const a = typeof address === 'string' ? address : (this.selectedOrder?.address || '');
      if (!a) return;
      const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
      try { window.open(url, '_blank', 'noopener'); } catch (_) { location.href = url; }
    },

    openEditClient() {
      this.editClient = {
        phone: this.selectedOrder?.client_phone || '',
        email: this.selectedOrder?.client_email || '',
        address: this.selectedOrder?.address || ''
      };
      this.showEditClientModal = true;
    },
    closeEditClient() {
      this.showEditClientModal = false;
    },

    openEditDevice() {
      const toInputDate = (v) => {
        try {
          if (!v) return ''
          const s = String(v)
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
          const d = new Date(s)
          if (isNaN(d.getTime())) return ''
          return d.toISOString().slice(0,10)
        } catch (_) { return '' }
      }
      this.editDevice = {
        manufacturer: this.selectedOrder?.device_brand || '',
        serial_number: this.selectedOrder?.device_serial || '',
        fuel_type: this.selectedOrder?.device_fuel_type || '',
        installation_date: toInputDate(this.selectedOrder?.device_installation_date),
        warranty_end_date: toInputDate(this.selectedOrder?.device_warranty_end_date),
        last_service_date: toInputDate(this.selectedOrder?.device_last_service_date),
        next_service_date: toInputDate(this.selectedOrder?.device_next_service_date)
      }
      this.showEditDeviceModal = true
    },
    closeEditDevice() { this.showEditDeviceModal = false },
    async saveDeviceEdits() {
      try {
        if (!this.selectedOrder?.device_id) { alert('Brak powiązanego urządzenia'); return }
        const toInputDate = (v) => {
          try {
            if (!v) return ''
            const s = String(v)
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
            const d = new Date(s)
            if (isNaN(d.getTime())) return ''
            return d.toISOString().slice(0,10)
          } catch (_) { return '' }
        }
        // Normalizuj daty do formatu yyyy-MM-dd wymagane przez <input type="date">
        this.editDevice.installation_date = toInputDate(this.editDevice.installation_date)
        this.editDevice.warranty_end_date = toInputDate(this.editDevice.warranty_end_date)
        this.editDevice.last_service_date = toInputDate(this.editDevice.last_service_date)
        this.editDevice.next_service_date = toInputDate(this.editDevice.next_service_date)
        const body = JSON.stringify({
          ...this.editDevice,
          propose: true,
          proposed_by: (this.auth && this.auth.user && this.auth.user.id) ? this.auth.user.id : null
        })
        const resp = await fetch(`${API.baseUrl}/api/devices/${this.selectedOrder.device_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body
        })
        const j = await resp.json().catch(()=>({}))
        if (!resp.ok || !j.success) { console.error('Device update failed', resp.status, j); alert('Nie udało się zaktualizować urządzenia'); return }
        // Nie zmieniaj widoku – czekamy na akceptację operatora desktop
        this.showNotification('Zmiana urządzenia wysłana do akceptacji. Odświeży się po zatwierdzeniu.', 'success')
        // Best-effort: poinformuj desktop, aby odświeżył dane urządzenia (Railway -> Desktop)
        try {
          fetch(`http://localhost:5174/api/railway/import-device/${this.selectedOrder.device_id}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }
          }).catch(()=>{})
        } catch (_) {}
        this.closeEditDevice()
        this.showNotification('Oczekuje na akceptację', 'success')
      } catch (e) {
        console.error('Device update exception', e)
        alert('Błąd przy aktualizacji urządzenia')
      }
    },

    async openAttachDevice() {
      try {
        if (!this.selectedOrder?.client_id) { alert('Brak klienta dla zlecenia'); return }
        // Pobierz urządzenia klienta
        const resp = await fetch(`${API.baseUrl}/api/clients/${this.selectedOrder.client_id}/devices`)
        const j = await resp.json().catch(()=>({}))
        if (!resp.ok || !j.success) { alert('Nie udało się pobrać urządzeń klienta'); return }
        this.clientDevices = Array.isArray(j.items) ? j.items : []
        this.attachDeviceId = null
        this.showAttachDeviceModal = true
      } catch (e) {
        console.error('openAttachDevice error', e)
        alert('Błąd podczas pobierania urządzeń klienta')
      }
    },
    closeAttachDevice() { this.showAttachDeviceModal = false },
    async saveAttachDevice() {
      try {
        if (!this.selectedOrder?.id || !this.attachDeviceId) return
        const resp = await fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}/device`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: this.attachDeviceId })
        })
        const j = await resp.json().catch(()=>({}))
        if (!resp.ok || !j.success) { alert('Nie udało się przypisać urządzenia'); return }
        // Ustaw w aktualnym zleceniu
        const d = this.clientDevices.find(x => x.id === this.attachDeviceId) || {}
        Object.assign(this.selectedOrder, {
          device_id: this.attachDeviceId,
          device_name: d.name || this.selectedOrder.device_name,
          device_brand: d.brand || this.selectedOrder.device_brand,
          device_model: d.model || this.selectedOrder.device_model,
          device_serial: d.serial_number || this.selectedOrder.device_serial
        })
        // Po przypięciu, wymuś pełne odświeżenie danych urządzenia z API
        await this.refreshDeviceDetails(true)
        this.closeAttachDevice()
        this.showNotification('Urządzenie przypisane do zlecenia', 'success')
      } catch (e) {
        console.error('saveAttachDevice error', e)
        alert('Błąd podczas przypisywania urządzenia')
      }
    },

    async updateClient(payload) {
      try {
        console.log('🔍 UPDATE CLIENT START:', { client_id: this.selectedOrder?.client_id, payload });
        if (!this.selectedOrder?.client_id) {
          alert('Brak powiązania z klientem');
          return;
        }
        const body = JSON.stringify({
          phone: (payload.phone || '').trim(),
          email: (payload.email || '').trim(),
          address: (payload.address || '').trim(),
          // Wyślij jako propozycję – operator desktop zaakceptuje/odrzuci
          propose: true,
          proposed_by: (this.auth && this.auth.user && this.auth.user.id) ? this.auth.user.id : null
        });
        console.log('🔍 CLIENT UPDATE REQUEST:', {
          url: `${API.baseUrl}/api/clients/${this.selectedOrder.client_id}`,
          body: JSON.parse(body),
          propose: true
        });
        const resp = await fetch(`${API.baseUrl}/api/clients/${this.selectedOrder.client_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        const j = await resp.json().catch(()=>({}));
        console.log('🔍 CLIENT UPDATE RESPONSE:', { status: resp.status, ok: resp.ok, data: j });
        if (!resp.ok || !j.success) {
          console.error('Update client failed:', resp.status, j);
          alert('Nie udało się zaktualizować danych klienta');
          return;
        }
        // Nie zmieniaj lokalnego stanu – czekamy na akceptację operatora desktop
        this.showNotification('Zmiana wysłana do akceptacji. Odświeży się po zatwierdzeniu.', 'success');
        // Best-effort: zainicjuj import do desktopu (jeśli desktop działa)
        try {
          fetch(`http://localhost:5174/api/railway/import-client/${this.selectedOrder.client_id}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }
          }).catch(()=>{})
        } catch (_) { /* ignore */ }
        this.closeEditClient();
        this.showNotification('Dane klienta zaktualizowane', 'success');
      } catch (e) {
        console.error('Update client exception:', e);
        alert('Błąd przy aktualizacji danych klienta');
      }
    },

    // Bezpieczny parser listy zdjęć (string JSON | tablica | null)
    getWorkPhotos(photos) {
      try {
        if (!photos) return [];
        const arr = typeof photos === 'string' ? JSON.parse(photos) : (Array.isArray(photos) ? photos : []);
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    },
    // Obsługa formularza
    async submitServiceRequest() {
      if (!this.canSubmit) {
        alert('Proszę wypełnić wszystkie wymagane pola');
        return;
      }

      this.submitting = true;
      
      try {
        const payloadJson = {
          // Mapowanie do Railway /api/service-requests
          type: this.form.serviceType || 'awaria',
          name: this.form.contactName,
          phone: this.form.phone,
          email: this.form.email || null,
          nip: this.form.nip || null,
          address_street: this.form.street || this.form.address,
          address_city_postal: this.form.postalCity || this.form.city,
          directions: this.form.directions || null,
          device_type: (this.form.deviceType === 'inne' ? (this.form.deviceTypeOther || 'inne') : this.form.deviceType) || null,
          brand_model: this.form.deviceModel || null,
          is_existing_client: (String(this.form.deviceServiced||'').toLowerCase() === 'tak'),
          description: this.form.description || null
        };

        let result;
        result = await API.submitServiceRequest(payloadJson);
        
        if (result && result.success) {
          console.log('✅ Zgłoszenie wysłane pomyślnie:', result);
          this.referenceNumber = result.reference_number || result.referenceNumber || '';
          console.log('🔧 Ustawiam showSuccessModal = true');
          console.log('🔧 showSuccessModal przed ustawieniem:', this.showSuccessModal);
          this.showSuccessModal = true;
          console.log('🔧 showSuccessModal po ustawieniu:', this.showSuccessModal);
          
          // Force update Vue.js
          this.$forceUpdate();
          
          // Dodatkowe zabezpieczenie z nextTick
          this.$nextTick(() => {
            this.showSuccessModal = true;
            console.log('🔧 showSuccessModal po $nextTick:', this.showSuccessModal);
          });
          
          this.resetForm();
          this.showNotification('Zgłoszenie zostało wysłane pomyślnie!', 'success');
        } else {
          this.showNotification('Błąd podczas wysyłania zgłoszenia', 'error');
        }
      } catch (error) {
        console.error('❌ Błąd wysyłania:', error);
        this.showNotification('Błąd podczas wysyłania zgłoszenia', 'error');
      } finally {
        this.submitting = false;
      }
    },

    resetForm() {
      this.form = {
        serviceType: 'awaria',
        contactName: '',
        phone: '',
        email: '',
        nip: '',
        street: '',
        postalCity: '',
        address: '',
        city: '',
        directions: '',
        deviceType: '',
        deviceTypeOther: '',
        deviceModel: '',
        deviceYear: '',
        previousService: '',
        description: '',
        preferredDate: '',
        preferredTime: '',
        isUrgent: false,
        privacyPolicy: false,
        emailCopy: false,
        deviceServiced: ''
      };
      this.attachments = [];
    },

    async handleFileUpload(event) {
      const files = Array.from(event.target.files || []);
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { alert('Plik jest za duży (max 5MB)'); continue; }
        if (!allowedTypes.includes(file.type)) { alert('Nieobsługiwany typ pliku'); continue; }
        const item = { file, name: file.name, type: file.type, size: file.size, preview: null };
        if (file.type.startsWith('image/')) {
          item.preview = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
        }
        this.attachments.push(item);
      }
      event.target.value = '';
    },

    removeAttachment(idx) { this.attachments.splice(idx, 1); },

    // Panel technika
    async showTechnicianPanel() {
      if (this.formOnly) {
        this.showServiceForm = true;
        this.isTechnicianPanelVisible = false;
        return;
      }
      this.showServiceForm = false;
      // Sprawdź sesję; jeśli brak – pokaż listę techników i logowanie PIN zamiast legacy login
      try {
        const me = await fetch(`${API.baseUrl}/api/auth/me`, { credentials: 'include' });
        const j = await me.json().catch(()=>({}));
        if (!j || !j.authenticated) {
          this.showLoginModal = false; // nie pokazuj login/hasło
          this.isTechnicianPanelVisible = true;
          this.currentView = 'technicians';
          await this.loadTechnicians();
          return;
        }
        this.auth.authenticated = true; this.auth.user = j.user;
      } catch (_) {
        this.showLoginModal = false;
        this.isTechnicianPanelVisible = true;
        this.currentView = 'technicians';
        await this.loadTechnicians();
        return;
      }
      this.isTechnicianPanelVisible = true;
      // Jeśli to technik – od razu ładuj swoje zlecenia; listy nie renderuj wcześniej
      const isAdmin = !!(this.auth && this.auth.user && this.auth.user.role === 'admin');
      if (!isAdmin && this.auth && this.auth.user) {
        // Najpierw ładuj zlecenia dla zalogowanego
        await this.loadOrders(this.auth.user.id);
        // Potem dociągnij listę (będzie już przefiltrowana do jednego rekordu)
        await this.loadTechnicians();
        const mine = (this.technicians || []).find(t => t.id === this.auth.user.id) || { id: this.auth.user.id, name: this.auth.user.username };
        this.selectedTechnician = mine;
        this.currentView = 'orders';
      } else {
        await this.loadTechnicians();
        this.currentView = 'technicians';
      }
    },

    async openTechnicianPanel() {
      if (this.formOnly) {
        this.showServiceForm = true;
        this.isTechnicianPanelVisible = false;
        return;
      }
      if (!this.isTechnicianPanelVisible) {
        await this.showTechnicianPanel();
      } else {
        this.showServiceForm = false;
      }
    },

    openServiceForm() {
      this.showServiceForm = true;
    },

    hideTechnicianPanel() {
      this.openServiceForm();
    },

    async loadTechnicians() {
      try {
        // Zawsze ładuj listę; logowanie PIN nastąpi po wyborze technika
        this.technicians = await API.getTechnicians();
        console.log('✅ Załadowano techników:', this.technicians);
        
        if (!Array.isArray(this.technicians)) {
          console.error('❌ Technicy nie są tablicą:', this.technicians);
          this.technicians = [];
          return;
        }
        
        // Zamapuj i odfiltruj duplikaty po username (preferuj z telefonem i większą liczbą zleceń)
        const mapped = (this.technicians || []).map(tech => ({
          id: Number(tech.id) || 0,
          username: (tech.username || '').toLowerCase(),
          name: tech.full_name || tech.name || 'Brak nazwy',
          phone: (tech.phone && String(tech.phone).trim()) || 'Brak telefonu',
          order_count: tech.order_count || 0
        })).filter(t => t.name.toLowerCase() !== 'jan technik');

        const pickBetter = (a, b) => {
          if (!a) return b; if (!b) return a;
          const hasPhoneA = a.phone && a.phone !== 'Brak telefonu';
          const hasPhoneB = b.phone && b.phone !== 'Brak telefonu';
          if (hasPhoneA !== hasPhoneB) return hasPhoneA ? a : b;
          if ((a.order_count||0) !== (b.order_count||0)) return (a.order_count||0) > (b.order_count||0) ? a : b;
          return (a.id||0) >= (b.id||0) ? a : b;
        };
        const byUser = new Map();
        for (const t of mapped) {
          const key = t.username || t.name.toLowerCase();
          byUser.set(key, pickBetter(byUser.get(key), t));
        }
        this.technicians = Array.from(byUser.values());
        // Jeżeli zalogowany to technik – ukryj pozostałych
        const role = this.auth && this.auth.user ? String(this.auth.user.role || '').toLowerCase() : '';
        if (this.auth && this.auth.authenticated && role !== 'admin') {
          this.technicians = this.technicians.filter(t => t.id === this.auth.user.id);
        }
        // Nie pobieraj zleceń do zliczania bez aktywnej sesji – unikamy 401
        if (this.auth && this.auth.authenticated) {
          // Opcjonalnie można dociągać liczby zleceń po zalogowaniu
        }
        
      } catch (error) {
        console.error('❌ Błąd ładowania techników:', error);
        this.technicians = [];
      }
    },

    async selectTechnician(technician) {
      this.selectedTechnician = technician;
      this.currentView = 'orders';
      // Admin może przeglądać dowolnego technika; technik tylko swoje zlecenia
      const isAdmin = !!(this.auth && this.auth.user && this.auth.user.role === 'admin');
      const targetId = isAdmin
        ? technician.id
        : ((this.auth && this.auth.user && this.auth.user.id) ? this.auth.user.id : technician.id);
      if (!isAdmin && technician && this.auth && this.auth.user && technician.id !== this.auth.user.id) {
        console.warn('Wybrano innego technika niż zalogowany. Pokazuję zlecenia zalogowanego.');
      }
      // Jeśli nie ma sesji – otwórz PIN modal dla wybranego technika
      try {
        const me = await fetch(`${API.baseUrl}/api/auth/me`, { credentials: 'include' });
        const j = await me.json().catch(()=>({}));
        if (!j || !j.authenticated) { this.openPinForTechnician(technician); return }
      } catch (_) { this.openPinForTechnician(technician); return }
      await this.loadOrders(targetId);
    },

    async loadOrders(technicianId) {
      const reqId = ++this._ordersReqId;
      try {
        // Hard check session before pobieranie zleceń
        try {
          const me = await fetch(`${API.baseUrl}/api/auth/me`, { credentials: 'include' });
          const j = await me.json().catch(()=>({}));
          if (!j || !j.authenticated) {
            this.showLoginModal = true; return;
          }
        } catch (_) { this.showLoginModal = true; return; }
        // Admin może pobrać dla wskazanego ID; technik – tylko swoje
        const isAdmin = !!(this.auth && this.auth.user && this.auth.user.role === 'admin');
        const myId = isAdmin ? technicianId : ((this.auth && this.auth.user && this.auth.user.id) ? this.auth.user.id : technicianId);
        console.log(`📋 Ładowanie zleceń dla technika ID: ${myId}`);
        try {
          const fetched = await API.getMyOrders(myId);
          // Tylko najnowsze żądanie może nadpisać listę
          if (reqId !== this._ordersReqId) return;
          // Nie nadpisuj niepustej listy pustą odpowiedzią
          if (Array.isArray(fetched) && fetched.length === 0 && Array.isArray(this.orders) && this.orders.length > 0) {
            // Jednorazowy retry po krótkim opóźnieniu (race z innymi żądaniami/SSE)
            setTimeout(async () => {
              try {
                if (reqId !== this._ordersReqId) return;
                const second = await API.getMyOrders(myId);
                if (reqId !== this._ordersReqId) return;
                if (Array.isArray(second) && second.length > 0) {
                  this.orders = second;
                  console.log(`✅ Retry: Załadowano ${second.length} zleceń`);
                }
              } catch (_) {}
            }, 1200);
            // zachowaj obecną listę
          } else {
            this.orders = fetched;
          }
        } catch (e) {
          if (e && e.code === 'AUTH_REQUIRED') {
            this.showLoginModal = true; return;
          } else { throw e; }
        }
        console.log(`✅ Załadowano ${this.orders.length} zleceń`);
        
        if (!Array.isArray(this.orders)) {
          console.error('❌ Zlecenia nie są tablicą:', this.orders);
          this.orders = [];
          return;
        }
        
        this.orders = this.orders.map(order => ({
          id: Number(order.id) || 0,
          order_number: order.order_number || `Z-${Number(order.id) || 'N/A'}`,
          title: order.title || order.description || '',
          client_id: order.client_id != null ? Number(order.client_id) : null,
          device_id: order.device_id != null ? Number(order.device_id) : null,
          client_name: order.client_name || 'Brak nazwy klienta',
          client_phone: order.client_phone || 'Brak telefonu',
          client_email: order.client_email || 'Brak email',
          address: order.address || 'Brak adresu',
          device_name: order.device_name || 'Brak urządzenia',
          device_brand: (String(order.device_brand||'').trim()) || (String(order.device_manufacturer||'').trim()) || (String(order.manufacturer||'').trim()) || 'Brak marki',
          device_model: (String(order.device_model||'').trim()) || (String(order.model||'').trim()) || 'Brak modelu',
          device_serial: order.device_serial || 'Brak numeru seryjnego',
          assigned_user_id: order.assigned_user_id != null ? Number(order.assigned_user_id) : null,
          device_fuel_type: order.device_fuel_type || null,
          device_installation_date: order.device_installation_date || null,
          device_warranty_end_date: order.device_warranty_end_date || null,
          device_last_service_date: order.device_last_service_date || null,
          device_next_service_date: order.device_next_service_date || null,
          description: order.description || 'Brak opisu',
          status: order.status || 'pending',
          priority: order.priority || 'medium',
          scheduled_datetime: (order.scheduled_datetime || (order.scheduled_date && /T\d{2}:\d{2}/.test(String(order.scheduled_date)) ? String(order.scheduled_date) : null)) || null,
          scheduled_date: order.scheduled_date || 'Brak daty',
          total_cost: order.total_cost || 0,
          parts_used: order.parts_used || null,
          work_photos: order.work_photos || null,
          estimated_cost_note: order.estimated_cost_note || order.estimate_text || null,
          // Ujednolicone pole do prostego wyświetlania (opis > kwota)
          estimated_cost_display: (order.estimated_cost_note || order.estimate_text || '').trim() || (Number(order.total_cost||0)).toFixed(2) + ' zł',
          // Sync to desktop status (if available)
          desktop_sync_status: order.desktop_sync_status || 'pending',
          desktop_synced_at: order.desktop_synced_at || null,
          _paused: false
        }));
        console.log('📦 Zamapowane zlecenia:', this.orders);
        // Zbuduj słowniki clientsById/devicesById
        try {
          const cMap = {};
          const dMap = {};
          for (const o of this.orders) {
            if (o.client_id) {
              if (!cMap[o.client_id]) {
                cMap[o.client_id] = {
                  id: o.client_id,
                  name: o.client_name,
                  phone: o.client_phone,
                  email: o.client_email,
                  address: o.address
                };
              }
            }
            if (o.device_id) {
              if (!dMap[o.device_id]) {
                dMap[o.device_id] = {
                  id: o.device_id,
                  name: o.device_name,
                  brand: o.device_brand,
                  model: o.device_model,
                  serial_number: o.device_serial
                };
              }
            }
          }
          this.clientsById = cMap;
          this.devicesById = dMap;
        } catch (_) { this.clientsById = {}; this.devicesById = {}; }
        // Zastosuj lokalny stan pauzy po mapowaniu
        try { this.orders.forEach(o => { o._paused = this.isOrderPaused(o) }) } catch (_) {}
        
      } catch (error) {
        console.error('❌ Błąd ładowania zleceń:', error);
        if (reqId === this._ordersReqId) this.orders = [];
        alert('Nie udało się załadować zleceń. Sprawdź połączenie z aplikacją desktop.');
      }
    },

    selectOrder(order) {
      this.selectedOrder = {
        ...order,
        id: order && order.id != null ? Number(order.id) : order.id,
        client_id: order && order.client_id != null ? Number(order.client_id) : order.client_id,
        device_id: order && order.device_id != null ? Number(order.device_id) : order.device_id
      };
      this.currentView = 'order-details';
      // Upewnij się, że mamy katalog części do mapowania nazw w historii
      this.ensurePartsCatalogLoaded();
      // Dociągnij pełne dane urządzenia jeśli mamy device_id, a brakuje pól
      this.ensureDeviceDetailsLoaded();
      // Best-effort: dociągnij świeże dane tego zlecenia po wejściu w szczegóły, aby pokazać koszt/status
      this.refreshSelectedOrderFromRailway();
      // Raport czasu pracy (tylko read-only; nie wpływa na istniejące akcje)
      this.loadTimeSummary();
      // Dociągnij dokumentację urządzenia (zdjęcia/dokumenty)
      this.fetchDevicePhotosForOrder(order)
      this.fetchDeviceDocsForOrder(order)
      // Historia urządzenia
      this.loadDeviceHistory()
    },

    async refreshSelectedOrderFromRailway() {
      try {
        if (!this.selectedOrder?.id) return
        // UI feedback
        this.selectedOrder._loading = true
        console.log('🔄 Refresh order from Railway:', this.selectedOrder.id)
        const r = await fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}?include=client,device&preferLatest=true`, { signal: AbortSignal.timeout(8000) })
        const j = await r.json().catch(()=>({}))
        const o = (j && (j.order || j.data)) || null
        if (o && Number(o.id) === Number(this.selectedOrder.id)) {
          const keys = ['status','priority','title','description','scheduled_date','total_cost','estimated_cost_note']
          keys.forEach(k => { if (o[k] !== undefined && o[k] !== null) this.selectedOrder[k] = o[k] })
          // oznacz zmienione
          this.selectedOrder._justUpdated = true
          setTimeout(()=>{ try { if (this.selectedOrder) this.selectedOrder._justUpdated = false } catch(_){} }, 4000)
        } else {
          // Fallback: przeładuj listę moich zleceń i zmerguj po order_number (ID może być inne po stronie Railway)
          try {
            if (this.auth && this.auth.user) {
              await this.loadOrders(this.auth.user.id)
              const match = (this.orders || []).find(o => String(o.order_number||'') === String(this.selectedOrder.order_number||''))
              if (match) {
                const keys = ['status','priority','title','description','scheduled_date','total_cost','estimated_cost_note']
                keys.forEach(k => { if (match[k] !== undefined && match[k] !== null) this.selectedOrder[k] = match[k] })
                this.selectedOrder._justUpdated = true
                setTimeout(()=>{ try { if (this.selectedOrder) this.selectedOrder._justUpdated = false } catch(_){} }, 4000)
              }
            }
          } catch (_) {}
        }
      } catch (_) { /* soft fail */ }
      finally { try { if (this.selectedOrder) this.selectedOrder._loading = false } catch(_){} }
    },

    async fetchDevicePhotosForOrder(order) {
      try {
        const o = order || this.selectedOrder
        if (!o || !o.device_id) return
        // 1) Railway
        let added = 0
        try {
          const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/files`)
          const j = await r.json().catch(()=>({}))
          if (r.ok && j.success) {
            const isImage = (x) => {
              const mt = String(x.mime_type||'').toLowerCase()
              if (mt.startsWith('image/')) return true
              const ft = String(x.file_type||'').toLowerCase()
              if (ft === 'photo' || ft === 'image') return true
              const name = String(x.file_name||x.file_path||x.path||'').toLowerCase()
              return /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(name)
            }
            const urlOf = (x) => x.public_url || x.url || x.path || x.file_path
            const baseOf = (u) => {
              const s = String(u||''); const q = s.split('?')[0]; const h = q.split('#')[0];
              return h.substring(h.lastIndexOf('/')+1).toLowerCase()
            }
            // Preferuj wyłącznie files/items. Photos użyj tylko jeśli brak files.
            let images = []
            if (Array.isArray(j.files) && j.files.length) images = j.files.filter(isImage).map(p => ({ id: p.id, path: urlOf(p), name: p.file_name || baseOf(urlOf(p)) }))
            if ((!images || images.length === 0) && Array.isArray(j.items) && j.items.length) images = j.items.filter(isImage).map(p => ({ id: p.id, path: urlOf(p), name: p.file_name || baseOf(urlOf(p)) }))
            // Fallback do photos tylko, gdy brak plików
            if ((!images || images.length === 0) && Array.isArray(j.photos)) images = j.photos.map(p => ({ path: urlOf(p), name: baseOf(urlOf(p)) }))
            // Dedup po basename
            const seen = new Set(); const unique = []
            for (const img of (images||[])) {
              const key = baseOf(img.path)
              if (key && !seen.has(key)) { seen.add(key); unique.push({ path: img.path }) }
            }
            if (unique.length) {
              o.work_photos = unique
              added = unique.length
            }
          }
        } catch (_) {}
        // 2) Fallback: Desktop (lokalny) zawsze dociąga brakujące – pozwala usunąć puste ramki po deletach
        if (this._allowDesktopFallback()) {
          try {
            const r2 = await fetch(`http://localhost:5174/api/desktop/devices/${o.device_id}/files`)
            const j2 = await r2.json().catch(()=>({}))
            if (r2.ok && j2.success && Array.isArray(j2.items)) {
              const isImage = (x) => {
                const mt = String(x.mime_type||'').toLowerCase()
                if (mt.startsWith('image/')) return true
                const ft = String(x.file_type||'').toLowerCase()
                if (ft === 'photo' || ft === 'image') return true
                const name = String(x.file_name||x.file_path||'').toLowerCase()
                return /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(name)
              }
              const photos2 = (j2.items || []).filter(isImage)
              if (photos2.length) {
                const mapped2 = photos2.map(p => ({ id: p.id, path: (p.url ? `http://localhost:5174${p.url}` : p.file_path) }))
                // Jeśli mamy już zdjęcia z Railway – nie nadpisuj; jeśli nie – ustaw
                const hasAny = Array.isArray(this.getWorkPhotos(o.work_photos)) && this.getWorkPhotos(o.work_photos).length > 0
                if (!hasAny) o.work_photos = mapped2
              }
            }
          } catch (_) {
            // brak desktopu – ignoruj
          }
        }
        // 3) Oczyszczanie: jeżeli Railway i desktop nic nie zwróciły – wyczyść galerię
        const after = this.getWorkPhotos(o.work_photos)
        if (added === 0 && (!after || after.length === 0)) {
          o.work_photos = []
        }
      } catch (e) { /* ignore */ }
    },

    _mergePhotos(orderObj, mapped) {
      if (!Array.isArray(mapped) || mapped.length === 0) return 0
      const prod = !this._allowDesktopFallback()
      if (!orderObj.work_photos || this.getWorkPhotos(orderObj.work_photos).length === 0) {
        orderObj.work_photos = prod ? mapped.filter(p => !(typeof p === 'string' ? p : (p.path||'')).includes('localhost:5174')) : mapped
        return mapped.length
      } else {
        const current = this.getWorkPhotos(orderObj.work_photos)
        const merged = [...current, ...mapped]
        const seen = new Set()
        orderObj.work_photos = merged.filter(p => {
          const key = typeof p === 'string' ? p : (p.path || '')
          if (prod && key.includes('localhost:5174')) return false
          if (!key || seen.has(key)) return false
          seen.add(key); return true
        })
        return orderObj.work_photos.length - current.length
      }
    },

    async fetchDeviceDocsForOrder(order) {
      try {
        const o = order || this.selectedOrder
        if (!o || !o.device_id) return
        let added = 0
        try {
          const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/files`)
          const j = await r.json().catch(()=>({}))
          if (r.ok && j.success) {
            const isPdf = (x) => {
              const mt = String(x.mime_type||'').toLowerCase()
              if (mt === 'application/pdf') return true
              const ft = String(x.file_type||'').toLowerCase()
              if (ft === 'document' || ft === 'pdf') return true
              const name = String(x.file_name||x.file_path||x.path||'').toLowerCase()
              return /\.pdf$/.test(name)
            }
            const urlOf = (x) => x.public_url || x.url || x.path || x.file_path
            let docs = []
            if (Array.isArray(j.files)) docs = j.files.filter(isPdf)
            if ((!docs || docs.length === 0) && Array.isArray(j.items)) docs = j.items.filter(isPdf)
            if (docs && docs.length) {
              this.selectedOrderDocuments = docs.map(d => ({ id: d.id, name: d.file_name || `plik-${d.id}.pdf`, url: urlOf(d), mime: d.mime_type || 'application/pdf' }))
              added = docs.length
            }
          }
        } catch (_) {}
        if (!added && this._allowDesktopFallback()) {
          try {
            const r2 = await fetch(`http://localhost:5174/api/desktop/devices/${o.device_id}/files`)
            const j2 = await r2.json().catch(()=>({}))
            if (r2.ok && j2.success && Array.isArray(j2.items)) {
              const isPdf = (x) => {
                const mt = String(x.mime_type||'').toLowerCase()
                if (mt === 'application/pdf') return true
                const ft = String(x.file_type||'').toLowerCase()
                if (ft === 'document' || ft === 'pdf') return true
                const name = String(x.file_name||x.file_path||'').toLowerCase()
                return /\.pdf$/.test(name)
              }
              const docs2 = (j2.items || []).filter(isPdf)
              this.selectedOrderDocuments = docs2.map(d => ({ id: d.id, name: d.file_name || `plik-${d.id}.pdf`, url: d.url ? `http://localhost:5174${d.url}` : null, mime: d.mime_type || 'application/pdf' }))
            }
          } catch (_) { /* ignore */ }
        }
      } catch (_) { this.selectedOrderDocuments = [] }
    },

    

    async openDocument(doc) {
      try {
        if (!doc) return
        const url = doc.url
        if (!url) return
        // Pobierz jako blob (stabilniej w HTTPS→HTTP) i otwórz w nowej karcie
        const resp = await fetch(url)
        if (!resp.ok) { window.open(url, '_blank', 'noopener'); return }
        const blob = await resp.blob()
        const objectUrl = URL.createObjectURL(blob)
        try { window.open(objectUrl, '_blank', 'noopener'); }
        finally { setTimeout(()=> URL.revokeObjectURL(objectUrl), 60_000) }
      } catch (_) {
        try { window.open(doc.url, '_blank', 'noopener') } catch (e) {}
      }
    },

    async downloadDocument(doc) {
      try {
        if (!doc || !doc.url) return
        const resp = await fetch(doc.url)
        if (!resp.ok) return this.openDocument(doc)
        const blob = await resp.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = doc.name || 'dokument.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(()=> URL.revokeObjectURL(objectUrl), 60_000)
      } catch (_) { this.openDocument(doc) }
    },

    async loadDeviceHistory() {
      try {
        const o = this.selectedOrder
        if (!o || !o.device_id) { this.deviceHistory = []; return }
        const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/orders`)
        const j = await r.json().catch(()=>({}))
        if (r.ok && j.success && Array.isArray(j.items)) {
          this.deviceHistory = j.items
        } else {
          this.deviceHistory = []
        }
      } catch (_) { this.deviceHistory = [] }
    },

    toggleHistory() { this.showAllHistory = !this.showAllHistory },
    openHistoryDetail(item) { this.selectedHistory = item; this.showHistoryModal = true },
    closeHistoryDetail() { this.showHistoryModal = false; this.selectedHistory = null },
    parsedHistoryCategories(item) {
      try {
        const raw = item && item.completed_categories
        const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
        return (arr || []).map(x => String(x))
      } catch (_) { return [] }
    },
    resolveHistoryPhotoSrc(ph) {
      const val = typeof ph === 'string' ? ph : (ph && (ph.path || ph.url))
      if (!val) return ''
      const v = String(val)
      if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v
      if (v.startsWith('/uploads')) return `${API.baseUrl.replace(/\/$/, '')}${v}`
      if (v.startsWith('uploads/')) return `${API.baseUrl.replace(/\/$/, '')}/${v}`
      return v
    },

    async deletePhoto(ph) {
      try {
        const id = ph && (ph.id || ph.file_id)
        if (!id) { this.showNotification('Brak identyfikatora pliku', 'error'); return }
        if (!confirm('Usunąć to zdjęcie?')) return
        const r = await fetch(`${API.baseUrl}/api/device-files/${id}`, { method: 'DELETE' })
        const j = await r.json().catch(()=>({}))
        if (r.ok && j.success) {
          // Usuń z lokalnej listy
          const cur = this.getWorkPhotos(this.selectedOrder.work_photos)
          this.selectedOrder.work_photos = (cur || []).filter(p => (p.id||p.file_id) !== id)
          this.showNotification('Zdjęcie usunięte', 'success')
        } else {
          this.showNotification('Nie udało się usunąć zdjęcia', 'error')
        }
      } catch (_) { this.showNotification('Błąd usuwania zdjęcia', 'error') }
    },

    async deleteDocument(doc) {
      try {
        if (!doc || !doc.id) return
        if (!confirm('Usunąć ten dokument?')) return
        const r = await fetch(`${API.baseUrl}/api/device-files/${doc.id}`, { method: 'DELETE' })
        const j = await r.json().catch(()=>({}))
        if (r.ok && j.success) {
          this.selectedOrderDocuments = (this.selectedOrderDocuments || []).filter(d => d.id !== doc.id)
          this.showNotification('Dokument usunięty', 'success')
        } else {
          this.showNotification('Nie udało się usunąć dokumentu', 'error')
        }
      } catch (_) { this.showNotification('Błąd usuwania dokumentu', 'error') }
    },

    backToTechnicians() {
      this.currentView = 'technicians';
      this.selectedTechnician = null;
      this.orders = [];
      this.selectedOrder = null;
    },

    backToOrders() {
      this.currentView = 'orders';
      this.selectedOrder = null;
    },

    // Mobilny kalendarz technika (lightweight, tylko odczyt)
    openCalendar() {
      this.currentView = 'calendar'
      this.currentCalendarDate = new Date()
      this.buildCalendar()
    },
    prevCalMonth() {
      const d = this.currentCalendarDate; d.setMonth(d.getMonth()-1); this.buildCalendar()
    },
    nextCalMonth() {
      const d = this.currentCalendarDate; d.setMonth(d.getMonth()+1); this.buildCalendar()
    },
    formatCalMonthYear(date) {
      try { return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }) } catch { return '' }
    },
    buildCalendar() {
      try {
        const base = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), 1)
        const first = new Date(base); const wd = first.getDay()===0?6:first.getDay()-1; first.setDate(first.getDate()-wd)
        const days = []
        for (let i=0;i<42;i++) {
          const d = new Date(first); d.setDate(first.getDate()+i)
          const key = d.toISOString().split('T')[0]
          const inMonth = d.getMonth() === this.currentCalendarDate.getMonth()
          const isToday = key === new Date().toISOString().split('T')[0]
          const day = d.getDate()
          const events = (this.orders || [])
            .filter(o => ((o.scheduled_datetime || o.scheduled_date || '')).startsWith(key))
            .map(o => ({ 
              title: o.title || o.description || 'Zlecenie', 
              orderId: o.id,
              time: ((o.scheduled_datetime || o.scheduled_date || '').split('T')[1]?.substring(0,5)) || ''
            }))
          days.push({ key, day, inMonth, isToday, events })
        }
        this.calendarDays = days
      } catch (_) { this.calendarDays = [] }
    },

    openCalendarEvent(ev) {
      try {
        if (!ev || !ev.orderId) return
        const ord = (this.orders || []).find(o => o.id === ev.orderId)
        if (ord) this.selectOrder(ord)
      } catch (_) {}
    },

    async startSelectedOrder() {
      try {
        if (!this.selectedOrder?.id) return
        await API.startOrder(this.selectedOrder.id)
        this.selectedOrder.status = 'in_progress'
        this.showNotification('Rozpoczęto pracę', 'success')
      } catch (e) {
        const msg = (e && e.message) ? e.message : 'Nie udało się rozpocząć pracy'
        this.showNotification(msg, 'error')
      }
    },

    getTechnicianOrderCount(technicianId) {
      const t = this.technicians.find(x => x.id === technicianId);
      return t?.order_count ?? this.orders.filter(order => order.assigned_user_id === technicianId).length;
    },

    getStatusText(status) {
      switch (status) {
        case 'pending': return 'Oczekujące';
        case 'assigned': return 'Przydzielone';
        case 'in_progress': return 'W realizacji';
        case 'completed': return 'Zakończone';
        case 'cancelled': return 'Anulowane';
        default: return status;
      }
    },

    async refreshDeviceDetails(force = false) {
      try {
        const o = this.selectedOrder;
        if (!o || !o.device_id) return;
        if (!force) {
          const missing = !o.device_brand || !o.device_serial || !o.device_fuel_type || !o.device_model;
          if (!missing) return;
        }
        const resp = await fetch(`${API.baseUrl}/api/devices/${o.device_id}`);
        const j = await resp.json().catch(()=>({}));
        if (!resp.ok || !j.success || !j.device) return;
        Object.assign(this.selectedOrder, {
          device_brand: (String(j.device.brand||'').trim()) || (String(j.device.manufacturer||'').trim()) || this.selectedOrder.device_brand,
          device_model: (String(j.device.model||'').trim()) || this.selectedOrder.device_model,
          device_serial: j.device.serial_number ?? this.selectedOrder.device_serial,
          device_fuel_type: j.device.fuel_type ?? this.selectedOrder.device_fuel_type,
          device_installation_date: j.device.installation_date ?? this.selectedOrder.device_installation_date,
          device_warranty_end_date: j.device.warranty_end_date ?? this.selectedOrder.device_warranty_end_date,
          device_last_service_date: j.device.last_service_date ?? this.selectedOrder.device_last_service_date,
          device_next_service_date: j.device.next_service_date ?? this.selectedOrder.device_next_service_date
        })
      } catch (e) { /* cichy fallback */ }
    },

    async ensureDeviceDetailsLoaded() {
      // Odśwież zawsze po starcie (po reload mobilki), aby dograć brand/model z Railway
      return this.refreshDeviceDetails(true)
    },

    getStatusColor(status) {
      switch (status) {
        case 'pending': return 'bg-yellow-200 text-yellow-800';
        case 'assigned': return 'bg-indigo-200 text-indigo-800';
        case 'in_progress': return 'bg-blue-200 text-blue-800';
        case 'completed': return 'bg-green-200 text-green-800';
        case 'cancelled': return 'bg-red-200 text-red-800';
        default: return 'bg-gray-200 text-gray-800';
      }
    },

    getPriorityColor(priority) {
      switch (priority) {
        case 'high': return 'bg-red-200 text-red-800';
        case 'medium': return 'bg-orange-200 text-orange-800';
        case 'low': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
      }
    },

    // Zakończenie zlecenia
    showCompletionModal() {
      // Blokada: nie pozwól zakończyć, jeśli zlecenie nie zostało rozpoczęte
      try {
        const s = this.selectedOrder && this.selectedOrder.started_at
        const st = String(this.selectedOrder && this.selectedOrder.status || '').toLowerCase()
        if (!s && st !== 'in_progress') {
          alert('Najpierw rozpocznij zlecenie (▶️ Rozpocznij), a dopiero potem je zakończ.');
          return;
        }
      } catch (_) {}
      this.isCompletionModalVisible = true;
      this.completionData = {
        mainCategory: '',
        selectedSubCategories: [],
        workDescription: '',
        partsUsed: '',
        hoursWorked: '',
        completionDate: new Date().toISOString().split('T')[0],
        notes: '',
        selectedParts: []
      };
      this.manualWorkDescription = false;
      this.updateAutoWorkDescription();
      // Load service categories (global)
      fetch(`${API.baseUrl}/api/service-categories`).then(r => r.json()).then((resp) => {
        const list = resp?.data || [];
        if (Array.isArray(list) && list.length) {
          const map = {};
          const parents = list.filter(c => !c.parent_id && c.is_active !== false).sort((a,b)=>a.sort_order-b.sort_order);
          const byId = Object.fromEntries(list.map(c => [c.id, c]));
          for (const p of parents) { map[p.code] = { name: `${p.code}: ${p.name}`, subcategories: {} }; }
          for (const c of list) {
            if (c.parent_id && c.is_active !== false) {
              const parent = byId[c.parent_id];
              if (parent && map[parent.code]) map[parent.code].subcategories[c.code] = `${c.code}: ${c.name}`;
            }
          }
          this.serviceCategories = map;
          this.serviceCategoriesLoaded = true;
          this.updateAutoWorkDescription();
        }
      }).catch(() => { /* fallback zostaje */ });
      
      // Load part categories for cascading filter
      fetch(`${API.baseUrl}/api/part-categories`).then(r=>r.json()).then(d=>{
        this.partCategories = Array.isArray(d.data) ? d.data : []
      }).catch(()=>{ this.partCategories = [] })
      
      // Lazy load parts catalog (soft-fallback)
      fetch(`${API.baseUrl}/api/parts`).then(r => r.json()).then(d => {
        this.partsCatalog = Array.isArray(d.items) ? d.items : []
      }).catch(() => { this.partsCatalog = [] })
    },

    onMainCategoryChange() {
      if (!this.completionData) return;
      this.completionData.selectedSubCategories = [];
      this.updateAutoWorkDescription();
    },

    toggleSubCategory(code) {
      if (!code) return;
      if (!Array.isArray(this.completionData.selectedSubCategories)) {
        this.completionData.selectedSubCategories = [];
      }
      const list = this.completionData.selectedSubCategories;
      const idx = list.indexOf(code);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(code);
      }
      this.updateAutoWorkDescription();
    },

    onCompletionDateChange() {
      this.updateAutoWorkDescription();
    },

    onWorkDescriptionInput() {
      this.manualWorkDescription = true;
    },

    getSubCategoryLabel(code) {
      const main = this.completionData?.mainCategory;
      if (!main || !code) return code;
      const entry = this.serviceCategories[main] || SERVICE_CATEGORIES[main];
      if (entry && entry.subcategories && entry.subcategories[code]) {
        return entry.subcategories[code];
      }
      return code;
    },

    formatCompletionDateLabel(rawDate) {
      try {
        if (!rawDate) return new Date().toLocaleDateString('pl-PL');
        const date = new Date(rawDate);
        if (!isNaN(date.getTime())) return date.toLocaleDateString('pl-PL');
        return rawDate;
      } catch (_) {
        return rawDate || new Date().toLocaleDateString('pl-PL');
      }
    },

    generateAutoWorkDescription() {
      const main = this.completionData?.mainCategory;
      const subs = Array.isArray(this.completionData?.selectedSubCategories) ? this.completionData.selectedSubCategories.filter(Boolean) : [];
      if (!main || subs.length === 0) return '';
      const dateLabel = this.formatCompletionDateLabel(this.completionData?.completionDate);
      const lines = subs.map(code => `- ${this.getSubCategoryLabel(code)}`);
      return [`W dniu ${dateLabel} wykonano:`, ...lines].join('\n');
    },

    updateAutoWorkDescription(force = false) {
      if (force) this.manualWorkDescription = false;
      if (this.manualWorkDescription) return;
      const autoText = this.generateAutoWorkDescription();
      this.completionData.workDescription = autoText;
    },
    
    onPartMainCatChange() {
      this.partSubCatId = null
    },

    // Helper: merge selected parts into text field without duplicates
    syncPartsText() {
      const selected = Array.isArray(this.completionData.selectedParts) ? this.completionData.selectedParts : [];
      const manual = (this.completionData.partsUsed || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => !selected.includes(s));
      const merged = [...selected, ...manual];
      this.completionData.partsUsed = merged.join(', ');
    },

    // Called when user types in partsUsed textarea
    onPartsUsedInput() {
      // keep both in sync by re-merging to normalize spacing/duplicates later on save
      this.syncPartsText();
    },

    onSelectedPartsChange() {
      this.syncPartsText();
    },

    onPhotosSelected(e) {
      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
      this.completionPhotos = files;
      this.completionPhotoPreviews = [];
      // Always build dataURL previews to work on browsers without URL.createObjectURL
      files.forEach((f, idx) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            // Maintain order by index
            this.$set ? this.$set(this.completionPhotoPreviews, idx, reader.result) : (this.completionPhotoPreviews[idx] = reader.result);
          };
          reader.readAsDataURL(f);
        } catch (_) {
          // ignore broken file
        }
      });
    },

    hideCompletionModal() {
      this.isCompletionModalVisible = false;
      // Cleanup previews and file inputs to free memory
      this.completionPhotos = [];
      this.completionPhotoPreviews = [];
      this.manualWorkDescription = false;
    },

    async sendToDesktop() {
      try {
        if (!this.selectedOrder) return;
        const resp = await fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}/send-to-desktop`, {
          method: 'POST'
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          this.selectedOrder.desktop_sync_status = 'sent';
          this.selectedOrder.desktop_synced_at = new Date().toISOString();
          // Odbij zmianę również na liście kart, aby użytkownik widział "wysłano"
          try {
            const idx = (this.orders || []).findIndex(o => Number(o.id) === Number(this.selectedOrder.id));
            if (idx !== -1) {
              this.orders[idx] = {
                ...this.orders[idx],
                desktop_sync_status: 'sent',
                desktop_synced_at: this.selectedOrder.desktop_synced_at,
                // Upewnij się, że status pozostaje completed
                status: (String(this.orders[idx].status||'').toLowerCase() === 'completed') ? this.orders[idx].status : 'completed'
              };
            }
          } catch (_) {}
          this.showNotification('Wysłano do firmy', 'success');
        } else {
          this.showNotification('Nie udało się wysłać do firmy', 'error');
          console.error('sendToDesktop error:', resp.status, data);
        }
      } catch (e) {
        console.error('sendToDesktop exception:', e);
        this.showNotification('Błąd wysyłania do firmy', 'error');
      }
    },

    async checkAndDeleteOrder() {
      try {
        console.log('🔧 Próba usunięcia zlecenia ID:', this.selectedOrder?.id);
        // Reguła: zawsze ostrzegaj. Jeśli status != completed (niebieskie), pokaż mocniejsze ostrzeżenie i pozwól usunąć.
        let allow = false;
        try {
          const resp = await fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}/deletable`);
          const data = await resp.json();
          allow = !!(data.success && data.deletable);
        } catch (_) {}

        // Dodatkowa reguła: jeśli nie oznaczono "wysłano do firmy" – zablokuj usuwanie
        const sent = String(this.selectedOrder?.desktop_sync_status || '').toLowerCase() === 'sent';
        // Jeżeli UI pokazuje na dole "Status: nie wysłano" to pewnie nie zdążyliśmy zmergować stanu po POST send-to-desktop.
        // Spróbuj best-effort odpytać serwer o najnowszy stan przed decyzją.
        if (!sent) {
          try {
            const st = await fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}`, { method: 'GET' })
            const js = await st.json().catch(()=>({}))
            const s2 = String((js && (js.order && js.order.desktop_sync_status)) || js.desktop_sync_status || '').toLowerCase()
            if (s2 === 'sent') this.selectedOrder.desktop_sync_status = 'sent'
          } catch (_) {}
        }
        const isSentNow = String(this.selectedOrder?.desktop_sync_status || '').toLowerCase() === 'sent'
        if (!isSentNow) {
          alert('Najpierw wyślij zlecenie do firmy, a dopiero potem możesz je usunąć.');
          return;
        }

        if (!allow) {
          const warn = `To zlecenie nie jest zakończone.\n\n` +
            `Usunięcie spowoduje trwałą utratę danych lokalnych technika.\n` +
            `Czy na pewno chcesz usunąć to zlecenie?`;
          if (!confirm(warn)) return;
        } else {
          if (!confirm('Czy na pewno chcesz usunąć zlecenie?')) return;
        }

        const del = await fetch(`${API.baseUrl}/api/sync/orders/${this.selectedOrder.id}`, { method: 'DELETE' });
        const delJson = await del.json();
        if (del.ok && delJson.success) {
          this.showNotification('Zlecenie usunięte', 'success');
          this.backToOrders();
          await this.loadOrders(this.selectedTechnician.id);
        } else {
          this.showNotification('Nie udało się usunąć zlecenia', 'error');
        }
      } catch (e) {
        console.error('delete exception:', e);
        this.showNotification('Błąd podczas usuwania zlecenia', 'error');
      }
    },

    async completeOrder() {
      if (!this.canCompleteOrder) {
        alert('Proszę wypełnić wszystkie wymagane pola');
        return;
      }

      try {
              // 1) upload photos if any (chunked to 2 files/batch to avoid timeouts on slow links)
      let uploadedPhotos = [];
      // WYŁĄCZONE: upload zdjęć – zgodnie z decyzją biznesową
      if (false && this.completionPhotos && this.completionPhotos.length) {
        const files = Array.from(this.completionPhotos);
        const batchSize = 2;
        for (let i = 0; i < files.length; i += batchSize) {
          const fd = new FormData();
          files.slice(i, i + batchSize).forEach(f => fd.append('photos', f, f.name));
          this.uploadingPhotos = true;
          const up = await fetch(`${API.baseUrl}/api/desktop/orders/${this.selectedOrder.id}/photos`, { method: 'POST', body: fd, credentials: 'include' });
          if (up.ok) {
            const upJson = await up.json();
            uploadedPhotos = (uploadedPhotos || []).concat(upJson.files || []);
          } else {
            const txt = await up.text();
            console.error('Upload photos failed:', up.status, txt);
          }
          this.uploadingPhotos = false;
        }

        // Fallback: jeśli backend nie zwrócił żadnych plików, dołącz base64 miniatury
        if ((!uploadedPhotos || uploadedPhotos.length === 0) && files.length > 0) {
          const fileToDataUrl = (file) => new Promise((resolve) => {
            try {
              const reader = new FileReader();
              reader.onload = () => resolve({ local: reader.result, name: file.name });
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
            } catch (_) { resolve(null); }
          });
          const dataItems = (await Promise.all(files.map(fileToDataUrl))).filter(Boolean);
          uploadedPhotos = dataItems;
        }
      }
      // Wymuś brak zdjęć w payloadzie
      uploadedPhotos = [];

        // 2) build payload
        this.syncPartsText();
        const partsFromSelect = Array.isArray(this.completionData.selectedParts) && this.completionData.selectedParts.length
          ? this.completionData.selectedParts.join(', ')
          : ''
        const selectedSubs = Array.isArray(this.completionData.selectedSubCategories)
          ? this.completionData.selectedSubCategories.filter(Boolean)
          : [];
        const completedCategories = [this.completionData.mainCategory, ...selectedSubs].filter(Boolean);
        const serviceTypeLabel = completedCategories.join(', ');
        const mergedParts = [partsFromSelect, this.completionData.partsUsed]
          .filter(Boolean)
          .join(', ')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(', ');
        this.completionData.partsUsed = mergedParts;
        const actualHours = (this.completionData.hoursWorked ? Number(this.completionData.hoursWorked) : 0) || 0;
        const completionPayload = {
          mainCategory: this.completionData.mainCategory,
          workDescription: this.completionData.workDescription,
          partsUsed: mergedParts,
          hoursWorked: this.completionData.hoursWorked,
          completionDate: this.completionData.completionDate,
          notes: this.completionData.notes,
          selectedParts: this.completionData.selectedParts,
          selectedSubCategories: selectedSubs,
          completedAt: new Date().toISOString(),
          technicianId: this.selectedTechnician.id,
          work_photos: uploadedPhotos,
          historyData: {
            clientId: this.selectedOrder.client_id,
            deviceId: this.selectedOrder.device_id,
            completionDate: this.completionData.completionDate,
            serviceType: serviceTypeLabel,
            description: this.completionData.workDescription
          },
          // pola zgodne z desktopem
          completion_notes: this.completionData.workDescription || this.completionData.notes || '',
          completed_categories: completedCategories,
          actual_hours: actualHours
        };

        // Preferuj PUT, a w razie potrzeby fallback do POST
        let resp = await fetch(`${API.baseUrl}/api/desktop/orders/${this.selectedOrder.id}/complete`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completion_notes: completionPayload.completion_notes,
            completed_categories: completionPayload.completed_categories,
            actual_hours: completionPayload.actual_hours,
            work_photos: [],
            // Notatki technika wysyłamy wyłącznie z pola "Uwagi" (bez fallbacku do opisu prac)
            notes: (this.completionData && this.completionData.notes) ? String(this.completionData.notes) : ''
          })
        }).catch(()=>null)
        if (!resp || !resp.ok) {
          resp = await fetch(`${API.baseUrl}/api/desktop/orders/${this.selectedOrder.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completionPayload)
          });
        }
        let result;
        try { result = await resp.json(); } catch { result = { success: resp.ok }; }
        if (!resp.ok || !result.success) {
          console.error('Complete order failed:', resp.status, result);
          alert('Błąd podczas zakończenia zlecenia');
          return;
        }

        this.showNotification('Zlecenie zostało zakończone pomyślnie!', 'success');
        this.hideCompletionModal();
        this.completionPhotoPreviews = [];
        if (this.selectedOrder) this.selectedOrder.status = 'completed';
        // Od razu zaktualizuj kartę na liście (bez przeładowania)
        try {
          const idx = (this.orders || []).findIndex(o => Number(o.id) === Number(this.selectedOrder.id));
          if (idx !== -1) {
            this.orders[idx] = { ...this.orders[idx], status: 'completed' };
          }
        } catch (_) {}
        // Wyślij status przypisania oraz oznacz do wysłania, ale nie przeładowuj listy natychmiast
        try {
          await fetch(`${API.baseUrl}/api/sync/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: this.selectedOrder.id, technicianId: this.selectedTechnician.id, status: 'completed' })
          });
          fetch(`${API.baseUrl}/api/orders/${this.selectedOrder.id}/send-to-desktop`, { method: 'POST' }).catch(() => {})
          // Best-effort: powiadom desktop o imporcie, bez wpływu na UI
          fetch('http://localhost:5174/api/railway/import-order/' + this.selectedOrder.id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markImported: true })
          }).catch(()=>{})
        } catch (_) {}
        // Pozostań na szczegółach; lista zostanie odświeżona ręcznie lub po wysłaniu do firmy
      } catch (error) {
        console.error('❌ Błąd zakończenia zlecenia:', error);
        this.showNotification('Błąd podczas zakończenia zlecenia', 'error');
      }
    },

    // Modal
    hideSuccessModal() {
      console.log('🔧 Próba zamknięcia modala sukcesu...');
      console.log('🔧 showSuccessModal przed:', this.showSuccessModal);
      
      // Prosty sposób - bez skomplikowanej logiki
      this.showSuccessModal = false;
      this.referenceNumber = '';
      
      // Force update Vue.js
      this.$forceUpdate();
      
      // Dodatkowe zabezpieczenie z nextTick
      this.$nextTick(() => {
        this.showSuccessModal = false;
        console.log('🔧 showSuccessModal po $nextTick:', this.showSuccessModal);
      });
      
      console.log('🔧 showSuccessModal po:', this.showSuccessModal);
      console.log('✅ Modal sukcesu zamknięty');
    },

    // Obsługa klawisza ESC
    handleKeydown(event) {
      if (event.key === 'Escape' && this.showSuccessModal) {
        this.hideSuccessModal();
      }
    },

    // Powiadomienia
    showNotification(message, type = 'info') {
      if (type === 'error') {
        alert(message);
      } else {
        console.log('✅', message);
      }
    },

    async loadCompanyProfile () {
      try {
        const resp = await fetch(`${API.baseUrl}/api/company`)
        const data = await resp.json().catch(() => ({}))
        if (resp.ok && data && data.success) {
          this.companyProfile = data.data || null
        }
      } catch (e) {
        console.warn('company profile load failed:', e?.message || e)
        this.companyProfile = null
      }
    },
  }
});

// Montowanie aplikacji
app.mount('#app'); 