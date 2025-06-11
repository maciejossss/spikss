<template>
  <div class="client-details p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Szczegóły Klienta</h1>
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
            <p class="font-medium">{{ client.name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Osoba Kontaktowa</label>
            <p class="font-medium">{{ client.contact_person }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Telefon</label>
            <p class="font-medium">{{ client.phone }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Email</label>
            <p class="font-medium">{{ client.email }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Adres</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Adres</label>
            <p class="font-medium whitespace-pre-line">{{ client.address }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Notatki</h2>
        <p class="whitespace-pre-line">{{ client.notes || 'Brak notatek' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const client = ref({});
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie danych klienta z API
    // Przykładowe dane
    client.value = {
      id: route.params.id,
      name: 'Nazwa Klienta',
      contact_person: 'Jan Kowalski',
      phone: '+48 123 456 789',
      email: 'jan@example.com',
      address: 'ul. Przykładowa 123\n00-000 Warszawa',
      notes: 'Przykładowe notatki o kliencie'
    };
    loading.value = false;
  } catch (err) {
    error.value = 'Nie udało się załadować danych klienta';
    loading.value = false;
    console.error('Błąd podczas ładowania danych klienta:', err);
  }
});

const handleEdit = () => {
  router.push(`/clients/${route.params.id}/edit`);
};

const handleDelete = async () => {
  if (!confirm('Czy na pewno chcesz usunąć tego klienta?')) {
    return;
  }

  try {
    // TODO: Zaimplementować usuwanie klienta przez API
    router.push('/clients');
  } catch (err) {
    error.value = 'Nie udało się usunąć klienta';
    console.error('Błąd podczas usuwania klienta:', err);
  }
};
</script> 