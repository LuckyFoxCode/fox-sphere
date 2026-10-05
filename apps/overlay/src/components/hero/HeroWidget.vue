<script setup lang="ts">
import { useHeroSocket, type HeroEventType } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { HeroAssigned } from './widgets';

const { currentEventType, newUserWithHero } = useHeroSocket(socket);

interface WidgetMapValue {
  component: Component;
  props: Record<string, unknown>;
}

type ActiveHeroEvents = Exclude<HeroEventType, 'idle'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle') return null;

  const map: Record<ActiveHeroEvents, WidgetMapValue> = {
    assigned: { component: HeroAssigned, props: { newUser: newUserWithHero.value } },
  };

  return map[currentEventType.value as ActiveHeroEvents] || null;
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
