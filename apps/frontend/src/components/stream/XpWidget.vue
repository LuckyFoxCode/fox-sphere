<script setup lang="ts">
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';
import LevelBadge from './LevelBadge.vue';
import XpProgressBar from './XpProgressBar.vue';

const { level, maxXp, newXp, isLoading } = useStreamSocket(socket);

const progressPercentage = computed(() => {
  if (!maxXp.value || maxXp.value === 0) return 0;
  const percentage = (newXp.value / maxXp.value) * 100;
  return Math.min(Math.max(percentage, 0), 100);
});
</script>

<template>
  <div
    v-if="!isLoading"
    class="my-auto flex w-100 items-center gap-x-1.5"
  >
    <LevelBadge :level="level" />
    <XpProgressBar
      :max-xp="maxXp"
      :new-xp="newXp"
      :progress-percentage="progressPercentage"
    />
  </div>
</template>
