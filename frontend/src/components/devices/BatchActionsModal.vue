<template>
  <div v-if="visible" class="batch-actions-overlay" @click="handleOverlayClick">
    <div class="batch-actions-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-tasks"></i>
          Akcje grupowe
        </h3>
        <div class="selected-count">
          Wybrano: {{ selectedDevices.length }} urządzeń
        </div>
        <button @click="handleClose" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <div class="action-section">
          <h4 class="action-title">
            <i class="fas fa-edit"></i>
            Zmiana statusu
          </h4>
          <p class="action-description">
            Zmień status wybranych urządzeń na jeden z dostępnych.
          </p>
          
          <div class="action-form">
            <select v-model="selectedStatus" class="form-control">
              <option value="">Wybierz nowy status</option>
              <option 
                v-for="status in statusOptions" 
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
            
            <button 
              @click="executeStatusChange"
              :disabled="!selectedStatus || loading"
              class="btn btn-warning"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-edit"></i>
              Zmień status
            </button>
          </div>
        </div>

        <div class="action-section">
          <h4 class="action-title">
            <i class="fas fa-calendar-alt"></i>
            Harmonogram serwisu
          </h4>
          <p class="action-description">
            Ustaw datę następnego serwisu dla wybranych urządzeń.
          </p>
          
          <div class="action-form">
            <input
              type="date"
              v-model="selectedServiceDate"
              :min="today"
              class="form-control"
            >
            
            <button 
              @click="executeServiceDateChange"
              :disabled="!selectedServiceDate || loading"
              class="btn btn-info"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-calendar-alt"></i>
              Ustaw datę serwisu
            </button>
          </div>
        </div>

        <div class="action-section">
          <h4 class="action-title">
            <i class="fas fa-wrench"></i>
            Oznacz jako serwisowane
          </h4>
          <p class="action-description">
            Oznacz wybrane urządzenia jako właśnie serwisowane. Automatycznie ustawi datę ostatniego serwisu na dziś i przeliczy następny serwis.
          </p>
          
          <div class="action-form">
            <button 
              @click="executeMarkAsServiced"
              :disabled="loading"
              class="btn btn-success"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-wrench"></i>
              Oznacz jako serwisowane
            </button>
          </div>
        </div>

        <div class="action-section danger">
          <h4 class="action-title">
            <i class="fas fa-trash"></i>
            Usuń urządzenia
          </h4>
          <p class="action-description">
            Usuń wybrane urządzenia. Ta akcja jest nieodwracalna i można usunąć tylko urządzenia nieaktywne.
          </p>
          
          <div class="action-form">
            <div v-if="activeDevicesCount > 0" class="warning-message">
              <i class="fas fa-exclamation-triangle"></i>
              Wśród wybranych urządzeń {{ activeDevicesCount }} jest aktywnych i nie może zostać usuniętych.
              Usunięte zostaną tylko nieaktywne urządzenia ({{ inactiveDevicesCount }}).
            </div>
            
            <button 
              @click="executeDelete"
              :disabled="loading || inactiveDevicesCount === 0"
              class="btn btn-danger"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-trash"></i>
              Usuń {{ inactiveDevicesCount }} urządzeń
            </button>
          </div>
        </div>

        <!-- Results -->
        <div v-if="actionResult" class="action-result">
          <div class="result-message" :class="actionResult.type">
            <i :class="actionResult.icon"></i>
            {{ actionResult.message }}
          </div>
          
          <div v-if="actionResult.details" class="result-details">
            <h5>Szczegóły:</h5>
            <ul>
              <li v-for="detail in actionResult.details" :key="detail">
                {{ detail }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button 
          @click="handleClose"
          class="btn btn-outline-secondary"
          :disabled="loading"
        >
          {{ actionResult ? 'Zamknij' : 'Anuluj' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'

export default {
  name: 'BatchActionsModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    selectedDevices: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'action-complete'],
  setup(props, { emit }) {
    const deviceStore = useDeviceStore()
    const loading = ref(false)
    const actionResult = ref(null)
    
    // Form data
    const selectedStatus = ref('')
    const selectedServiceDate = ref('')
    
    const today = new Date().toISOString().split('T')[0]

    const statusOptions = computed(() => deviceStore.deviceConfig.status_options)

    const activeDevicesCount = computed(() => {
      return props.selectedDevices.filter(deviceId => {
        const device = deviceStore.devices.find(d => d.id === deviceId)
        return device?.status === 'active'
      }).length
    })

    const inactiveDevicesCount = computed(() => {
      return props.selectedDevices.length - activeDevicesCount.value
    })

    const executeStatusChange = async () => {
      if (!selectedStatus.value) return
      
      loading.value = true
      actionResult.value = null
      
      try {
        const result = await deviceStore.batchUpdateStatus(
          props.selectedDevices, 
          selectedStatus.value
        )
        
        if (result.success) {
          actionResult.value = {
            type: 'success',
            icon: 'fas fa-check-circle',
            message: `Status został zmieniony dla ${result.updated} urządzeń`,
            details: result.details
          }
          
          // Refresh devices list
          await deviceStore.fetchDevices()
          emit('action-complete', 'status-change')
        } else {
          throw new Error(result.error || 'Błąd podczas zmiany statusu')
        }
      } catch (error) {
        console.error('Error updating status:', error)
        actionResult.value = {
          type: 'error',
          icon: 'fas fa-exclamation-circle',
          message: `Błąd: ${error.message || 'Nie udało się zmienić statusu'}`
        }
      } finally {
        loading.value = false
      }
    }

    const executeServiceDateChange = async () => {
      if (!selectedServiceDate.value) return
      
      loading.value = true
      actionResult.value = null
      
      try {
        const result = await deviceStore.batchUpdateServiceDate(
          props.selectedDevices, 
          selectedServiceDate.value
        )
        
        if (result.success) {
          actionResult.value = {
            type: 'success',
            icon: 'fas fa-check-circle',
            message: `Data serwisu została ustawiona dla ${result.updated} urządzeń`,
            details: result.details
          }
          
          // Refresh devices list
          await deviceStore.fetchDevices()
          emit('action-complete', 'service-date-change')
        } else {
          throw new Error(result.error || 'Błąd podczas ustawiania daty serwisu')
        }
      } catch (error) {
        console.error('Error updating service date:', error)
        actionResult.value = {
          type: 'error',
          icon: 'fas fa-exclamation-circle',
          message: `Błąd: ${error.message || 'Nie udało się ustawić daty serwisu'}`
        }
      } finally {
        loading.value = false
      }
    }

    const executeMarkAsServiced = async () => {
      loading.value = true
      actionResult.value = null
      
      try {
        const result = await deviceStore.batchMarkAsServiced(props.selectedDevices)
        
        if (result.success) {
          actionResult.value = {
            type: 'success',
            icon: 'fas fa-check-circle',
            message: `${result.updated} urządzeń zostało oznaczonych jako serwisowanych`,
            details: result.details
          }
          
          // Refresh devices list and statistics
          await Promise.all([
            deviceStore.fetchDevices(),
            deviceStore.loadStatistics()
          ])
          emit('action-complete', 'mark-serviced')
        } else {
          throw new Error(result.error || 'Błąd podczas oznaczania jako serwisowane')
        }
      } catch (error) {
        console.error('Error marking as serviced:', error)
        actionResult.value = {
          type: 'error',
          icon: 'fas fa-exclamation-circle',
          message: `Błąd: ${error.message || 'Nie udało się oznaczyć jako serwisowane'}`
        }
      } finally {
        loading.value = false
      }
    }

    const executeDelete = async () => {
      if (inactiveDevicesCount.value === 0) return
      
      loading.value = true
      actionResult.value = null
      
      try {
        const result = await deviceStore.batchDeleteDevices(props.selectedDevices)
        
        if (result.success) {
          actionResult.value = {
            type: 'success',
            icon: 'fas fa-check-circle',
            message: `${result.deleted} urządzeń zostało usuniętych`,
            details: result.details
          }
          
          // Refresh devices list and statistics
          await Promise.all([
            deviceStore.fetchDevices(),
            deviceStore.loadStatistics()
          ])
          emit('action-complete', 'delete')
        } else {
          throw new Error(result.error || 'Błąd podczas usuwania urządzeń')
        }
      } catch (error) {
        console.error('Error deleting devices:', error)
        actionResult.value = {
          type: 'error',
          icon: 'fas fa-exclamation-circle',
          message: `Błąd: ${error.message || 'Nie udało się usunąć urządzeń'}`
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

    return {
      loading,
      actionResult,
      selectedStatus,
      selectedServiceDate,
      today,
      statusOptions,
      activeDevicesCount,
      inactiveDevicesCount,
      executeStatusChange,
      executeServiceDateChange,
      executeMarkAsServiced,
      executeDelete,
      handleClose,
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
.batch-actions-overlay {
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

.batch-actions-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 700px;
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

.selected-count {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
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

.action-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.action-section.danger {
  border-color: #dc3545;
  background: #fdf2f2;
}

.action-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-description {
  color: #6c757d;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.action-form {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.form-control {
  flex: 1;
  min-width: 200px;
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
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-warning {
  background: #ffc107;
  border-color: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
  border-color: #d39e00;
}

.btn-info {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
  border-color: #117a8b;
}

.btn-success {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  border-color: #1e7e34;
}

.btn-danger {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  border-color: #bd2130;
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

.warning-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 0.75rem;
  color: #856404;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  width: 100%;
}

.action-result {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
}

.result-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.result-message.success {
  color: #155724;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 0.75rem;
  border-radius: 6px;
}

.result-message.error {
  color: #721c24;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 0.75rem;
  border-radius: 6px;
}

.result-details {
  margin-top: 1rem;
}

.result-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
}

.result-details ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .batch-actions-modal {
    width: 98%;
    margin: 1rem;
  }
  
  .action-form {
    flex-direction: column;
  }
  
  .form-control {
    min-width: auto;
  }
  
  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style> 