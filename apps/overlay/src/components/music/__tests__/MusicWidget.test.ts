import type { MusicNowPlaying } from '@fox-sphere/types';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// vi.hoisted держит контейнер выше vi.mock - иначе фабрика обратится к
// неинициализированным переменным (TDZ) при первом импорте компонента.
const mocks = vi.hoisted(() => ({
  refs: undefined as
    | {
        state: { value: MusicNowPlaying | null };
        positionMs: { value: number };
        durationMs: { value: number };
        isPlaying: { value: boolean };
      }
    | undefined,
}));

vi.mock('@/services', () => ({ socket: {} }));

vi.mock('@/composables/sockets', async () => {
  const { ref } = await import('vue');
  const state = ref<MusicNowPlaying | null>(null);
  const positionMs = ref(0);
  const durationMs = ref(0);
  const isPlaying = ref(false);
  mocks.refs = { state, positionMs, durationMs, isPlaying };

  return {
    useMusicSocket: () => ({ state, positionMs, durationMs, isPlaying }),
  };
});

// В jsdom нет ResizeObserver, а MarqueeText заводит его в onMounted.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const MusicWidget = (await import('../MusicWidget.vue')).default;

const refs = () => {
  if (!mocks.refs) throw new Error('socket mock not initialized');
  return mocks.refs;
};

const playing: MusicNowPlaying = {
  title: 'Black Friday - pretty like the sun',
  artist: 'Lost Frequencies, Tom Odell',
  album: 'Black Friday (pretty like the sun)',
  artwork: 'data:image/png;base64,AAAA',
  durationMs: 145_650,
  positionMs: 72_000,
  isPlaying: true,
  sentAt: 1_000_000,
};

const show = (state: MusicNowPlaying | null) => {
  const current = refs();
  current.state.value = state;
  current.durationMs.value = state?.durationMs ?? 0;
  current.positionMs.value = state?.positionMs ?? 0;
  current.isPlaying.value = state?.isPlaying ?? false;

  return mount(MusicWidget);
};

describe('MusicWidget', () => {
  it('не рисует карточку, пока ничего не играет', () => {
    const wrapper = show(null);

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Play now');
  });

  it('показывает обложку, исполнителя, название и оба тайминга', () => {
    const wrapper = show(playing);

    expect(wrapper.find('img').attributes('src')).toBe(playing.artwork);
    expect(wrapper.text()).toContain('Lost Frequencies, Tom Odell');
    expect(wrapper.text()).toContain('Black Friday - pretty like the sun');
    expect(wrapper.text()).toContain('1:12');
    expect(wrapper.text()).toContain('2:25');
  });

  it('рисует сорок делений полоски', () => {
    const wrapper = show(playing);

    expect(wrapper.findAll('.border-r-2')).toHaveLength(40);
  });

  it('ставит заглушку с нотой, когда обложки нет', () => {
    const wrapper = show({ ...playing, artwork: null });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('path').exists()).toBe(true);
  });

  it('притухает на паузе', () => {
    expect(show({ ...playing, isPlaying: false }).find('.opacity-70').exists()).toBe(true);
    expect(show(playing).find('.opacity-70').exists()).toBe(false);
  });
});
