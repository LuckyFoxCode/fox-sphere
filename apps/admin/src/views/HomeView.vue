<script setup lang="ts">
import { navItems } from '@/components/nav';
import { RouterLink } from 'vue-router';
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold">Dashboard</h1>
    <div class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.url"
        :to="item.url"
        class="bg-card text-card-foreground hover:bg-accent rounded-xl border p-6 transition-colors"
      >
        <div class="mb-3 flex items-center gap-3">
          <component
            :is="item.icon"
            class="text-muted-foreground size-5"
          />
          <h2 class="font-medium">{{ item.title }}</h2>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
