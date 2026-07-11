<script setup lang="ts">
import { useUserSocket, type UserEventType } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { UserLevelUp } from './widgets';

const { currentEventType, levelUp } = useUserSocket(socket);

interface WidgetMapValue {
  component: Component;
  props?: Record<string, unknown>;
}

type ActiveLotteryEvent = Exclude<UserEventType, 'idle'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle') return null;

  const map: Record<ActiveLotteryEvent, WidgetMapValue> = {
    'level-up': { component: UserLevelUp, props: { levelUp: levelUp.value } },
  };

  return map[currentEventType.value as ActiveLotteryEvent] || null;
});
</script>

<template>
  <div class="fixed top-[20%]">
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
