import { api } from '@/services/api'
import { Client, ClientFormData } from '../types/client.types'

interface ApiResponse<T> {
  data: T
  message?: string
}

export const clientService = {
  async getClients() {
    const response = await api.get<ApiResponse<Client[]>>('/clients')
    return response.data
  },

  async getClientById(id: number) {
    const response = await api.get<ApiResponse<Client>>(`/clients/${id}`)
    return response.data
  },

  async createClient(clientData: ClientFormData) {
    const response = await api.post<ApiResponse<Client>>('/clients', clientData)
    return response.data
  },

  async updateClient(id: number, clientData: ClientFormData) {
    const response = await api.put<ApiResponse<Client>>(`/clients/${id}`, clientData)
    return response.data
  },

  async deleteClient(id: number) {
    const response = await api.delete<ApiResponse<void>>(`/clients/${id}`)
    return response.data
  }
} 