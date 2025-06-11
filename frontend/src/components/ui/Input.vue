<template>
  <div class="space-y-2">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative">
      <!-- Leading icon -->
      <div v-if="leadingIcon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <component :is="leadingIcon" :class="iconClasses" />
      </div>

      <!-- Input field -->
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :pattern="pattern"
        :autocomplete="autocomplete"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown="handleKeydown"
      />

      <!-- Trailing icon or loading -->
      <div v-if="trailingIcon || loading" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <div v-if="loading" class="loading-spinner w-4 h-4"></div>
        <component v-else-if="trailingIcon" :is="trailingIcon" :class="iconClasses" />
      </div>

      <!-- Clear button -->
      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
        @click="handleClear"
      >
        <X class="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </button>
    </div>

    <!-- Help text -->
    <p v-if="helpText && !error" class="text-sm text-gray-500">
      {{ helpText }}
    </p>

    <!-- Error message -->
    <p v-if="error" class="form-error">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => [
      'text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'
    ].includes(value)
  },
  label: String,
  placeholder: String,
  helpText: String,
  error: String,
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'filled', 'outlined'].includes(value)
  },
  leadingIcon: [String, Object],
  trailingIcon: [String, Object],
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  loading: Boolean,
  clearable: Boolean,
  min: [String, Number],
  max: [String, Number],
  step: [String, Number],
  pattern: String,
  autocomplete: String
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'clear', 'keydown'])

const inputId = useId()
const isFocused = ref(false)

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleBlur = (event) => {
  isFocused.value = false
  emit('blur', event)
}

const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}

const handleKeydown = (event) => {
  emit('keydown', event)
}

const inputClasses = computed(() => {
  const baseClasses = [
    'form-input',
    'transition-all duration-200',
    'focus:outline-none'
  ]

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  }

  // Variant classes
  const variantClasses = {
    default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
    filled: 'border-transparent bg-gray-100 focus:bg-white focus:border-primary-500 focus:ring-primary-500',
    outlined: 'border-2 border-gray-300 focus:border-primary-500 bg-transparent'
  }

  // State classes
  const stateClasses = []
  
  if (props.error) {
    stateClasses.push('border-red-500 focus:border-red-500 focus:ring-red-500')
  }
  
  if (props.disabled) {
    stateClasses.push('bg-gray-100 text-gray-500 cursor-not-allowed')
  }
  
  if (props.readonly) {
    stateClasses.push('bg-gray-50 cursor-default')
  }

  // Icon padding
  const iconPadding = []
  if (props.leadingIcon) {
    iconPadding.push('pl-10')
  }
  if (props.trailingIcon || props.loading || props.clearable) {
    iconPadding.push('pr-10')
  }

  return [
    ...baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    ...stateClasses,
    ...iconPadding
  ].filter(Boolean).join(' ')
})

const iconClasses = computed(() => {
  const baseClasses = 'w-5 h-5'
  
  if (props.error) {
    return `${baseClasses} text-red-500`
  }
  
  if (props.disabled) {
    return `${baseClasses} text-gray-400`
  }
  
  return `${baseClasses} text-gray-500`
})
</script> 