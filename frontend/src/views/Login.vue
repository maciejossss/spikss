<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 relative overflow-hidden">
    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div class="absolute top-40 left-40 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo and title -->
      <div class="text-center mb-8">
        <div class="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary-focus rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/25 hover:scale-105 transition-transform duration-300">
          <Settings class="w-10 h-10 text-primary-content" />
        </div>
        <h1 class="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          System Serwisowy
        </h1>
        <p class="text-base-content/70 text-base font-medium">
          Palniki & Kotły
        </p>
      </div>

      <!-- Login form with glass morphism -->
      <div class="card bg-base-100/80 backdrop-blur-lg shadow-2xl border border-base-300/20">
        <div class="card-body">
          <form @submit.prevent="handleLogin" class="space-y-6">
            <div class="form-control">
              <label class="label" for="username">
                <span class="label-text font-semibold">Nazwa użytkownika</span>
              </label>
              <div class="relative">
                <input
                  id="username"
                  v-model="form.username"
                  type="text"
                  required
                  autocomplete="username"
                  class="input input-bordered w-full bg-base-100/50 backdrop-blur-sm hover:bg-base-100/70 transition-all duration-300"
                  :class="{ 'input-error': errors.username }"
                  placeholder="Wprowadź nazwę użytkownika"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <User class="w-5 h-5 text-base-content/40" />
                </div>
              </div>
              <label v-if="errors.username" class="label">
                <span class="label-text-alt text-error">{{ errors.username }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label" for="password">
                <span class="label-text font-semibold">Hasło</span>
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  class="input input-bordered w-full bg-base-100/50 backdrop-blur-sm hover:bg-base-100/70 transition-all duration-300 pr-12"
                  :class="{ 'input-error': errors.password }"
                  placeholder="Wprowadź hasło"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="btn btn-ghost btn-sm absolute inset-y-0 right-0 rounded-l-none"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
              <label v-if="errors.password" class="label">
                <span class="label-text-alt text-error">{{ errors.password }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start">
                <input
                  id="remember"
                  v-model="form.remember"
                  type="checkbox"
                  class="checkbox checkbox-primary mr-3"
                />
                <span class="label-text">Zapamiętaj mnie</span>
              </label>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="btn btn-primary w-full shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              <div v-if="isLoading" class="loading loading-spinner loading-sm mr-2"></div>
              <span v-if="isLoading">Logowanie...</span>
              <span v-else>Zaloguj się</span>
            </button>
          </form>

          <!-- Demo accounts info -->
          <div class="mt-8 p-6 bg-gradient-to-r from-base-200 to-base-300 rounded-2xl border border-base-300">
            <h3 class="text-sm font-bold text-base-content mb-3 flex items-center">
              <div class="w-2 h-2 bg-success rounded-full mr-2"></div>
              Konta testowe:
            </h3>
            <div class="space-y-2">
              <button
                @click="quickLogin('admin', 'Admin123!')"
                class="btn btn-outline btn-block justify-between text-left"
              >
                <div>
                  <div class="text-sm font-semibold">admin / Admin123!</div>
                  <div class="text-xs opacity-60">Administrator - pełny dostęp</div>
                </div>
                <div class="badge badge-error badge-sm"></div>
              </button>
              
              <button
                @click="quickLogin('technik1', 'Technik123!')"
                class="btn btn-outline btn-block justify-between text-left"
              >
                <div>
                  <div class="text-sm font-semibold">technik1 / Technik123!</div>
                  <div class="text-xs opacity-60">Technik - serwis i urządzenia</div>
                </div>
                <div class="badge badge-info badge-sm"></div>
              </button>
              
              <button
                @click="quickLogin('kierownik', 'Kierownik123!')"
                class="btn btn-outline btn-block justify-between text-left"
              >
                <div>
                  <div class="text-sm font-semibold">kierownik / Kierownik123!</div>
                  <div class="text-xs opacity-60">Kierownik - zarządzanie i raporty</div>
                </div>
                <div class="badge badge-success badge-sm"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-8 text-sm text-base-content/60 font-medium">
        System Serwisowy Palniki & Kotły v1.0.0
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Settings, Eye, EyeOff, User } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: '',
  remember: false
})

const errors = ref({})
const showPassword = ref(false)

const isLoading = computed(() => authStore.isLoading)

function validateForm() {
  errors.value = {}
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Nazwa użytkownika jest wymagana'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Hasło jest wymagane'
  }
  
  return Object.keys(errors.value).length === 0
}

async function handleLogin() {
  if (!validateForm()) {
    return
  }

  const result = await authStore.login({
    username: form.value.username,
    password: form.value.password
  })

  if (result.success) {
    router.push('/')
  } else {
    // Error is handled by the store and shown via toast
    errors.value.general = result.message
  }
}

// Quick login functions for demo
function quickLogin(username, password) {
  form.value.username = username
  form.value.password = password
  handleLogin()
}
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style> 