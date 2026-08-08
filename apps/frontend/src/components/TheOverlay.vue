<script setup lang="ts">
import TheFooter from './TheFooter.vue';
import TheHeader from './TheHeader.vue';
import TheSidebar from './TheSidebar.vue';
import { WidgetEventsHub } from './widgets-hub';
</script>

<template>
  <div class="relative flex h-screen w-screen flex-col overflow-hidden">
    <TheHeader />
    <main class="flex w-full flex-1 justify-end">
      <WidgetEventsHub />
      <TheSidebar />
    </main>
    <TheFooter />
  </div>
</template>
