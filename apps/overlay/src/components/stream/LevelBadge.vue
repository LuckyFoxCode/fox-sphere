<script setup lang="ts">
import { getRankConfigByLevel, MAX_ICON_TIER, RANK_RINGS } from '@/constants';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ level: number; isBroadcaster?: boolean; size?: number }>(),
  {
    size: 64,
  },
);

const ring = computed(
  () =>
    RANK_RINGS[
      Math.min(getRankConfigByLevel(props.level, props.isBroadcaster).tier, MAX_ICON_TIER)
    ],
);

const ringStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
const levelStyle = computed(() => ({ fontSize: `${Math.round(props.size * 0.28)}px` }));
</script>

<template>
  <div class="text-text-main relative flex">
    <component
      :is="ring"
      :style="ringStyle"
    />
    <span
      class="absolute top-1/2 left-1/2 -translate-1/2 font-bold"
      :style="levelStyle"
    >
      {{ level }}
    </span>
  </div>
</template>
