<script setup lang="ts">
import { paperFor } from '@/constants';
import type { WidgetVariant } from '@fox-sphere/types';
import { computed, type Component } from 'vue';
import StickerFrame from '../sticker-frame/StickerFrame.vue';

/**
 * Оболочка одного события на стриме: follow, raid, reward, vip, стрик, пиво.
 *
 * Шесть виджетов отличаются только данными, поэтому анатомия живёт здесь одним
 * экземпляром — иначе она разъезжается на второй правке. Материал взят из
 * графитовой раскатки: графитовое тело, овсяный контур, крупа (всё это уже в
 * `StickerFrame`), и ровно одна бумага события на пластину под знак.
 *
 * Пластина — единственное место, где звучит цвет события: он перестал светиться
 * и стал бумагой, из которой вырезан знак. Чипы фактов при этом остаются
 * графитовыми, чтобы второй цвет не спорил с первым.
 */
interface EventStickerProps {
  /** Бумага события — одна на стикер. */
  variant: WidgetVariant;
  /** Микролейбл: что произошло. Верхний регистр навешивает CSS. */
  label: string;
  /** Главная строка: с кем это произошло. */
  title: string;
  /** Вторая строка: чем событие закончилось. */
  detail?: string;
  /** Крупная фигура события. Появляется у редких событий с артом. */
  figure?: string;
  /** Знак на пластине. Не рисуется, когда пластину занял арт. */
  icon?: Component;
  /** Арт достижения: занимает пластину целиком, как марка на паспарту. */
  mediaSrc?: string;
  mediaAlt?: string;
  /** Овсяный чип в углу — та же деталь, что `!spin` у рулетки. */
  tag?: string;
  /** Факты события: зрители, XP, название награды. */
  chips?: readonly string[];
}

const props = defineProps<EventStickerProps>();

const paper = computed(() => paperFor(props.variant));

const ariaLabel = computed(() =>
  [props.label, props.title, props.detail, ...(props.chips ?? [])].filter(Boolean).join(' — '),
);
</script>

<template>
  <StickerFrame
    role="status"
    :aria-label="ariaLabel"
    class="w-105 gap-x-3 py-2.5 pr-3 pl-2.5"
  >
    <div
      class="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-transparent"
      :class="[
        paper,
        mediaSrc
          ? `size-32 bg-transparent p-1 border-paper-${paper}`
          : 'size-12 border-transparent',
      ]"
    >
      <img
        v-if="mediaSrc"
        :src="mediaSrc"
        :alt="mediaAlt"
        class="size-50 object-contain"
      />
      <component
        :is="icon"
        v-else-if="icon"
        aria-hidden="true"
        class="text-sticker-body size-8"
      />
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-start justify-between gap-x-2">
        <span
          class="text-sticker-muted text-[10px] leading-none font-bold tracking-[0.17em] uppercase"
        >
          {{ label }}
        </span>
        <span
          v-if="tag"
          class="bg-sticker-edge text-sticker-body -mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-[0.12em] uppercase"
        >
          {{ tag }}
        </span>
      </div>

      <span
        v-if="figure"
        class="text-sticker-ink mt-1.5 text-4xl leading-none font-bold tabular-nums"
      >
        {{ figure }}
      </span>

      <span
        class="text-sticker-ink mt-1.5 truncate leading-none font-bold"
        :class="figure ? 'text-lg font-semibold' : 'text-xl'"
      >
        {{ title }}
      </span>

      <span
        v-if="detail"
        class="text-sticker-muted mt-1.5 truncate text-sm leading-none font-medium"
      >
        {{ detail }}
      </span>

      <div
        v-if="chips?.length"
        class="mt-2 flex flex-wrap gap-1.5"
      >
        <span
          v-for="chip in chips"
          :key="chip"
          class="bg-sticker-track text-sticker-ink max-w-full truncate rounded-md px-1.5 py-1 text-xs leading-none font-bold"
        >
          {{ chip }}
        </span>
      </div>
    </div>
  </StickerFrame>
</template>
