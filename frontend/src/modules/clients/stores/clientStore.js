import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ClientAPI } from '../services/clientApi'

export const useClientStore = defineStore('clients', () => {
  // Stan
  const clients = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedClient = ref(null)

  // Gettery
  const activeClients = computed(() => 
    clients.value.filter(client => client.is_active)
  )

  const inactiveClients = computed(() => 
    clients.value.filter(client => !client.is_active)
  )

  const getClientById = computed(() => (id) => 
    clients.value.find(client => client.id === id)
  )

  // Akcje
  async function fetchClients() {
    try {
      isLoading.value = true
      error.value = null
      const response = await ClientAPI.getAll()
      clients.value = response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas pobierania klientów'
      console.error('Error fetching clients:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createClient(clientData) {
    try {
      isLoading.value = true
      error.value = null
      const response = await ClientAPI.create(clientData)
      clients.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas tworzenia klienta'
      console.error('Error creating client:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateClient(id, clientData) {
    try {
      isLoading.value = true
      error.value = null
      const response = await ClientAPI.update(id, clientData)
      const index = clients.value.findIndex(c => c.id === id)
      if (index !== -1) {
        clients.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas aktualizacji klienta'
      console.error('Error updating client:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteClient(id) {
    try {
      isLoading.value = true
      error.value = null
      await ClientAPI.delete(id)
      clients.value = clients.value.filter(c => c.id !== id)
    } catch (err) {
      error.value = err.message || 'Błąd podczas usuwania klienta'
      console.error('Error deleting client:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchClientDetails(id) {
    try {
      isLoading.value = true
      error.value = null
      const response = await ClientAPI.getById(id)
      selectedClient.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas pobierania szczegółów klienta'
      console.error('Error fetching client details:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Reset stanu
  function resetState() {
    clients.value = []
    selectedClient.value = null
    error.value = null
    isLoading.value = false
  }

  return {
    // Stan
    clients,
    isLoading,
    error,
    selectedClient,
    
    // Gettery
    activeClients,
    inactiveClients,
    getClientById,
    
    // Akcje
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    fetchClientDetails,
    resetState
  }
}) 