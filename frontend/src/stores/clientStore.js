import { defineStore } from 'pinia'
import api from '@/services/api'

export const useClientStore = defineStore('client', {
  state: () => ({
    // Client data
    clients: [],
    currentClient: null,
    
    // Loading states
    loading: false,
    saving: false,
    
    // Pagination
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    
    // Filters
    filters: {
      search: '',
      type: '',
      priority: ''
    },
    
    // Error handling
    error: null,
    
    // Stats
    stats: null
  }),

  getters: {
    // Get client by ID
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id)
    },
    
    // Check if filters are active
    hasActiveFilters: (state) => {
      return !!(state.filters.search || state.filters.type || state.filters.priority)
    },
    
    // Get filtered clients count
    filteredCount: (state) => {
      return state.clients.length
    }
  },

  actions: {
    // CRUD Operations following RULE 4: API STANDARDIZATION
    
    /**
     * Fetch all clients with pagination and filters
     */
    async fetchClients() {
      this.loading = true
      this.error = null
      
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        }
        
        // Remove empty filters
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null || params[key] === undefined) {
            delete params[key]
          }
        })
        
        const response = await api.get('/clients', { params })
        
        if (response.data.success) {
          this.clients = response.data.data
          this.pagination = {
            ...this.pagination,
            total: response.data.meta.total,
            totalPages: response.data.meta.totalPages
          }
        }
        
      } catch (error) {
        console.error('Error fetching clients:', error)
        this.error = error.response?.data?.message || 'Błąd podczas pobierania klientów'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create new client
     */
    async createClient(clientData) {
      this.saving = true
      this.error = null
      
      try {
        const response = await api.post('/clients', clientData)
        
        if (response.data.success) {
          // Add new client to the list
          this.clients.unshift(response.data.data)
          
          // Update pagination total
          this.pagination.total += 1
          
          return response.data.data
        }
        
      } catch (error) {
        console.error('Error creating client:', error)
        this.error = error.response?.data?.message || 'Błąd podczas tworzenia klienta'
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Update existing client
     */
    async updateClient(id, clientData) {
      this.saving = true
      this.error = null
      
      try {
        const response = await api.put(`/clients/${id}`, clientData)
        
        if (response.data.success) {
          // Update client in the list
          const index = this.clients.findIndex(client => client.id === id)
          if (index !== -1) {
            this.clients[index] = response.data.data
          }
          
          // Update current client if it's the same
          if (this.currentClient && this.currentClient.id === id) {
            this.currentClient = response.data.data
          }
          
          return response.data.data
        }
        
      } catch (error) {
        console.error('Error updating client:', error)
        this.error = error.response?.data?.message || 'Błąd podczas aktualizacji klienta'
        throw error
      } finally {
        this.saving = false
      }
    },

    /**
     * Delete client
     */
    async deleteClient(id) {
      this.error = null
      
      try {
        const response = await api.delete(`/clients/${id}`)
        
        if (response.data.success) {
          // Remove client from the list
          this.clients = this.clients.filter(client => client.id !== id)
          
          // Update pagination total
          this.pagination.total -= 1
          
          // Clear current client if it's the deleted one
          if (this.currentClient && this.currentClient.id === id) {
            this.currentClient = null
          }
        }
        
      } catch (error) {
        console.error('Error deleting client:', error)
        this.error = error.response?.data?.message || 'Błąd podczas usuwania klienta'
        throw error
      }
    },

    /**
     * Get client by ID
     */
    async getClientById(id) {
      this.loading = true
      this.error = null
      
      try {
        const response = await api.get(`/clients/${id}`)
        
        if (response.data.success) {
          this.currentClient = response.data.data
          return response.data.data
        }
        
      } catch (error) {
        console.error('Error fetching client:', error)
        this.error = error.response?.data?.message || 'Błąd podczas pobierania klienta'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Get client statistics
     */
    async fetchClientStats() {
      this.error = null
      
      try {
        const response = await api.get('/clients/stats')
        
        if (response.data.success) {
          this.stats = response.data.data
          return response.data.data
        }
        
      } catch (error) {
        console.error('Error fetching client stats:', error)
        this.error = error.response?.data?.message || 'Błąd podczas pobierania statystyk'
        throw error
      }
    },

    // Filter and Search operations
    
    /**
     * Set search filter
     */
    setSearch(search) {
      this.filters.search = search
      this.pagination.page = 1 // Reset to first page when searching
    },

    /**
     * Set type filter
     */
    setTypeFilter(type) {
      this.filters.type = type
      this.pagination.page = 1
    },

    /**
     * Set priority filter
     */
    setPriorityFilter(priority) {
      this.filters.priority = priority
      this.pagination.page = 1
    },

    /**
     * Reset all filters
     */
    resetFilters() {
      this.filters = {
        search: '',
        type: '',
        priority: ''
      }
      this.pagination.page = 1
    },

    /**
     * Set pagination page
     */
    setPage(page) {
      this.pagination.page = page
    },

    /**
     * Set pagination limit
     */
    setLimit(limit) {
      this.pagination.limit = limit
      this.pagination.page = 1 // Reset to first page when changing limit
    },

    // Utility methods
    
    /**
     * Clear current client
     */
    clearCurrentClient() {
      this.currentClient = null
    },

    /**
     * Clear error
     */
    clearError() {
      this.error = null
    },

    /**
     * Reset store to initial state
     */
    resetStore() {
      this.clients = []
      this.currentClient = null
      this.loading = false
      this.saving = false
      this.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
      this.filters = {
        search: '',
        type: '',
        priority: ''
      }
      this.error = null
      this.stats = null
    }
  }
}) 