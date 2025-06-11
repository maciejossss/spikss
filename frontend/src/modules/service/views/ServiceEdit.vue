<template>
  <div class="service-edit p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ isNew ? 'Nowe Zlecenie Serwisowe' : 'Edycja Zlecenia Serwisowego' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Informacje Podstawowe</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Data</label>
              <input
                v-model="form.date"
                type="date"
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
                <option value="pending">Oczekujące</option>
                <option value="in_progress">W realizacji</option>
                <option value="completed">Zakończone</option>
                <option value="cancelled">Anulowane</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Technik</label>
              <select
                v-model="form.technician_id"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Wybierz technika</option>
                <option v-for="technician in technicians" :key="technician.id" :value="technician.id">
                  {{ technician.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Klient i Urządzenie</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Klient</label>
              <select
                v-model="form.client_id"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                @change="handleClientChange"
              >
                <option value="">Wybierz klienta</option>
                <option v-for="client in clients" :key="client.id" :value="client.id">
                  {{ client.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Urządzenie</label>
              <select
                v-model="form.device_id"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Wybierz urządzenie</option>
                <option v-for="device in devices" :key="device.id" :value="device.id">
                  {{ device.name }} ({{ device.model }})
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
          <h2 class="text-xl font-semibold mb-4">Szczegóły Serwisu</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Opis Problemu</label>
              <textarea
                v-model="form.problem_description"
                rows="4"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Wykonane Czynności</label>
              <textarea
                v-model="form.work_description"
                rows="4"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Użyte Części</h2>
            <button
              type="button"
              class="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              @click="handleAddPart"
            >
              Dodaj Część
            </button>
          </div>
          <div class="space-y-4">
            <div v-if="form.parts.length === 0" class="text-center py-4 text-gray-500">
              Brak dodanych części
            </div>
            <div v-else class="space-y-4">
              <div v-for="(part, index) in form.parts" :key="index" class="flex gap-4 items-start">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700">Nazwa</label>
                  <input
                    v-model="part.name"
                    type="text"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700">Numer</label>
                  <input
                    v-model="part.number"
                    type="text"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div class="w-32">
                  <label class="block text-sm font-medium text-gray-700">Ilość</label>
                  <input
                    v-model.number="part.quantity"
                    type="number"
                    min="1"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="button"
                  class="mt-6 px-2 py-1 text-red-600 hover:text-red-800"
                  @click="handleRemovePart(index)"
                >
                  Usuń
                </button>
              </div>
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
const devices = ref([]);
const technicians = ref([
  { id: 1, name: 'Jan Kowalski' },
  { id: 2, name: 'Anna Nowak' }
]);

const isNew = computed(() => route.params.id === 'new');

const form = ref({
  date: new Date().toISOString().split('T')[0],
  status: 'pending',
  technician_id: '',
  client_id: '',
  device_id: '',
  location: '',
  problem_description: '',
  work_description: '',
  parts: []
});

const handleClientChange = async () => {
  if (!form.value.client_id) {
    devices.value = [];
    form.value.device_id = '';
    return;
  }

  try {
    // TODO: Zaimplementować pobieranie urządzeń klienta z API
    devices.value = [
      { id: 1, name: 'Palnik gazowy XYZ', model: 'PG-2000' },
      { id: 2, name: 'Palnik gazowy ABC', model: 'PG-1000' }
    ];
  } catch (error) {
    console.error('Błąd podczas pobierania urządzeń klienta:', error);
  }
};

const handleAddPart = () => {
  form.value.parts.push({
    name: '',
    number: '',
    quantity: 1
  });
};

const handleRemovePart = (index) => {
  form.value.parts.splice(index, 1);
};

onMounted(async () => {
  if (!isNew.value) {
    try {
      loading.value = true;
      // TODO: Zaimplementować pobieranie danych zlecenia z API
      // Przykładowe dane
      const data = {
        id: route.params.id,
        date: '2025-06-11',
        status: 'in_progress',
        technician_id: 1,
        client_id: 1,
        device_id: 1,
        location: 'Hala produkcyjna 1\nStanowisko 3',
        problem_description: 'Nieregularna praca palnika, spadki ciśnienia gazu',
        work_description: '1. Sprawdzenie układu zasilania\n2. Wymiana dysz\n3. Kalibracja',
        parts: [
          { name: 'Dysza gazowa', number: 'DG-2000', quantity: 2 },
          { name: 'Uszczelka', number: 'U-100', quantity: 4 }
        ]
      };
      Object.assign(form.value, data);
      await handleClientChange();
    } catch (error) {
      console.error('Błąd podczas ładowania danych zlecenia:', error);
    } finally {
      loading.value = false;
    }
  }

  try {
    // TODO: Zaimplementować pobieranie listy klientów i techników z API
  } catch (error) {
    console.error('Błąd podczas ładowania danych:', error);
  }
});

const handleSubmit = async () => {
  try {
    loading.value = true;
    // TODO: Zaimplementować zapisywanie zlecenia przez API
    router.push('/service');
  } catch (error) {
    console.error('Błąd podczas zapisywania zlecenia:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script> 