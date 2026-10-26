<script setup lang="ts">
import { HeroPortrait } from '@/components/ui';
import { WidgetFrame } from '@/components/ui/widget-frame';
import { HEROES } from '@/utils/hero';
import type { HeroStats } from '@fox-sphere/types';

/**
 * The storefront: one row of the whole catalog, nothing else.
 *
 * It is deliberately stateless — no "owned", no "equipped", no viewer name. The window is
 * shared by everyone watching, so a personal state drawn here would be one viewer's collection
 * shown to the whole chat. That state lives in `!buy` / `!use`, which answer in chat.
 *
 * The row is `flex` with `basis-0` children rather than a fixed grid: cards shrink to fit and
 * the layout survives a catalog that grows, with no scroll and no pagination.
 */
const STAT_LABELS = [
  { key: 'health', label: 'hp' },
  { key: 'attack', label: 'atk' },
  { key: 'defense', label: 'def' },
  { key: 'speed', label: 'spd' },
] as const satisfies readonly { key: keyof HeroStats; label: string }[];

/** A free hero priced at `0` reads as a bug on a shop card; the number is still the source. */
const formatPrice = (price: number): string => (price === 0 ? 'free' : `🪙 ${price}`);
</script>

<template>
  <WidgetFrame variant="purple">
    <div class="flex w-[44rem] max-w-[80vw] flex-col gap-y-4 px-1 py-1">
      <div class="flex flex-col items-center gap-y-0.5">
        <span class="text-event-purple text-[10px] font-bold tracking-[0.3em] uppercase">
          foxsphere
        </span>
        <span class="text-text-main text-lg leading-none font-bold">Shop</span>
      </div>

      <div class="flex items-stretch gap-x-3">
        <div
          v-for="hero in HEROES"
          :key="hero.id"
          class="border-event-purple/30 bg-event-purple/5 flex min-w-0 flex-1 basis-0 flex-col items-center gap-y-2 rounded-xl border-2 px-2 py-3"
        >
          <HeroPortrait
            :hero-id="hero.id"
            size="w-full max-w-24"
          />

          <div class="flex min-w-0 flex-col items-center gap-y-0.5">
            <span class="text-text-main max-w-full truncate text-sm leading-none font-bold">
              {{ hero.name }}
            </span>
            <span class="text-event-amber text-xs leading-none font-bold">
              {{ formatPrice(hero.price) }}
            </span>
          </div>

          <div class="grid w-full grid-cols-2 gap-1">
            <div
              v-for="stat in STAT_LABELS"
              :key="stat.key"
              class="bg-event-purple/10 flex items-center justify-between gap-x-1 rounded-md px-1.5 py-0.5"
            >
              <span
                class="text-text-second truncate text-[9px] font-bold tracking-widest uppercase"
              >
                {{ stat.label }}
              </span>
              <span class="text-event-purple shrink-0 text-xs font-bold">
                {{ hero.baseStats[stat.key] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>
