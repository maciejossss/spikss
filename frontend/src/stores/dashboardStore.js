import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref({
    totalClients: 0,
    activeDevices: 0,
    pendingServices: 0,
    lowStock: 0
  })

  const dataMonitoring = ref({
    totalConnections: 0,
    throughput: 0,
    latency: 0,
    errorRate: 0
  })

  const loading = ref(false)
  const error = ref(null)

  async function fetchDashboardStats() {
    try {
      loading.value = true
      error.value = null

      const [clientsResponse, devicesResponse, servicesResponse, inventoryResponse] = await Promise.all([
        api.get('/clients/statistics'),
        api.get('/devices/statistics'),
        api.get('/service/records/statistics'),
        api.get('/inventory/statistics')
      ])

      stats.value = {
        totalClients: clientsResponse.data.data.total_clients || 0,
        activeDevices: devicesResponse.data.data.active_devices || 0,
        pendingServices: servicesResponse.data.data.pending_services || 0,
        lowStock: inventoryResponse.data.data.low_stock_items || 0
      }

      // Update monitoring data
      const monitoringResponse = await api.get('/system/monitoring')
      if (monitoringResponse.data.success) {
        dataMonitoring.value = monitoringResponse.data.data
      }

    } catch (err) {
      error.value = err.message || 'Failed to fetch dashboard statistics'
      console.error('Dashboard stats error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    dataMonitoring,
    loading,
    error,
    fetchDashboardStats
  }
}) 