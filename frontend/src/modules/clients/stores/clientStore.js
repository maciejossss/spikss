import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { clientService } from '../services/clientService'

export const useClientStore = defineStore('client', () => {
  const authStore = useAuthStore()
  
  // State
  const clients = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentClient = ref(null)
  
  // Getters
  const totalClients = computed(() => clients.value.length)
  const activeClients = computed(() => clients.value.filter(client => client.status === 'active').length)
  
  const getClientById = computed(() => {
    return (id) => clients.value.find(client => client.id === id)
  })
  
  // Actions
  const fetchClients = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await clientService.getClients()
      clients.value = response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas pobierania listy klientów'
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const createClient = async (clientData) => {
    try {
      loading.value = true
      error.value = null
      const response = await clientService.createClient(clientData)
      clients.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas tworzenia klienta'
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const updateClient = async (id, clientData) => {
    try {
      loading.value = true
      error.value = null
      const response = await clientService.updateClient(id, clientData)
      const index = clients.value.findIndex(client => client.id === id)
      if (index !== -1) {
        clients.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message || 'Błąd podczas aktualizacji klienta'
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const deleteClient = async (id) => {
    try {
      loading.value = true
      error.value = null
      await clientService.deleteClient(id)
      clients.value = clients.value.filter(client => client.id !== id)
    } catch (err) {
      error.value = err.message || 'Błąd podczas usuwania klienta'
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const setCurrentClient = (client) => {
    currentClient.value = client
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    clients,
    loading,
    error,
    currentClient,
    
    // Getters
    totalClients,
    activeClients,
    getClientById,
    
    // Actions
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    setCurrentClient,
    clearError
  }
}) 