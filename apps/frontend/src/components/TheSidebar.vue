<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { TwitchTimer } from './twitch/widgets';

const { timer, currentEventType } = useTwitchSocket(socket);
</script>

<template>
  <aside class="bg-card/20 absolute top-0 right-0 flex h-[93%] w-100 flex-col">
    <div class="flex flex-col">
      <Transition
        name="zoom-in"
        mode="out-in"
      >
        <TwitchTimer
          v-if="currentEventType === 'timer' && timer"
          :timer="timer"
        />
      </Transition>
    </div>
  </aside>
</template>
