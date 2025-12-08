<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo i nagłówek -->
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4">
          <span class="text-white font-bold text-2xl">S</span>
        </div>
        <h2 class="text-3xl font-bold text-secondary-900">System Serwisowy</h2>
        <p class="mt-2 text-sm text-secondary-600">Zaloguj się do swojego konta</p>
      </div>

      <!-- Formularz logowania -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Nazwa użytkownika -->
          <div>
            <label for="username" class="form-label">
              Nazwa użytkownika
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              required
              class="form-input"
              :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': errors.username }"
              placeholder="Wprowadź nazwę użytkownika"
            />
            <p v-if="errors.username" class="mt-1 text-sm text-red-600">
              {{ errors.username }}
            </p>
          </div>

          <!-- Hasło -->
          <div>
            <label for="password" class="form-label">
              Hasło
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="form-input pr-10"
                :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': errors.password }"
                placeholder="Wprowadź hasło"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="w-4 h-4 text-secondary-400"></i>
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">
              {{ errors.password }}
            </p>
          </div>

          <!-- Zapamiętaj mnie -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember"
                v-model="form.remember"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label for="remember" class="ml-2 block text-sm text-secondary-700">
                Zapamiętaj mnie
              </label>
            </div>
          </div>

          <!-- Błąd globalny -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <i class="fas fa-exclamation-circle text-red-400 mt-0.5 mr-3"></i>
              <div class="text-sm text-red-700">{{ error }}</div>
            </div>
          </div>

          <!-- Przycisk logowania -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full btn-primary"
            :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
          >
            <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-sign-in-alt mr-2"></i>
            {{ isLoading ? 'Logowanie...' : 'Zaloguj się' }}
          </button>
        </form>

        <!-- Informacje testowe -->
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-medium text-blue-800 mb-2">Dane testowe:</h4>
          <div class="text-xs text-blue-700 space-y-1">
            <div><strong>Użytkownik:</strong> admin</div>
            <div><strong>Hasło:</strong> admin123</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-xs text-secondary-500">
        System Serwisowy © 2024. Wszystkie prawa zastrzeżone.
      </div>
    </div>
  </div>
</template>

<script setup>
console.log('=== LOGIN.VUE LOADED ===')

import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const errors = reactive({
  username: '',
  password: ''
})

const clearErrors = () => {
  errors.username = ''
  errors.password = ''
  error.value = ''
}

const validateForm = () => {
  clearErrors()
  let isValid = true

  if (!form.username.trim()) {
    errors.username = 'Nazwa użytkownika jest wymagana'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'Hasło jest wymagane'
    isValid = false
  } else if (form.password.length < 3) {
    errors.password = 'Hasło musi mieć co najmniej 3 znaki'
    isValid = false
  }

  return isValid
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = ''

  try {
    const result = await authStore.login(form.username, form.password)
    
    if (result.success) {
      router.push('/')
    } else {
      error.value = result.error || 'Błąd podczas logowania'
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = 'Wystąpił nieoczekiwany błąd'
  } finally {
    isLoading.value = false
  }
}
</script> 