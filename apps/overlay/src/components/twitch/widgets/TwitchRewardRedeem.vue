<script setup lang="ts">
import { IconGift } from '@/assets/icons';
import { EventSticker } from '@/components/ui';
import type { TwitchRewardPayload } from '@fox-sphere/types';

defineProps<{ reward: TwitchRewardPayload }>();
</script>

<template>
  <EventSticker
    variant="purple"
    :icon="IconGift"
    label="reward redeemed"
    :title="reward.username"
    :chips="[reward.rewardTitle]"
  />
</template>
