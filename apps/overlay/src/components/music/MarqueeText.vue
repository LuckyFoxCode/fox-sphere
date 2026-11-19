<script setup lang="ts">
import { shouldMarquee } from '@/utils/music';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  text: string;
}>();

// Скорость бегущей строки: 40 px/с. Длительность считается из фактической ширины,
// поэтому длинное название едет дольше, а не быстрее.
const SPEED_PX_PER_SECOND = 40;
// Пробел между копиями текста. Он же входит в период анимации, иначе на стыке
// копии слипаются и строка дёргается.
const GAP_PX = 32;

const viewport = ref<HTMLDivElement | null>(null);
const probe = ref<HTMLSpanElement | null>(null);
const running = ref(false);
const periodPx = ref(0);

const trackStyle = computed<Record<string, string>>(() => ({
  '--music-period': `${periodPx.value}px`,
  '--music-duration': `${periodPx.value / SPEED_PX_PER_SECOND}s`,
}));

// Решение принимается по фактическим ширинам, а не по длине строки: шрифт и
// контейнер могут поменяться, а «12 символов влезают» — не факт.
const measure = () => {
  const box = viewport.value;
  const copy = probe.value;
  if (!box || !copy) return;

  running.value = shouldMarquee(copy.scrollWidth, box.clientWidth);
  periodPx.value = copy.scrollWidth + GAP_PX;
};

let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();

  if (viewport.value) {
    observer = new ResizeObserver(measure);
    observer.observe(viewport.value);
    // За текстом тоже: подмена шрифта после загрузки Quicksand меняет ширину, а
    // контейнер при этом не двигается.
    if (probe.value) observer.observe(probe.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

// Только на текст: повторное событие с тем же названием не должно перезапускать
// анимацию с начала.
watch(
  () => props.text,
  () => measure(),
  { flush: 'post' },
);
</script>

<template>
  <div
    ref="viewport"
    class="w-full overflow-hidden whitespace-nowrap"
  >
    <div
      class="music-track flex w-max"
      :class="{ 'music-run': running }"
      :style="trackStyle"
    >
      <span
        ref="probe"
        class="block"
        >{{ text }}</span
      >
      <!-- Вторая копия нужна только для бесшовного цикла. Пока строка стоит, её
           нельзя держать в разметке: `w-max` делает трек шире текста вдвое, и у
           названия, которое само влезает в контейнер, но вместе с копией и
           отступом - уже нет, хвост копии вылезал рядом с названием. -->
      <span
        v-if="running"
        class="block pl-8"
        aria-hidden="true"
        >{{ text }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.music-run {
  animation: music-marquee var(--music-duration, 8s) linear infinite;
}

@keyframes music-marquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-1 * var(--music-period, 0px)));
  }
}
</style>
