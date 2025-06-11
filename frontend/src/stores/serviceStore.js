import { defineStore } from 'pinia'
import api from '@/services/api'

export const useServiceStore = defineStore('service', {
  state: () => ({
    // Service Records
    serviceRecords: [],
    currentServiceRecord: null,
    
    // Appointments
    appointments: [],
    currentAppointment: null,
    todaysAppointments: [],
    
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
      service_type: '',
      status: '',
      technician_id: '',
      date_from: '',
      date_to: ''
    },
    
    // Configuration
    config: {
      serviceTypes: [],
      serviceStatuses: [],
      appointmentTypes: [],
      appointmentStatuses: [],
      priorityLevels: []
    },
    
    // Statistics
    statistics: null,
    
    // Error handling
    error: null
  }),

  getters: {
    // Get service record by ID
    getServiceRecordById: (state) => (id) => {
      return state.serviceRecords.find(record => record.id === id)
    },
    
    // Get appointment by ID  
    getAppointmentById: (state) => (id) => {
      return state.appointments.find(appointment => appointment.id === id)
    },
    
    // Check if filters are active
    hasActiveFilters: (state) => {
      return Object.values(state.filters).some(value => value !== '')
    },
    
    // Get upcoming services (follow-ups)
    upcomingServices: (state) => {
      return state.serviceRecords.filter(record => 
        record.follow_up_required && record.follow_up_date
      )
    }
  },

  actions: {
    // ===================
    // SERVICE RECORDS
    // ===================
    
    /**
     * Fetch all service records with pagination and filters
     */
    async fetchServiceRecords(options = {}) {
      try {
        this.loading = true
        this.error = null
        
        const params = {
          page: options.page || this.pagination.page,
          limit: options.limit || this.pagination.limit,
          ...this.filters,
          ...options
        }
        
        // Remove empty filters
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null || params[key] === undefined) {
            delete params[key]
          }
        })
        
        const response = await api.get('/service/records', { params })
        
        this.serviceRecords = response.data.data || []
        
        if (response.data.pagination) {
          this.pagination = {
            ...this.pagination,
            ...response.data.pagination
          }
        }
        
        return response.data
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas pobierania zleceń serwisowych'
        console.error('Error fetching service records:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Fetch service record by ID
     */
    async fetchServiceRecordById(id) {
      try {
        this.loading = true
        this.error = null
        
        const response = await api.get(`/service/records/${id}`)
        this.currentServiceRecord = response.data.data
        
        return response.data.data
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas pobierania zlecenia serwisowego'
        console.error('Error fetching service record:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Create new service record
     */
    async createServiceRecord(serviceRecordData) {
      try {
        this.saving = true
        this.error = null
        
        const response = await api.post('/service/records', serviceRecordData)
        const newRecord = response.data.data
        
        // Add to list
        this.serviceRecords.unshift(newRecord)
        this.currentServiceRecord = newRecord
        
        return newRecord
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas tworzenia zlecenia serwisowego'
        console.error('Error creating service record:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    /**
     * Update service record
     */
    async updateServiceRecord(id, serviceRecordData) {
      try {
        this.saving = true
        this.error = null
        
        const response = await api.put(`/service/records/${id}`, serviceRecordData)
        const updatedRecord = response.data.data
        
        // Update in list
        const index = this.serviceRecords.findIndex(record => record.id === id)
        if (index !== -1) {
          this.serviceRecords[index] = updatedRecord
        }
        
        if (this.currentServiceRecord?.id === id) {
          this.currentServiceRecord = updatedRecord
        }
        
        return updatedRecord
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas aktualizacji zlecenia serwisowego'
        console.error('Error updating service record:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    /**
     * Delete service record
     */
    async deleteServiceRecord(id) {
      try {
        this.saving = true
        this.error = null
        
        await api.delete(`/service/records/${id}`)
        
        // Remove from list
        this.serviceRecords = this.serviceRecords.filter(record => record.id !== id)
        
        if (this.currentServiceRecord?.id === id) {
          this.currentServiceRecord = null
        }
        
        return true
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas usuwania zlecenia serwisowego'
        console.error('Error deleting service record:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    /**
     * Complete service record
     */
    async completeServiceRecord(id, completionData) {
      try {
        this.saving = true
        this.error = null
        
        const response = await api.post(`/service/records/${id}/complete`, completionData)
        const updatedRecord = response.data.data
        
        // Update in list
        const index = this.serviceRecords.findIndex(record => record.id === id)
        if (index !== -1) {
          this.serviceRecords[index] = updatedRecord
        }
        
        if (this.currentServiceRecord?.id === id) {
          this.currentServiceRecord = updatedRecord
        }
        
        return updatedRecord
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas kończenia zlecenia serwisowego'
        console.error('Error completing service record:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    // ===================
    // APPOINTMENTS  
    // ===================
    
    /**
     * Fetch all appointments with pagination and filters
     */
    async fetchAppointments(options = {}) {
      try {
        this.loading = true
        this.error = null
        
        const params = {
          page: options.page || this.pagination.page,
          limit: options.limit || this.pagination.limit,
          ...options
        }
        
        const response = await api.get('/service/appointments', { params })
        
        this.appointments = response.data.data || []
        
        if (response.data.pagination) {
          this.pagination = {
            ...this.pagination,
            ...response.data.pagination
          }
        }
        
        return response.data
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas pobierania terminów'
        console.error('Error fetching appointments:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Fetch today's appointments
     */
    async fetchTodaysAppointments() {
      try {
        this.loading = true
        this.error = null
        
        const response = await api.get('/service/appointments/today')
        this.todaysAppointments = response.data.data || []
        
        console.log('📅 Fetched today\'s appointments:', this.todaysAppointments.length)
        console.log('📋 Today\'s appointments data:', this.todaysAppointments.map(apt => ({
          id: apt.id.substring(0, 8),
          date: apt.appointment_date,
          description: apt.description
        })))
        
        return response.data.data
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas pobierania dzisiejszych terminów'
        console.error('Error fetching today\'s appointments:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Create new appointment
     */
    async createAppointment(appointmentData) {
      try {
        this.saving = true
        this.error = null
        
        const response = await api.post('/service/appointments', appointmentData)
        const newAppointment = response.data.data
        
        // Add to list
        this.appointments.unshift(newAppointment)
        this.currentAppointment = newAppointment
        
        // Jeśli termin jest na dzisiaj, dodaj go też do dzisiejszych terminów
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const appointmentDate = new Date(newAppointment.appointment_date).toISOString().split('T')[0] // Handle timezone
        if (appointmentDate === today) {
          this.todaysAppointments.unshift(newAppointment)
          console.log('✅ Added appointment to today\'s list:', newAppointment.id, 'Date:', appointmentDate, 'Today:', today)
        } else {
          console.log('ℹ️ Appointment not for today:', appointmentDate, 'vs', today)
        }
        
        return newAppointment
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas tworzenia terminu'
        console.error('Error creating appointment:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    /**
     * Convert appointment to service record
     */
    async convertAppointmentToService(id, serviceData) {
      try {
        this.saving = true
        this.error = null
        
        const response = await api.post(`/service/appointments/${id}/convert`, serviceData)
        const newServiceRecord = response.data.data
        
        // Remove appointment from list
        this.appointments = this.appointments.filter(appointment => appointment.id !== id)
        
        // Add service record to list
        this.serviceRecords.unshift(newServiceRecord)
        
        return newServiceRecord
        
      } catch (error) {
        this.error = error.response?.data?.message || 'Błąd podczas konwersji terminu na zlecenie'
        console.error('Error converting appointment:', error)
        throw error
      } finally {
        this.saving = false
      }
    },
    
    // ===================
    // CONFIGURATION & STATISTICS
    // ===================
    
    /**
     * Fetch service configuration
     */
    async fetchServiceConfig() {
      try {
        console.log('🔄 Fetching service config from API...')
        const response = await api.get('/service/config')
        console.log('📋 Raw config response:', response.data)
        
        const configData = response.data.data || {}
        
        // Map backend response to frontend structure
        this.config = {
          serviceTypes: configData.service_types || [],
          serviceStatuses: configData.service_statuses || [],
          appointmentTypes: configData.appointment_types || [],
          appointmentStatuses: configData.appointment_statuses || [],
          priorityLevels: configData.priority_levels || []
        }
        
        console.log('✅ Mapped config:', this.config)
        return configData
      } catch (error) {
        console.error('❌ Error fetching service config:', error)
        console.error('Error details:', error.response?.data || error.message)
        throw error
      }
    },
    
    /**
     * Fetch service statistics
     */
    async fetchStatistics() {
      try {
        const response = await api.get('/service/records/statistics')
        this.statistics = response.data.data
        return response.data.data
      } catch (error) {
        console.error('Error fetching statistics:', error)
        throw error
      }
    },
    
    /**
     * Fetch upcoming services (follow-ups)
     */
    async fetchUpcomingServices() {
      try {
        const response = await api.get('/service/records/upcoming')
        return response.data.data || []
      } catch (error) {
        console.error('Error fetching upcoming services:', error)
        throw error
      }
    },
    
    // ===================
    // UTILITY ACTIONS
    // ===================
    
    /**
     * Set filters
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    
    /**
     * Clear filters
     */
    clearFilters() {
      this.filters = {
        search: '',
        service_type: '',
        status: '',
        technician_id: '',
        date_from: '',
        date_to: ''
      }
    },
    
    /**
     * Set pagination
     */
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination }
    },
    
    /**
     * Clear error
     */
    clearError() {
      this.error = null
    },
    
    /**
     * Clear current service record
     */
    clearCurrentServiceRecord() {
      this.currentServiceRecord = null
    },
    
    /**
     * Clear current appointment
     */
    clearCurrentAppointment() {
      this.currentAppointment = null
    }
  }
}) 