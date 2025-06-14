export default {
  setup() {
    const form = ref({
      name: '',
      email: '',
      phone: '',
      address: '',
      // ... inne pola formularza
    })
    
    // Nasłuchuj na event przywracania stanu formularza
    onMounted(() => {
      window.addEventListener('form-restore', (event) => {
        if (event.detail) {
          form.value = { ...form.value, ...event.detail }
        }
      })
    })
    
    onUnmounted(() => {
      window.removeEventListener('form-restore')
    })
    
    // ... reszta kodu komponentu
  }
} 