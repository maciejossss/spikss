<template>
  <div class="clients-list">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Klientów</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleAddClient"
      >
        Dodaj Klienta
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Osoba kontaktowa</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="5" class="px-6 py-4">Ładowanie...</td>
          </tr>
          <tr v-else-if="clients.length === 0" class="text-center">
            <td colspan="5" class="px-6 py-4">Brak klientów</td>
          </tr>
          <tr v-for="client in clients" :key="client.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">{{ client.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ client.contact_person }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ client.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ client.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleEditClient(client)"
              >
                Edytuj
              </button>
              <button
                class="text-red-600 hover:text-red-800"
                @click="handleDeleteClient(client)"
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
const clients = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie klientów z API
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas pobierania klientów:', error);
    loading.value = false;
  }
});

const handleAddClient = () => {
  router.push('/clients/new');
};

const handleEditClient = (client) => {
  router.push(`/clients/${client.id}/edit`);
};

const handleDeleteClient = async (client) => {
  if (!confirm('Czy na pewno chcesz usunąć tego klienta?')) {
    return;
  }
  
  try {
    // TODO: Zaimplementować usuwanie klienta przez API
    clients.value = clients.value.filter(c => c.id !== client.id);
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error);
  }
};
</script> 