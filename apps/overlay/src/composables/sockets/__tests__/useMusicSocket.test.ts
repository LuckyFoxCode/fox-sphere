import type { MusicNowPlaying } from '@fox-sphere/types';
import { describe, expect, it } from 'vitest';
import { useMusicSocket } from '../useMusicSocket';
import type { WidgetSocket } from '../types';

// Композабл держит состояние в модуле и подписывается один раз, поэтому сокет
// здесь один на весь файл: второй `useMusicSocket` уже ничего не регистрирует.
type Handler = (payload: MusicNowPlaying | null) => void;

const handlers: Record<string, Handler> = {};

const fakeSocket = {
  on: (event: string, handler: Handler) => {
    handlers[event] = handler;
  },
  emit: () => {},
  connected: false,
} as unknown as WidgetSocket;

const { state } = useMusicSocket(fakeSocket);

const payload = (sentAt: number): MusicNowPlaying => ({
  title: 'Every Breath',
  artist: 'Miss Monique, braev',
  album: null,
  artwork: null,
  durationMs: 205_000,
  positionMs: 30_000,
  isPlaying: true,
  sentAt,
});

describe('useMusicSocket', () => {
  it('показывает свежее состояние', () => {
    handlers['music:now-playing']?.(payload(Date.now()));

    expect(state.value?.title).toBe('Every Breath');
  });

  it('не показывает состояние, которому больше сорока пяти секунд', () => {
    // `music:get-current` отдаёт последнее состояние из памяти сервера, а
    // таймеров там нет: агент мог умереть полчаса назад. Такое состояние
    // приезжает с `sentAt` тех времён и не должно всплывать как живой трек.
    handlers['music:now-playing']?.(payload(Date.now() - 60_000));

    expect(state.value).toBeNull();
  });

  it('скрывает карточку после `null` от агента', () => {
    handlers['music:now-playing']?.(payload(Date.now()));
    handlers['music:now-playing']?.(null);

    expect(state.value).toBeNull();
  });
});
