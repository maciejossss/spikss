<template>
  <div class="device-details p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Szczegóły Urządzenia</h1>
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
            <label class="text-sm text-gray-600">Nazwa</label>
            <p class="font-medium">{{ device.name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Model</label>
            <p class="font-medium">{{ device.model }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Numer Seryjny</label>
            <p class="font-medium">{{ device.serial_number }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Status</label>
            <p class="font-medium">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-green-100 text-green-800': device.status === 'active',
                'bg-red-100 text-red-800': device.status === 'inactive',
                'bg-yellow-100 text-yellow-800': device.status === 'service'
              }">
                {{ device.status }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Informacje o Kliencie</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Nazwa Klienta</label>
            <p class="font-medium">{{ device.client_name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Lokalizacja</label>
            <p class="font-medium whitespace-pre-line">{{ device.location }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Parametry Techniczne</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Specyfikacja</label>
            <p class="whitespace-pre-line">{{ device.specifications }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Notatki Serwisowe</label>
            <p class="whitespace-pre-line">{{ device.service_notes || 'Brak notatek serwisowych' }}</p>
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
const device = ref({});
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie danych urządzenia z API
    // Przykładowe dane
    device.value = {
      id: route.params.id,
      name: 'Palnik gazowy XYZ',
      model: 'PG-2000',
      serial_number: 'SN123456789',
      status: 'active',
      client_name: 'Firma ABC',
      location: 'Hala produkcyjna 1\nStanowisko 3',
      specifications: 'Moc: 200kW\nPaliwo: Gaz ziemny\nSterowanie: Automatyczne',
      service_notes: 'Ostatni przegląd: 2025-01-15\nWymiana dysz: 2024-12-01'
    };
    loading.value = false;
  } catch (err) {
    error.value = 'Nie udało się załadować danych urządzenia';
    loading.value = false;
    console.error('Błąd podczas ładowania danych urządzenia:', err);
  }
});

const handleEdit = () => {
  router.push(`/devices/${route.params.id}/edit`);
};

const handleDelete = async () => {
  if (!confirm('Czy na pewno chcesz usunąć to urządzenie?')) {
    return;
  }

  try {
    // TODO: Zaimplementować usuwanie urządzenia przez API
    router.push('/devices');
  } catch (err) {
    error.value = 'Nie udało się usunąć urządzenia';
    console.error('Błąd podczas usuwania urządzenia:', err);
  }
};
</script> 