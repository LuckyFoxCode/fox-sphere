<script setup lang="ts">
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';
import LevelBadge from './LevelBadge.vue';
import XpProgressBar from './XpProgressBar.vue';

const { level, maxXp, newXp, startXp, isLoading } = useStreamSocket(socket);

const progressPercentage = computed(() => {
  const levelRange = maxXp.value - startXp.value;
  if (!levelRange) return 0;
  const percentage = ((newXp.value - startXp.value) / levelRange) * 100;
  return Math.min(Math.max(percentage, 0), 100);
});
</script>

<template>
  <div
    v-if="!isLoading"
    class="relative my-auto flex w-100 items-center gap-x-1.5"
  >
    <LevelBadge :level="level" />
    <XpProgressBar
      :max-xp="maxXp"
      :new-xp="newXp"
      :progress-percentage="progressPercentage"
    />
  </div>
</template>
