<template>
  <div class="parts-list">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Części</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleAddPart"
      >
        Dodaj Część
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategoria</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="6" class="px-6 py-4">Ładowanie...</td>
          </tr>
          <tr v-else-if="parts.length === 0" class="text-center">
            <td colspan="6" class="px-6 py-4">Brak części</td>
          </tr>
          <tr v-for="part in parts" :key="part.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">{{ part.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ part.number }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ part.category }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-green-100 text-green-800': part.stock > part.min_stock,
                'bg-yellow-100 text-yellow-800': part.stock <= part.min_stock && part.stock > 0,
                'bg-red-100 text-red-800': part.stock === 0
              }">
                {{ part.stock }} szt.
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatPrice(part.price) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleEditPart(part)"
              >
                Edytuj
              </button>
              <button
                class="text-red-600 hover:text-red-800"
                @click="handleDeletePart(part)"
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
const parts = ref([]);
const loading = ref(true);

const formatPrice = (price) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(price);
};

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie części z API
    // Przykładowe dane
    parts.value = [
      {
        id: 1,
        name: 'Dysza gazowa',
        number: 'DG-2000',
        category: 'Palniki',
        stock: 15,
        min_stock: 5,
        price: 199.99
      },
      {
        id: 2,
        name: 'Uszczelka',
        number: 'U-100',
        category: 'Uszczelnienia',
        stock: 3,
        min_stock: 10,
        price: 29.99
      }
    ];
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas pobierania części:', error);
    loading.value = false;
  }
});

const handleAddPart = () => {
  router.push('/parts/new');
};

const handleEditPart = (part) => {
  router.push(`/parts/${part.id}/edit`);
};

const handleDeletePart = async (part) => {
  if (!confirm('Czy na pewno chcesz usunąć tę część?')) {
    return;
  }
  
  try {
    // TODO: Zaimplementować usuwanie części przez API
    parts.value = parts.value.filter(p => p.id !== part.id);
  } catch (error) {
    console.error('Błąd podczas usuwania części:', error);
  }
};
</script>