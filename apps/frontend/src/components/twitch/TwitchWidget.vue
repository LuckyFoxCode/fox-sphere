<script setup lang="ts">
import { useTwitchSocket, type TwitchEventType } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { TwitchAddVip, TwitchFollow, TwitchRaid, TwitchRewardRedeem } from './widgets';

const { addVip, currentEventType, follow, raid, reward } = useTwitchSocket(socket);

interface WidgetMapValue {
  component: Component;
  props: Record<string, unknown>;
}

type ActiveTwitchEvents = Exclude<TwitchEventType, 'idle' | 'timer'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle' || currentEventType.value === 'timer') return null;

  const map: Record<ActiveTwitchEvents, WidgetMapValue> = {
    'add-vip': { component: TwitchAddVip, props: { addVip: addVip.value } },
    reward: { component: TwitchRewardRedeem, props: { reward: reward.value } },
    raid: { component: TwitchRaid, props: { raid: raid.value } },
    follow: { component: TwitchFollow, props: { follow: follow.value } },
  };

  return map[currentEventType.value as ActiveTwitchEvents] || null;
});
</script>

<template>
  <div class="fixed bottom-[15%] left-1/2 -translate-1/2">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <component
        :is="widgetConfig?.component"
        v-if="widgetConfig"
        v-bind="widgetConfig.props"
      />
    </Transition>
  </div>
</template>
