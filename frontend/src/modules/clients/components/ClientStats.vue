<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Clients -->
    <div class="stat bg-base-100 shadow">
      <div class="stat-figure text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div class="stat-title">Wszyscy klienci</div>
      <div class="stat-value">{{ stats.total }}</div>
      <div class="stat-desc">
        <span :class="stats.totalTrend > 0 ? 'text-success' : 'text-error'">
          {{ stats.totalTrend > 0 ? '↗' : '↘' }} {{ Math.abs(stats.totalTrend) }}%
        </span>
        vs poprzedni miesiąc
      </div>
    </div>

    <!-- Active Clients -->
    <div class="stat bg-base-100 shadow">
      <div class="stat-figure text-success">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="stat-title">Aktywni klienci</div>
      <div class="stat-value text-success">{{ stats.active }}</div>
      <div class="stat-desc">{{ ((stats.active / stats.total) * 100).toFixed(1) }}% wszystkich klientów</div>
    </div>

    <!-- Business Clients -->
    <div class="stat bg-base-100 shadow">
      <div class="stat-figure text-info">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <div class="stat-title">Firmy</div>
      <div class="stat-value text-info">{{ stats.business }}</div>
      <div class="stat-desc">{{ ((stats.business / stats.total) * 100).toFixed(1) }}% wszystkich klientów</div>
    </div>

    <!-- Individual Clients -->
    <div class="stat bg-base-100 shadow">
      <div class="stat-figure text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div class="stat-title">Osoby prywatne</div>
      <div class="stat-value text-secondary">{{ stats.individual }}</div>
      <div class="stat-desc">{{ ((stats.individual / stats.total) * 100).toFixed(1) }}% wszystkich klientów</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ClientStats {
  total: number
  active: number
  business: number
  individual: number
  totalTrend: number
}

defineProps<{
  stats: ClientStats
}>()
</script> 