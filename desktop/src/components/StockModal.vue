<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full m-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-secondary-200">
        <h2 class="text-xl font-bold text-secondary-900">
          Zarządzaj stanem magazynowym
        </h2>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <!-- Part Info -->
      <div class="p-6 border-b border-secondary-200 bg-secondary-50">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <i class="fas fa-puzzle-piece text-primary-600 text-lg"></i>
          </div>
          <div>
            <h3 class="font-medium text-secondary-900">{{ part.name }}</h3>
            <p class="text-sm text-secondary-600">{{ part.part_number }}</p>
            <div class="flex items-center space-x-4 mt-1">
              <span class="text-sm text-secondary-500">
                Obecny stan: <span class="font-medium">{{ part.stock_quantity }}</span>
              </span>
              <span
                :class="getStockStatusClass()"
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStockStatusText() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Operation Selection -->
      <div class="p-6">
        <div class="grid grid-cols-3 gap-3 mb-6">
          <button
            @click="selectedOperation = 'receive'"
            :class="[
              selectedOperation === 'receive' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-secondary-200 text-secondary-700',
              'border rounded-lg p-3 text-center hover:bg-green-50 transition-colors'
            ]"
          >
            <i class="fas fa-plus-circle text-lg mb-1"></i>
            <p class="text-sm font-medium">Przyjęcie</p>
          </button>
          
          <button
            @click="selectedOperation = 'issue'"
            :class="[
              selectedOperation === 'issue' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-secondary-200 text-secondary-700',
              'border rounded-lg p-3 text-center hover:bg-red-50 transition-colors'
            ]"
          >
            <i class="fas fa-minus-circle text-lg mb-1"></i>
            <p class="text-sm font-medium">Wydanie</p>
          </button>
          
          <button
            @click="selectedOperation = 'adjustment'"
            :class="[
              selectedOperation === 'adjustment' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-secondary-200 text-secondary-700',
              'border rounded-lg p-3 text-center hover:bg-blue-50 transition-colors'
            ]"
          >
            <i class="fas fa-edit text-lg mb-1"></i>
            <p class="text-sm font-medium">Korekta</p>
          </button>
        </div>

        <!-- Operation Form -->
        <form @submit.prevent="processOperation" class="space-y-4">
          <!-- Quantity -->
          <div v-if="selectedOperation">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              {{ getQuantityLabel() }}
            </label>
            <input
              v-model.number="quantity"
              type="number"
              :min="selectedOperation === 'adjustment' ? 0 : 1"
              :max="selectedOperation === 'issue' ? part.stock_quantity : undefined"
              required
              class="input-field"
              :class="{ 'border-red-300': errors.quantity }"
              :placeholder="getQuantityPlaceholder()"
            />
            <p v-if="errors.quantity" class="text-red-600 text-xs mt-1">{{ errors.quantity }}</p>
            
            <!-- Preview for adjustment -->
            <div v-if="selectedOperation === 'adjustment' && quantity !== null" class="mt-2 text-sm">
              <span class="text-secondary-600">Nowy stan będzie wynosić: </span>
              <span class="font-medium text-secondary-900">{{ quantity }}</span>
              <span
                v-if="quantity !== part.stock_quantity"
                :class="quantity > part.stock_quantity ? 'text-green-600' : 'text-red-600'"
                class="ml-2"
              >
                ({{ quantity > part.stock_quantity ? '+' : '' }}{{ quantity - part.stock_quantity }})
              </span>
            </div>
            
            <!-- Preview for issue -->
            <div v-if="selectedOperation === 'issue' && quantity && quantity <= part.stock_quantity" class="mt-2 text-sm">
              <span class="text-secondary-600">Stan po wydaniu: </span>
              <span class="font-medium text-secondary-900">{{ part.stock_quantity - quantity }}</span>
            </div>
            
            <!-- Preview for receive -->
            <div v-if="selectedOperation === 'receive' && quantity" class="mt-2 text-sm">
              <span class="text-secondary-600">Stan po przyjęciu: </span>
              <span class="font-medium text-secondary-900">{{ part.stock_quantity + quantity }}</span>
            </div>
          </div>

          <!-- Reason/Note -->
          <div v-if="selectedOperation">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              {{ getReasonLabel() }}
            </label>
            <textarea
              v-model="reason"
              rows="3"
              class="input-field"
              :placeholder="getReasonPlaceholder()"
              :required="selectedOperation === 'adjustment'"
            ></textarea>
          </div>

          <!-- Order/Document Number -->
          <div v-if="selectedOperation === 'receive'">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Numer zamówienia/dokumentu
            </label>
            <input
              v-model="documentNumber"
              type="text"
              class="input-field"
              placeholder="np. ZAM-2024-001"
            />
          </div>

          <!-- Cost (for receive) -->
          <div v-if="selectedOperation === 'receive'">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Koszt jednostkowy (zł)
            </label>
            <input
              v-model.number="unitCost"
              type="number"
              step="0.01"
              min="0"
              class="input-field"
              :placeholder="Number(part.gross_price ?? part.price ?? 0).toFixed(2)"
            />
          </div>

          <!-- Error Display -->
          <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
              <div>
                <h3 class="text-sm font-medium text-red-800">Błąd operacji</h3>
                <p class="text-sm text-red-700 mt-1">{{ formError }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
            <button
              type="button"
              @click="$emit('close')"
              class="btn-secondary"
            >
              Anuluj
            </button>
            <button
              v-if="selectedOperation"
              type="submit"
              :disabled="isLoading || !canSubmit"
              class="btn-primary"
            >
              <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else :class="getOperationIcon()" class="mr-2"></i>
              {{ getSubmitText() }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  part: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

// State
const selectedOperation = ref('')
const quantity = ref(null)
const reason = ref('')
const documentNumber = ref('')
const unitCost = ref(null)
const isLoading = ref(false)
const formError = ref('')
const errors = ref({})

// Computed properties
const canSubmit = computed(() => {
  if (!selectedOperation.value || !quantity.value) return false
  
  if (selectedOperation.value === 'issue' && quantity.value > props.part.stock_quantity) {
    return false
  }
  
  if (selectedOperation.value === 'adjustment' && !reason.value.trim()) {
    return false
  }
  
  return true
})

// Helper methods
const getStockStatusClass = () => {
  if (props.part.stock_quantity === 0) {
    return 'bg-red-100 text-red-800'
  } else if (props.part.stock_quantity <= props.part.min_stock_level) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-green-100 text-green-800'
  }
}

const getStockStatusText = () => {
  if (props.part.stock_quantity === 0) {
    return 'Brak na stanie'
  } else if (props.part.stock_quantity <= props.part.min_stock_level) {
    return 'Niski stan'
  } else {
    return 'Dostępne'
  }
}

const getQuantityLabel = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'Ilość do przyjęcia'
    case 'issue': return 'Ilość do wydania'
    case 'adjustment': return 'Nowy stan magazynowy'
    default: return 'Ilość'
  }
}

const getQuantityPlaceholder = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'Wpisz ilość przyjmowanych części'
    case 'issue': return `Dostępne: ${props.part.stock_quantity}`
    case 'adjustment': return `Obecny stan: ${props.part.stock_quantity}`
    default: return '0'
  }
}

const getReasonLabel = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'Notatka (opcjonalnie)'
    case 'issue': return 'Powód wydania (opcjonalnie)'
    case 'adjustment': return 'Powód korekty *'
    default: return 'Notatka'
  }
}

const getReasonPlaceholder = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'np. Dostawa od dostawcy ABC'
    case 'issue': return 'np. Wykorzystane w zleceniu SRV-2024-001'
    case 'adjustment': return 'np. Inwentaryzacja - rozbieżności w stanie'
    default: return 'Wpisz powód...'
  }
}

const getOperationIcon = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'fas fa-plus-circle'
    case 'issue': return 'fas fa-minus-circle'
    case 'adjustment': return 'fas fa-edit'
    default: return 'fas fa-save'
  }
}

const getSubmitText = () => {
  switch (selectedOperation.value) {
    case 'receive': return 'Przyjmij na magazyn'
    case 'issue': return 'Wydaj z magazynu'
    case 'adjustment': return 'Wykonaj korektę'
    default: return 'Zapisz'
  }
}

// Validation
const validateForm = () => {
  errors.value = {}

  if (!quantity.value || quantity.value <= 0) {
    if (selectedOperation.value !== 'adjustment') {
      errors.value.quantity = 'Ilość musi być większa od 0'
    } else if (quantity.value < 0) {
      errors.value.quantity = 'Stan nie może być ujemny'
    }
  }

  if (selectedOperation.value === 'issue' && quantity.value > props.part.stock_quantity) {
    errors.value.quantity = 'Nie można wydać więcej niż jest na stanie'
  }

  if (selectedOperation.value === 'adjustment' && !reason.value.trim()) {
    errors.value.reason = 'Powód korekty jest wymagany'
  }

  return Object.keys(errors.value).length === 0
}

// Actions
const processOperation = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  formError.value = ''

  try {
    let newQuantity = props.part.stock_quantity

    switch (selectedOperation.value) {
      case 'receive':
        newQuantity += quantity.value
        break
      case 'issue':
        newQuantity -= quantity.value
        break
      case 'adjustment':
        newQuantity = quantity.value
        break
    }

    // Create stock movement record
    const movementData = {
      part_id: props.part.id,
      operation_type: selectedOperation.value,
      quantity_before: props.part.stock_quantity,
      quantity_change: selectedOperation.value === 'adjustment' 
        ? quantity.value - props.part.stock_quantity 
        : (selectedOperation.value === 'receive' ? quantity.value : -quantity.value),
      quantity_after: newQuantity,
      reason: reason.value,
      document_number: documentNumber.value,
      unit_cost: unitCost.value,
      created_at: new Date().toISOString()
    }

    if (window.electronAPI?.database) {
      // Update part stock
      await window.electronAPI.database.run(
        'UPDATE spare_parts SET stock_quantity = ?, updated_at = ? WHERE id = ?',
        [newQuantity, new Date().toISOString(), props.part.id]
      )

      // Record stock movement
      await window.electronAPI.database.run(
        `INSERT INTO stock_movements 
         (part_id, operation_type, quantity_before, quantity_change, quantity_after, reason, document_number, unit_cost, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movementData.part_id, movementData.operation_type, movementData.quantity_before,
          movementData.quantity_change, movementData.quantity_after, movementData.reason,
          movementData.document_number, movementData.unit_cost, movementData.created_at
        ]
      )
    }

    // Emit updated part
    const updatedPart = {
      ...props.part,
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString()
    }

    emit('updated', updatedPart)
  } catch (err) {
    console.error('Error processing stock operation:', err)
    formError.value = 'Błąd podczas przetwarzania operacji. Spróbuj ponownie.'
  } finally {
    isLoading.value = false
  }
}

// Reset form when operation changes
watch(selectedOperation, () => {
  quantity.value = selectedOperation.value === 'adjustment' ? props.part.stock_quantity : null
  reason.value = ''
  documentNumber.value = ''
  unitCost.value = props.part.gross_price ?? props.part.price ?? null
  errors.value = {}
  formError.value = ''
})
</script> 