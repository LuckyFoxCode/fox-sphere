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
    class="flex w-100 items-center gap-x-2"
  >
    <div class="border-text-second/50 flex size-7 items-center justify-center rounded-full border">
      <span>{{ level }}</span>
    </div>
    <div class="flex flex-1 flex-col items-center text-xs">
      <span>{{ newXp }} / {{ maxXp }}</span>
      <div class="bg-event-cyan/10 h-3.5 w-full rounded-lg">
        <div
          :style="{ width: `${progressPercentage}%` }"
          class="from-event-cyan/20 to-event-cyan/80 h-full rounded-lg bg-linear-to-r transition-[width] duration-500 ease-in-out"
        />
      </div>
    </div>
  </div>
</template>
