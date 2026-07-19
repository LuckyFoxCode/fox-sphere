<script setup lang="ts">
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';

const { level, maxXp, newXp, isLoading } = useStreamSocket(socket);

const progressPercentage = computed(() => {
  if (maxXp.value === 0) return 0;

  const percentage = (newXp.value / maxXp.value) * 100;

  return Math.min(Math.max(percentage, 0), 100);
});
</script>

<template>
  <div
    v-if="!isLoading"
    class="my-auto flex w-100 items-center"
  >
    <div
      class="border-event-blue/70 text-event-blue/75 flex size-12 flex-col items-center justify-center rounded-md border-3"
    >
      <span class="text-lg">15</span>
    </div>
    <div class="border-event-blue/20 h-7 w-full rounded-r-lg border-3 border-l-transparent">
      <div
        class="border-event-blue/40 h-full w-full rounded-r-md border-2 border-l-transparent"
      ></div>
    </div>
  </div>
</template>
