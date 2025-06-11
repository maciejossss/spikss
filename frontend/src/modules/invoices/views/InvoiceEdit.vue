<template>
  <div class="invoice-edit p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ isNew ? 'Nowa Faktura' : 'Edycja Faktury' }}</h1>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Informacje Podstawowe</h2>
          <div class="space-y-4">
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
              <label class="block text-sm font-medium text-gray-700">Data Wystawienia</label>
              <input
                v-model="form.issue_date"
                type="date"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Termin Płatności</label>
              <input
                v-model="form.due_date"
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
                required
              >
                <option value="draft">Szkic</option>
                <option value="issued">Wystawiona</option>
                <option value="paid">Opłacona</option>
                <option value="overdue">Przeterminowana</option>
                <option value="cancelled">Anulowana</option>
              </select>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Dane Klienta</h2>
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
            <div v-if="selectedClient">
              <div class="mt-4 space-y-2">
                <p class="text-sm text-gray-600">NIP: {{ selectedClient.tax_id }}</p>
                <p class="text-sm text-gray-600">{{ selectedClient.address }}</p>
                <p class="text-sm text-gray-600">{{ selectedClient.postal_code }} {{ selectedClient.city }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Pozycje Faktury</h2>
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              @click="addItem"
            >
              Dodaj Pozycję
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ilość</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cena jedn.</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wartość netto</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wartość brutto</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-if="form.items.length === 0">
                  <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    Brak pozycji na fakturze
                  </td>
                </tr>
                <tr v-for="(item, index) in form.items" :key="index" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      v-model="item.name"
                      type="text"
                      class="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="block w-32 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      v-model.number="item.unit_price"
                      type="number"
                      min="0"
                      step="0.01"
                      class="block w-32 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select
                      v-model="item.vat_rate"
                      class="block w-24 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      <option value="0.23">23%</option>
                      <option value="0.08">8%</option>
                      <option value="0.05">5%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatPrice(calculateNetValue(item)) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatPrice(calculateGrossValue(item)) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800"
                      @click="removeItem(index)"
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="4" class="px-6 py-4 text-right font-medium">Suma:</td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium">{{ formatPrice(calculateTotalNet) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium">{{ formatPrice(calculateTotalGross) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h2 class="text-xl font-semibold mb-4">Uwagi</h2>
          <div>
            <textarea
              v-model="form.notes"
              rows="3"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Dodatkowe informacje..."
            ></textarea>
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
const clients = ref([]);

const isNew = computed(() => route.params.id === 'new');

const form = ref({
  number: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'draft',
  client_id: '',
  items: [],
  notes: ''
});

const selectedClient = computed(() => {
  return clients.value.find(c => c.id === form.value.client_id);
});

const formatPrice = (price) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(price);
};

const calculateNetValue = (item) => {
  return item.quantity * item.unit_price;
};

const calculateGrossValue = (item) => {
  return calculateNetValue(item) * (1 + parseFloat(item.vat_rate));
};

const calculateTotalNet = computed(() => {
  return form.value.items.reduce((sum, item) => sum + calculateNetValue(item), 0);
});

const calculateTotalGross = computed(() => {
  return form.value.items.reduce((sum, item) => sum + calculateGrossValue(item), 0);
});

const addItem = () => {
  form.value.items.push({
    name: '',
    quantity: 1,
    unit_price: 0,
    vat_rate: '0.23'
  });
};

const removeItem = (index) => {
  form.value.items.splice(index, 1);
};

onMounted(async () => {
  try {
    // TODO: Zaimplementować pobieranie listy klientów z API
    clients.value = [
      {
        id: 1,
        name: 'Firma ABC',
        tax_id: '1234567890',
        address: 'ul. Przykładowa 1',
        postal_code: '00-001',
        city: 'Warszawa'
      }
    ];

    if (!isNew.value) {
      loading.value = true;
      // TODO: Zaimplementować pobieranie danych faktury z API
      const data = {
        id: route.params.id,
        number: 'FV/2025/001',
        issue_date: '2025-06-11',
        due_date: '2025-06-25',
        status: 'issued',
        client_id: 1,
        items: [
          {
            name: 'Serwis palnika gazowego',
            quantity: 1,
            unit_price: 500,
            vat_rate: '0.23'
          }
        ],
        notes: 'Termin płatności: 14 dni'
      };
      Object.assign(form.value, data);
      loading.value = false;
    }
  } catch (error) {
    console.error('Błąd podczas ładowania danych:', error);
    loading.value = false;
  }
});

const handleSubmit = async () => {
  try {
    loading.value = true;
    // TODO: Zaimplementować zapisywanie faktury przez API
    router.push('/invoices');
  } catch (error) {
    console.error('Błąd podczas zapisywania faktury:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};
</script> 