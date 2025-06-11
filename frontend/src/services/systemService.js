import { api } from './api'

export const systemService = {
  /**
   * Get system status
   */
  async getStatus() {
    try {
      const response = await api.get('/system/status')
      return response.data
    } catch (error) {
      console.error('Error fetching system status:', error)
      throw error
    }
  },

  /**
   * Clear memory cache
   */
  async clearMemory() {
    try {
      const response = await api.post('/system/clear-memory')
      return response.data
    } catch (error) {
      console.error('Error clearing memory:', error)
      throw error
    }
  },

  /**
   * Cleanup connections
   */
  async cleanupConnections() {
    try {
      const response = await api.post('/system/cleanup-connections')
      return response.data
    } catch (error) {
      console.error('Error cleaning up connections:', error)
      throw error
    }
  },

  /**
   * Restart server
   */
  async restartServer() {
    try {
      const response = await api.post('/system/restart')
      return response.data
    } catch (error) {
      console.error('Error restarting server:', error)
      throw error
    }
  },

  /**
   * Get system logs
   */
  async getLogs(limit = 50) {
    try {
      const response = await api.get(`/system/logs?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Error fetching system logs:', error)
      throw error
    }
  }
} 