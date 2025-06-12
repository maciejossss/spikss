import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)

  // Actions
  const login = async (credentials: LoginCredentials) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.post<LoginResponse>('/auth/login', credentials)
      
      token.value = response.data.token
      user.value = response.data.user
      
      localStorage.setItem('token', response.data.token)
      
      // Set token in API instance
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
      
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Błąd podczas logowania'
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  const checkAuth = async () => {
    if (!token.value) return false

    try {
      loading.value = true
      error.value = null
      
      const response = await api.get<{ user: User }>('/auth/me')
      user.value = response.data.user
      
      return true
    } catch (err) {
      logout()
      error.value = err instanceof Error ? err.message : 'Sesja wygasła'
      return false
    } finally {
      loading.value = false
    }
  }

  // Initialize
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    checkAuth()
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    
    // Getters
    isAuthenticated,
    userRole,
    
    // Actions
    login,
    logout,
    checkAuth
  }
}) 