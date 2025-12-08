// Konfiguracja API
const API_CONFIG = {
    BASE_URL: 'https://web-production-fc58d.up.railway.app',
    TIMEOUT: 10000
};

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
            // Fallback data z rzeczywistymi danymi
            return [
                { id: 2, name: 'Jan Technik', email: 'jan.technik@serwis.pl' },
                { id: 13, name: 'Radosław Cichorek', email: '' },
                { id: 9, name: 'Sławomir Jur', email: '' }
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
            return [
                {
                    id: 50,
                    order_number: 'SRV-2025-878969',
                    status: 'in_progress',
                    client_name: 'ABC Firma',
                    client_phone: '+48 987 654 321',
                    client_email: 'maria.nowak@abc.com',
                    address: 'ul. Przemysłowa 45, 02-600 Warszawa',
                    device_name: 'Kocioł gazowy ścienny',
                    device_model: 'Cerapur Excellence ZWB 28-3CE',
                    title: 'AWARIA KOTŁA',
                    description: 'Kocioł nie uruchamia się, wyświetla błąd f4',
                    scheduled_date: '2025-08-04T12:00:00Z',
                    priority: 'medium'
                }
            ];
        }
    },

    async updateOrderStatus(orderId, status) {
        try {
            console.log(`📱 Aktualizacja statusu zlecenia ${orderId} na ${status}...`);
            const response = await this.request(`/api/desktop/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            console.log('📱 Status zaktualizowany:', response);
            return response;
        } catch (error) {
            console.error('❌ Błąd aktualizacji statusu:', error);
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
            currentView: 'main', // main, login, technicians, orders, orderDetail
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
            },
            loginForm: {
                technicianId: '',
                password: ''
            }
        }
    },

    async mounted() {
        await this.loadData();
    },

    methods: {
        async loadData() {
            this.loading = true;
            this.error = null;
            
            try {
                await this.loadTechnicians();
                this.loading = false;
            } catch (error) {
                this.error = 'Błąd połączenia z serwerem';
                this.loading = false;
                console.error('Błąd ładowania danych:', error);
            }
        },

        async refreshData() {
            await this.loadData();
        },

        async loadTechnicians() {
            try {
                this.technicians = await API.getTechnicians();
                console.log('Technicy załadowani:', this.technicians);
            } catch (error) {
                console.error('Błąd ładowania techników:', error);
                throw error;
            }
        },

        async loadOrders() {
            if (!this.selectedTechnician) return;
            
            try {
                this.orders = await API.getMyOrders(this.selectedTechnician.id);
                console.log('Zlecenia załadowane:', this.orders);
            } catch (error) {
                console.error('Błąd ładowania zleceń:', error);
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
            this.currentView = 'orderDetail';
        },

        async updateOrderStatus(status) {
            if (!this.selectedOrder) return;
            
            try {
                await API.updateOrderStatus(this.selectedOrder.id, status);
                this.selectedOrder.status = status;
                this.showNotification(`Status zlecenia zmieniony na: ${this.getStatusText(status)}`);
            } catch (error) {
                this.showNotification('Błąd aktualizacji statusu', 'error');
            }
        },

        async submitServiceRequest() {
            try {
                await API.submitServiceRequest(this.serviceForm);
                this.showNotification('Zgłoszenie zostało wysłane!');
                this.serviceForm = {
                    name: '',
                    phone: '',
                    address: '',
                    description: ''
                };
                this.showServiceForm = false;
            } catch (error) {
                this.showNotification('Błąd wysyłania zgłoszenia', 'error');
            }
        },

        async loginTechnician() {
            // Symulacja logowania - w rzeczywistości sprawdzałoby hasło
            const technician = this.technicians.find(t => t.id == this.loginForm.technicianId);
            if (technician) {
                this.selectedTechnician = technician;
                this.currentView = 'orders';
                this.loadOrders();
                this.showNotification('Zalogowano pomyślnie!');
            } else {
                this.showNotification('Nieprawidłowe dane logowania', 'error');
            }
        },

        getTechnicianOrderCount(technicianId) {
            // W rzeczywistości pobierałoby z API
            return this.orders.filter(order => order.assigned_user_id == technicianId).length;
        },

        getStatusText(status) {
            const statusMap = {
                'new': 'Nowe',
                'in_progress': 'W realizacji',
                'completed': 'Zakończone',
                'rejected': 'Odrzucone'
            };
            return statusMap[status] || status;
        },

        getStatusColor(status) {
            const colorMap = {
                'new': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-orange-100 text-orange-800',
                'completed': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800'
            };
            return colorMap[status] || 'bg-gray-100 text-gray-800';
        },

        getPriorityColor(priority) {
            const colorMap = {
                'low': 'bg-green-100 text-green-800',
                'medium': 'bg-yellow-100 text-yellow-800',
                'high': 'bg-red-100 text-red-800'
            };
            return colorMap[priority] || 'bg-gray-100 text-gray-800';
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
            // Prosta implementacja powiadomień
            alert(message);
        },

        backToTechnicians() {
            this.currentView = 'technicians';
            this.selectedTechnician = null;
            this.orders = [];
        },

        backToOrders() {
            this.currentView = 'orders';
            this.selectedOrder = null;
        },

        openMap(address) {
            if (!address) return;
            const encodedAddress = encodeURIComponent(address);
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            window.open(mapUrl, '_blank');
        }
    }
}).mount('#app'); 