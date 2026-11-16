import { WIDGET_VARIANTS } from "@fox-sphere/types";
import type { ActiveStreamTimer, WidgetVariant } from "@fox-sphere/types";

/** Цвет по умолчанию — тот же, что подставляет `!timer`, если вариант не распознан. */
const DEFAULT_TIMER_COLOR: WidgetVariant = "blue";

const isWidgetVariant = (value: string): value is WidgetVariant =>
  WIDGET_VARIANTS.includes(value as WidgetVariant);

/**
 * Разворачивает строку `SystemState` в живой таймер или `null`.
 *
 * Просроченный дедлайн — это отсутствие таймера, и решает это чтение, а не
 * запись: строка не обязана сама себя чистить, а оверлей не должен получать
 * `endsAt` в прошлом и рисовать нули вместо пустоты.
 *
 * `timerColor` — `String?` в схеме, а не enum: значение приходит из чата, и
 * неизвестное (старая строка, опечатка после смены палитры) падает на цвет по
 * умолчанию вместо того, чтобы отдать оверлею несуществующий вариант.
 */
export const resolveActiveTimer = (
  state: {
    timerTitle: string | null;
    timerColor: string | null;
    timerEndsAt: Date | null;
  },
  now: number = Date.now(),
): ActiveStreamTimer | null => {
  if (!state.timerTitle || !state.timerEndsAt) {
    return null;
  }

  const endsAt = state.timerEndsAt.getTime();

  if (endsAt <= now) {
    return null;
  }

  return {
    title: state.timerTitle,
    color:
      state.timerColor && isWidgetVariant(state.timerColor)
        ? state.timerColor
        : DEFAULT_TIMER_COLOR,
    endsAt,
  };
};
