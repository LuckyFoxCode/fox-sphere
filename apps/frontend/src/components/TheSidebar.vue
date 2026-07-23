<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { TwitchTimer } from './twitch/widgets';

const { isTimerActive, timer, timeDigits } = useTwitchSocket(socket);
</script>

<template>
  <aside class="bg-card/70 flex h-full w-100 flex-col pt-1.5 backdrop-blur-md">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <TwitchTimer
        v-if="isTimerActive && timer"
        :timer="timer"
        :time-digits="timeDigits"
      />
    </Transition>
  </aside>
</template>
