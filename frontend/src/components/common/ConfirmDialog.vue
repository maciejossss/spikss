<template>
  <div 
    v-if="visible" 
    class="confirm-dialog-overlay"
    @click="handleOverlayClick"
  >
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-dialog-header">
        <h3 class="confirm-dialog-title">
          <i :class="iconClass"></i>
          {{ title }}
        </h3>
      </div>
      
      <div class="confirm-dialog-body">
        <p class="confirm-dialog-message">{{ message }}</p>
        <div v-if="details" class="confirm-dialog-details">
          {{ details }}
        </div>
      </div>
      
      <div class="confirm-dialog-footer">
        <button 
          @click="handleCancel"
          class="btn btn-outline-secondary"
          :disabled="loading"
        >
          {{ cancelText }}
        </button>
        <button 
          @click="handleConfirm"
          :class="confirmButtonClass"
          :disabled="loading"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Potwierdź akcję'
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: null
    },
    confirmText: {
      type: String,
      default: 'Potwierdź'
    },
    cancelText: {
      type: String,
      default: 'Anuluj'
    },
    type: {
      type: String,
      default: 'warning', // warning, danger, info, success
      validator: (value) => ['warning', 'danger', 'info', 'success'].includes(value)
    },
    loading: {
      type: Boolean,
      default: false
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    }
  },
  emits: ['confirm', 'cancel', 'close'],
  setup(props, { emit }) {
    const iconClass = computed(() => {
      const icons = {
        warning: 'fas fa-exclamation-triangle text-warning',
        danger: 'fas fa-exclamation-circle text-danger',
        info: 'fas fa-info-circle text-info',
        success: 'fas fa-check-circle text-success'
      }
      return icons[props.type] || icons.warning
    })

    const confirmButtonClass = computed(() => {
      const classes = {
        warning: 'btn btn-warning',
        danger: 'btn btn-danger',
        info: 'btn btn-info',
        success: 'btn btn-success'
      }
      return classes[props.type] || classes.warning
    })

    const handleConfirm = () => {
      emit('confirm')
    }

    const handleCancel = () => {
      emit('cancel')
      emit('close')
    }

    const handleOverlayClick = () => {
      if (props.closeOnOverlay && !props.loading) {
        emit('cancel')
        emit('close')
      }
    }

    return {
      iconClass,
      confirmButtonClass,
      handleConfirm,
      handleCancel,
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
.confirm-dialog-overlay {
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

.confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: dialogSlideIn 0.3s ease-out;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.confirm-dialog-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e9ecef;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confirm-dialog-body {
  padding: 1.5rem;
}

.confirm-dialog-message {
  margin: 0 0 1rem;
  color: #6c757d;
  line-height: 1.5;
}

.confirm-dialog-details {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem;
  color: #495057;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.confirm-dialog-footer {
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

.btn-warning {
  background: #ffc107;
  border-color: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
  border-color: #d39e00;
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
</style> 