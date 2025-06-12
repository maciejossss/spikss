import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useClientStore = defineStore('clients', () => {
  // State
  const clients = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedClient = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Getters
  const activeClients = computed(() => 
    clients.value.filter(client => client.is_active)
  )

  const inactiveClients = computed(() => 
    clients.value.filter(client => !client.is_active)
  )

  const getClientById = computed(() => (id) => 
    clients.value.find(client => client.id === id)
  )

  // Actions
  async function fetchClients(params = new URLSearchParams()) {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await api.get(`/clients?${params.toString()}`)
      
      if (response.data.success) {
        clients.value = response.data.data
        if (response.data.pagination) {
          pagination.value = response.data.pagination
        }
      } else {
        throw new Error(response.data.message || 'Błąd podczas pobierania klientów')
      }
    } catch (err) {
      error.value = err.message || 'Błąd podczas pobierania klientów'
      console.error('Error fetching clients:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createClient(clientData) {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await api.post('/clients', clientData)
      
      if (response.data.success) {
        clients.value.unshift(response.data.data)
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Błąd podczas tworzenia klienta')
      }
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
      
      const response = await api.put(`/clients/${id}`, clientData)
      
      if (response.data.success) {
        const index = clients.value.findIndex(c => c.id === id)
        if (index !== -1) {
          clients.value[index] = response.data.data
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Błąd podczas aktualizacji klienta')
      }
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
      
      const response = await api.delete(`/clients/${id}`)
      
      if (response.data.success) {
        clients.value = clients.value.filter(c => c.id !== id)
        return true
      } else {
        throw new Error(response.data.message || 'Błąd podczas usuwania klienta')
      }
    } catch (err) {
      error.value = err.message || 'Błąd podczas usuwania klienta'
      console.error('Error deleting client:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getClientDetails(id) {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await api.get(`/clients/${id}`)
      
      if (response.data.success) {
        selectedClient.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Błąd podczas pobierania szczegółów klienta')
      }
    } catch (err) {
      error.value = err.message || 'Błąd podczas pobierania szczegółów klienta'
      console.error('Error fetching client details:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function resetStore() {
    clients.value = []
    selectedClient.value = null
    isLoading.value = false
    error.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  }

  return {
    // State
    clients,
    isLoading,
    error,
    selectedClient,
    pagination,
    
    // Getters
    activeClients,
    inactiveClients,
    getClientById,
    
    // Actions
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClientDetails,
    resetStore
  }
}) 