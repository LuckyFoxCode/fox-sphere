<script setup lang="ts">
defineProps<{ level: number }>();
</script>

<template>
  <div
    class="border-lime text-text-main flex size-12 flex-col items-center justify-center rounded-md border-3"
  >
    <span class="text-lg">{{ level }}</span>
  </div>
</template>
