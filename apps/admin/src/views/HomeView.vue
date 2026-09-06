<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold">Fox Sphere Admin</h1>
    <div class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        to="/channels"
        class="bg-card text-card-foreground hover:bg-accent rounded-xl border p-6 transition-colors"
      >
        <h2 class="font-medium">Channels</h2>
        <p class="text-muted-foreground text-sm">Manage channels and create new ones</p>
      </RouterLink>
      <!-- Сюда лягут будущие разделы: dashboard, team members, dev-tools -->
    </div>
  </div>
</template>
