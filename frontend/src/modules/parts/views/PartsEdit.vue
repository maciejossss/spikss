<template>
  <div class="parts-edit p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ isNew ? 'Nowa Część' : 'Edycja Części' }}</h1>
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
              <label class="block text-sm font-medium text-gray-700">Numer</label>
              <input
                v-model="form.number"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Kategoria</label>
              <select
                v-model="form.category"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Wybierz kategorię</option>
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Producent</label>
              <input
                v-model="form.manufacturer"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Stan Magazynowy</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Stan</label>
              <input
                v-model.number="form.stock"
                type="number"
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Minimalny Stan</label>
              <input
                v-model.number="form.min_stock"
                type="number"
                min="0"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Lokalizacja</label>
              <input
                v-model="form.location"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Cena (PLN)</label>
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h2 class="text-xl font-semibold mb-4">Specyfikacja</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Opis</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Parametry Techniczne</label>
              <textarea
                v-model="form.specifications"
                rows="4"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Uwagi</label>
              <textarea
                v-model="form.notes"
                rows="3"
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
const categories = ref([
  'Palniki',
  'Uszczelnienia',
  'Elektronika',
  'Automatyka',
  'Mechanika',
  'Inne'
]);

const isNew = computed(() => route.params.id === 'new');

const form = ref({
  name: '',
  number: '',
  category: '',
  manufacturer: '',
  stock: 0,
  min_stock: 0,
  location: '',
  price: 0,
  description: '',
  specifications: '',
  notes: ''
});

onMounted(async () => {
  if (!isNew.value) {
    try {
      loading.value = true;
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
        description: 'Dysza gazowa do palników przemysłowych',
        specifications: '- Średnica: 2.0 mm\n- Materiał: Stal nierdzewna\n- Ciśnienie robocze: do 6 bar',
        notes: 'Zalecana wymiana co 1000 godzin pracy'
      };
      Object.assign(form.value, data);
    } catch (error) {
      console.error('Błąd podczas ładowania danych części:', error);
    } finally {
      loading.value = false;
    }
  }
});

const handleSubmit = async () => {
  try {
    loading.value = true;
    // TODO: Zaimplementować zapisywanie części przez API
    router.push('/parts');
  } catch (error) {
    console.error('Błąd podczas zapisywania części:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script>