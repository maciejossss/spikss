<template>
  <div id="app" class="min-h-screen bg-base-200 text-base-content" :data-theme="currentTheme">
    <!-- Use AppLayout for authenticated users -->
    <AppLayout v-if="isAuthenticated" />
    
    <!-- Login page for unauthenticated users -->
    <router-view v-else />
    
    <!-- Loading overlay -->
    <LoadingOverlay v-if="isLoading" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingOverlay from '@/components/ui/LoadingOverlay.vue'

const authStore = useAuthStore()
const currentTheme = ref('light')

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isLoading = computed(() => authStore.isLoading)

// Theme management
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  currentTheme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)
  document.body.className = `bg-base-200 text-base-content ${savedTheme}`
}

// Watch for theme changes
watch(currentTheme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
  document.documentElement.setAttribute('data-theme', newTheme)
  document.body.className = `bg-base-200 text-base-content ${newTheme}`
})

onMounted(async () => {
  // Initialize theme
  initTheme()
  
  // Restore session on app start
  await authStore.restoreSession()
})
</script>

<style>
/* Global styles are in src/style.css */
html {
  @apply bg-base-200;
}

body {
  @apply bg-base-200 text-base-content;
}
</style> 