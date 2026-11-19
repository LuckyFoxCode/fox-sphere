import { describe, expect, it } from 'vitest';
import { formatTime, shouldMarquee } from '../format-time';

describe('formatTime', () => {
  it('форматирует минуты и секунды', () => {
    expect(formatTime(72_000)).toBe('1:12');
  });

  it('добивает секунды нулём', () => {
    expect(formatTime(65_000)).toBe('1:05');
  });

  it('показывает 0:00 для нуля', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('показывает часы для длинного трека', () => {
    expect(formatTime(3_723_000)).toBe('1:02:03');
  });

  it('не уходит в минус', () => {
    expect(formatTime(-500)).toBe('0:00');
  });
});

describe('shouldMarquee', () => {
  it('едет, когда текст шире контейнера', () => {
    expect(shouldMarquee(400, 200)).toBe(true);
  });

  it('не едет, когда влезает ровно', () => {
    expect(shouldMarquee(200, 200)).toBe(false);
  });

  it('не едет из-за полупикселя округления', () => {
    expect(shouldMarquee(200.4, 200)).toBe(false);
  });
});
