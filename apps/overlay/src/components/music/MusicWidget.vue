<script setup lang="ts">
import { StickerFrame } from '@/components/ui';
import { useMusicSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { formatTime } from '@/utils/music';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MarqueeText from './MarqueeText.vue';

const { state, positionMs, durationMs, isPlaying } = useMusicSocket(socket);

const percent = computed(() => {
  // Нулевая длительность — это не 0 %, а «неизвестно»: деление дало бы NaN, и
  // ширина заливки стала бы невалидной.
  if (durationMs.value <= 0) return 0;

  return Math.min(Math.max(positionMs.value / durationMs.value, 0), 1) * 100;
});

// У радио-потока длительности нет вовсе: GSMTC отдаёт `EndTime = 0` и позицию
// `0` на каждом опросе. Полоска из этого не выходит - она стоит пустой, а оба
// тайминга читаются как `0:00`, то есть как «трек на самом начале», хотя он
// играет уже час. Такому треку полоску не показываем совсем: она врёт, а
// обложка, исполнитель и название остаются верными.
const hasDuration = computed(() => durationMs.value > 0);

const pad = (value: number) => value.toString().padStart(2, '0');

const clock = ref('');

const updateClock = () => {
  const now = new Date();
  clock.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

let clockTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 30_000);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
});
</script>

<template>
  <div class="absolute top-18.5 right-3 z-10 w-80">
    <Transition name="music-fade">
      <div
        v-if="state"
        class="w-full"
      >
        <StickerFrame
          class="w-full px-3.5 pt-3 pb-4 transition-opacity duration-500"
          :class="isPlaying ? 'opacity-100' : 'opacity-70'"
        >
          <div class="flex w-full flex-col gap-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sticker-ink flex items-center gap-x-2 text-[15px] font-bold">
                <span class="bg-sticker-edge flex size-5 items-center justify-center rounded-full">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="text-sticker-body"
                  >
                    <path
                      d="M9 18.5A2.5 2.5 0 1 1 6.5 16H9V5l10-2v11.5A2.5 2.5 0 1 1 16.5 12H17V7.4l-8 1.6z"
                    />
                  </svg>
                </span>
                Play now
              </div>

              <span
                class="bg-sticker-edge text-sticker-body rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums"
              >
                {{ clock }}
              </span>
            </div>

            <div
              class="border-sticker-edge/25 bg-sticker-well flex items-center overflow-hidden rounded-xl border"
            >
              <img
                v-if="state.artwork"
                :src="state.artwork"
                alt=""
                class="size-18 shrink-0 object-cover"
              />
              <div
                v-else
                class="bg-sticker-track text-sticker-muted flex size-18 shrink-0 items-center justify-center"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M9 18.5A2.5 2.5 0 1 1 6.5 16H9V5l10-2v11.5A2.5 2.5 0 1 1 16.5 12H17V7.4l-8 1.6z"
                  />
                </svg>
              </div>

              <div class="min-w-0 flex-1 py-2 pr-3 pl-3">
                <div class="text-sticker-muted truncate text-sm leading-snug font-semibold">
                  {{ state.artist }}
                </div>
                <MarqueeText
                  :text="state.title"
                  class="text-sticker-ink mt-1 text-lg leading-snug font-bold"
                />
              </div>
            </div>

            <div v-if="hasDuration">
              <div
                class="text-sticker-muted mb-1 flex justify-between text-xs font-semibold tabular-nums"
              >
                <span>{{ formatTime(positionMs) }}</span>
                <span>{{ formatTime(durationMs) }}</span>
              </div>

              <!-- Та же бумага, что у XP-полоски: дорожка, роза, мятный ведущий
                   край. Отличие одно - заливка едет непрерывно, а не ячейками,
                   иначе она дёргается раз в 3.6 секунды. -->
              <div class="bg-sticker-track relative h-2.5 w-full overflow-hidden rounded-full">
                <div
                  class="bg-sticker-rose absolute inset-y-0 left-0 rounded-full transition-[width] duration-250 ease-linear"
                  :style="{ width: `${percent}%` }"
                >
                  <span class="bg-sticker-mint absolute inset-y-0 right-0 w-2" />
                </div>

                <div class="pointer-events-none absolute inset-0 flex">
                  <span
                    v-for="cell in 40"
                    :key="cell"
                    class="border-sticker-body flex-1 border-r-2 last:border-r-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </StickerFrame>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.music-fade-enter-active,
.music-fade-leave-active {
  transition: opacity 0.4s ease;
}

.music-fade-enter-from,
.music-fade-leave-to {
  opacity: 0;
}
</style>
