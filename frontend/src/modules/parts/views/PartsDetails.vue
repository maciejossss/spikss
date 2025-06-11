<template>
  <div class="parts-details p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Szczegóły Części</h1>
      <div class="space-x-4">
        <button
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
      <p>Ładowanie...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Informacje podstawowe -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Informacje Podstawowe</h2>
        <dl class="space-y-4">
          <div>
            <dt class="text-sm font-medium text-gray-500">Nazwa</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.name }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Numer</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.number }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Kategoria</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.category }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Producent</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.manufacturer }}</dd>
          </div>
        </dl>
      </div>

      <!-- Stan magazynowy -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Stan Magazynowy</h2>
        <dl class="space-y-4">
          <div>
            <dt class="text-sm font-medium text-gray-500">Stan</dt>
            <dd class="mt-1 text-sm text-gray-900">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-green-100 text-green-800': part.stock > part.min_stock,
                'bg-yellow-100 text-yellow-800': part.stock <= part.min_stock && part.stock > 0,
                'bg-red-100 text-red-800': part.stock === 0
              }">
                {{ part.stock }} szt.
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Minimalny Stan</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.min_stock }} szt.</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Lokalizacja</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ part.location }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Cena</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ formatPrice(part.price) }}</dd>
          </div>
        </dl>
      </div>

      <!-- Historia -->
      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Historia Użycia</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zlecenie</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ilość</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="part.history.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">
                  Brak historii użycia
                </td>
              </tr>
              <tr v-for="record in part.history" :key="record.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(record.date) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.service_number }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.quantity }} szt.
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.type === 'used' ? 'Użycie' : 'Dostawa' }}
                </td>
              </tr>
            </tbody>
          </table>
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
const loading = ref(true);
const part = ref({
  name: '',
  number: '',
  category: '',
  manufacturer: '',
  stock: 0,
  min_stock: 0,
  location: '',
  price: 0,
  history: []
});

const formatPrice = (price) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(price);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pl-PL');
};

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie danych części z API
    // Przykładowe dane
    const data = {
      id: route.params.id,
      name: 'Dysza gazowa',
      number: 'DG-2000',
      category: 'Palniki',
      manufacturer: 'GasTech',
      stock: 15,
      min_stock: 5,
      location: 'Magazyn A, Regał 3, Półka 2',
      price: 199.99,
      history: [
        {
          id: 1,
          date: '2025-06-11',
          service_number: 'SRV/2025/001',
          quantity: 1,
          type: 'used'
        }
      ]
    };
    Object.assign(part.value, data);
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas ładowania danych części:', error);
    loading.value = false;
  }
});

const handleEdit = () => {
  router.push(`/parts/${route.params.id}/edit`);
};

const handleDelete = async () => {
  if (!confirm('Czy na pewno chcesz usunąć tę część?')) {
    return;
  }

  try {
    // TODO: Zaimplementować usuwanie części przez API
    router.push('/parts');
  } catch (error) {
    console.error('Błąd podczas usuwania części:', error);
  }
};
</script> 