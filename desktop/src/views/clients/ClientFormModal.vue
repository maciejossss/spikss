<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-secondary-200 sticky top-0 bg-white">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-secondary-900">
            {{ isEdit ? 'Edytuj klienta' : 'Dodaj nowego klienta' }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-secondary-400 hover:text-secondary-600"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <form @submit.prevent="saveClient" class="px-6 py-4">
        <!-- Typ klienta -->
        <div class="mb-6">
          <label class="form-label">Typ klienta</label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                v-model="form.type"
                type="radio"
                value="individual"
                class="text-primary-600 focus:ring-primary-500"
              />
              <span class="ml-2">Klient prywatny</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="form.type"
                type="radio"
                value="business"
                class="text-primary-600 focus:ring-primary-500"
              />
              <span class="ml-2">Firma</span>
            </label>
          </div>
        </div>

        <!-- Dane osobowe / firmowe -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <template v-if="form.type === 'individual'">
            <div>
              <label class="form-label">Imię <span class="text-red-500">*</span></label>
              <input
                v-model="form.first_name"
                type="text"
                required
                :class="['form-input', prefillFlags.first_name ? 'prefill-highlight' : '', errors.first_name ? 'border-red-300' : '']"
                placeholder="Wprowadź imię"
              />
              <p v-if="errors.first_name" class="mt-1 text-sm text-red-600">{{ errors.first_name }}</p>
            </div>
            <div>
              <label class="form-label">Nazwisko <span class="text-red-500">*</span></label>
              <input
                v-model="form.last_name"
                type="text"
                required
                :class="['form-input', prefillFlags.last_name ? 'prefill-highlight' : '', errors.last_name ? 'border-red-300' : '']"
                placeholder="Wprowadź nazwisko"
              />
              <p v-if="errors.last_name" class="mt-1 text-sm text-red-600">{{ errors.last_name }}</p>
            </div>
          </template>
          
          <template v-if="form.type === 'business'">
            <div class="md:col-span-2">
              <label class="form-label">Nazwa firmy <span class="text-red-500">*</span></label>
              <input
                v-model="form.company_name"
                type="text"
                required
                :class="['form-input', prefillFlags.company_name ? 'prefill-highlight' : '', errors.company_name ? 'border-red-300' : '']"
                placeholder="Wprowadź nazwę firmy"
              />
              <p v-if="errors.company_name" class="mt-1 text-sm text-red-600">{{ errors.company_name }}</p>
            </div>
            <div>
              <label class="form-label">NIP</label>
              <input
                v-model="form.nip"
                type="text"
                :class="['form-input', prefillFlags.nip ? 'prefill-highlight' : '']"
                placeholder="000-000-00-00"
              />
            </div>
            <div>
              <label class="form-label">REGON</label>
              <input
                v-model="form.regon"
                type="text"
                :class="['form-input', prefillFlags.regon ? 'prefill-highlight' : '']"
                placeholder="000000000"
              />
            </div>
          </template>
        </div>

        <!-- Dane kontaktowe -->
        <div class="border-t border-secondary-200 pt-6 mb-6">
          <h4 class="text-md font-medium text-secondary-900 mb-4">Dane kontaktowe</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Telefon</label>
              <input
                v-model="form.phone"
                type="tel"
                :class="['form-input', prefillFlags.phone ? 'prefill-highlight' : '']"
                placeholder="+48 123 456 789"
              />
            </div>
            <div>
              <label class="form-label">Email</label>
              <input
                v-model="form.email"
                type="email"
                :class="['form-input', prefillFlags.email ? 'prefill-highlight' : '', errors.email ? 'border-red-300' : '']"
                placeholder="email@przykład.pl"
              />
              <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
            </div>
          </div>
        </div>

        <!-- Adres -->
        <div class="border-t border-secondary-200 pt-6 mb-6">
          <h4 class="text-md font-medium text-secondary-900 mb-4">Adres</h4>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="form-label">Ulica i numer</label>
              <input
                v-model="form.address_street"
                type="text"
                :class="['form-input', prefillFlags.address_street ? 'prefill-highlight' : '']"
                placeholder="ul. Przykładowa 123"
              />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Kod pocztowy</label>
                <input
                  v-model="form.address_postal_code"
                  type="text"
                  :class="['form-input', prefillFlags.address_postal_code ? 'prefill-highlight' : '']"
                  placeholder="00-000"
                />
              </div>
              <div>
                <label class="form-label">Miasto</label>
                <input
                  v-model="form.address_city"
                  type="text"
                  :class="['form-input', prefillFlags.address_city ? 'prefill-highlight' : '']"
                  placeholder="Warszawa"
                />
              </div>
              <div>
                <label class="form-label">Kraj</label>
                <input
                  v-model="form.address_country"
                  type="text"
                  :class="['form-input', prefillFlags.address_country ? 'prefill-highlight' : '']"
                  placeholder="Polska"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Notatki -->
        <div class="border-t border-secondary-200 pt-6 mb-6">
          <h4 class="text-md font-medium text-secondary-900 mb-4">Dodatkowe informacje</h4>
          <div>
            <label class="form-label">Notatki</label>
            <textarea
              v-model="form.notes"
              rows="3"
              :class="['form-input', prefillFlags.notes ? 'prefill-highlight' : '']"
              placeholder="Dodatkowe informacje o kliencie..."
            ></textarea>
          </div>
        </div>

        <!-- Status -->
        <div class="border-t border-secondary-200 pt-6 mb-6">
          <div class="flex items-center">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
            <label class="ml-2 text-sm text-secondary-700">Klient aktywny</label>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="generalError" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <i class="fas fa-exclamation-circle text-red-400 mt-0.5 mr-3"></i>
            <div class="text-sm text-red-700">{{ generalError }}</div>
          </div>
        </div>
      </form>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
        <button
          @click="$emit('close')"
          type="button"
          class="btn-secondary"
          :disabled="isSaving"
        >
          Anuluj
        </button>
        <button
          @click="saveClient"
          type="button"
          class="btn-primary"
          :disabled="isSaving"
        >
          <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-save mr-2"></i>
          {{ isSaving ? 'Zapisywanie...' : (isEdit ? 'Zapisz zmiany' : 'Dodaj klienta') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'

const props = defineProps({
  client: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  prefill: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

// Reactive data
const isSaving = ref(false)
const generalError = ref('')

const form = reactive({
  type: 'individual',
  first_name: '',
  last_name: '',
  company_name: '',
  nip: '',
  regon: '',
  email: '',
  phone: '',
  address_street: '',
  address_city: '',
  address_postal_code: '',
  address_country: 'Polska',
  notes: '',
  is_active: true
})

const prefillFlags = reactive({
  first_name: false,
  last_name: false,
  company_name: false,
  nip: false,
  regon: false,
  email: false,
  phone: false,
  address_street: false,
  address_city: false,
  address_postal_code: false,
  address_country: false,
  notes: false
})

const resetFormValues = () => {
  form.type = 'individual'
  form.first_name = ''
  form.last_name = ''
  form.company_name = ''
  form.nip = ''
  form.regon = ''
  form.email = ''
  form.phone = ''
  form.address_street = ''
  form.address_city = ''
  form.address_postal_code = ''
  form.address_country = 'Polska'
  form.notes = ''
  form.is_active = true
  Object.keys(prefillFlags).forEach(key => { prefillFlags[key] = false })
}

const errors = reactive({
  first_name: '',
  last_name: '',
  company_name: '',
  email: ''
})

// Methods
const clearErrors = () => {
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
  generalError.value = ''
}

const applyPrefill = (prefill) => {
  if (!prefill) return
  if (!props.isEdit) {
    resetFormValues()
  }
  Object.keys(form).forEach(key => {
    if (prefill[key] !== undefined && prefill[key] !== null) {
      form[key] = prefill[key]
      if (key in prefillFlags) {
        const val = prefill[key]
        prefillFlags[key] = typeof val === 'string' ? val.trim().length > 0 : val !== null
      }
    }
  })
  if (prefill.type) {
    form.type = prefill.type
  }
  if (prefill.is_active !== undefined && prefill.is_active !== null) {
    form.is_active = Boolean(prefill.is_active)
  }
}

const validateForm = () => {
  clearErrors()
  let isValid = true

  // Validate based on client type
  if (form.type === 'individual') {
    if (!form.first_name.trim()) {
      errors.first_name = 'Imię jest wymagane'
      isValid = false
    }
    if (!form.last_name.trim()) {
      errors.last_name = 'Nazwisko jest wymagane'
      isValid = false
    }
  } else if (form.type === 'business') {
    if (!form.company_name.trim()) {
      errors.company_name = 'Nazwa firmy jest wymagana'
      isValid = false
    }
  }

  // Validate email format
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Nieprawidłowy format email'
    isValid = false
  }

  return isValid
}

const checkForDuplicates = async (clientData) => {
  if (!window.electronAPI) return false

  if (clientData.type === 'individual') {
    // Check for duplicate individual client
    const duplicate = await window.electronAPI.database.get(
      `SELECT id FROM clients 
       WHERE type = 'individual' 
       AND first_name = ? 
       AND last_name = ? 
       AND phone = ?
       ${props.isEdit ? 'AND id != ?' : ''}`,
      props.isEdit 
        ? [clientData.first_name, clientData.last_name, clientData.phone, props.client.id]
        : [clientData.first_name, clientData.last_name, clientData.phone]
    )
    
    if (duplicate) {
      generalError.value = `Klient ${clientData.first_name} ${clientData.last_name} z numerem ${clientData.phone} już istnieje w bazie danych.`
      return true
    }
  } else {
    // Check for duplicate business client
    const duplicate = await window.electronAPI.database.get(
      `SELECT id FROM clients 
       WHERE type = 'business' 
       AND (company_name = ? OR (nip IS NOT NULL AND nip = ?))
       ${props.isEdit ? 'AND id != ?' : ''}`,
      props.isEdit 
        ? [clientData.company_name, clientData.nip, props.client.id]
        : [clientData.company_name, clientData.nip]
    )
    
    if (duplicate) {
      generalError.value = `Firma ${clientData.company_name}${clientData.nip ? ' (NIP: ' + clientData.nip + ')' : ''} już istnieje w bazie danych.`
      return true
    }
  }
  
  return false
}

const saveClient = async () => {
  if (!validateForm()) return

  isSaving.value = true
  generalError.value = ''

  try {
    // Prepare data for saving
    const clientData = {
      type: form.type,
      first_name: form.type === 'individual' ? form.first_name : null,
      last_name: form.type === 'individual' ? form.last_name : null,
      company_name: form.type === 'business' ? form.company_name : null,
      nip: form.type === 'business' ? form.nip : null,
      regon: form.type === 'business' ? form.regon : null,
      email: form.email || null,
      phone: form.phone || null,
      address_street: form.address_street || null,
      address_city: form.address_city || null,
      address_postal_code: form.address_postal_code || null,
      address_country: form.address_country || 'Polska',
      notes: form.notes || null,
      is_active: form.is_active ? 1 : 0
    }

    // Check for duplicates
    const isDuplicate = await checkForDuplicates(clientData)
    if (isDuplicate) {
      isSaving.value = false
      return
    }

    let savedClient

    if (props.isEdit) {
      // Update existing client
      if (window.electronAPI) {
        await window.electronAPI.database.run(
          `UPDATE clients SET 
           type = ?, first_name = ?, last_name = ?, company_name = ?, 
           nip = ?, regon = ?, email = ?, phone = ?, 
           address_street = ?, address_city = ?, address_postal_code = ?, address_country = ?,
           notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            clientData.type, clientData.first_name, clientData.last_name, clientData.company_name,
            clientData.nip, clientData.regon, clientData.email, clientData.phone,
            clientData.address_street, clientData.address_city, clientData.address_postal_code, clientData.address_country,
            clientData.notes, clientData.is_active, props.client.id
          ]
        )
      }
      
      savedClient = { ...props.client, ...clientData }
    } else {
      // Add new client
      if (window.electronAPI) {
        const result = await window.electronAPI.database.run(
          `INSERT INTO clients (
            type, first_name, last_name, company_name, nip, regon, 
            email, phone, address_street, address_city, address_postal_code, address_country,
            notes, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            clientData.type, clientData.first_name, clientData.last_name, clientData.company_name,
            clientData.nip, clientData.regon, clientData.email, clientData.phone,
            clientData.address_street, clientData.address_city, clientData.address_postal_code, clientData.address_country,
            clientData.notes, clientData.is_active
          ]
        )
        
        savedClient = { id: result.id, ...clientData, created_at: new Date().toISOString() }
      } else {
        // Fallback for browser
        savedClient = { 
          id: Date.now(), 
          ...clientData, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    }

    emit('saved', savedClient)
    if (!props.isEdit) {
      resetFormValues()
    }

    // Best-effort: automatycznie wyeksportuj zaktualizowanego klienta do Railway,
    // aby PWA natychmiast zobaczyła zmiany bez ręcznego odświeżania.
    try {
      const idToExport = savedClient && savedClient.id ? savedClient.id : (props.client && props.client.id)
      if (idToExport) {
        fetch('http://localhost:5174/api/railway/export-client/' + idToExport, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }
        }).catch(()=>{})
      }
    } catch (e) { /* ignore */ }
  } catch (error) {
    console.error('Error saving client:', error)
    generalError.value = 'Błąd podczas zapisywania klienta'
  } finally {
    isSaving.value = false
  }
}

// Initialize form with client data if editing
const initializeForm = () => {
  if (props.client && props.isEdit) {
    Object.keys(form).forEach(key => {
      if (props.client[key] !== undefined) {
        form[key] = props.client[key]
      }
    })
    form.is_active = Boolean(props.client.is_active)
  } else if (!props.isEdit && props.prefill) {
    applyPrefill(props.prefill)
  } else if (!props.isEdit) {
    resetFormValues()
  }
}

// Watch for prop changes
watch(() => props.client, initializeForm, { immediate: true })
watch(() => props.prefill, (newPrefill) => {
  if (!props.isEdit && newPrefill) {
    applyPrefill(newPrefill)
  }
}, { immediate: true })

watch(() => form.first_name, (val) => { if (!val) prefillFlags.first_name = false })
watch(() => form.last_name, (val) => { if (!val) prefillFlags.last_name = false })
watch(() => form.company_name, (val) => { if (!val) prefillFlags.company_name = false })
watch(() => form.nip, (val) => { if (!val) prefillFlags.nip = false })
watch(() => form.regon, (val) => { if (!val) prefillFlags.regon = false })
watch(() => form.email, (val) => { if (!val) prefillFlags.email = false })
watch(() => form.phone, (val) => { if (!val) prefillFlags.phone = false })
watch(() => form.address_street, (val) => { if (!val) prefillFlags.address_street = false })
watch(() => form.address_city, (val) => { if (!val) prefillFlags.address_city = false })
watch(() => form.address_postal_code, (val) => { if (!val) prefillFlags.address_postal_code = false })
watch(() => form.address_country, (val) => { if (!val) prefillFlags.address_country = false })
watch(() => form.notes, (val) => { if (!val) prefillFlags.notes = false })

// Lifecycle
onMounted(() => {
  initializeForm()
})
</script> 

<style scoped>
.prefill-highlight {
  background-color: #eef3ff;
  color: #1c3d8f;
  border-color: #a2b4e6;
}
</style>