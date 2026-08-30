<script setup lang="ts">
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { StreamLevelUp, StreamXpBoost } from './widgets';

const { currentEventType, levelUp } = useStreamSocket(socket);

const widgetConfig = computed<{
  component: Component;
  props: Record<string, unknown>;
} | null>(() => {
  if (currentEventType.value !== 'level-up') return null;

  return { component: StreamLevelUp, props: { levelUp: levelUp.value } };
});
</script>

<template>
  <div>
    <StreamXpBoost />

    <div class="fixed top-[20%] left-1/2 -translate-1/2">
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
  </div>
</template>
