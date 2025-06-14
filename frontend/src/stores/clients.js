import { defineStore } from 'pinia'
import axios from 'axios'

export const useClientStore = defineStore('clients', {
  state: () => ({
    clients: [],
    isLoading: false,
    error: null
  }),

  getters: {
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id)
    },
    
    getBusinessClients: (state) => {
      return state.clients.filter(client => client.type === 'business')
    },
    
    getIndividualClients: (state) => {
      return state.clients.filter(client => client.type === 'individual')
    }
  },

  actions: {
    async fetchClients() {
      this.isLoading = true
      this.error = null
      try {
        const response = await axios.get('/api/clients')
        this.clients = response.data
        return this.clients
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas pobierania klientów'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createClient(clientData) {
      this.isLoading = true
      this.error = null
      try {
        const response = await axios.post('/api/clients', clientData)
        this.clients.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas tworzenia klienta'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async updateClient(id, clientData) {
      this.isLoading = true
      this.error = null
      try {
        const response = await axios.put(`/api/clients/${id}`, clientData)
        const index = this.clients.findIndex(client => client.id === id)
        if (index !== -1) {
          this.clients[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas aktualizacji klienta'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteClient(id) {
      this.isLoading = true
      this.error = null
      try {
        await axios.delete(`/api/clients/${id}`)
        this.clients = this.clients.filter(client => client.id !== id)
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas usuwania klienta'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async searchClients(query) {
      this.isLoading = true
      this.error = null
      try {
        const response = await axios.get(`/api/clients/search?q=${encodeURIComponent(query)}`)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas wyszukiwania klientów'
        throw error
      } finally {
        this.isLoading = false
      }
    }
  }
}) 