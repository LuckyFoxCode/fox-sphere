<script setup lang="ts">
import { usePokemonSocket, type PokemonEventType } from '@/composables/sockets';
import { socket } from '@/services';
import { computed, type Component } from 'vue';
import { PokemonAssigned } from './widgets';

const { currentEventType, newUserWithPokemon } = usePokemonSocket(socket);

interface WidgetMapValue {
  component: Component;
  props: Record<string, unknown>;
}

type ActivePokemonEvents = Exclude<PokemonEventType, 'idle'>;

const widgetConfig = computed(() => {
  if (currentEventType.value === 'idle') return null;

  const map: Record<ActivePokemonEvents, WidgetMapValue> = {
    assigned: { component: PokemonAssigned, props: { newUser: newUserWithPokemon.value } },
  };

  return map[currentEventType.value as ActivePokemonEvents] || null;
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
