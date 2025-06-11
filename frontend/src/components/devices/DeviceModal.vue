<template>
  <div v-if="visible" class="device-modal-overlay" @click="handleOverlayClick">
    <div class="device-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-cogs"></i>
          {{ isEdit ? 'Edytuj urządzenie' : 'Dodaj nowe urządzenie' }}
        </h3>
        <button @click="handleClose" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-grid">
          <!-- Client Selection -->
          <div class="form-group full-width">
            <label class="form-label required">Klient</label>
            <select 
              v-model="form.client_id" 
              :class="['form-control', { 'is-invalid': errors.client_id }]"
              :disabled="loading"
              required
            >
              <option value="">Wybierz klienta</option>
              <option 
                v-for="client in clients" 
                :key="client.id" 
                :value="client.id"
              >
                {{ client.company_name }} - {{ client.contact_person }}
              </option>
            </select>
            <div v-if="errors.client_id" class="invalid-feedback">
              {{ errors.client_id }}
            </div>
          </div>

          <!-- Device Type -->
          <div class="form-group">
            <label class="form-label required">Typ urządzenia</label>
            <select 
              v-model="form.device_type" 
              :class="['form-control', { 'is-invalid': errors.device_type }]"
              :disabled="loading"
              @change="onDeviceTypeChange"
              required
            >
              <option value="">Wybierz typ</option>
              <option 
                v-for="type in deviceConfig.device_types" 
                :key="type.value" 
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
            <div v-if="errors.device_type" class="invalid-feedback">
              {{ errors.device_type }}
            </div>
          </div>

          <!-- Brand -->
          <div class="form-group">
            <label class="form-label">Marka</label>
            <select
              v-model="form.brand"
              :class="['form-control', { 'is-invalid': errors.brand }]"
              :disabled="loading"
              @change="onBrandChange"
            >
              <option value="">Wybierz markę</option>
              <option 
                v-for="brand in deviceConfig.brands" 
                :key="brand.value" 
                :value="brand.value"
              >
                {{ brand.label }}
              </option>
            </select>
            <div v-if="errors.brand" class="invalid-feedback">
              {{ errors.brand }}
            </div>
          </div>

          <!-- Model -->
          <div class="form-group">
            <label class="form-label">Model</label>
            <select
              v-model="form.model"
              :class="['form-control', { 'is-invalid': errors.model }]"
              :disabled="loading || !form.brand || !form.device_type"
              @change="onModelChange"
            >
              <option value="">Wybierz model</option>
              <template v-for="category in availableModels" :key="category.category">
                <optgroup :label="category.category">
                  <option 
                    v-for="model in category.models" 
                    :key="model.value" 
                    :value="model.value"
                  >
                    {{ model.label }}
                  </option>
                </optgroup>
              </template>
              <option value="__custom__" v-if="form.brand && form.device_type">
                🔧 Inny model (wpisz własny)
              </option>
            </select>
            <div v-if="errors.model" class="invalid-feedback">
              {{ errors.model }}
            </div>
            <small v-if="!form.brand || !form.device_type" class="form-text text-muted">
              Najpierw wybierz typ urządzenia i markę
            </small>
          </div>

          <!-- Custom Model Input -->
          <div v-if="form.model === '__custom__'" class="form-group">
            <label class="form-label">Własny model</label>
            <input
              type="text"
              v-model="form.custom_model"
              :class="['form-control', { 'is-invalid': errors.custom_model }]"
              :disabled="loading"
              placeholder="Wpisz model urządzenia..."
            >
            <div v-if="errors.custom_model" class="invalid-feedback">
              {{ errors.custom_model }}
            </div>
          </div>

          <!-- Serial Number -->
          <div class="form-group">
            <label class="form-label">Numer seryjny</label>
            <input
              type="text"
              v-model="form.serial_number"
              :class="['form-control', { 'is-invalid': errors.serial_number }]"
              :disabled="loading"
              placeholder="Numer seryjny"
            >
            <div v-if="errors.serial_number" class="invalid-feedback">
              {{ errors.serial_number }}
            </div>
          </div>

          <!-- Manufacture Year -->
          <div class="form-group">
            <label class="form-label">Rok produkcji</label>
            <input
              type="number"
              v-model.number="form.manufacture_year"
              :class="['form-control', { 'is-invalid': errors.manufacture_year }]"
              :disabled="loading"
              :min="1950"
              :max="currentYear"
              placeholder="RRRR"
            >
            <div v-if="errors.manufacture_year" class="invalid-feedback">
              {{ errors.manufacture_year }}
            </div>
          </div>

          <!-- Power Rating -->
          <div class="form-group">
            <label class="form-label">Moc [kW]</label>
            <input
              type="number"
              v-model.number="form.power_rating"
              :class="['form-control', { 'is-invalid': errors.power_rating }]"
              :disabled="loading"
              step="0.1"
              min="0"
              max="10000"
              placeholder="0.0"
            >
            <div v-if="errors.power_rating" class="invalid-feedback">
              {{ errors.power_rating }}
            </div>
          </div>

          <!-- Fuel Type -->
          <div class="form-group">
            <label class="form-label">Typ paliwa</label>
            <select 
              v-model="form.fuel_type" 
              :class="['form-control', { 'is-invalid': errors.fuel_type }]"
              :disabled="loading"
            >
              <option value="">Wybierz paliwo</option>
              <option 
                v-for="fuel in deviceConfig.fuel_types" 
                :key="fuel.value" 
                :value="fuel.value"
              >
                {{ fuel.label }}
              </option>
            </select>
            <div v-if="errors.fuel_type" class="invalid-feedback">
              {{ errors.fuel_type }}
            </div>
          </div>

          <!-- Installation Date -->
          <div class="form-group">
            <label class="form-label">Data instalacji</label>
            <input
              type="date"
              v-model="form.installation_date"
              :class="['form-control', { 'is-invalid': errors.installation_date }]"
              :disabled="loading"
              :max="today"
            >
            <div v-if="errors.installation_date" class="invalid-feedback">
              {{ errors.installation_date }}
            </div>
          </div>

          <!-- Warranty Expiry -->
          <div class="form-group">
            <label class="form-label">Data wygaśnięcia gwarancji</label>
            <input
              type="date"
              v-model="form.warranty_expiry_date"
              :class="['form-control', { 'is-invalid': errors.warranty_expiry_date }]"
              :disabled="loading"
            >
            <div v-if="errors.warranty_expiry_date" class="invalid-feedback">
              {{ errors.warranty_expiry_date }}
            </div>
          </div>

          <!-- Maintenance Interval -->
          <div class="form-group">
            <label class="form-label">Interwał serwisu [dni]</label>
            <input
              type="number"
              v-model.number="form.maintenance_interval_days"
              :class="['form-control', { 'is-invalid': errors.maintenance_interval_days }]"
              :disabled="loading"
              min="1"
              max="3650"
              placeholder="365"
            >
            <div v-if="errors.maintenance_interval_days" class="invalid-feedback">
              {{ errors.maintenance_interval_days }}
            </div>
          </div>

          <!-- Last Service Date -->
          <div class="form-group">
            <label class="form-label">Ostatni serwis</label>
            <input
              type="date"
              v-model="form.last_service_date"
              :class="['form-control', { 'is-invalid': errors.last_service_date }]"
              :disabled="loading"
              :max="today"
            >
            <div v-if="errors.last_service_date" class="invalid-feedback">
              {{ errors.last_service_date }}
            </div>
          </div>

          <!-- Status -->
          <div class="form-group">
            <label class="form-label">Status</label>
            <select 
              v-model="form.status" 
              :class="['form-control', { 'is-invalid': errors.status }]"
              :disabled="loading"
            >
              <option 
                v-for="status in deviceConfig.status_options" 
                :key="status.value" 
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
            <div v-if="errors.status" class="invalid-feedback">
              {{ errors.status }}
            </div>
          </div>

          <!-- Condition Rating -->
          <div class="form-group">
            <label class="form-label">Ocena stanu</label>
            <select 
              v-model.number="form.condition_rating" 
              :class="['form-control', { 'is-invalid': errors.condition_rating }]"
              :disabled="loading"
            >
              <option value="">Wybierz ocenę</option>
              <option 
                v-for="rating in deviceConfig.condition_ratings" 
                :key="rating.value" 
                :value="rating.value"
              >
                {{ rating.label }}
              </option>
            </select>
            <div v-if="errors.condition_rating" class="invalid-feedback">
              {{ errors.condition_rating }}
            </div>
          </div>

          <!-- Location -->
          <div class="form-group full-width">
            <label class="form-label">Opis lokalizacji</label>
            <textarea
              v-model="form.location_description"
              :class="['form-control', { 'is-invalid': errors.location_description }]"
              :disabled="loading"
              rows="2"
              placeholder="Opis lokalizacji urządzenia..."
            ></textarea>
            <div v-if="errors.location_description" class="invalid-feedback">
              {{ errors.location_description }}
            </div>
          </div>

          <!-- Notes -->
          <div class="form-group full-width">
            <label class="form-label">Uwagi</label>
            <textarea
              v-model="form.notes"
              :class="['form-control', { 'is-invalid': errors.notes }]"
              :disabled="loading"
              rows="3"
              placeholder="Dodatkowe uwagi dotyczące urządzenia..."
            ></textarea>
            <div v-if="errors.notes" class="invalid-feedback">
              {{ errors.notes }}
            </div>
          </div>
        </div>
      </form>

      <!-- Footer -->
      <div class="modal-footer">
        <button 
          type="button"
          @click="handleClose"
          class="btn btn-outline-secondary"
          :disabled="loading"
        >
          Anuluj
        </button>
        <button 
          type="submit"
          @click="handleSubmit"
          class="btn btn-primary"
          :disabled="loading || !isFormValid"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ isEdit ? 'Zapisz zmiany' : 'Dodaj urządzenie' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import api from '@/services/api'

export default {
  name: 'DeviceModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    device: {
      type: Object,
      default: null
    },
    clients: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const deviceStore = useDeviceStore()
    const loading = ref(false)
    const loadingModels = ref(false)
    const errors = reactive({})
    const availableModels = ref([])

    const isEdit = computed(() => !!props.device)
    const currentYear = new Date().getFullYear()
    const today = new Date().toISOString().split('T')[0]

    const defaultForm = {
      client_id: '',
      device_type: '',
      brand: '',
      model: '',
      serial_number: '',
      manufacture_year: null,
      power_rating: null,
      fuel_type: '',
      installation_date: '',
      warranty_expiry_date: '',
      location_description: '',
      maintenance_interval_days: 365,
      last_service_date: '',
      status: 'active',
      condition_rating: null,
      notes: '',
      custom_model: ''
    }

    const form = reactive({ ...defaultForm })

    const deviceConfig = computed(() => deviceStore.deviceConfig)

    const isFormValid = computed(() => {
      return form.client_id && form.device_type && Object.keys(errors).length === 0
    })

    // Load models when brand or device type changes
    const loadModels = async () => {
      if (!form.brand || !form.device_type) {
        availableModels.value = []
        return
      }

      loadingModels.value = true
      try {
        const response = await api.get('/devices/models', {
          params: {
            brand: form.brand,
            device_type: form.device_type
          }
        })
        
        if (response.data.success) {
          availableModels.value = response.data.data.models
        } else {
          availableModels.value = []
        }
      } catch (error) {
        console.error('Failed to load models:', error)
        availableModels.value = []
      } finally {
        loadingModels.value = false
      }
    }

    // Watch for brand or device type changes
    watch([() => form.brand, () => form.device_type], () => {
      form.model = '' // Clear selected model when brand or device type changes
      loadModels()
    })

    // Initialize form when device prop changes
    watch(() => props.device, (newDevice) => {
      if (newDevice) {
        Object.assign(form, {
          ...defaultForm,
          ...newDevice,
          manufacture_year: newDevice.manufacture_year || null,
          power_rating: newDevice.power_rating || null,
          condition_rating: newDevice.condition_rating || null
        })
        
        // Load models for existing device
        if (newDevice.brand && newDevice.device_type) {
          loadModels().then(() => {
            // Check if the current model exists in available models
            if (newDevice.model && availableModels.value.length > 0) {
              const modelExists = availableModels.value.some(category => 
                category.models.some(model => model.value === newDevice.model)
              )
              
              // If model doesn't exist in predefined list, treat as custom
              if (!modelExists) {
                form.model = '__custom__'
                form.custom_model = newDevice.model
              }
            }
          })
        }
      } else {
        Object.assign(form, defaultForm)
        availableModels.value = []
      }
      clearErrors()
    }, { immediate: true })

    // Reset form when modal opens/closes
    watch(() => props.visible, (visible) => {
      if (!visible) {
        Object.assign(form, defaultForm)
        availableModels.value = []
        clearErrors()
      }
    })

    const clearErrors = () => {
      Object.keys(errors).forEach(key => {
        delete errors[key]
      })
    }

    const validateForm = () => {
      clearErrors()

      if (!form.client_id) {
        errors.client_id = 'Klient jest wymagany'
      }

      if (!form.device_type) {
        errors.device_type = 'Typ urządzenia jest wymagany'
      }

      if (form.model === '__custom__' && !form.custom_model) {
        errors.custom_model = 'Model jest wymagany'
      }

      if (form.power_rating && (form.power_rating < 0 || form.power_rating > 10000)) {
        errors.power_rating = 'Moc musi być między 0 a 10000 kW'
      }

      if (form.manufacture_year && (form.manufacture_year < 1950 || form.manufacture_year > currentYear)) {
        errors.manufacture_year = `Rok produkcji musi być między 1950 a ${currentYear}`
      }

      if (form.condition_rating && (form.condition_rating < 1 || form.condition_rating > 5)) {
        errors.condition_rating = 'Ocena stanu musi być między 1 a 5'
      }

      if (form.maintenance_interval_days && (form.maintenance_interval_days < 1 || form.maintenance_interval_days > 3650)) {
        errors.maintenance_interval_days = 'Interwał serwisu musi być między 1 a 3650 dni'
      }

      return Object.keys(errors).length === 0
    }

    const handleSubmit = async () => {
      if (!validateForm()) {
        return
      }

      loading.value = true

      try {
        const deviceData = { ...form }
        
        // Handle custom model
        if (deviceData.model === '__custom__') {
          deviceData.model = deviceData.custom_model
        }
        
        // Remove custom_model field and empty strings and null values
        delete deviceData.custom_model
        Object.keys(deviceData).forEach(key => {
          if (deviceData[key] === '' || deviceData[key] === null) {
            delete deviceData[key]
          }
        })

        let result
        if (isEdit.value) {
          result = await deviceStore.updateDevice(props.device.id, deviceData)
        } else {
          result = await deviceStore.createDevice(deviceData)
        }

        if (result) {
          emit('saved', result)
          handleClose()
        }
      } catch (error) {
        console.error('Error saving device:', error)
        // Handle specific validation errors from server
        if (error.response?.data?.error) {
          if (error.response.data.error.includes('serial number')) {
            errors.serial_number = error.response.data.error
          } else if (error.response.data.error.includes('Client')) {
            errors.client_id = error.response.data.error
          } else {
            // Generic error handling
            errors.general = error.response.data.error
          }
        }
      } finally {
        loading.value = false
      }
    }

    const handleClose = () => {
      emit('close')
    }

    const handleOverlayClick = () => {
      if (!loading.value) {
        handleClose()
      }
    }

    const onBrandChange = () => {
      // Models will be loaded automatically by the watcher
      form.model = '' // Clear selected model
    }

    const onDeviceTypeChange = () => {
      // Models will be loaded automatically by the watcher
      form.model = '' // Clear selected model
    }

    const onModelChange = () => {
      // Models will be loaded automatically by the watcher
      form.custom_model = '' // Clear custom model input
    }

    return {
      form,
      errors,
      loading,
      loadingModels,
      availableModels,
      isEdit,
      currentYear,
      today,
      deviceConfig,
      isFormValid,
      handleSubmit,
      handleClose,
      handleOverlayClick,
      onBrandChange,
      onDeviceTypeChange,
      onModelChange
    }
  }
}
</script>

<style scoped>
.device-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.device-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 800px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.form-label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.form-control:disabled {
  background-color: #f8f9fa;
  opacity: 0.65;
}

.invalid-feedback {
  display: block;
  color: #dc3545;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

textarea.form-control {
  resize: vertical;
  min-height: 60px;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-outline-secondary {
  color: #6c757d;
  border-color: #6c757d;
  background: white;
}

.btn-outline-secondary:hover:not(:disabled) {
  background: #6c757d;
  color: white;
}

.btn-primary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #004085;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .device-modal {
    width: 98%;
    margin: 1rem;
  }
}
</style> 