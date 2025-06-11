<template>
  <div class="client-edit p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ isNew ? 'Nowy Klient' : 'Edycja Klienta' }}</h1>
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
              <label class="block text-sm font-medium text-gray-700">Osoba Kontaktowa</label>
              <input
                v-model="form.contact_person"
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Telefon</label>
              <input
                v-model="form.phone"
                type="tel"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Email</label>
              <input
                v-model="form.email"
                type="email"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Adres</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700">Adres</label>
            <textarea
              v-model="form.address"
              rows="4"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h2 class="text-xl font-semibold mb-4">Notatki</h2>
          <textarea
            v-model="form.notes"
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          ></textarea>
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

const isNew = computed(() => route.params.id === 'new');

const form = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
});

onMounted(async () => {
  if (!isNew.value) {
    try {
      loading.value = true;
      // TODO: Zaimplementować pobieranie danych klienta z API
      // Przykładowe dane
      const data = {
        id: route.params.id,
        name: 'Nazwa Klienta',
        contact_person: 'Jan Kowalski',
        phone: '+48 123 456 789',
        email: 'jan@example.com',
        address: 'ul. Przykładowa 123\n00-000 Warszawa',
        notes: 'Przykładowe notatki o kliencie'
      };
      Object.assign(form.value, data);
    } catch (error) {
      console.error('Błąd podczas ładowania danych klienta:', error);
    } finally {
      loading.value = false;
    }
  }
});

const handleSubmit = async () => {
  try {
    loading.value = true;
    // TODO: Zaimplementować zapisywanie klienta przez API
    router.push('/clients');
  } catch (error) {
    console.error('Błąd podczas zapisywania klienta:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script> 