import { defineStore } from 'pinia'
import { api } from '@/services/api'

interface User {
  id: string
  username: string
  role: string
  permissions: Record<string, string[]>
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token')
  }),

  getters: {
    hasPermission: (state) => (module: string, permission: string): boolean => {
      if (!state.user?.permissions) return false
      return state.user.permissions[module]?.includes(permission) || false
    },
    
    getUser: (state): User | null => state.user,
    
    getToken: (state): string | null => state.token,
    
    isAdmin: (state): boolean => state.user?.role === 'admin'
  },

  actions: {
    async login(credentials: { username: string; password: string }) {
      try {
        const response = await api.post('/auth/login', credentials)
        const { token, user } = response.data

        this.token = token
        this.user = user
        this.isAuthenticated = true
        
        localStorage.setItem('token', token)
        
        return { success: true }
      } catch (error: any) {
        console.error('Login failed:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Błąd logowania'
        }
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.clearAuth()
      }
    },

    async fetchUser() {
      try {
        const response = await api.get('/auth/me')
        this.user = response.data
        return true
      } catch (error) {
        console.error('Failed to fetch user:', error)
        this.clearAuth()
        return false
      }
    },

    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    },

    // Metoda do sprawdzania i odświeżania sesji
    async checkAuth() {
      if (!this.token) return false
      
      try {
        await this.fetchUser()
        return true
      } catch (error) {
        this.clearAuth()
        return false
      }
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'auth',
        storage: localStorage,
        paths: ['token', 'isAuthenticated']
      }
    ]
  }
}) 