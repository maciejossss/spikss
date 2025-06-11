import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import './style.css'

// Create Vue app
const app = createApp(App)

// Pinia store
const pinia = createPinia()
app.use(pinia)

// Vue Router
app.use(router)

// Head management
const head = createHead()
app.use(head)

// Toast notifications
app.use(Toast, {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
})

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error, info)
  // Here you could send errors to monitoring service
}

// Mount app
app.mount('#app') 