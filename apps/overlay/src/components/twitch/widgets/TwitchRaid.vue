<script setup lang="ts">
import { IconLightning } from '@/assets/icons';
import { EventSticker } from '@/components/ui';
import type { TwitchRaidPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ raid: TwitchRaidPayload }>();

const chips = computed(() => [
  `${props.raid.viewers} ${props.raid.viewers === 1 ? 'viewer' : 'viewers'}`,
]);
</script>

<template>
  <EventSticker
    variant="cyan"
    :icon="IconLightning"
    label="raid incoming"
    :title="raid.raiderName"
    detail="welcome to the sphere"
    :chips="chips"
  />
</template>
