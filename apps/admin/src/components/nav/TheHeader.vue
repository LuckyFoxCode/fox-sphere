<script setup lang="ts">
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-1 px-4">
    <SidebarTrigger class="-ml-1" />
    <div class="flex-1" />
    <ThemeToggle />
    <span class="text-muted-foreground text-sm">LuckyFoxCode</span>
  </header>
</template>
