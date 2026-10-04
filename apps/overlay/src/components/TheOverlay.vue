<script setup lang="ts">
import { MainScene } from '@/phaser/scenes';
import Phaser from 'phaser';
import { onMounted, onUnmounted, ref } from 'vue';
import TheFooter from './TheFooter.vue';
import TheHeader from './TheHeader.vue';
import TheSidebar from './TheSidebar.vue';
import { WidgetEventsHub } from './widgets-hub';

const phaserContainer = ref<HTMLDivElement | null>(null);
let game: Phaser.Game | null = null;

onMounted(() => {
  if (!phaserContainer.value) return;

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: phaserContainer.value,
    width: '100%',
    height: '100%',
    transparent: true,
    backgroundColor: 'rgba(0,0,0,0)',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene],
  });
});

onUnmounted(() => {
  game?.destroy(true);
  game = null;
});
</script>

<template>
  <div class="relative flex h-screen w-screen flex-col overflow-hidden">
    <div
      ref="phaserContainer"
      class="pointer-events-none absolute inset-0 z-0"
    />

    <TheHeader class="relative z-10" />
    <main class="relative z-10 flex w-full flex-1 justify-end">
      <WidgetEventsHub />
      <TheSidebar />
    </main>
    <TheFooter class="relative z-10 hidden" />
  </div>
</template>
