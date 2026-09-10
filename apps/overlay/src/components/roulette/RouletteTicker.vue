<script setup lang="ts">
import { useRouletteSocket } from '@/composables/sockets';
import { socket } from '@/services';

const { jackpotTotal } = useRouletteSocket(socket);
</script>

<template>
  <div
    class="my-auto rounded-md border border-amber-400/30 bg-card/80 px-3 py-1 text-sm text-amber-300"
  >
    🎰 Банк: {{ jackpotTotal.toLocaleString('ru-RU') }} 🪙
  </div>
</template>
