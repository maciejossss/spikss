/**
 * RULE 1: MODULAR IMPLEMENTATION
 * Device Store for System Serwisowy Palniki & Kotły
 * Pinia store for devices module state management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useDeviceStore = defineStore('devices', () => {
  // State
  const devices = ref([])
  const currentDevice = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  
  // Filters
  const filters = ref({
    search: '',
    client_id: null,
    client_search: '',
    device_type: null,
    brand: null,
    status: null,
    next_service_overdue: false,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  })

  // Configuration
  const deviceConfig = ref({
    device_types: [],
    fuel_types: [],
    status_options: [],
    condition_ratings: []
  })

  // Statistics
  const statistics = ref({
    total_devices: 0,
    active_devices: 0,
    inactive_devices: 0,
    decommissioned_devices: 0,
    overdue_services: 0,
    upcoming_services: 0,
    device_types_count: 0,
    brands_count: 0,
    active_percentage: 0,
    overdue_percentage: 0
  })

  // Getters
  const activeDevices = computed(() => 
    devices.value.filter(device => device.status === 'active')
  )

  const overdueDevices = computed(() => 
    devices.value.filter(device => device.service_overdue)
  )

  const devicesByType = computed(() => {
    const types = {}
    devices.value.forEach(device => {
      if (!types[device.device_type]) {
        types[device.device_type] = []
      }
      types[device.device_type].push(device)
    })
    return types
  })

  const hasDevices = computed(() => devices.value.length > 0)
  
  const isLastPage = computed(() => !pagination.value.hasNextPage)
  const isFirstPage = computed(() => !pagination.value.hasPrevPage)

  // Actions
  
  /**
   * Load device configuration
   */
  async function loadDeviceConfig() {
    try {
      const response = await api.get('/devices/config')
      if (response.data.success) {
        deviceConfig.value = response.data.data
      }
    } catch (err) {
      console.error('Failed to load device config:', err)
      error.value = 'Failed to load device configuration'
    }
  }

  /**
   * Fetch devices with filters and pagination
   */
  async function fetchDevices(options = {}) {
    loading.value = true
    error.value = null
    
    try {
      const params = {
        ...filters.value,
        ...options,
        page: options.page || pagination.value.page,
        limit: options.limit || pagination.value.limit
      }

      // Remove empty values
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '') {
          delete params[key]
        }
      })

      const response = await api.get('/devices', { params })
      
      if (response.data.success) {
        devices.value = response.data.data
        pagination.value = response.data.pagination
        
        // Update filters with applied values
        if (response.data.filters) {
          Object.assign(filters.value, response.data.filters)
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err)
      error.value = err.response?.data?.error || 'Failed to fetch devices'
      devices.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get device by ID
   */
  async function fetchDeviceById(deviceId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/devices/${deviceId}`)
      
      if (response.data.success) {
        currentDevice.value = response.data.data
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to fetch device:', err)
      error.value = err.response?.data?.error || 'Failed to fetch device'
      currentDevice.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new device
   */
  async function createDevice(deviceData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/devices', deviceData)
      
      if (response.data.success) {
        // Add to devices list if we're on the first page
        if (pagination.value.page === 1) {
          devices.value.unshift(response.data.data)
        }
        
        // Refresh statistics
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to create device:', err)
      error.value = err.response?.data?.error || 'Failed to create device'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update device
   */
  async function updateDevice(deviceId, updateData) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.put(`/devices/${deviceId}`, updateData)
      
      if (response.data.success) {
        // Update device in the list
        const index = devices.value.findIndex(d => d.id === deviceId)
        if (index !== -1) {
          devices.value[index] = response.data.data
        }
        
        // Update current device if it's the same
        if (currentDevice.value?.id === deviceId) {
          currentDevice.value = response.data.data
        }
        
        // Refresh statistics
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to update device:', err)
      error.value = err.response?.data?.error || 'Failed to update device'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete device
   */
  async function deleteDevice(deviceId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.delete(`/devices/${deviceId}`)
      
      if (response.data.success) {
        // Remove from devices list
        devices.value = devices.value.filter(d => d.id !== deviceId)
        
        // Clear current device if it's the deleted one
        if (currentDevice.value?.id === deviceId) {
          currentDevice.value = null
        }
        
        // Refresh statistics
        await loadStatistics()
        
        return true
      }
    } catch (err) {
      console.error('Failed to delete device:', err)
      error.value = err.response?.data?.error || 'Failed to delete device'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get devices by client ID
   */
  async function fetchDevicesByClientId(clientId) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/devices/client/${clientId}`)
      
      if (response.data.success) {
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to fetch client devices:', err)
      error.value = err.response?.data?.error || 'Failed to fetch client devices'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get devices due for service
   */
  async function fetchDevicesDueForService(daysAhead = 30) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.get('/devices/service/due', {
        params: { days_ahead: daysAhead }
      })
      
      if (response.data.success) {
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to fetch devices due for service:', err)
      error.value = err.response?.data?.error || 'Failed to fetch devices due for service'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Load device statistics
   */
  async function loadStatistics() {
    try {
      const response = await api.get('/devices/statistics')
      
      if (response.data.success) {
        statistics.value = response.data.data
      }
    } catch (err) {
      console.error('Failed to load device statistics:', err)
    }
  }

  /**
   * Advanced search
   */
  async function searchDevices(searchCriteria) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.post('/devices/search', searchCriteria)
      
      if (response.data.success) {
        devices.value = response.data.data
        pagination.value = response.data.pagination
        return response.data
      }
    } catch (err) {
      console.error('Failed to search devices:', err)
      error.value = err.response?.data?.error || 'Failed to search devices'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Batch update device statuses
   */
  async function batchUpdateStatus(deviceIds, status) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch('/devices/batch/status', {
        device_ids: deviceIds,
        status: status
      })
      
      if (response.data.success) {
        // Refresh the devices list to reflect changes
        await fetchDevices()
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to batch update device statuses:', err)
      error.value = err.response?.data?.error || 'Failed to batch update device statuses'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Batch update service dates
   */
  async function batchUpdateServiceDate(deviceIds, serviceDate) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch('/devices/batch/service-date', {
        device_ids: deviceIds,
        next_service_due: serviceDate
      })
      
      if (response.data.success) {
        // Refresh the devices list to reflect changes
        await fetchDevices()
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to batch update service dates:', err)
      error.value = err.response?.data?.error || 'Failed to batch update service dates'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Batch mark devices as serviced
   */
  async function batchMarkAsServiced(deviceIds) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.patch('/devices/batch/mark-serviced', {
        device_ids: deviceIds
      })
      
      if (response.data.success) {
        // Refresh the devices list to reflect changes
        await fetchDevices()
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to batch mark as serviced:', err)
      error.value = err.response?.data?.error || 'Failed to batch mark as serviced'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Batch delete devices
   */
  async function batchDeleteDevices(deviceIds) {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.delete('/devices/batch', {
        data: { device_ids: deviceIds }
      })
      
      if (response.data.success) {
        // Refresh the devices list to reflect changes
        await fetchDevices()
        await loadStatistics()
        
        return response.data.data
      }
    } catch (err) {
      console.error('Failed to batch delete devices:', err)
      error.value = err.response?.data?.error || 'Failed to batch delete devices'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Set filters
   */
  function setFilters(newFilters) {
    Object.assign(filters.value, newFilters)
  }

  /**
   * Reset filters
   */
  function resetFilters() {
    filters.value = {
      search: '',
      client_id: null,
      client_search: '',
      device_type: null,
      brand: null,
      status: null,
      next_service_overdue: false,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    }
  }

  /**
   * Set current page
   */
  function setPage(page) {
    pagination.value.page = page
  }

  /**
   * Set page size
   */
  function setPageSize(limit) {
    pagination.value.limit = limit
    pagination.value.page = 1 // Reset to first page
  }

  /**
   * Clear current device
   */
  function clearCurrentDevice() {
    currentDevice.value = null
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Initialize store
   */
  async function initialize() {
    await loadDeviceConfig()
    await loadStatistics()
  }

  return {
    // State
    devices,
    currentDevice,
    loading,
    error,
    pagination,
    filters,
    deviceConfig,
    statistics,
    
    // Getters
    activeDevices,
    overdueDevices,
    devicesByType,
    hasDevices,
    isLastPage,
    isFirstPage,
    
    // Actions
    loadDeviceConfig,
    fetchDevices,
    fetchDeviceById,
    createDevice,
    updateDevice,
    deleteDevice,
    fetchDevicesByClientId,
    fetchDevicesDueForService,
    loadStatistics,
    searchDevices,
    batchUpdateStatus,
    batchUpdateServiceDate,
    batchMarkAsServiced,
    batchDeleteDevices,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    clearCurrentDevice,
    clearError,
    initialize
  }
}) 