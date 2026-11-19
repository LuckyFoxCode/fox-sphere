import type { MusicNowPlaying } from '@fox-sphere/types';
import { describe, expect, it } from 'vitest';
import { anchorFrom, positionAt } from '../playback-clock';

const base: MusicNowPlaying = {
  title: 'Black Friday - pretty like the sun',
  artist: 'Lost Frequencies, Tom Odell',
  album: 'Black Friday (pretty like the sun)',
  artwork: null,
  durationMs: 145_000,
  positionMs: 72_000,
  isPlaying: true,
  sentAt: 1_000_000,
};

describe('anchorFrom', () => {
  it('ставит якорь на позицию плюс время в пути', () => {
    expect(anchorFrom(base, 1_000_500)).toEqual({
      positionMs: 72_500,
      atMs: 1_000_500,
      isPlaying: true,
    });
  });

  it('не двигает позицию на паузе', () => {
    expect(anchorFrom({ ...base, isPlaying: false }, 1_030_000).positionMs).toBe(72_000);
  });

  it('обрезает отрицательное время в пути', () => {
    expect(anchorFrom(base, 999_000).positionMs).toBe(72_000);
  });

  it('обрезает время в пути пятью минутами', () => {
    expect(anchorFrom(base, 1_600_000).positionMs).toBe(72_000 + 300_000);
  });
});

describe('positionAt', () => {
  it('двигает позицию по времени', () => {
    const anchor = { positionMs: 72_000, atMs: 1_000, isPlaying: true };
    expect(positionAt(anchor, 6_000, 145_000)).toBe(77_000);
  });

  it('стоит на паузе', () => {
    const anchor = { positionMs: 72_000, atMs: 1_000, isPlaying: false };
    expect(positionAt(anchor, 60_000, 145_000)).toBe(72_000);
  });

  it('не выходит за длительность', () => {
    const anchor = { positionMs: 144_000, atMs: 0, isPlaying: true };
    expect(positionAt(anchor, 10_000, 145_000)).toBe(145_000);
  });

  it('возвращает 0 при неизвестной длительности', () => {
    const anchor = { positionMs: 0, atMs: 0, isPlaying: true };
    expect(positionAt(anchor, 5_000, 0)).toBe(0);
  });

  it('не уходит в минус', () => {
    const anchor = { positionMs: 0, atMs: 10_000, isPlaying: true };
    expect(positionAt(anchor, 0, 145_000)).toBe(0);
  });
});
