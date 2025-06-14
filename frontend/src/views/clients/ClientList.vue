<template>
  <div class="bg-white shadow sm:rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-900">Klienci</h1>
          <p class="mt-2 text-sm text-gray-700">Lista wszystkich klientów w systemie.</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            @click="openNewClientModal"
          >
            Dodaj klienta
          </button>
        </div>
      </div>

      <!-- Search and filters -->
      <div class="mt-4 flex space-x-4">
        <div class="flex-1">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Szukaj klientów..."
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div class="w-48">
          <select
            v-model="selectedType"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Wszystkie typy</option>
            <option value="business">Firmy</option>
            <option value="individual">Osoby prywatne</option>
          </select>
        </div>
      </div>

      <!-- Clients table -->
      <div class="mt-8 flex flex-col">
        <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      v-for="header in tableHeaders"
                      :key="header.key"
                      scope="col"
                      class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      {{ header.label }}
                    </th>
                    <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span class="sr-only">Akcje</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-if="isLoading" class="animate-pulse">
                    <td
                      :colspan="tableHeaders.length + 1"
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                    >
                      Ładowanie...
                    </td>
                  </tr>
                  <tr v-else-if="filteredClients.length === 0">
                    <td
                      :colspan="tableHeaders.length + 1"
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"
                    >
                      Brak klientów do wyświetlenia
                    </td>
                  </tr>
                  <tr
                    v-for="client in filteredClients"
                    :key="client.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ client.name }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ client.email }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ client.phone }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ client.type === 'business' ? 'Firma' : 'Osoba prywatna' }}
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        @click="editClient(client)"
                        class="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edytuj
                      </button>
                      <button
                        @click="deleteClient(client)"
                        class="text-red-600 hover:text-red-900"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New/Edit Client Modal -->
    <Modal v-if="showModal" @close="closeModal">
      <template #title>
        {{ isEditing ? 'Edytuj klienta' : 'Dodaj nowego klienta' }}
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Nazwa</label>
            <input
              type="text"
              id="name"
              v-model="form.name"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              v-model="form.email"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              id="phone"
              v-model="form.phone"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700">Typ</label>
            <select
              id="type"
              v-model="form.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="business">Firma</option>
              <option value="individual">Osoba prywatna</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <button
          type="button"
          class="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          @click="closeModal"
        >
          Anuluj
        </button>
        <button
          type="submit"
          class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          @click="handleSubmit"
        >
          {{ isEditing ? 'Zapisz zmiany' : 'Dodaj klienta' }}
        </button>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-if="showDeleteModal" @close="closeDeleteModal">
      <template #title>
        Potwierdź usunięcie
      </template>
      <template #content>
        <p class="text-sm text-gray-500">
          Czy na pewno chcesz usunąć tego klienta? Tej operacji nie można cofnąć.
        </p>
      </template>
      <template #footer>
        <button
          type="button"
          class="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          @click="closeDeleteModal"
        >
          Anuluj
        </button>
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          @click="confirmDelete"
        >
          Usuń
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import Modal from '@/components/ui/Modal.vue'
import { useClientStore } from '@/stores/clients'

const clientStore = useClientStore()
const toast = useToast()

// State
const clients = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedType = ref('')
const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const selectedClient = ref(null)
const form = ref({
  name: '',
  email: '',
  phone: '',
  type: 'business'
})

// Table configuration
const tableHeaders = [
  { key: 'name', label: 'Nazwa' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefon' },
  { key: 'type', label: 'Typ' }
]

// Computed
const filteredClients = computed(() => {
  return clients.value
    .filter(client => {
      const matchesSearch = !searchQuery.value || 
        client.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.value.toLowerCase())
      const matchesType = !selectedType.value || client.type === selectedType.value
      return matchesSearch && matchesType
    })
})

// Methods
async function fetchClients() {
  try {
    isLoading.value = true
    const response = await clientStore.fetchClients()
    clients.value = response
  } catch (error) {
    toast.error('Błąd podczas pobierania listy klientów')
  } finally {
    isLoading.value = false
  }
}

function openNewClientModal() {
  isEditing.value = false
  form.value = {
    name: '',
    email: '',
    phone: '',
    type: 'business'
  }
  showModal.value = true
}

function editClient(client) {
  isEditing.value = true
  selectedClient.value = client
  form.value = { ...client }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  form.value = {
    name: '',
    email: '',
    phone: '',
    type: 'business'
  }
}

async function handleSubmit() {
  try {
    if (isEditing.value) {
      await clientStore.updateClient(selectedClient.value.id, form.value)
      toast.success('Klient został zaktualizowany')
    } else {
      await clientStore.createClient(form.value)
      toast.success('Klient został dodany')
    }
    closeModal()
    fetchClients()
  } catch (error) {
    toast.error(error.message || 'Wystąpił błąd podczas zapisywania')
  }
}

function deleteClient(client) {
  selectedClient.value = client
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedClient.value = null
}

async function confirmDelete() {
  try {
    await clientStore.deleteClient(selectedClient.value.id)
    toast.success('Klient został usunięty')
    closeDeleteModal()
    fetchClients()
  } catch (error) {
    toast.error('Błąd podczas usuwania klienta')
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchClients()
})
</script> 