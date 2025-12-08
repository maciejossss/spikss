const { createApp, ref, computed, onMounted } = Vue;

// WERSJA LOCALHOST - dla problemów z siecią
const API = {
  // Pobierz listę dostępnych techników z desktop
  async getTechnicians() {
    try {
      console.log('👥 Ładuję listę techników z localhost...');
      
      const response = await fetch('http://localhost:5174/api/technicians', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
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
      console.log(`📋 Ładuję zlecenia dla technika ${userId} z localhost...`);
      
      const response = await fetch(`http://localhost:5174/api/desktop/orders/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('⚠️ Błąd pobierania zleceń:', response.status);
        return [];
      }
      
      const orders = await response.json();
      console.log(`✅ Pobrano ${orders.length} zleceń dla technika ${userId}`);
      return orders;
    } catch (error) {
      console.error('❌ Błąd połączenia z desktop:', error);
      throw error;
    }
  }
};

// Prosta aplikacja testowa
createApp({
  setup() {
    const status = ref('Sprawdzanie połączenia...');
    const technicians = ref([]);
    const orders = ref([]);
    
    const testConnection = async () => {
      try {
        // Test połączenia z desktop API
        const response = await fetch('http://localhost:5174/api/health');
        if (response.ok) {
          status.value = '✅ Połączenie z desktop działa!';
          
          // Załaduj techników
          const techs = await API.getTechnicians();
          technicians.value = techs;
          
          if (techs.length > 0) {
            // Załaduj zlecenia dla pierwszego technika
            const orders_data = await API.getMyOrders(techs[0].id);
            orders.value = orders_data;
          }
        } else {
          status.value = '❌ Desktop API nie odpowiada';
        }
      } catch (error) {
        status.value = '❌ Błąd połączenia: ' + error.message;
      }
    };
    
    onMounted(testConnection);
    
    return {
      status,
      technicians,
      orders,
      testConnection
    };
  },
  
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Test Połączenia - Localhost</h1>
      
      <div class="mb-4 p-3 bg-blue-100 rounded">
        <strong>Status:</strong> {{ status }}
      </div>
      
      <button @click="testConnection" class="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
        🔄 Sprawdź ponownie
      </button>
      
      <div v-if="technicians.length > 0" class="mb-4">
        <h2 class="text-lg font-semibold mb-2">Technicy:</h2>
        <ul class="list-disc list-inside">
          <li v-for="tech in technicians" :key="tech.id">
            {{ tech.full_name || tech.username }} (ID: {{ tech.id }})
          </li>
        </ul>
      </div>
      
      <div v-if="orders.length > 0">
        <h2 class="text-lg font-semibold mb-2">Zlecenia:</h2>
        <ul class="list-disc list-inside">
          <li v-for="order in orders" :key="order.id">
            Zlecenie #{{ order.id }} - {{ order.description }}
          </li>
        </ul>
      </div>
    </div>
  `
}).mount('#app'); 