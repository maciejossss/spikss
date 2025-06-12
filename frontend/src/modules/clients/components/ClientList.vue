<template>
  <div class="overflow-x-auto">
    <table class="table w-full">
      <thead>
        <tr>
          <th>Nazwa / Osoba</th>
          <th>Kontakt</th>
          <th>Typ</th>
          <th>Status</th>
          <th>Akcje</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="text-center">
          <td colspan="5">
            <div class="flex justify-center items-center p-4">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          </td>
        </tr>
        <tr v-else-if="error" class="text-center">
          <td colspan="5">
            <div class="alert alert-error">
              {{ error }}
            </div>
          </td>
        </tr>
        <tr v-else-if="clients.length === 0" class="text-center">
          <td colspan="5">Brak klientów do wyświetlenia</td>
        </tr>
        <template v-else>
          <tr v-for="client in clients" :key="client.id" class="hover">
            <td>
              <div class="font-bold">{{ client.company_name || client.contact_person }}</div>
              <div v-if="client.company_name" class="text-sm opacity-50">
                {{ client.contact_person }}
              </div>
            </td>
            <td>
              <div>{{ client.phone }}</div>
              <div class="text-sm opacity-50">{{ client.email }}</div>
            </td>
            <td>
              <div class="badge" :class="{
                'badge-primary': client.client_type === 'business',
                'badge-secondary': client.client_type === 'individual'
              }">
                {{ client.client_type === 'business' ? 'Firma' : 'Osoba prywatna' }}
              </div>
            </td>
            <td>
              <div class="badge" :class="{
                'badge-success': client.status === 'active',
                'badge-error': client.status === 'inactive'
              }">
                {{ client.status === 'active' ? 'Aktywny' : 'Nieaktywny' }}
              </div>
            </td>
            <td>
              <div class="flex gap-2">
                <button 
                  class="btn btn-sm btn-ghost"
                  @click="$emit('edit', client)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  class="btn btn-sm btn-ghost text-error"
                  @click="$emit('delete', client)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { Client } from '../types/client.types'

defineProps<{
  clients: Client[]
  loading: boolean
  error: string | null
}>()

defineEmits<{
  (e: 'edit', client: Client): void
  (e: 'delete', client: Client): void
}>()
</script> 