// Konfiguracja API – autodetekcja hosta Railway, bez twardych URL
const API_CONFIG = (() => {
    const origin = window.location.origin.replace(/\/$/, '')
    return {
        BASE_URL: origin,
        TIMEOUT: 10000
    }
})();

// API functions
const API = {
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    async getTechnicians() {
        try {
            console.log('📱 Pobieranie listy techników...');
            const response = await this.request('/api/technicians');
            console.log('📱 Pobrano techników:', response);
            return response;
        } catch (error) {
            console.error('❌ Błąd pobierania techników:', error);
            // Fallback data
            return [
                { id: 2, name: 'Jan Technik' },
                { id: 13, name: 'Radosław Cichorek' },
                { id: 9, name: 'Sławomir Jur' }
            ];
        }
    },

    async getMyOrders(technicianId) {
        try {
            console.log(`📱 Pobieranie zleceń dla technika ${technicianId}...`);
            const response = await this.request(`/api/desktop/orders/${technicianId}`);
            console.log('📱 Pobrano zlecenia:', response);
            return response;
        } catch (error) {
            console.error('❌ Błąd pobierania zleceń:', error);
            // Fallback data
            return [];
        }
    },

    async updateOrderStatus(orderId, statusOrPayload, completedCategories = [], photos = [], notes = '') {
        try {
            const payload = (typeof statusOrPayload === 'object' && statusOrPayload !== null)
                ? statusOrPayload
                : { status: statusOrPayload, completedCategories, photos, notes };
            console.log(`📱 Aktualizacja zlecenia ${orderId}:`, payload);
            const response = await this.request(`/api/desktop/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            console.log('📱 Zlecenie zaktualizowane:', response);
            return response;
        } catch (error) {
            console.error('❌ Błąd aktualizacji zlecenia:', error);
            throw error;
        }
    },

    async submitServiceRequest(formData) {
        try {
            console.log('📱 Wysyłanie zgłoszenia serwisowego...');
            const response = await this.request('/api/service-requests', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            console.log('📱 Zgłoszenie wysłane:', response);
            return response;
        } catch (error) {
            console.error('❌ Błąd wysyłania zgłoszenia:', error);
            throw error;
        }
    }
};

// Vue App
const { createApp } = Vue;

createApp({
    data() {
        return {
            loading: true,
            error: null,
            currentView: 'technicians',
            technicians: [],
            orders: [],
            selectedTechnician: null,
            selectedOrder: null,
            showServiceForm: false,
            serviceForm: {
                name: '',
                phone: '',
                address: '',
                description: ''
            }
        };
    },

    async mounted() {
        await this.loadData();
        
        // Auto-refresh orders every 30 seconds
        setInterval(() => {
            if (this.currentView === 'orders' && this.selectedTechnician) {
                this.loadOrders();
            }
        }, 30000);
    },

    methods: {
        async loadData() {
            this.loading = true;
            this.error = null;
            
            try {
                await this.loadTechnicians();
            } catch (error) {
                this.error = 'Nie można połączyć się z aplikacją desktop';
                console.error('❌ Błąd ładowania danych:', error);
            } finally {
                this.loading = false;
            }
        },

        async loadTechnicians() {
            try {
                this.technicians = await API.getTechnicians();
            } catch (error) {
                throw error;
            }
        },

        async loadOrders() {
            if (!this.selectedTechnician) return;
            
            try {
                this.orders = await API.getMyOrders(this.selectedTechnician.id);
            } catch (error) {
                console.error('❌ Błąd ładowania zleceń:', error);
                this.orders = [];
            }
        },

        selectTechnician(technician) {
            this.selectedTechnician = technician;
            this.currentView = 'orders';
            this.loadOrders();
        },

        selectOrder(order) {
            this.selectedOrder = order;
            this.currentView = 'order-detail';
        },

        async updateOrderStatus(status) {
            if (!this.selectedOrder) return;
            
            try {
                await API.updateOrderStatus(this.selectedOrder.id, status);
                this.selectedOrder.status = status;
                
                // Refresh orders list
                await this.loadOrders();
                
                // Show success message
                this.showNotification(`Status zlecenia zmieniony na: ${this.getStatusText(status)}`);
            } catch (error) {
                console.error('❌ Błąd aktualizacji statusu:', error);
                this.showNotification('Błąd aktualizacji statusu', 'error');
            }
        },

        async submitServiceRequest() {
            try {
                await API.submitServiceRequest(this.serviceForm);
                
                // Reset form
                this.serviceForm = {
                    name: '',
                    phone: '',
                    address: '',
                    description: ''
                };
                this.showServiceForm = false;
                
                this.showNotification('Zgłoszenie zostało wysłane pomyślnie!');
            } catch (error) {
                console.error('❌ Błąd wysyłania zgłoszenia:', error);
                this.showNotification('Błąd wysyłania zgłoszenia', 'error');
            }
        },

        getTechnicianOrderCount(technicianId) {
            return this.orders.filter(order => order.assigned_user_id === technicianId).length;
        },

        getStatusText(status) {
            const statusMap = {
                'new': 'Nowe',
                'in_progress': 'W realizacji',
                'completed': 'Zakończone',
                'cancelled': 'Anulowane',
                'pending': 'Oczekujące'
            };
            return statusMap[status] || status;
        },

        getStatusColor(status) {
            const colorMap = {
                'new': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-green-100 text-green-800',
                'cancelled': 'bg-red-100 text-red-800',
                'pending': 'bg-gray-100 text-gray-800'
            };
            return colorMap[status] || 'bg-gray-100 text-gray-800';
        },

        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        showNotification(message, type = 'success') {
            // Simple notification - you can enhance this with a proper toast library
            alert(message);
        },

        backToTechnicians() {
            this.currentView = 'technicians';
            this.selectedTechnician = null;
            this.orders = [];
        }
    }
}).mount('#app'); 