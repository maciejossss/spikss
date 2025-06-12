import { api } from '@/services/api'

export const clientService = {
  async getClients() {
    const response = await api.get('/clients')
    return response.data
  },

  async getClientById(id) {
    const response = await api.get(`/clients/${id}`)
    return response.data
  },

  async createClient(clientData) {
    const response = await api.post('/clients', clientData)
    return response.data
  },

  async updateClient(id, clientData) {
    const response = await api.put(`/clients/${id}`, clientData)
    return response.data
  },

  async deleteClient(id) {
    const response = await api.delete(`/clients/${id}`)
    return response.data
  }
} 