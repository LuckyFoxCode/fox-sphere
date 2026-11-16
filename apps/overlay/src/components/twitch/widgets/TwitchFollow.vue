<script setup lang="ts">
import { IconPaw } from '@/assets/icons';
import { EventSticker } from '@/components/ui';
import type { TwitchFollowPayload } from '@fox-sphere/types';

defineProps<{ follow: TwitchFollowPayload }>();
</script>

<template>
  <EventSticker
    variant="red"
    :icon="IconPaw"
    label="new follower"
    :title="follow.username"
    detail="welcome to the sphere"
  />
</template>
