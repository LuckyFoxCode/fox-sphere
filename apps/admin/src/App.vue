<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools';
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';
import { useTheme } from '@/composables/useTheme';
import { TheHeader, TheSidebar } from './components/nav';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar';

const { isDark } = useTheme();
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
    <Toaster :theme="isDark ? 'dark' : 'light'" />
  </SidebarProvider>
</template>
