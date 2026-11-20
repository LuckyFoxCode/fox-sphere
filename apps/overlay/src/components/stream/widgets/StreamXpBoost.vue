<script setup lang="ts">
import { IconLightning } from '@/assets/icons';
import { StickerFrame } from '@/components/ui';
import { useStreamSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { computed } from 'vue';

const { xpBoost, xpBoostTimeLeft } = useStreamSocket(socket);

const isActive = computed(() => xpBoost.value !== null && xpBoostTimeLeft.value > 0);

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${String(s).padStart(2, '0')}`;
};
</script>

<template>
  <!-- Позиция здесь, а не в родителе, и это лечит сдвиг чата: плашка раньше
       рисовалась в обычном потоке внутри `<main class="flex">`, и её появление
       отжимало сайдбар вправо. `absolute` выводит её из потока совсем - сдвинуть
       она не может ничего, даже на кадр.

       Привязка `right-[21.5rem]` = 12px отступ плюс ширина карточки музыки
       (320px). Поменяется ширина - поправить и здесь. -->
  <Transition name="boost-fade">
    <div
      v-if="isActive"
      class="absolute top-18.5 right-[21.5rem] z-10"
    >
      <StickerFrame
        role="status"
        :aria-label="`Опыт ${xpBoost?.multiplier} икс, осталось ${formatTime(xpBoostTimeLeft)}`"
        class="gap-x-2 py-1.5 pr-3 pl-1.5"
      >
        <!-- Бумажная пластина: единственное место, где звучит цвет события, ровно
             как у `EventSticker`. Молния внутри - графитовыми чернилами. -->
        <span class="bg-paper-purple flex size-7 shrink-0 items-center justify-center rounded-lg">
          <IconLightning class="text-sticker-body size-4" />
        </span>

        <span class="text-sticker-ink text-sm font-bold tabular-nums">
          ×{{ xpBoost?.multiplier }}
        </span>
        <span class="text-sticker-muted text-xs font-semibold tabular-nums">
          {{ formatTime(xpBoostTimeLeft) }}
        </span>
      </StickerFrame>
    </div>
  </Transition>
</template>

<style scoped>
/* Только прозрачность и 200ms: плашка сообщает, а не зовёт. Подскок `zoom-in`
   здесь был лишним движением на краю экрана. */
.boost-fade-enter-active,
.boost-fade-leave-active {
  transition: opacity 200ms ease;
}

.boost-fade-enter-from,
.boost-fade-leave-to {
  opacity: 0;
}
</style>
