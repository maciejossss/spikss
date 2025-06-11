<template>
  <div class="invoice-details p-6">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Szczegóły Faktury</h1>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="handleEdit"
        >
          Edytuj
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="handleDownload"
        >
          Pobierz PDF
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
            <label class="text-sm text-gray-600">Numer Faktury</label>
            <p class="font-medium">{{ invoice.number }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Data Wystawienia</label>
            <p class="font-medium">{{ formatDate(invoice.date) }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Termin Płatności</label>
            <p class="font-medium">{{ formatDate(invoice.due_date) }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Status</label>
            <p class="font-medium">
              <span :class="{
                'px-2 py-1 rounded-full text-xs font-medium': true,
                'bg-yellow-100 text-yellow-800': invoice.status === 'pending',
                'bg-green-100 text-green-800': invoice.status === 'paid',
                'bg-red-100 text-red-800': invoice.status === 'overdue'
              }">
                {{ getStatusLabel(invoice.status) }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Informacje o Kliencie</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Nazwa</label>
            <p class="font-medium">{{ invoice.client_name }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">NIP</label>
            <p class="font-medium">{{ invoice.client_tax_id }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Adres</label>
            <p class="font-medium whitespace-pre-line">{{ invoice.client_address }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Szczegóły Zlecenia</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Numer Zlecenia</label>
            <p class="font-medium">{{ invoice.service_number }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Opis Usługi</label>
            <p class="whitespace-pre-line">{{ invoice.service_description }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Pozycje Faktury</h2>
        <div class="space-y-4">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Lp.</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Nazwa</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Ilość</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Cena jedn.</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">VAT</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Wartość netto</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Wartość brutto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="(item, index) in invoice.items" :key="index" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ index + 1 }}</td>
                <td class="px-4 py-2">{{ item.name }}</td>
                <td class="px-4 py-2">{{ item.quantity }}</td>
                <td class="px-4 py-2">{{ formatPrice(item.unit_price) }}</td>
                <td class="px-4 py-2">{{ item.vat_rate }}%</td>
                <td class="px-4 py-2">{{ formatPrice(item.net_amount) }}</td>
                <td class="px-4 py-2">{{ formatPrice(item.gross_amount) }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50">
              <tr>
                <td colspan="5" class="px-4 py-2 text-right font-medium">Razem:</td>
                <td class="px-4 py-2 font-medium">{{ formatPrice(invoice.total_net_amount) }}</td>
                <td class="px-4 py-2 font-medium">{{ formatPrice(invoice.total_gross_amount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 class="text-xl font-semibold mb-4">Płatność</h2>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">Metoda Płatności</label>
            <p class="font-medium">{{ invoice.payment_method }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Numer Konta</label>
            <p class="font-medium">{{ invoice.bank_account }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-600">Uwagi</label>
            <p class="whitespace-pre-line">{{ invoice.notes || 'Brak uwag' }}</p>
          </div>
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
const invoice = ref({});
const loading = ref(true);
const error = ref(null);

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
    // TODO: Zaimplementować pobieranie danych faktury z API
    // Przykładowe dane
    invoice.value = {
      id: route.params.id,
      number: 'FV/2025/001',
      date: '2025-06-11',
      due_date: '2025-06-25',
      status: 'pending',
      client_name: 'Firma ABC',
      client_tax_id: '1234567890',
      client_address: 'ul. Przykładowa 1\n00-001 Warszawa',
      service_number: 'SRV/2025/001',
      service_description: 'Serwis i naprawa palnika gazowego',
      items: [
        {
          name: 'Usługa serwisowa',
          quantity: 1,
          unit_price: 500,
          vat_rate: 23,
          net_amount: 500,
          gross_amount: 615
        },
        {
          name: 'Dysza gazowa',
          quantity: 2,
          unit_price: 199.99,
          vat_rate: 23,
          net_amount: 399.98,
          gross_amount: 491.98
        },
        {
          name: 'Uszczelka',
          quantity: 4,
          unit_price: 29.99,
          vat_rate: 23,
          net_amount: 119.96,
          gross_amount: 147.55
        }
      ],
      total_net_amount: 1019.94,
      total_gross_amount: 1254.53,
      payment_method: 'Przelew bankowy',
      bank_account: '12 3456 7890 1234 5678 9012 3456',
      notes: 'Termin płatności: 14 dni'
    };
    loading.value = false;
  } catch (err) {
    error.value = 'Nie udało się załadować danych faktury';
    loading.value = false;
    console.error('Błąd podczas ładowania danych faktury:', err);
  }
});

const handleEdit = () => {
  router.push(`/invoices/${route.params.id}/edit`);
};

const handleDownload = async () => {
  try {
    // TODO: Zaimplementować pobieranie PDF faktury z API
    console.log('Pobieranie faktury:', invoice.value.number);
  } catch (err) {
    error.value = 'Nie udało się pobrać faktury';
    console.error('Błąd podczas pobierania faktury:', err);
  }
};

const handleDelete = async () => {
  if (!confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
    return;
  }

  try {
    // TODO: Zaimplementować usuwanie faktury przez API
    router.push('/invoices');
  } catch (err) {
    error.value = 'Nie udało się usunąć faktury';
    console.error('Błąd podczas usuwania faktury:', err);
  }
};
</script> 