<template>
  <div class="invoices-list">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Faktur</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="handleAddInvoice"
      >
        Nowa Faktura
      </button>
    </header>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klient</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zlecenie</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kwota</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="px-6 py-4">Ładowanie...</td>
          </tr>
          <tr v-else-if="invoices.length === 0" class="text-center">
            <td colspan="7" class="px-6 py-4">Brak faktur</td>
          </tr>
          <tr v-for="invoice in invoices" :key="invoice.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">{{ invoice.number }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(invoice.date) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ invoice.client_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ invoice.service_number }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ formatPrice(invoice.total_amount) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-yellow-100 text-yellow-800': invoice.status === 'pending',
                'bg-green-100 text-green-800': invoice.status === 'paid',
                'bg-red-100 text-red-800': invoice.status === 'overdue'
              }">
                {{ getStatusLabel(invoice.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleEditInvoice(invoice)"
              >
                Edytuj
              </button>
              <button
                class="text-blue-600 hover:text-blue-800 mr-3"
                @click="handleDownloadInvoice(invoice)"
              >
                Pobierz
              </button>
              <button
                class="text-red-600 hover:text-red-800"
                @click="handleDeleteInvoice(invoice)"
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
const invoices = ref([]);
const loading = ref(true);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pl-PL');
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(price);
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Oczekująca',
    paid: 'Opłacona',
    overdue: 'Przeterminowana'
  };
  return labels[status] || status;
};

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie faktur z API
    // Przykładowe dane
    invoices.value = [
      {
        id: 1,
        number: 'FV/2025/001',
        date: '2025-06-11',
        client_name: 'Firma ABC',
        service_number: 'SRV/2025/001',
        total_amount: 1234.56,
        status: 'pending'
      },
      {
        id: 2,
        number: 'FV/2025/002',
        date: '2025-06-01',
        client_name: 'Firma XYZ',
        service_number: 'SRV/2025/002',
        total_amount: 2345.67,
        status: 'paid'
      }
    ];
    loading.value = false;
  } catch (error) {
    console.error('Błąd podczas pobierania faktur:', error);
    loading.value = false;
  }
});

const handleAddInvoice = () => {
  router.push('/invoices/new');
};

const handleEditInvoice = (invoice) => {
  router.push(`/invoices/${invoice.id}/edit`);
};

const handleDownloadInvoice = async (invoice) => {
  try {
    // TODO: Zaimplementować pobieranie PDF faktury z API
    console.log('Pobieranie faktury:', invoice.number);
  } catch (error) {
    console.error('Błąd podczas pobierania faktury:', error);
  }
};

const handleDeleteInvoice = async (invoice) => {
  if (!confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
    return;
  }
  
  try {
    // TODO: Zaimplementować usuwanie faktury przez API
    invoices.value = invoices.value.filter(i => i.id !== invoice.id);
  } catch (error) {
    console.error('Błąd podczas usuwania faktury:', error);
  }
};
</script> 