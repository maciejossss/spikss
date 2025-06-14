import { defineStore } from 'pinia'

export const useFormStore = defineStore('form', {
  state: () => ({
    savedFormData: null,
    returnPath: null
  }),
  
  actions: {
    saveFormState(formData, path) {
      this.savedFormData = formData
      this.returnPath = path
    },
    
    clearFormState() {
      this.savedFormData = null
      this.returnPath = null
    }
  },
  
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'form_store',
        storage: localStorage
      }
    ]
  }
}) 