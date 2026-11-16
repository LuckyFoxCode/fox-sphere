<script setup lang="ts">
import { IconFlame } from '@/assets/icons';
import { EventSticker } from '@/components/ui';
import { getWatchStreakAchievement } from '@/constants';
import type { TwitchWatchStreakPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ watchStreak: TwitchWatchStreakPayload }>();

/**
 * Стрик — событие с артом: знак на пластине отдан бейджу достижения, а когда
 * бейджа ещё нет (до первого рубежа), пластину занимает огонь. Пустой она не
 * остаётся никогда.
 */
const achievementSrc = computed(() => getWatchStreakAchievement(props.watchStreak.streakValue));

/**
 * Фраза без эмодзи: знак события несёт пластина, картинке в тексте там не место.
 * Возвращает именно продолжение под фигурой — «x7 / unstoppable» — поэтому
 * единица измерения («streams in a row») нужна только в последней ветке.
 */
const getStreakFlavor = (streak: number): string => {
  if (streak === 3) return 'the fire ignites';
  if (streak === 5) return 'streak machine';
  if (streak === 7) return 'unstoppable';
  if (streak % 10 === 0) return 'a jubilee run';
  if (streak % 5 === 0) return 'a round number';

  return 'streams in a row';
};

const flavor = computed(() => getStreakFlavor(props.watchStreak.streakValue));

const chips = computed(() => {
  const facts: string[] = [];

  if (props.watchStreak.xpAwarded > 0) facts.push(`+${props.watchStreak.xpAwarded} XP`);
  if (props.watchStreak.coinsAwarded > 0) facts.push(`+${props.watchStreak.coinsAwarded} coins`);

  return facts;
});
</script>

<template>
  <EventSticker
    variant="blue"
    :icon="achievementSrc ? undefined : IconFlame"
    :media-src="achievementSrc ?? undefined"
    media-alt="Watch streak achievement"
    label="stream streak"
    :figure="`x${watchStreak.streakValue}`"
    :title="watchStreak.displayName"
    :detail="flavor"
    :tag="watchStreak.isRepeat ? undefined : 'new'"
    :chips="chips"
  />
</template>
