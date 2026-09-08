<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools';
import { RouterView } from 'vue-router';
import { TheHeader, TheSidebar } from './components/nav';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar';
</script>

<template>
  <SidebarProvider>
    <TheSidebar />
    <SidebarInset>
      <main class="flex-1 px-6 pb-6">
        <TheHeader />
        <RouterView />
      </main>
    </SidebarInset>
    <VueQueryDevtools />
  </SidebarProvider>
</template>
