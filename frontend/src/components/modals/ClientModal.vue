<template>
  <div 
    v-if="isOpen"
    class="modal modal-open"
    @click.self="closeModal"
  >
    <div class="modal-box w-11/12 max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-base-content">
          {{ isEditing ? 'Edytuj klienta' : 'Dodaj nowego klienta' }}
        </h2>
        <button 
          @click="closeModal"
          class="btn btn-sm btn-circle btn-ghost"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit">
        
        <!-- Global Error Message -->
        <div v-if="globalError" class="alert alert-error mb-4">
          <div class="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="font-bold">Błąd walidacji</h3>
              <div class="text-sm">{{ globalError }}</div>
            </div>
          </div>
        </div>

        <!-- Client Type -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">Typ klienta</span>
          </label>
          <div class="flex gap-4">
            <label class="label cursor-pointer">
              <input 
                type="radio" 
                name="client_type" 
                value="individual"
                v-model="form.client_type"
                class="radio radio-primary" 
              />
              <span class="label-text ml-2">Osoba prywatna</span>
            </label>
            <label class="label cursor-pointer">
              <input 
                type="radio" 
                name="client_type" 
                value="business"
                v-model="form.client_type"
                class="radio radio-primary" 
              />
              <span class="label-text ml-2">Firma</span>
            </label>
          </div>
          <div v-if="errors.client_type" class="label">
            <span class="label-text-alt text-error">{{ errors.client_type }}</span>
          </div>
        </div>

        <!-- Company Name (for business clients) -->
        <div v-if="form.client_type === 'business'" class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">Nazwa firmy *</span>
          </label>
          <input 
            type="text" 
            v-model="form.company_name"
            placeholder="np. TERMO-BUD Sp. z o.o."
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.company_name }"
          />
          <div v-if="errors.company_name" class="label">
            <span class="label-text-alt text-error">{{ errors.company_name }}</span>
          </div>
        </div>

        <!-- NIP (for business clients) -->
        <div v-if="form.client_type === 'business'" class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">NIP</span>
          </label>
          <input 
            type="text" 
            v-model="form.nip"
            placeholder="000-000-00-00"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.nip }"
          />
          <div v-if="errors.nip" class="label">
            <span class="label-text-alt text-error">{{ errors.nip }}</span>
          </div>
        </div>

        <!-- Contact Person -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">
              {{ form.client_type === 'business' ? 'Osoba kontaktowa' : 'Imię i nazwisko' }} *
            </span>
          </label>
          <input 
            type="text" 
            v-model="form.contact_person"
            placeholder="np. Jan Kowalski"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.contact_person }"
          />
          <div v-if="errors.contact_person" class="label">
            <span class="label-text-alt text-error">{{ errors.contact_person }}</span>
          </div>
        </div>

        <!-- Contact Info Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- Phone -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Telefon *</span>
            </label>
            <input 
              type="tel" 
              v-model="form.phone"
              placeholder="+48 123 456 789"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.phone }"
            />
            <div v-if="errors.phone" class="label">
              <span class="label-text-alt text-error">{{ errors.phone }}</span>
            </div>
          </div>

          <!-- Email -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Email</span>
            </label>
            <input 
              type="email" 
              v-model="form.email"
              placeholder="email@example.com"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.email }"
            />
            <div v-if="errors.email" class="label">
              <span class="label-text-alt text-error">{{ errors.email }}</span>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">Adres</span>
          </label>
          <input 
            type="text" 
            v-model="form.address_street"
            placeholder="ul. Przykładowa 123"
            class="input input-bordered w-full mb-2"
          />
          <div class="grid grid-cols-2 gap-2">
            <input 
              type="text" 
              v-model="form.address_postal_code"
              placeholder="00-000"
              class="input input-bordered w-full"
            />
            <input 
              type="text" 
              v-model="form.address_city"
              placeholder="Miasto"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Priority Level -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-medium">Poziom priorytetu</span>
          </label>
          <select 
            v-model="form.priority_level"
            class="select select-bordered w-full"
          >
            <option value="standard">Standardowy</option>
            <option value="high">Wysoki</option>
            <option value="urgent">Pilny</option>
          </select>
        </div>

        <!-- Notes -->
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Notatki</span>
          </label>
          <textarea 
            v-model="form.notes"
            placeholder="Dodatkowe informacje o kliencie..."
            class="textarea textarea-bordered h-20"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="modal-action">
          <button 
            type="button"
            @click="closeModal"
            class="btn btn-ghost"
          >
            Anuluj
          </button>
          <button 
            type="submit"
            class="btn btn-primary"
            :class="{ 'loading': isSubmitting }"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? '' : (isEditing ? 'Zapisz zmiany' : 'Dodaj klienta') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import api from '@/services/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  client: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const isEditing = ref(false)
const isSubmitting = ref(false)
const globalError = ref('')

const form = reactive({
  client_type: 'individual',
  company_name: '',
  nip: '',
  contact_person: '',
  phone: '',
  email: '',
  address_street: '',
  address_postal_code: '',
  address_city: '',
  priority_level: 'standard',
  notes: ''
})

const errors = ref({})

// Watch for client changes (for editing)
watch(() => props.client, (newClient) => {
  if (newClient) {
    isEditing.value = true
    Object.assign(form, {
      client_type: newClient.client_type || 'individual',
      company_name: newClient.company_name || '',
      nip: newClient.nip || '',
      contact_person: newClient.contact_person || '',
      phone: newClient.phone || '',
      email: newClient.email || '',
      address_street: newClient.address_street || '',
      address_postal_code: newClient.address_postal_code || '',
      address_city: newClient.address_city || '',
      priority_level: newClient.priority_level || 'standard',
      notes: newClient.notes || ''
    })
  } else {
    isEditing.value = false
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  Object.assign(form, {
    client_type: 'individual',
    company_name: '',
    nip: '',
    contact_person: '',
    phone: '',
    email: '',
    address_street: '',
    address_postal_code: '',
    address_city: '',
    priority_level: 'standard',
    notes: ''
  })
  errors.value = {}
  globalError.value = ''
}

function validateForm() {
  errors.value = {}
  globalError.value = ''

  if (!form.client_type) {
    errors.value.client_type = 'Wybierz typ klienta'
  }

  if (form.client_type === 'business' && !form.company_name.trim()) {
    errors.value.company_name = 'Nazwa firmy jest wymagana'
  }

  if (!form.contact_person.trim()) {
    errors.value.contact_person = 'Osoba kontaktowa jest wymagana'
  }

  if (!form.phone.trim()) {
    errors.value.phone = 'Telefon jest wymagany'
  }

  if (form.email && !isValidEmail(form.email)) {
    errors.value.email = 'Nieprawidłowy format email'
  }

  if (form.nip && !isValidNIP(form.nip)) {
    errors.value.nip = 'Nieprawidłowy format NIP'
  }

  return Object.keys(errors.value).length === 0
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidNIP(nip) {
  const nipRegex = /^\d{3}-\d{3}-\d{2}-\d{2}$|^\d{10}$/
  return nipRegex.test(nip.replace(/[-\s]/g, ''))
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  globalError.value = ''

  try {
    const clientData = {
      ...form,
      // Clean up empty strings
      company_name: form.company_name.trim() || null,
      nip: form.nip.trim() || null,
      email: form.email.trim() || null,
      address_street: form.address_street.trim() || null,
      address_postal_code: form.address_postal_code.trim() || null,
      address_city: form.address_city.trim() || null,
      notes: form.notes.trim() || null
    }

    let response
    if (isEditing.value) {
      response = await api.put(`/clients/${props.client.id}`, clientData)
    } else {
      response = await api.post('/clients', clientData)
    }

    if (response.data.success) {
      emit('saved', response.data.data)
      closeModal()
      resetForm()
    } else {
      throw new Error(response.data.message || 'Błąd podczas zapisywania')
    }
  } catch (error) {
    console.error('Error saving client:', error)
    
    // Check if it's a business logic error (400 status)
    if (error.response?.status === 400 && error.response?.data?.message) {
      globalError.value = error.response.data.message
    } else if (error.response?.status === 500 && error.response?.data?.message) {
      const errorMessage = error.response.data.message
      
      // Check for specific duplicate client errors
      if (errorMessage.includes('już istnieje') || errorMessage.includes('duplicate') || errorMessage.includes('Klient')) {
        globalError.value = errorMessage.replace('Błąd podczas tworzenia klienta: ', '').replace('Błąd podczas aktualizacji klienta: ', '')
      } else {
        globalError.value = 'Wystąpił błąd podczas zapisywania klienta: ' + errorMessage
      }
    } else if (error.response?.data?.errors) {
      // Handle field validation errors
      errors.value = error.response.data.errors
      globalError.value = 'Sprawdź poprawność wprowadzonych danych'
    } else if (error.response?.data?.message) {
      globalError.value = error.response.data.message
    } else if (error.message) {
      globalError.value = error.message
    } else {
      globalError.value = 'Wystąpił nieoczekiwany błąd podczas zapisywania klienta'
    }
  } finally {
    isSubmitting.value = false
  }
}

function closeModal() {
  emit('close')
  nextTick(() => {
    resetForm()
  })
}
</script> 