<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { TwitchTimer } from './twitch/widgets';
import { ChatWidget } from './twitch/widgets/chat';

const { isTimerActive, timer, timeDigits, messages } = useTwitchSocket(socket);
</script>

<template>
  <aside class="bg-card/70 flex h-full w-100 flex-col justify-between pt-1.5 backdrop-blur-md">
    <div>
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
    </div>
    <ChatWidget :messages="messages" />
  </aside>
</template>
