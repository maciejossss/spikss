<template>
  <div class="devices-list">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Urządzeń</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleAddDevice"
      >
        Dodaj Urządzenie
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numer seryjny</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klient</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="6" class="px-6 py-4">Ładowanie...</td>
          </tr>
          <tr v-else-if="devices.length === 0" class="text-center">
            <td colspan="6" class="px-6 py-4">Brak urządzeń</td>
          </tr>
          <tr v-for="device in devices" :key="device.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">{{ device.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ device.model }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ device.serial_number }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-green-100 text-green-800': device.status === 'active',
                'bg-red-100 text-red-800': device.status === 'inactive',
                'bg-yellow-100 text-yellow-800': device.status === 'service'
              }">
                {{ device.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ device.client_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleEditDevice(device)"
              >
                Edytuj
              </button>
              <button
                class="text-red-600 hover:text-red-800"
                @click="handleDeleteDevice(device)"
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
const devices = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie urządzeń z API
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas pobierania urządzeń:', error);
    loading.value = false;
  }
});

const handleAddDevice = () => {
  router.push('/devices/new');
};

const handleEditDevice = (device) => {
  router.push(`/devices/${device.id}/edit`);
};

const handleDeleteDevice = async (device) => {
  if (!confirm('Czy na pewno chcesz usunąć to urządzenie?')) {
    return;
  }
  
  try {
    // TODO: Zaimplementować usuwanie urządzenia przez API
    devices.value = devices.value.filter(d => d.id !== device.id);
  } catch (error) {
    console.error('Błąd podczas usuwania urządzenia:', error);
  }
};
</script> 