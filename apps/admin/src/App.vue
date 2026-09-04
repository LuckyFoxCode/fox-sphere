<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools';
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="bg-background text-foreground min-h-screen">
    <header class="border-border border-b px-6 py-4">
      <h1 class="text-lg font-semibold">Fox Sphere Admin</h1>
      <nav class="text-muted-foreground mt-1 text-sm">
        <RouterLink
          to="/"
          class="hover:text-foreground"
        >
          Home
        </RouterLink>
        <RouterLink
          to="/channels"
          class="hover:text-foreground"
        >
          Channels
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto max-w-4xl p-6">
      <RouterView />
    </main>

    <VueQueryDevtools />
  </div>
</template>
