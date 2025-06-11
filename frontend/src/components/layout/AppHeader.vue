<template>
  <header class="navbar bg-base-100 border-b border-base-300 shadow-sm safe-area-top">
    <div class="navbar-start">
      <!-- Logo and title -->
      <button
        @click="$router.push('/')"
        class="btn btn-ghost normal-case text-xl"
      >
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2">
          <Settings class="w-5 h-5 text-primary-content" />
        </div>
        <div class="hidden sm:block">
          <span class="font-semibold text-base-content">System Serwisowy</span>
        </div>
      </button>
    </div>

    <div class="navbar-end">
      <div class="flex items-center space-x-2">
        <!-- Notifications -->
        <div class="indicator">
          <span class="indicator-item badge badge-secondary badge-xs"></span>
          <button class="btn btn-ghost btn-circle">
            <Bell class="w-5 h-5" />
          </button>
        </div>

        <!-- User dropdown -->
        <div class="dropdown dropdown-end" ref="userMenuRef">
          <label tabindex="0" class="btn btn-ghost btn-circle avatar">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User class="w-5 h-5 text-primary" />
            </div>
          </label>
          
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300">
            <!-- User info header -->
            <li class="menu-title">
              <span class="text-base-content font-semibold">
                {{ user?.first_name }} {{ user?.last_name }}
              </span>
              <span class="text-base-content/60 text-xs">{{ user?.email }}</span>
              <span class="text-base-content/60 text-xs">{{ roleLabel }}</span>
            </li>
            
            <li><a @click="handleProfile" class="text-base-content">
              <UserCircle class="w-4 h-4" />
              Profil
            </a></li>
            
            <li><a @click="handleSettings" class="text-base-content">
              <Settings class="w-4 h-4" />
              Ustawienia
            </a></li>
            
            <li class="border-t border-base-300 mt-2 pt-2">
              <a @click="handleLogout" class="text-error">
                <LogOut class="w-4 h-4" />
                Wyloguj
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  Settings, 
  Bell, 
  User, 
  UserCircle, 
  ChevronDown, 
  LogOut 
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const showUserMenu = ref(false)
const userMenuRef = ref(null)

const user = computed(() => authStore.user)
const roleLabel = computed(() => {
  const roles = {
    admin: 'Administrator',
    manager: 'Kierownik',
    technician: 'Technik'
  }
  return roles[user.value?.role] || user.value?.role
})

function handleProfile() {
  showUserMenu.value = false
  // Navigate to profile page when implemented
  console.log('Profile clicked')
}

function handleSettings() {
  showUserMenu.value = false
  router.push('/settings')
}

async function handleLogout() {
  showUserMenu.value = false
  await authStore.logout()
  router.push('/login')
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script> 