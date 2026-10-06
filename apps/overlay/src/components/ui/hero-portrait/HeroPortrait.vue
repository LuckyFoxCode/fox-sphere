<script setup lang="ts">
import { buildHeroPortraitStyle, getHeroById } from '@/utils/hero';
import { computed } from 'vue';

const { heroId, size = 'h-16' } = defineProps<{ heroId: string; size?: string }>();

const portraitStyle = computed(() => buildHeroPortraitStyle(heroId));
const heroName = computed(() => getHeroById(heroId).name);
</script>

<template>
  <div
    class="aspect-square shrink-0 bg-no-repeat"
    :class="size"
    :style="portraitStyle"
    role="img"
    :aria-label="heroName"
  />
</template>
