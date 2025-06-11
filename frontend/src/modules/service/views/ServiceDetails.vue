<template>
  <div class="service-details p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Szczegóły Zlecenia Serwisowego</h1>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="handleEdit"
        >
          Edytuj
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          @click="handleDelete"
        >
          Usuń
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      Ładowanie...
    </div>
    
    <div v-else-if="error" class="text-center py-8 text-red-600">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Informacje Podstawowe</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Numer Zlecenia</label>
            <p class="font-medium">{{ service.number }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Data</label>
            <p class="font-medium">{{ formatDate(service.date) }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Status</label>
            <p class="font-medium">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-yellow-100 text-yellow-800': service.status === 'pending',
                'bg-blue-100 text-blue-800': service.status === 'in_progress',
                'bg-green-100 text-green-800': service.status === 'completed',
                'bg-red-100 text-red-800': service.status === 'cancelled'
              }">
                {{ getStatusLabel(service.status) }}
              </span>
            </p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Technik</label>
            <p class="font-medium">{{ service.technician_name }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Informacje o Kliencie i Urządzeniu</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Klient</label>
            <p class="font-medium">{{ service.client_name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Urządzenie</label>
            <p class="font-medium">{{ service.device_name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Lokalizacja</label>
            <p class="font-medium whitespace-pre-line">{{ service.location }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Szczegóły Serwisu</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Opis Problemu</label>
            <p class="whitespace-pre-line">{{ service.problem_description }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Wykonane Czynności</label>
            <p class="whitespace-pre-line">{{ service.work_description || 'Brak opisu wykonanych czynności' }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Użyte Części</label>
            <div v-if="service.parts && service.parts.length > 0" class="mt-2">
              <table class="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Nazwa</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Numer</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Ilość</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="part in service.parts" :key="part.id">
                    <td class="px-4 py-2">{{ part.name }}</td>
                    <td class="px-4 py-2">{{ part.number }}</td>
                    <td class="px-4 py-2">{{ part.quantity }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-gray-500">Brak użytych części</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const service = ref({});
const loading = ref(true);
const error = ref(null);

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
    // TODO: Zaimplementować pobieranie danych zlecenia z API
    // Przykładowe dane
    service.value = {
      id: route.params.id,
      number: 'SRV/2025/001',
      date: '2025-06-11',
      status: 'in_progress',
      technician_name: 'Jan Kowalski',
      client_name: 'Firma ABC',
      device_name: 'Palnik gazowy XYZ',
      location: 'Hala produkcyjna 1\nStanowisko 3',
      problem_description: 'Nieregularna praca palnika, spadki ciśnienia gazu',
      work_description: '1. Sprawdzenie układu zasilania\n2. Wymiana dysz\n3. Kalibracja',
      parts: [
        { id: 1, name: 'Dysza gazowa', number: 'DG-2000', quantity: 2 },
        { id: 2, name: 'Uszczelka', number: 'U-100', quantity: 4 }
      ]
    };
    loading.value = false;
  } catch (err) {
    error.value = 'Nie udało się załadować danych zlecenia';
    loading.value = false;
    console.error('Błąd podczas ładowania danych zlecenia:', err);
  }
});

const handleEdit = () => {
  router.push(`/service/${route.params.id}/edit`);
};

const handleDelete = async () => {
  if (!confirm('Czy na pewno chcesz usunąć to zlecenie?')) {
    return;
  }

  try {
    // TODO: Zaimplementować usuwanie zlecenia przez API
    router.push('/service');
  } catch (err) {
    error.value = 'Nie udało się usunąć zlecenia';
    console.error('Błąd podczas usuwania zlecenia:', err);
  }
};
</script> 