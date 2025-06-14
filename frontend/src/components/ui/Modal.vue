<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-10 overflow-y-auto" @click="$emit('close')">
      <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" />

        <span class="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div
          class="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
          @click.stop
        >
          <div class="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              @click="$emit('close')"
            >
              <span class="sr-only">Zamknij</span>
              <XMarkIcon class="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div class="sm:flex sm:items-start">
            <div class="mt-3 w-full text-center sm:mt-0 sm:text-left">
              <h3 class="text-lg font-medium leading-6 text-gray-900">
                <slot name="title" />
              </h3>
              <div class="mt-2">
                <slot name="content" />
              </div>
            </div>
          </div>

          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style> 