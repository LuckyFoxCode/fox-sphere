<script setup lang="ts">
import { IconCrown } from '@/assets/icons';
import { EventSticker } from '@/components/ui';
import type { TwitchAddVipPaylod } from '@fox-sphere/types';

defineProps<{ addVip: TwitchAddVipPaylod }>();
</script>

<template>
  <EventSticker
    variant="rose"
    :icon="IconCrown"
    label="vip unlocked"
    :title="addVip.username"
    detail="elite presence activated"
  />
</template>
