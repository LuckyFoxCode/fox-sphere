import type { WidgetVariant } from '@fox-sphere/types';

/**
 * Бумага события: цвет стримера, переведённый в материал.
 *
 * Шесть цветов `!timer 5 red BRB` были придуманы для неона, где цвет жил в
 * рамке и свечении. В стикерном мире цвет остаётся смыслом выбора, но
 * перестаёт светиться: он становится бумагой, из которой вырезаны тайлы
 * цифр. Тело виджета при этом графитовое - так цвет звучит ровно там, куда
 * смотрит глаз, и не тянет внимание с геймплея.
 *
 * Классы записаны строками целиком, а не собраны из имени варианта: Tailwind
 * ищет их в исходниках текстом, и `bg-paper-${variant}` дал бы пустой CSS.
 */
export const WIDGET_PAPER: Record<WidgetVariant, string> = {
  amber: 'bg-paper-amber',
  blue: 'bg-paper-blue',
  cyan: 'bg-paper-cyan',
  purple: 'bg-paper-purple',
  red: 'bg-paper-red',
  rose: 'bg-paper-rose',
};

/** Бумага для выбранного цвета. Неизвестный вариант не должен оставить тайл пустым. */
export const paperFor = (variant: WidgetVariant): string =>
  WIDGET_PAPER[variant] ?? WIDGET_PAPER.blue;
