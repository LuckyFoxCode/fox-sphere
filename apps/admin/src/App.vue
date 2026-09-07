<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools';
import { RouterView } from 'vue-router';
import { TheSidebar } from './components/nav';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
</script>

<template>
  <SidebarProvider>
    <TheSidebar />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger class="-ml-1" />
      </header>
      <main class="flex-1 px-6 pb-6">
        <RouterView />
      </main>
    </SidebarInset>
    <VueQueryDevtools />
  </SidebarProvider>
</template>
