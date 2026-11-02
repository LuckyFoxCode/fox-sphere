<script setup lang="ts">
import { useShopSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { ShopCard } from './widgets';

const { currentEventType } = useShopSocket(socket);
</script>

<template>
  <div class="fixed top-[50%] left-[50%] -translate-1/2">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <ShopCard v-if="currentEventType === 'show'" />
    </Transition>
  </div>
</template>
