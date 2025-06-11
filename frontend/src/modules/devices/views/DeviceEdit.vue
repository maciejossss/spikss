<template>
  <div class="device-edit p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ isNew ? 'Nowe Urządzenie' : 'Edycja Urządzenia' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Informacje Podstawowe</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Nazwa</label>
              <input
                v-model="form.name"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Model</label>
              <input
                v-model="form.model"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Numer Seryjny</label>
              <input
                v-model="form.serialNumber"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <select
                v-model="form.status"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="active">Aktywne</option>
                <option value="inactive">Nieaktywne</option>
                <option value="service">W serwisie</option>
              </select>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Informacje o Kliencie</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Klient</label>
              <select
                v-model="form.client_id"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Wybierz klienta</option>
                <option v-for="client in clients" :key="client.id" :value="client.id">
                  {{ client.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Lokalizacja</label>
              <textarea
                v-model="form.location"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h2 class="text-xl font-semibold mb-4">Parametry Techniczne</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Specyfikacja</label>
              <textarea
                v-model="form.specifications"
                rows="4"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Notatki Serwisowe</label>
              <textarea
                v-model="form.service_notes"
                rows="4"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-4">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          @click="handleCancel"
        >
          Anuluj
        </button>
        <button
          type="submit"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          :disabled="loading"
        >
          {{ loading ? 'Zapisywanie...' : 'Zapisz' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const clients = ref([
  { id: 1, name: 'Firma ABC' },
  { id: 2, name: 'Firma XYZ' }
]);

const isNew = computed(() => route.params.id === 'new');

const form = ref({
  name: '',
  model: '',
  serialNumber: '',
  status: 'active',
  client_id: '',
  location: '',
  specifications: '',
  service_notes: ''
});

onMounted(async () => {
  if (!isNew.value) {
    try {
      loading.value = true;
      // TODO: Zaimplementować pobieranie danych urządzenia z API
      // Przykładowe dane
      const data = {
        id: route.params.id,
        name: 'Palnik gazowy XYZ',
        model: 'PG-2000',
        serialNumber: 'SN123456789',
        status: 'active',
        client_id: 1,
        location: 'Hala produkcyjna 1\nStanowisko 3',
        specifications: 'Moc: 200kW\nPaliwo: Gaz ziemny\nSterowanie: Automatyczne',
        service_notes: 'Ostatni przegląd: 2025-01-15\nWymiana dysz: 2024-12-01'
      };
      Object.assign(form.value, data);
    } catch (error) {
      console.error('Błąd podczas ładowania danych urządzenia:', error);
    } finally {
      loading.value = false;
    }
  }

  try {
    // TODO: Zaimplementować pobieranie listy klientów z API
  } catch (error) {
    console.error('Błąd podczas ładowania listy klientów:', error);
  }
});

const handleSubmit = async () => {
  try {
    loading.value = true;
    // TODO: Zaimplementować zapisywanie urządzenia przez API
    router.push('/devices');
  } catch (error) {
    console.error('Błąd podczas zapisywania urządzenia:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script> 