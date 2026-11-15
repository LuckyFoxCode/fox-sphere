<script setup lang="ts">
import { StickerFrame } from '@/components/ui';
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
  <StickerFrame
    v-if="!isLoading"
    class="w-100 gap-x-2.5 py-1 pr-3 pl-2.5"
  >
    <LevelBadge
      :level="level"
      :size="46"
    />
    <XpProgressBar
      :max-xp="maxXp"
      :new-xp="newXp"
      :progress-percentage="progressPercentage"
    />
  </StickerFrame>
</template>
