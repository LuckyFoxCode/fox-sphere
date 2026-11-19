import type { MusicNowPlaying } from '@fox-sphere/types';

export type PlaybackAnchor = {
  positionMs: number;
  atMs: number;
  isPlaying: boolean;
};

// Сколько времени в пути имеет смысл учитывать. Всё, что больше, — это либо
// часы разъехались, либо состояние пролежало без сердцебиения; в обоих случаях
// доверять ему как «прошло пять минут» нельзя.
const MAX_TRAVEL_MS = 300_000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Ставит якорь по пришедшему состоянию.
 *
 * `sentAt` приходит с той же Windows-машины, где крутится OBS, поэтому его
 * можно сравнивать с местными часами напрямую. Это же спасает ack после
 * перезагрузки сцены: состояние может быть пятнадцатисекундной давности, и
 * полоска встанет на своё место, а не откатится назад.
 */
export const anchorFrom = (state: MusicNowPlaying, nowMs: number): PlaybackAnchor => {
  const travel = state.isPlaying ? clamp(nowMs - state.sentAt, 0, MAX_TRAVEL_MS) : 0;

  return {
    positionMs: state.positionMs + travel,
    atMs: nowMs,
    isPlaying: state.isPlaying,
  };
};

/** Позиция на момент `nowMs`, зажатая в `[0, durationMs]`. */
export const positionAt = (
  anchor: PlaybackAnchor,
  nowMs: number,
  durationMs: number,
): number => {
  if (durationMs <= 0) return 0;

  const elapsed = anchor.isPlaying ? nowMs - anchor.atMs : 0;

  return clamp(anchor.positionMs + elapsed, 0, durationMs);
};
