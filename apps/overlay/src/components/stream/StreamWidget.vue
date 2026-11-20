<script setup lang="ts">
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { StreamLevelUp } from './widgets';

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
  <!-- Плашка буста живёт не здесь, а в `TheOverlay` рядом с карточкой музыки:
       она постоянный статус, а не событие, и её место на экране - слева от
       «что играет». См. `StreamXpBoost.vue`. -->
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
</template>
