<script setup lang="ts">
import { useShopSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { ShopCard } from './widgets';

// Positioned in the upper-left band: the header sits top-right, the profile card at
// `right-[20%] bottom-[35%]`, and the hero lane wanders along the bottom of the screen - so the
// top-left is the one area no other widget and no sprite occupies. The widget positions itself,
// which is why it mounts from `WidgetEventsHub` rather than being placed in the layout.
const { currentEventType } = useShopSocket(socket);
</script>

<template>
  <div class="fixed top-[12%] left-[3%]">
    <Transition
      name="zoom-in"
      mode="out-in"
    >
      <ShopCard v-if="currentEventType === 'show'" />
    </Transition>
  </div>
</template>
