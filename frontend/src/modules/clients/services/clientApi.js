import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const ClientAPI = {
  /**
   * Pobierz wszystkich klientów
   */
  async getAll() {
    try {
      const response = await axios.get(`${API_URL}/clients`)
      return response.data
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw new Error(error.response?.data?.message || 'Błąd podczas pobierania klientów')
    }
  },

  /**
   * Pobierz klienta po ID
   */
  async getById(id) {
    try {
      const response = await axios.get(`${API_URL}/clients/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching client ${id}:`, error)
      throw new Error(error.response?.data?.message || 'Błąd podczas pobierania klienta')
    }
  },

  /**
   * Utwórz nowego klienta
   */
  async create(clientData) {
    try {
      const response = await axios.post(`${API_URL}/clients`, clientData)
      return response.data
    } catch (error) {
      console.error('Error creating client:', error)
      throw new Error(error.response?.data?.message || 'Błąd podczas tworzenia klienta')
    }
  },

  /**
   * Zaktualizuj klienta
   */
  async update(id, clientData) {
    try {
      const response = await axios.put(`${API_URL}/clients/${id}`, clientData)
      return response.data
    } catch (error) {
      console.error(`Error updating client ${id}:`, error)
      throw new Error(error.response?.data?.message || 'Błąd podczas aktualizacji klienta')
    }
  },

  /**
   * Usuń klienta
   */
  async delete(id) {
    try {
      const response = await axios.delete(`${API_URL}/clients/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting client ${id}:`, error)
      throw new Error(error.response?.data?.message || 'Błąd podczas usuwania klienta')
    }
  },

  /**
   * Pobierz urządzenia klienta
   */
  async getClientDevices(id) {
    try {
      const response = await axios.get(`${API_URL}/clients/${id}/devices`)
      return response.data
    } catch (error) {
      console.error(`Error fetching devices for client ${id}:`, error)
      throw new Error(error.response?.data?.message || 'Błąd podczas pobierania urządzeń klienta')
    }
  },

  /**
   * Pobierz historię serwisową klienta
   */
  async getClientServiceHistory(id) {
    try {
      const response = await axios.get(`${API_URL}/clients/${id}/service-history`)
      return response.data
    } catch (error) {
      console.error(`Error fetching service history for client ${id}:`, error)
      throw new Error(error.response?.data?.message || 'Błąd podczas pobierania historii serwisowej')
    }
  }
} 