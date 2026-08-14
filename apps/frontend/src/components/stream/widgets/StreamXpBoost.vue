<script setup lang="ts">
import { IconLightning } from '@/assets/icons';
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';

const { xpBoost, xpBoostTimeLeft } = useStreamSocket(socket);

const isActive = computed(() => xpBoost.value !== null && xpBoostTimeLeft.value > 0);

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${String(s).padStart(2, '0')}`;
};
</script>

<template>
  <Transition name="zoom-in">
    <div
      v-if="isActive"
      class="bg-event-purple/20 border-event-purple flex items-center gap-x-2 rounded-lg border px-4 py-2 text-lg font-bold"
    >
      <IconLightning class="text-event-purple size-5" />
      <span class="text-event-amber">×{{ xpBoost?.multiplier }} XP active</span>
      <span class="text-text-second">{{ formatTime(xpBoostTimeLeft) }}</span>
    </div>
  </Transition>
</template>
