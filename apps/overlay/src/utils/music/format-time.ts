const pad = (value: number): string => value.toString().padStart(2, '0');

/** `1:12`, `0:05`, `1:02:03`. Отрицательные значения читаются как ноль. */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(Math.max(ms, 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

/**
 * Ехать ли тексту. Порог в один пиксель, а не `> 0`: субпиксельное округление
 * иначе включает анимацию на строке, которая визуально влезает целиком, и
 * название дёргается, хотя деваться ему некуда.
 */
export const shouldMarquee = (scrollWidth: number, clientWidth: number): boolean =>
  scrollWidth - clientWidth > 1;
