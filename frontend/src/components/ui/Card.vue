<template>
  <div :class="cardClasses">
    <!-- Header -->
    <div v-if="$slots.header || title" class="card-header">
      <div v-if="title" class="flex items-center justify-between">
        <h3 :class="titleClasses">{{ title }}</h3>
        <div v-if="$slots.actions" class="flex items-center space-x-2">
          <slot name="actions" />
        </div>
      </div>
      <slot v-else name="header" />
    </div>

    <!-- Body -->
    <div :class="bodyClasses">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'elevated', 'outlined', 'ghost', 'gradient'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  rounded: {
    type: String,
    default: '2xl',
    validator: (value) => ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(value)
  },
  hover: {
    type: Boolean,
    default: true
  },
  clickable: Boolean,
  loading: Boolean,
  noPadding: Boolean
})

const emit = defineEmits(['click'])

const cardClasses = computed(() => {
  const baseClasses = [
    'bg-white transition-all duration-200',
    props.clickable ? 'cursor-pointer select-none' : '',
    props.loading ? 'loading-pulse' : ''
  ]

  // Variant classes
  const variantClasses = {
    default: 'border border-gray-100 shadow-soft',
    elevated: 'shadow-medium border border-gray-50',
    outlined: 'border-2 border-gray-200 shadow-none',
    ghost: 'border-none shadow-none bg-gray-50/50',
    gradient: 'border border-gray-100 shadow-soft bg-gradient-to-br from-white to-gray-50'
  }

  // Hover effects
  const hoverClasses = props.hover ? {
    default: 'hover:shadow-medium',
    elevated: 'hover:shadow-lg hover:-translate-y-1',
    outlined: 'hover:border-primary-300 hover:shadow-sm',
    ghost: 'hover:bg-gray-100/50',
    gradient: 'hover:shadow-medium'
  }[props.variant] : ''

  // Rounded classes
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl'
  }

  // Clickable effects
  const clickableClasses = props.clickable ? 'active:scale-[0.98] active:shadow-sm' : ''

  return [
    ...baseClasses,
    variantClasses[props.variant],
    hoverClasses,
    roundedClasses[props.rounded],
    clickableClasses
  ].filter(Boolean).join(' ')
})

const titleClasses = computed(() => {
  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-semibold',
    xl: 'text-2xl font-bold'
  }

  return [
    'text-gray-900',
    sizeClasses[props.size]
  ].join(' ')
})

const bodyClasses = computed(() => {
  if (props.noPadding) return ''
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  return paddingClasses[props.size]
})

const handleClick = (event) => {
  if (props.clickable && !props.loading) {
    emit('click', event)
  }
}
</script> 