<template>
  <div class="bg-white shadow sm:rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-900">Urządzenia</h1>
          <p class="mt-2 text-sm text-gray-700">Lista wszystkich urządzeń w systemie.</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            @click="openNewDeviceModal"
          >
            Dodaj urządzenie
          </button>
        </div>
      </div>

      <!-- Search and filters -->
      <div class="mt-4 flex space-x-4">
        <div class="flex-1">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Szukaj urządzeń..."
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div class="w-48">
          <select
            v-model="selectedType"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Wszystkie typy</option>
            <option value="boiler">Kocioły</option>
            <option value="burner">Palniki</option>
          </select>
        </div>
      </div>

      <!-- Devices table -->
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
                  <tr v-else-if="filteredDevices.length === 0">
                    <td
                      :colspan="tableHeaders.length + 1"
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"
                    >
                      Brak urządzeń do wyświetlenia
                    </td>
                  </tr>
                  <tr
                    v-for="device in filteredDevices"
                    :key="device.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ device.name }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ device.serialNumber }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ device.type === 'boiler' ? 'Kocioł' : 'Palnik' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ device.manufacturer }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {{ device.installationDate }}
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        @click="editDevice(device)"
                        class="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edytuj
                      </button>
                      <button
                        @click="deleteDevice(device)"
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

    <!-- New/Edit Device Modal -->
    <Modal v-if="showModal" @close="closeModal">
      <template #title>
        {{ isEditing ? 'Edytuj urządzenie' : 'Dodaj nowe urządzenie' }}
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
            <label for="serialNumber" class="block text-sm font-medium text-gray-700">Numer seryjny</label>
            <input
              type="text"
              id="serialNumber"
              v-model="form.serialNumber"
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
              <option value="boiler">Kocioł</option>
              <option value="burner">Palnik</option>
            </select>
          </div>
          <div>
            <label for="manufacturer" class="block text-sm font-medium text-gray-700">Producent</label>
            <input
              type="text"
              id="manufacturer"
              v-model="form.manufacturer"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="installationDate" class="block text-sm font-medium text-gray-700">Data instalacji</label>
            <input
              type="date"
              id="installationDate"
              v-model="form.installationDate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
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
          {{ isEditing ? 'Zapisz zmiany' : 'Dodaj urządzenie' }}
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
          Czy na pewno chcesz usunąć to urządzenie? Tej operacji nie można cofnąć.
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
import { useDeviceStore } from '@/stores/deviceStore'

const deviceStore = useDeviceStore()
const toast = useToast()

// State
const devices = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedType = ref('')
const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const selectedDevice = ref(null)
const form = ref({
  name: '',
  serialNumber: '',
  type: 'boiler',
  manufacturer: '',
  installationDate: ''
})

// Table configuration
const tableHeaders = [
  { key: 'name', label: 'Nazwa' },
  { key: 'serialNumber', label: 'Numer seryjny' },
  { key: 'type', label: 'Typ' },
  { key: 'manufacturer', label: 'Producent' },
  { key: 'installationDate', label: 'Data instalacji' }
]

// Computed
const filteredDevices = computed(() => {
  return devices.value
    .filter(device => {
      const matchesSearch = !searchQuery.value || 
        device.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        device.serialNumber.toLowerCase().includes(searchQuery.value.toLowerCase())
      const matchesType = !selectedType.value || device.type === selectedType.value
      return matchesSearch && matchesType
    })
})

// Methods
async function fetchDevices() {
  try {
    isLoading.value = true
    const response = await deviceStore.fetchDevices()
    devices.value = response
  } catch (error) {
    toast.error('Błąd podczas pobierania listy urządzeń')
  } finally {
    isLoading.value = false
  }
}

function openNewDeviceModal() {
  isEditing.value = false
  form.value = {
    name: '',
    serialNumber: '',
    type: 'boiler',
    manufacturer: '',
    installationDate: ''
  }
  showModal.value = true
}

function editDevice(device) {
  isEditing.value = true
  selectedDevice.value = device
  form.value = { ...device }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  form.value = {
    name: '',
    serialNumber: '',
    type: 'boiler',
    manufacturer: '',
    installationDate: ''
  }
}

async function handleSubmit() {
  try {
    if (isEditing.value) {
      await deviceStore.updateDevice(selectedDevice.value.id, form.value)
      toast.success('Urządzenie zostało zaktualizowane')
    } else {
      await deviceStore.createDevice(form.value)
      toast.success('Urządzenie zostało dodane')
    }
    closeModal()
    fetchDevices()
  } catch (error) {
    toast.error(error.message || 'Wystąpił błąd podczas zapisywania')
  }
}

function deleteDevice(device) {
  selectedDevice.value = device
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedDevice.value = null
}

async function confirmDelete() {
  try {
    await deviceStore.deleteDevice(selectedDevice.value.id)
    toast.success('Urządzenie zostało usunięte')
    closeDeleteModal()
    fetchDevices()
  } catch (error) {
    toast.error('Błąd podczas usuwania urządzenia')
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchDevices()
})
</script> 