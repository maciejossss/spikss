<template>
  <div v-if="visible && device" class="device-details-overlay" @click="handleOverlayClick">
    <div class="device-details-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-cogs"></i>
          Szczegóły urządzenia
        </h3>
        <div class="header-actions">
          <button 
            @click="$emit('edit', device)"
            class="btn btn-outline-primary"
            v-if="!loading"
          >
            <i class="fas fa-edit"></i>
            Edytuj
          </button>
          <button @click="handleClose" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Ładowanie szczegółów...</span>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="modal-body">
        <!-- Status Indicators -->
        <div class="status-indicators">
          <div class="status-badge" :class="getStatusClass(device.status)">
            <i :class="getStatusIcon(device.status)"></i>
            {{ device.status_label }}
          </div>
          
          <div v-if="device.service_overdue" class="status-badge danger">
            <i class="fas fa-exclamation-triangle"></i>
            Zaległy serwis
          </div>
          
          <div class="status-badge" :class="getWarrantyClass(device.warranty_status)">
            <i :class="getWarrantyIcon(device.warranty_status)"></i>
            {{ getWarrantyLabel(device.warranty_status) }}
          </div>
        </div>

        <!-- Main Information -->
        <div class="info-sections">
          <!-- Basic Information -->
          <div class="info-section">
            <h4 class="section-title">
              <i class="fas fa-info-circle"></i>
              Informacje podstawowe
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Typ urządzenia</label>
                <span>{{ device.device_type_label }}</span>
              </div>
              <div class="info-item">
                <label>Marka</label>
                <span>{{ device.brand || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Model</label>
                <span>{{ device.model || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Numer seryjny</label>
                <span>{{ device.serial_number || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Rok produkcji</label>
                <span>{{ device.manufacture_year || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Wiek urządzenia</label>
                <span>{{ device.age_years ? `${device.age_years} lat` : '-' }}</span>
              </div>
            </div>
          </div>

          <!-- Technical Specifications -->
          <div class="info-section">
            <h4 class="section-title">
              <i class="fas fa-cog"></i>
              Specyfikacja techniczna
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Moc</label>
                <span>{{ device.power_rating ? `${device.power_rating} kW` : '-' }}</span>
              </div>
              <div class="info-item">
                <label>Typ paliwa</label>
                <span>{{ device.fuel_type_label || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Ocena stanu</label>
                <span v-if="device.condition_rating" class="condition-rating">
                  <span class="rating-stars">
                    <i 
                      v-for="star in 5" 
                      :key="star"
                      :class="['fas fa-star', star <= device.condition_rating ? 'filled' : 'empty']"
                    ></i>
                  </span>
                  {{ device.condition_rating }}/5
                </span>
                <span v-else>-</span>
              </div>
              <div class="info-item full-width" v-if="device.location_description">
                <label>Lokalizacja</label>
                <span>{{ device.location_description }}</span>
              </div>
            </div>
          </div>

          <!-- Client Information -->
          <div class="info-section">
            <h4 class="section-title">
              <i class="fas fa-building"></i>
              Informacje o kliencie
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Firma</label>
                <span>{{ device.company_name || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Osoba kontaktowa</label>
                <span>{{ device.contact_person || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Telefon</label>
                <span>{{ device.client_phone || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Email</label>
                <span>{{ device.client_email || '-' }}</span>
              </div>
              <div class="info-item full-width" v-if="device.address_street">
                <label>Adres</label>
                <span>
                  {{ device.address_street }}, 
                  {{ device.address_postal_code }} {{ device.address_city }}
                </span>
              </div>
            </div>
          </div>

          <!-- Service Information -->
          <div class="info-section">
            <h4 class="section-title">
              <i class="fas fa-wrench"></i>
              Informacje serwisowe
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Data instalacji</label>
                <span>{{ formatDate(device.installation_date) || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Gwarancja do</label>
                <span :class="getWarrantyDateClass(device.warranty_expiry_date)">
                  {{ formatDate(device.warranty_expiry_date) || '-' }}
                </span>
              </div>
              <div class="info-item">
                <label>Interwał serwisu</label>
                <span>{{ device.maintenance_interval_days ? `${device.maintenance_interval_days} dni` : '-' }}</span>
              </div>
              <div class="info-item">
                <label>Ostatni serwis</label>
                <span>{{ formatDate(device.last_service_date) || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Następny serwis</label>
                <span :class="getServiceDateClass(device.next_service_due)">
                  {{ formatDate(device.next_service_due) || '-' }}
                </span>
              </div>
              <div class="info-item">
                <label>Status serwisu</label>
                <span :class="getServiceStatusClass(device.service_status)">
                  {{ getServiceStatusLabel(device.service_status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Technical Specifications JSON -->
          <div class="info-section" v-if="device.technical_specifications && Object.keys(device.technical_specifications).length > 0">
            <h4 class="section-title">
              <i class="fas fa-clipboard-list"></i>
              Dodatkowe specyfikacje
            </h4>
            <div class="technical-specs">
              <div 
                v-for="(value, key) in device.technical_specifications" 
                :key="key"
                class="spec-item"
              >
                <label>{{ formatSpecKey(key) }}</label>
                <span>{{ value }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="info-section" v-if="device.notes">
            <h4 class="section-title">
              <i class="fas fa-sticky-note"></i>
              Uwagi
            </h4>
            <div class="notes-content">
              {{ device.notes }}
            </div>
          </div>

          <!-- System Information -->
          <div class="info-section">
            <h4 class="section-title">
              <i class="fas fa-database"></i>
              Informacje systemowe
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Data utworzenia</label>
                <span>{{ formatDateTime(device.created_at) }}</span>
              </div>
              <div class="info-item">
                <label>Ostatnia aktualizacja</label>
                <span>{{ formatDateTime(device.updated_at) }}</span>
              </div>
              <div class="info-item">
                <label>Utworzone przez</label>
                <span>{{ device.created_by_name ? `${device.created_by_name} ${device.created_by_lastname}` : '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'DeviceDetailsModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    device: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'edit'],
  setup(props, { emit }) {
    const handleClose = () => {
      emit('close')
    }

    const handleOverlayClick = () => {
      if (!props.loading) {
        handleClose()
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleDateString('pl-PL')
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleString('pl-PL')
    }

    const formatSpecKey = (key) => {
      return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    const getStatusClass = (status) => {
      const classes = {
        'active': 'success',
        'inactive': 'warning',
        'decommissioned': 'danger'
      }
      return classes[status] || 'secondary'
    }

    const getStatusIcon = (status) => {
      const icons = {
        'active': 'fas fa-check-circle',
        'inactive': 'fas fa-pause-circle',
        'decommissioned': 'fas fa-times-circle'
      }
      return icons[status] || 'fas fa-question-circle'
    }

    const getWarrantyClass = (warrantyStatus) => {
      const classes = {
        'valid': 'success',
        'expiring_soon': 'warning',
        'expired': 'danger',
        'unknown': 'secondary'
      }
      return classes[warrantyStatus] || 'secondary'
    }

    const getWarrantyIcon = (warrantyStatus) => {
      const icons = {
        'valid': 'fas fa-shield-alt',
        'expiring_soon': 'fas fa-exclamation-triangle',
        'expired': 'fas fa-shield-alt',
        'unknown': 'fas fa-question-circle'
      }
      return icons[warrantyStatus] || 'fas fa-question-circle'
    }

    const getWarrantyLabel = (warrantyStatus) => {
      const labels = {
        'valid': 'Gwarancja ważna',
        'expiring_soon': 'Gwarancja wygasa',
        'expired': 'Gwarancja wygasła',
        'unknown': 'Brak danych o gwarancji'
      }
      return labels[warrantyStatus] || 'Nieznany'
    }

    const getWarrantyDateClass = (date) => {
      if (!date) return ''
      const warrantyDate = new Date(date)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((warrantyDate - today) / (1000 * 60 * 60 * 24))
      
      if (daysUntilExpiry < 0) return 'text-danger'
      if (daysUntilExpiry <= 30) return 'text-warning'
      return 'text-success'
    }

    const getServiceDateClass = (date) => {
      if (!date) return ''
      const serviceDate = new Date(date)
      const today = new Date()
      
      if (serviceDate < today) return 'text-danger'
      
      const daysUntilService = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24))
      if (daysUntilService <= 14) return 'text-warning'
      
      return 'text-success'
    }

    const getServiceStatusClass = (status) => {
      const classes = {
        'overdue': 'text-danger',
        'due_soon': 'text-warning',
        'scheduled': 'text-success',
        'unknown': 'text-muted'
      }
      return classes[status] || 'text-muted'
    }

    const getServiceStatusLabel = (status) => {
      const labels = {
        'overdue': 'Zaległy',
        'due_soon': 'Wkrótce',
        'scheduled': 'Zaplanowany',
        'unknown': 'Nieznany'
      }
      return labels[status] || 'Nieznany'
    }

    return {
      handleClose,
      handleOverlayClick,
      formatDate,
      formatDateTime,
      formatSpecKey,
      getStatusClass,
      getStatusIcon,
      getWarrantyClass,
      getWarrantyIcon,
      getWarrantyLabel,
      getWarrantyDateClass,
      getServiceDateClass,
      getServiceStatusClass,
      getServiceStatusLabel
    }
  }
}
</script>

<style scoped>
.device-details-overlay {
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

.device-details-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 900px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.loading-container {
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #6c757d;
}

.modal-body {
  padding: 1.5rem;
}

.status-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.warning {
  background: #fff3cd;
  color: #856404;
}

.status-badge.danger {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.secondary {
  background: #f8f9fa;
  color: #6c757d;
}

.info-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
}

.info-item span {
  font-size: 0.875rem;
  color: #495057;
  font-weight: 500;
}

.condition-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rating-stars {
  display: flex;
  gap: 0.125rem;
}

.rating-stars .fa-star.filled {
  color: #ffc107;
}

.rating-stars .fa-star.empty {
  color: #e9ecef;
}

.technical-specs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.spec-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
}

.spec-item span {
  font-size: 0.875rem;
  color: #495057;
  font-weight: 500;
}

.notes-content {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  color: #495057;
  line-height: 1.5;
  white-space: pre-wrap;
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
  text-decoration: none;
}

.btn-outline-primary {
  color: #007bff;
  border-color: #007bff;
  background: white;
}

.btn-outline-primary:hover {
  background: #007bff;
  color: white;
}

.text-danger {
  color: #dc3545 !important;
}

.text-warning {
  color: #ffc107 !important;
}

.text-success {
  color: #28a745 !important;
}

.text-muted {
  color: #6c757d !important;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .technical-specs {
    grid-template-columns: 1fr;
  }
  
  .device-details-modal {
    width: 98%;
    margin: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style> 