<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold">Klienci</h1>
      <button 
        @click="showAddClientModal = true"
        class="btn btn-primary"
      >
        Dodaj klienta
      </button>
    </div>

    <!-- Stats -->
    <ClientStats 
      :stats="clientStats"
      class="mb-8"
    />

    <!-- Filters -->
    <ClientFilters
      :initial-filters="filters"
      @filter-change="handleFilterChange"
      class="mb-8"
    />

    <!-- Client List -->
    <ClientList
      :clients="filteredClients"
      :loading="clientStore.loading"
      :error="clientStore.error"
      @edit="handleEditClient"
      @delete="handleDeleteClient"
    />

    <!-- Add/Edit Client Modal -->
    <div v-if="showAddClientModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ clientStore.currentClient ? 'Edytuj klienta' : 'Dodaj nowego klienta' }}
        </h3>
        <ClientForm
          :initial-data="clientStore.currentClient"
          :loading="clientStore.loading"
          @submit="handleSubmitClient"
          @cancel="handleCancelModal"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Potwierdź usunięcie</h3>
        <p class="py-4">
          Czy na pewno chcesz usunąć tego klienta? Tej operacji nie można cofnąć.
        </p>
        <div class="modal-action">
          <button 
            class="btn btn-ghost"
            @click="showDeleteModal = false"
          >
            Anuluj
          </button>
          <button 
            class="btn btn-error"
            :class="{ 'loading': clientStore.loading }"
            @click="confirmDelete"
          >
            Usuń
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClientStore } from '../stores/clientStore'
import { useToast } from '@/composables/useToast'
import { Client, ClientFilters, ClientFormData } from '../types/client.types'

// Components
import ClientForm from '../components/ClientForm.vue'
import ClientList from '../components/ClientList.vue'
import ClientStats from '../components/ClientStats.vue'
import ClientFilters from '../components/ClientFilters.vue'

const clientStore = useClientStore()
const toast = useToast()

// State
const showAddClientModal = ref(false)
const showDeleteModal = ref(false)
const clientToDelete = ref<Client | null>(null)
const filters = ref<ClientFilters>({
  search: '',
  type: 'all',
  status: 'all'
})

// Computed
const filteredClients = computed(() => {
  let filtered = [...clientStore.clients] as Client[]

  // Apply search
  if (filters.value.search) {
    const query = filters.value.search.toLowerCase()
    filtered = filtered.filter(client => 
      client.company_name?.toLowerCase().includes(query) ||
      client.contact_person.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    )
  }

  // Apply type filter
  if (filters.value.type !== 'all') {
    filtered = filtered.filter(client => client.client_type === filters.value.type)
  }

  // Apply status filter
  if (filters.value.status !== 'all') {
    filtered = filtered.filter(client => client.status === filters.value.status)
  }

  return filtered
})

const clientStats = computed(() => {
  const total = clientStore.clients.length
  const active = clientStore.clients.filter(c => c.status === 'active').length
  const business = clientStore.clients.filter(c => c.client_type === 'business').length
  const individual = clientStore.clients.filter(c => c.client_type === 'individual').length
  
  // TODO: Implement actual trend calculation
  const totalTrend = 5 

  return {
    total,
    active,
    business,
    individual,
    totalTrend
  }
})

// Methods
const handleFilterChange = (newFilters: ClientFilters) => {
  filters.value = newFilters
}

const handleEditClient = (client: Client) => {
  clientStore.setCurrentClient(client)
  showAddClientModal.value = true
}

const handleDeleteClient = (client: Client) => {
  clientToDelete.value = client
  showDeleteModal.value = true
}

const handleSubmitClient = async (formData: ClientFormData) => {
  try {
    if (clientStore.currentClient) {
      await clientStore.updateClient(clientStore.currentClient.id, formData)
      toast.success('Klient został zaktualizowany')
    } else {
      await clientStore.createClient(formData)
      toast.success('Klient został dodany')
    }
    handleCancelModal()
  } catch (error) {
    toast.error(error as Error)
  }
}

const handleCancelModal = () => {
  showAddClientModal.value = false
  clientStore.setCurrentClient(null)
  clientStore.clearError()
}

const confirmDelete = async () => {
  if (!clientToDelete.value) return

  try {
    await clientStore.deleteClient(clientToDelete.value.id)
    toast.success('Klient został usunięty')
    showDeleteModal.value = false
    clientToDelete.value = null
  } catch (error) {
    toast.error(error as Error)
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await clientStore.fetchClients()
  } catch (error) {
    toast.error(error as Error)
  }
})
</script> 