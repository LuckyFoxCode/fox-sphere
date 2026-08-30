<script setup lang="ts">
import { useTwitchSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { TwitchTimer } from './twitch/widgets';
import { ChatWidget } from './twitch/widgets/chat';

const { isTimerActive, timer, timeDigits, messages } = useTwitchSocket(socket);
</script>

<template>
  <aside
    class="from-card/75 via-card/35 flex h-full w-100 flex-col justify-between bg-linear-to-l to-transparent pt-1.5"
  >
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
