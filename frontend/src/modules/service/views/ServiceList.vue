<template>
  <div class="service-list">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Zleceń Serwisowych</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleAddService"
      >
        Nowe Zlecenie
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klient</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urządzenie</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technik</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="px-6 py-4">Ładowanie...</td>
          </tr>
          <tr v-else-if="services.length === 0" class="text-center">
            <td colspan="7" class="px-6 py-4">Brak zleceń serwisowych</td>
          </tr>
          <tr v-for="service in services" :key="service.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">{{ service.number }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(service.date) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ service.client_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ service.device_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-yellow-100 text-yellow-800': service.status === 'pending',
                'bg-blue-100 text-blue-800': service.status === 'in_progress',
                'bg-green-100 text-green-800': service.status === 'completed',
                'bg-red-100 text-red-800': service.status === 'cancelled'
              }">
                {{ getStatusLabel(service.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ service.technician_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleEditService(service)"
              >
                Edytuj
              </button>
              <button
                class="text-red-600 hover:text-red-800"
                @click="handleDeleteService(service)"
              >
                Usuń
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const services = ref([]);
const loading = ref(true);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pl-PL');
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Zakończone',
    cancelled: 'Anulowane'
  };
  return labels[status] || status;
};

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie zleceń z API
    // Przykładowe dane
    services.value = [
      {
        id: 1,
        number: 'SRV/2025/001',
        date: '2025-06-11',
        client_name: 'Firma ABC',
        device_name: 'Palnik gazowy XYZ',
        status: 'in_progress',
        technician_name: 'Jan Kowalski'
      }
    ];
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas pobierania zleceń:', error);
    loading.value = false;
  }
});

const handleAddService = () => {
  router.push('/service/new');
};

const handleEditService = (service) => {
  router.push(`/service/${service.id}/edit`);
};

const handleDeleteService = async (service) => {
  if (!confirm('Czy na pewno chcesz usunąć to zlecenie?')) {
    return;
  }
  
  try {
    // TODO: Zaimplementować usuwanie zlecenia przez API
    services.value = services.value.filter(s => s.id !== service.id);
  } catch (error) {
    console.error('Błąd podczas usuwania zlecenia:', error);
  }
};
</script>