<script setup lang="ts">
defineProps<{ level?: number }>();
</script>

<template>
  <span
    class="text-lime flex items-center justify-center rounded-full text-base leading-none font-semibold tracking-wide whitespace-nowrap"
  >
    {{ level ?? 1 }}
  </span>
</template>
