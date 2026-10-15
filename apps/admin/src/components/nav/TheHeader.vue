<script setup lang="ts">
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/custom-ui/theme-toggle';
import { useSessionQuery } from '@/composables/useSession';

const { displayName, sessionState } = useSessionQuery();
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-1 px-4">
    <SidebarTrigger class="-ml-1" />
    <div class="flex-1" />
    <ThemeToggle />
    <!-- `sessionState` rather than `displayName || 'Guest'`: while the answer is unknown the name
         is an empty string, and `||` would flash "Guest" before swapping to the real one. -->
    <span class="text-muted-foreground text-sm">{{
      sessionState === 'guest' ? 'Guest' : displayName
    }}</span>
  </header>
</template>
