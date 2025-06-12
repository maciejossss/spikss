<template>
  <div class="clients-list p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Lista Klientów</h1>
      <button
        v-if="canWrite"
        @click="handleAddClient"
        class="btn btn-primary"
      >
        <Plus class="w-4 h-4 mr-2" />
        Dodaj Klienta
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="flex gap-4 mb-6">
      <div class="flex-1">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Szukaj klientów..."
            class="input input-bordered w-full pl-10"
          />
          <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>
      
      <!-- Filters -->
      <div class="flex gap-2">
        <select v-model="filterType" class="select select-bordered">
          <option value="">Typ klienta</option>
          <option value="individual">Osoba prywatna</option>
          <option value="business">Firma</option>
        </select>
        
        <select v-model="filterPriority" class="select select-bordered">
          <option value="">Priorytet</option>
          <option value="standard">Standardowy</option>
          <option value="high">Wysoki</option>
          <option value="urgent">Pilny</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Nazwa / Firma</th>
            <th>Kontakt</th>
            <th>Adres</th>
            <th>Status</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="text-center">
            <td colspan="5" class="py-8">
              <div class="flex justify-center items-center">
                <div class="loading loading-spinner loading-lg text-primary"></div>
              </div>
            </td>
          </tr>
          <tr v-else-if="clients.length === 0" class="text-center">
            <td colspan="5" class="py-8">
              <div class="flex flex-col items-center gap-2">
                <Users class="w-12 h-12 text-gray-400" />
                <p class="text-gray-500">Brak klientów</p>
                <button
                  v-if="canWrite"
                  @click="handleAddClient"
                  class="btn btn-primary btn-sm mt-2"
                >
                  Dodaj pierwszego klienta
                </button>
              </div>
            </td>
          </tr>
          <tr v-for="client in clients" :key="client.id" class="hover">
            <td>
              <div class="font-medium">{{ client.company_name || client.contact_person }}</div>
              <div v-if="client.company_name" class="text-sm text-gray-500">
                {{ client.contact_person }}
              </div>
            </td>
            <td>
              <div class="flex flex-col">
                <a 
                  :href="'tel:' + client.phone"
                  class="link link-hover flex items-center gap-1"
                >
                  <Phone class="w-4 h-4" />
                  {{ client.phone }}
                </a>
                <a 
                  v-if="client.email"
                  :href="'mailto:' + client.email"
                  class="link link-hover flex items-center gap-1"
                >
                  <Mail class="w-4 h-4" />
                  {{ client.email }}
                </a>
              </div>
            </td>
            <td>
              <div v-if="client.address_street || client.address_city" class="flex items-start gap-1">
                <MapPin class="w-4 h-4 mt-1" />
                <div>
                  <div>{{ client.address_street }}</div>
                  <div>{{ client.address_postal_code }} {{ client.address_city }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <span 
                  :class="[
                    'badge',
                    client.priority_level === 'urgent' ? 'badge-error' :
                    client.priority_level === 'high' ? 'badge-warning' :
                    'badge-success'
                  ]"
                >
                  {{ 
                    client.priority_level === 'urgent' ? 'Pilny' :
                    client.priority_level === 'high' ? 'Wysoki' :
                    'Standardowy'
                  }}
                </span>
                <span 
                  v-if="client.client_type"
                  class="badge badge-ghost"
                >
                  {{ client.client_type === 'business' ? 'Firma' : 'Prywatny' }}
                </span>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <button
                  @click="handleEditClient(client)"
                  class="btn btn-ghost btn-sm"
                  title="Edytuj"
                >
                  <Edit2 class="w-4 h-4" />
                </button>
                <button
                  @click="handleDeleteClient(client)"
                  class="btn btn-ghost btn-sm text-error"
                  title="Usuń"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Client Modal -->
    <ClientModal
      :is-open="showModal"
      :client="selectedClient"
      @close="handleCloseModal"
      @saved="handleClientSaved"
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Potwierdź usunięcie</h3>
        <p class="py-4">
          Czy na pewno chcesz usunąć klienta 
          <span class="font-semibold">{{ clientToDelete?.company_name || clientToDelete?.contact_person }}</span>?
          <br>
          Ta operacja jest nieodwracalna.
        </p>
        <div class="modal-action">
          <button @click="showDeleteModal = false" class="btn">Anuluj</button>
          <button @click="confirmDelete" class="btn btn-error">Usuń</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '@/stores/auth';
import ClientModal from '@/components/modals/ClientModal.vue';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  Edit2,
  Trash2
} from 'lucide-vue-next';

const router = useRouter();
const clientStore = useClientStore();
const authStore = useAuthStore();

// State
const clients = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const filterType = ref('');
const filterPriority = ref('');
const showModal = ref(false);
const showDeleteModal = ref(false);
const selectedClient = ref(null);
const clientToDelete = ref(null);

// Computed
const canWrite = authStore.hasModulePermission('clients', 'write');

// Watch for filter changes
watch([searchQuery, filterType, filterPriority], () => {
  loadClients();
}, { debounce: 300 });

onMounted(async () => {
  await loadClients();
});

async function loadClients() {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value);
    }
    if (filterType.value) {
      params.append('client_type', filterType.value);
    }
    if (filterPriority.value) {
      params.append('priority_level', filterPriority.value);
    }
    
    await clientStore.fetchClients(params);
    clients.value = clientStore.clients;
  } catch (error) {
    console.error('Błąd podczas pobierania klientów:', error);
  } finally {
    loading.value = false;
  }
}

function handleAddClient() {
  selectedClient.value = null;
  showModal.value = true;
}

function handleEditClient(client) {
  selectedClient.value = client;
  showModal.value = true;
}

function handleDeleteClient(client) {
  clientToDelete.value = client;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!clientToDelete.value) return;
  
  try {
    await clientStore.deleteClient(clientToDelete.value.id);
    showDeleteModal.value = false;
    clientToDelete.value = null;
    await loadClients();
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error);
  }
}

function handleCloseModal() {
  showModal.value = false;
  selectedClient.value = null;
}

async function handleClientSaved() {
  showModal.value = false;
  selectedClient.value = null;
  await loadClients();
}
</script> 