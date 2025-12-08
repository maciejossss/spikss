console.log('🔥 MAIN.JS - Step 1: Starting import')

import { createApp } from 'vue'
import { createPinia } from 'pinia'

console.log('🔥 MAIN.JS - Step 2: Vue imported')

import App from './App.vue'

console.log('🔥 MAIN.JS - Step 3: App imported')

import router from './router'

console.log('🔥 MAIN.JS - Step 4: Router imported')

import './style.css'

console.log('🔥 MAIN.JS - Step 5: CSS imported')

console.log('=== MAIN.JS START ===')

try {
  const app = createApp(App)
  
  console.log('🔥 MAIN.JS - Step 6: App created')
  
  app.use(createPinia())
  
  console.log('🔥 MAIN.JS - Step 7: Pinia added')
  
  app.use(router)
  
  console.log('🔥 MAIN.JS - Step 8: Router added')
  
  // Obsługa błędów PRZED mountem
  app.config.errorHandler = (err, vm, info) => {
    console.error('❌ Vue error:', err, info)
  }
  
  console.log('🔥 MAIN.JS - Step 9: About to mount')
  
  app.mount('#app')
  
  console.log('🔥 === MAIN.JS MOUNTED SUCCESSFULLY ===')
  
} catch (error) {
  console.error('❌ MAIN.JS ERROR:', error)
}

window.addEventListener('error', (e) => {
  console.error('❌ Global error:', e.error)
})

// Test czy DOM działa
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 DOM loaded')
  
  // Test prostego kliknięcia
  setTimeout(() => {
    const testButton = document.querySelector('#test-new-order-btn')
    if (testButton) {
      console.log('🔥 Found test button:', testButton)
      testButton.addEventListener('click', () => {
        console.log('🔥 TEST BUTTON CLICKED!')
      })
    } else {
      console.log('❌ Test button not found')
    }
  }, 2000)
}) 