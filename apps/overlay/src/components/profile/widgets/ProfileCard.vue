<script setup lang="ts">
import { WidgetFrame } from '@/components/ui/widget-frame';
import type { ProfileShowPayload } from '@fox-sphere/types';
import { computed } from 'vue';

const props = defineProps<{ profile: ProfileShowPayload }>();

interface RoleChip {
  label: string;
  classes: string;
}

// Порядок — от самого «громкого» статуса к обычному подписчику.
const roleChips = computed<RoleChip[]>(() => {
  const chips: RoleChip[] = [];

  if (props.profile.isFounder) {
    chips.push({ label: 'founder', classes: 'bg-event-amber/20 text-event-amber' });
  }
  if (props.profile.isMod) {
    chips.push({ label: 'mod', classes: 'bg-event-blue/20 text-event-blue' });
  }
  if (props.profile.isPermanentVip) {
    chips.push({ label: 'vip', classes: 'bg-event-purple/20 text-event-purple' });
  }
  if (props.profile.isLuckyVip) {
    chips.push({ label: 'lucky vip', classes: 'bg-event-rose/20 text-event-rose' });
  }
  if (props.profile.isSubscriber) {
    chips.push({ label: 'sub', classes: 'bg-event-cyan/20 text-event-cyan' });
  }

  return chips;
});
</script>

<template>
  <WidgetFrame
    variant="cyan"
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
          class="bg-event-cyan/20 text-event-cyan shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
        >
          lvl {{ profile.lvl }}
        </span>
      </div>

      <div class="flex items-center gap-x-4">
        <!-- Заглушка вместо спрайта: здесь будет герой, круг — его место. -->
        <div
          class="border-event-cyan/40 bg-event-cyan/5 flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-2"
        >
          <span class="text-event-cyan/60 text-[9px] tracking-[0.2em] uppercase">hero</span>
          <span class="text-event-cyan max-w-18 truncate text-xs font-bold">
            {{ profile.heroId ?? 'none' }}
          </span>
        </div>

        <div class="flex min-w-0 flex-col gap-y-1.5 text-sm">
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">hero lvl:</span>
            <span class="text-event-cyan font-bold">{{ profile.heroLevel ?? '—' }}</span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">best streak:</span>
            <span class="text-event-amber font-bold">
              {{ profile.bestStreak ?? '—' }}
            </span>
          </div>
          <div class="flex items-center gap-x-1.5">
            <span class="text-text-second capitalize">xp:</span>
            <span class="font-bold">{{ profile.xp }}</span>
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
          class="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
          :class="chip.classes"
        >
          {{ chip.label }}
        </span>
      </div>
    </div>
  </WidgetFrame>
</template>
