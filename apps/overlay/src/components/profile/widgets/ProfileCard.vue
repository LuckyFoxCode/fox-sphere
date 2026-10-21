<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { ProfileShowPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ profile: ProfileShowPayload }>();

interface RoleChip {
  label: string;
  classes: string;
}

const roleChips = computed<RoleChip[]>(() => {
  const chips: RoleChip[] = [];

  if (props.profile.isFounder) {
    chips.push({
      label: 'founder',
      classes: 'bg-event-purple/10 border-event-purple/30 text-event-purple ',
    });
  }
  if (props.profile.isMod) {
    chips.push({ label: 'mod', classes: 'bg-event-cyan/10 border-event-cyan/30  text-event-cyan' });
  }
  if (props.profile.isPermanentVip) {
    chips.push({
      label: 'vip',
      classes: 'bg-event-rose/10 text-event-rose border-event-rose/30',
    });
  }
  if (props.profile.isLuckyVip) {
    chips.push({
      label: 'lucky vip',
      classes: 'bg-lime/10 border-lime/30 text-lime',
    });
  }
  if (props.profile.isSubscriber) {
    chips.push({ label: 'sub', classes: 'bg-event-blue/10 text-event-blue border-event-blue/30' });
  }

  return chips;
});
</script>

<template>
  <WidgetFrame
    variant="red"
    position-x="90"
  >
    <div class="flex w-80 flex-col gap-y-3 p-3">
      <div class="flex items-baseline justify-between gap-x-2">
        <span
          class="truncate text-lg leading-none font-bold"
          :style="{ color: profile.color }"
        >
          {{ profile.displayName }}
        </span>
        <span
          class="bg-event-amber/20 text-event-amber shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold uppercase"
        >
          lvl {{ profile.lvl }}
        </span>
      </div>

      <div class="flex items-center gap-x-4">
        <!-- Заглушка вместо спрайта: здесь будет герой, круг — его место. -->
        <div
          class="border-event-red/40 bg-event-red/5 flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-2"
        >
          <span class="text-event-red/60 text-[9px] tracking-[0.2em] uppercase">hero</span>
          <span class="text-event-red max-w-18 truncate text-xs font-bold">
            {{ profile.heroId ?? 'none' }}
          </span>
        </div>

        <div class="flex min-w-0 flex-col gap-y-1.5 text-sm">
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">hero lvl:</span>
            <span class="text-event-blue font-bold">{{ profile.heroLevel ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">best streak:</span>
            <span class="text-event-blue font-bold">
              {{ profile.bestStreak ?? '—' }}
            </span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">xp:</span>
            <span class="font-bold text-white">⚡{{ profile.xp }}</span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">coins:</span>
            <span class="text-event-amber font-bold">🪙 {{ profile.coins }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="roleChips.length > 0"
        class="flex flex-wrap gap-1.5"
      >
        <span
          v-for="chip in roleChips"
          :key="chip.label"
          class="flex items-center rounded-md border-2 px-1.5 py-0.5 text-[10px] font-bold uppercase"
          :class="chip.classes"
        >
          {{ chip.label }}
        </span>
      </div>
    </div>
  </WidgetFrame>
</template>
