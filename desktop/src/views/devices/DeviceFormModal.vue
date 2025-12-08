<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-secondary-200 sticky top-0 bg-white rounded-t-xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-secondary-900">
            {{ isEdit ? 'Edytuj urządzenie' : 'Dodaj nowe urządzenie' }}
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
      <div class="px-6 py-4">
        <form @submit.prevent="saveDevice" class="space-y-6">
          <!-- Podstawowe informacje -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Podstawowe informacje</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nazwa urządzenia -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Nazwa urządzenia *
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="np. Kocioł gazowy"
                  :class="['input-field', prefillFlags.name ? 'prefill-highlight' : '', errors.name ? 'border-red-300' : '']"
                />
                <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
              </div>

              <!-- Klient -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Klient *
                </label>
                <select
                  v-model="form.client_id"
                  required
                  class="input-field"
                  :class="{ 'border-red-300': errors.client_id }"
                  @change="onClientSelectChange"
                >
                  <option value="">Wybierz klienta</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ client.type === 'business' ? client.company_name : `${client.first_name} ${client.last_name}` }}
                  </option>
                </select>
                <p v-if="errors.client_id" class="mt-1 text-sm text-red-600">{{ errors.client_id }}</p>
              </div>

              <!-- Producent -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Producent
                </label>
                <input
                  v-model="form.manufacturer"
                  type="text"
                  placeholder="np. Viessmann"
                  :class="['input-field', prefillFlags.manufacturer ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Model -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Model
                </label>
                <input
                  v-model="form.model"
                  type="text"
                  placeholder="np. Vitopend 100-W"
                  :class="['input-field', prefillFlags.model ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Numer seryjny -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Numer seryjny
                </label>
                <input
                  v-model="form.serial_number"
                  type="text"
                  placeholder="np. VIT2024001"
                  :class="['input-field', prefillFlags.serial_number ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Rok produkcji -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Rok produkcji
                </label>
                <input
                  v-model.number="form.production_year"
                  type="number"
                  min="1990"
                  :max="new Date().getFullYear() + 1"
                  :class="['input-field', prefillFlags.production_year ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Moc -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Moc
                </label>
                <input
                  v-model="form.power_rating"
                  type="text"
                  placeholder="np. 24 kW"
                  :class="['input-field', prefillFlags.power_rating ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Typ paliwa -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Typ paliwa/energii
                </label>
                <select v-model="form.fuel_type" :class="['input-field', prefillFlags.fuel_type ? 'prefill-highlight' : '']">
                  <option value="">Wybierz typ</option>
                  <option value="Gaz ziemny">Gaz ziemny</option>
                  <option value="Gaz płynny (LPG)">Gaz płynny (LPG)</option>
                  <option value="Elektryczny">Elektryczny</option>
                  <option value="Olej opałowy">Olej opałowy</option>
                  <option value="Biomasa">Biomasa</option>
                  <option value="Pompa ciepła">Pompa ciepła</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Daty serwisowe -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Informacje serwisowe</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Data instalacji -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Data instalacji
                </label>
                <input
                  v-model="form.installation_date"
                  type="date"
                  :class="['input-field', prefillFlags.installation_date ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Data ostatniego serwisu -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Data ostatniego serwisu
                </label>
                <input
                  v-model="form.last_service_date"
                  type="date"
                  :class="['input-field', prefillFlags.last_service_date ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Data następnego serwisu -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Data następnego serwisu
                </label>
                <input
                  v-model="form.next_service_date"
                  type="date"
                  :class="['input-field', prefillFlags.next_service_date ? 'prefill-highlight' : '']"
                />
              </div>

              <!-- Data końca gwarancji -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Data końca gwarancji
                </label>
                <input
                  v-model="form.warranty_end_date"
                  type="date"
                  :class="['input-field', prefillFlags.warranty_end_date ? 'prefill-highlight' : '']"
                />
              </div>
            </div>
          </div>

          <!-- Dane techniczne -->
          <div>
            <h4 class="text-sm font-medium text-secondary-900 mb-4">Dodatkowe informacje</h4>
            <div class="space-y-4">
              <!-- Dane techniczne -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Dane techniczne
                </label>
                <textarea
                  v-model="form.technical_data"
                  rows="3"
                  placeholder="np. Sprawność 92%, klasa energetyczna A, wymiary..."
                  :class="['input-field', prefillFlags.technical_data ? 'prefill-highlight' : '']"
                ></textarea>
              </div>

              <!-- Notatki -->
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Notatki
                </label>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  placeholder="Dodatkowe informacje, uwagi serwisowe..."
                  :class="['input-field', prefillFlags.notes ? 'prefill-highlight' : '']"
                ></textarea>
              </div>

              <!-- Status aktywny -->
              <div class="flex items-center">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  id="device_active"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label for="device_active" class="ml-2 block text-sm text-secondary-900">
                  Urządzenie aktywne
                </label>
              </div>
            </div>
          </div>

          <!-- Sekcja plików i dokumentacji -->
          <div v-if="props.isEdit || newDeviceId">
            <h4 class="text-sm font-medium text-secondary-900 mb-4 flex items-center">
              <i class="fas fa-file-image mr-2"></i>
              Zdjęcia i dokumentacja
            </h4>
            <DeviceFilesManager 
              :device-id="props.isEdit ? props.device.id : newDeviceId"
              :readonly="false"
            />
          </div>
        </form>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3 bg-secondary-50 rounded-b-xl">
        <button
          @click="$emit('close')"
          type="button"
          class="btn-secondary"
        >
          Anuluj
        </button>
        <button
          @click="saveDevice"
          :disabled="isLoading"
          class="btn-primary"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-save mr-2"></i>
          {{ isEdit ? 'Zaktualizuj' : 'Dodaj' }} urządzenie
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import DeviceFilesManager from '../../components/DeviceFilesManager.vue'

const props = defineProps({
  device: {
    type: Object,
    default: null
  },
  clients: {
    type: Array,
    default: () => []
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  defaultClientId: {
    type: [Number, String],
    default: null
  },
  prefill: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const isLoading = ref(false)
const errors = ref({})
const newDeviceId = ref(null)

const form = reactive({
  name: '',
  client_id: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  production_year: null,
  power_rating: '',
  fuel_type: '',
  installation_date: '',
  last_service_date: '',
  next_service_date: '',
  warranty_end_date: '',
  technical_data: '',
  notes: '',
  is_active: true
})

const resetFormValues = () => {
  form.name = ''
  form.client_id = ''
  form.manufacturer = ''
  form.model = ''
  form.serial_number = ''
  form.production_year = null
  form.power_rating = ''
  form.fuel_type = ''
  form.installation_date = ''
  form.last_service_date = ''
  form.next_service_date = ''
  form.warranty_end_date = ''
  form.technical_data = ''
  form.notes = ''
  form.is_active = true
  resetPrefillFlags()
}

const prefillFlags = reactive({
  name: false,
  manufacturer: false,
  model: false,
  serial_number: false,
  production_year: false,
  power_rating: false,
  fuel_type: false,
  installation_date: false,
  last_service_date: false,
  next_service_date: false,
  warranty_end_date: false,
  technical_data: false,
  notes: false
})

const resetPrefillFlags = () => {
  Object.keys(prefillFlags).forEach(key => { prefillFlags[key] = false })
}

// Helper: sformatuj dowolną wartość do yyyy-MM-dd dla input type="date"
function formatForDateInput(value) {
  try {
    if (!value) return ''
    if (typeof value === 'string') {
      // Akceptuj już poprawny format lub utnij ISO do 10 znaków
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      if (value.length >= 10) return value.slice(0, 10)
    }
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    return ''
  } catch (_) { return '' }
}

function normalizeDateOrNull(value) {
  const s = formatForDateInput(value)
  return s || null
}

const applyPrefill = (prefill) => {
  if (!prefill) return
  resetPrefillFlags()
  Object.keys(form).forEach(key => {
    if (prefill[key] !== undefined && prefill[key] !== null) {
      if (key === 'installation_date' || key === 'last_service_date' || key === 'next_service_date' || key === 'warranty_end_date') {
        form[key] = formatForDateInput(prefill[key])
        if (key in prefillFlags) {
          const val = form[key]
          prefillFlags[key] = !!val
        }
      } else {
        form[key] = prefill[key]
        if (key in prefillFlags) {
          const val = prefill[key]
          prefillFlags[key] = typeof val === 'string' ? val.trim().length > 0 : val !== null
        }
      }
    }
  })
  if (prefill.is_active !== undefined && prefill.is_active !== null) {
    form.is_active = Boolean(prefill.is_active)
  }
}

// Wypełnij formularz danymi urządzenia przy edycji
watch(() => props.device, (newDevice) => {
  if (newDevice && props.isEdit) {
    Object.keys(form).forEach(key => {
      if (newDevice[key] !== undefined) {
        form[key] = newDevice[key]
      }
    })
    // Konwertuj is_active na boolean
    form.is_active = Boolean(newDevice.is_active)
    // Ujednolić format dat do yyyy-MM-dd dla inputów typu date
    form.installation_date   = formatForDateInput(newDevice.installation_date)
    form.last_service_date   = formatForDateInput(newDevice.last_service_date)
    form.next_service_date   = formatForDateInput(newDevice.next_service_date)
    form.warranty_end_date   = formatForDateInput(newDevice.warranty_end_date)
  }
}, { immediate: true })

const validateForm = () => {
  errors.value = {}

  if (!form.name?.trim()) {
    errors.value.name = 'Nazwa urządzenia jest wymagana'
  }

  const clientIdNum = parseInt(form.client_id)
  if (!clientIdNum || Number.isNaN(clientIdNum)) {
    errors.value.client_id = 'Wybór klienta jest wymagany'
  }

  return Object.keys(errors.value).length === 0
}

const saveDevice = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    const clientIdNum = parseInt(form.client_id)
    const deviceData = {
      ...form,
      client_id: clientIdNum || null,
      // Jeśli przypisano klienta, wymuś aktywność urządzenia
      is_active: (clientIdNum && !Number.isNaN(clientIdNum)) ? 1 : (form.is_active ? 1 : 0),
      // Normalizacja dat: yyyy-MM-dd lub null
      installation_date: normalizeDateOrNull(form.installation_date),
      last_service_date: normalizeDateOrNull(form.last_service_date),
      next_service_date: normalizeDateOrNull(form.next_service_date),
      warranty_end_date: normalizeDateOrNull(form.warranty_end_date)
    }

    let savedDevice

    if (window.electronAPI) {
      if (props.isEdit) {
        // Aktualizuj urządzenie
        await window.electronAPI.database.run(
          `UPDATE devices SET 
           name = ?, client_id = ?, manufacturer = ?, model = ?, 
           serial_number = ?, production_year = ?, power_rating = ?, fuel_type = ?,
           installation_date = ?, last_service_date = ?, next_service_date = ?, warranty_end_date = ?,
           technical_data = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            deviceData.name, deviceData.client_id, deviceData.manufacturer, deviceData.model,
            deviceData.serial_number, deviceData.production_year, deviceData.power_rating, deviceData.fuel_type,
            deviceData.installation_date, deviceData.last_service_date, deviceData.next_service_date, deviceData.warranty_end_date,
            deviceData.technical_data, deviceData.notes, deviceData.is_active,
            props.device.id
          ]
        )
        savedDevice = { ...deviceData, id: props.device.id }
      } else {
        // Dodaj nowe urządzenie
        const result = await window.electronAPI.database.run(
          `INSERT INTO devices 
           (name, client_id, manufacturer, model, serial_number, production_year, power_rating, fuel_type,
            installation_date, last_service_date, next_service_date, warranty_end_date,
            technical_data, notes, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deviceData.name, deviceData.client_id, deviceData.manufacturer, deviceData.model,
            deviceData.serial_number, deviceData.production_year, deviceData.power_rating, deviceData.fuel_type,
            deviceData.installation_date, deviceData.last_service_date, deviceData.next_service_date, deviceData.warranty_end_date,
            deviceData.technical_data, deviceData.notes, deviceData.is_active
          ]
        )
        savedDevice = { ...deviceData, id: result.id }
        newDeviceId.value = result.id
      }
    } else {
      // Fallback dla trybu przeglądarki
      savedDevice = {
        ...deviceData,
        id: props.isEdit ? props.device.id : Date.now(),
        created_at: props.isEdit ? props.device.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    emit('saved', savedDevice)
    if (!props.isEdit) {
      resetFormValues()
    }

    // Best-effort: natychmiastowy eksport do Railway, aby PWA zobaczyła zmiany
    try {
      const idToExport = savedDevice && savedDevice.id ? savedDevice.id : (props.device && props.device.id)
      if (idToExport) {
        fetch('http://localhost:5174/api/railway/export-device/' + idToExport, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }
        }).catch(()=>{})
      }
    } catch (_) {}
  } catch (err) {
    console.error('Error saving device:', err)
    errors.value.general = 'Błąd podczas zapisywania urządzenia'
  } finally {
    isLoading.value = false
  }
}

// Jeżeli wybierzemy klienta, upewnij się że wartość jest liczbą (błąd mógł wynikać z typu string)
const onClientSelectChange = () => {
  if (typeof form.client_id === 'string' && /^\d+$/.test(form.client_id)) {
    form.client_id = parseInt(form.client_id)
  }
  // Po przypisaniu klienta – automatycznie oznacz urządzenie jako aktywne
  if (form.client_id && !Number.isNaN(parseInt(form.client_id))) {
    form.is_active = true
  }
}

// Reset formularza przy montowaniu
onMounted(() => {
  if (!props.isEdit) {
    resetFormValues()
    if (props.prefill) {
      applyPrefill(props.prefill)
    }
    if (props.defaultClientId != null && props.defaultClientId !== '') {
      form.client_id = props.defaultClientId
      onClientSelectChange()
    }
  } else if (props.prefill) {
    applyPrefill(props.prefill)
  }
})

watch(() => props.defaultClientId, (newId) => {
  if (!props.isEdit && newId != null && newId !== '') {
    form.client_id = newId
    onClientSelectChange()
  }
})

watch(() => props.prefill, (newPrefill) => {
  if (!props.isEdit && newPrefill) {
    applyPrefill(newPrefill)
  }
})

watch(() => form.name, (val) => { if (!val) prefillFlags.name = false })
watch(() => form.manufacturer, (val) => { if (!val) prefillFlags.manufacturer = false })
watch(() => form.model, (val) => { if (!val) prefillFlags.model = false })
watch(() => form.serial_number, (val) => { if (!val) prefillFlags.serial_number = false })
watch(() => form.production_year, (val) => { if (!val) prefillFlags.production_year = false })
watch(() => form.power_rating, (val) => { if (!val) prefillFlags.power_rating = false })
watch(() => form.fuel_type, (val) => { if (!val) prefillFlags.fuel_type = false })
watch(() => form.installation_date, (val) => { if (!val) prefillFlags.installation_date = false })
watch(() => form.last_service_date, (val) => { if (!val) prefillFlags.last_service_date = false })
watch(() => form.next_service_date, (val) => { if (!val) prefillFlags.next_service_date = false })
watch(() => form.warranty_end_date, (val) => { if (!val) prefillFlags.warranty_end_date = false })
watch(() => form.technical_data, (val) => { if (!val) prefillFlags.technical_data = false })
watch(() => form.notes, (val) => { if (!val) prefillFlags.notes = false })
</script> 

<style scoped>
.prefill-highlight {
  background-color: #eef3ff;
  color: #1c3d8f;
  border-color: #a2b4e6;
}
</style>