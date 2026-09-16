import { flushPromises, mount } from '@vue/test-utils';
import type { RouletteSpinResultPayload } from '@fox-sphere/types';
import { describe, expect, it, vi } from 'vitest';
import type { RouletteStatus } from '@/composables/sockets/types';

// vi.hoisted держит контейнер выше vi.mock — иначе фабрика обратится к
// неинициализированным переменным (TDZ) при первом импорте компонента.
const mocks = vi.hoisted(() => ({
  refs: undefined as
    | {
        status: { value: RouletteStatus };
        result: { value: RouletteSpinResultPayload | null };
        jackpot: { value: number };
      }
    | undefined,
}));

vi.mock('@/composables/sockets', async () => {
  const { ref } = await import('vue');
  const status = ref<RouletteStatus>('idle');
  const result = ref<RouletteSpinResultPayload | null>(null);
  const jackpot = ref(1000);
  mocks.refs = { status, result, jackpot };
  return {
    useRouletteSocket: () => ({
      currentRouletteStatus: status,
      spinResult: result,
      jackpotTotal: jackpot,
    }),
  };
});

// В jsdom/happy-dom rAF может отсутствовать — заглушка на setTimeout.
if (typeof requestAnimationFrame === 'undefined') {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
}

const RouletteSpin = (await import('../RouletteSpin.vue')).default;

const refs = () => {
  if (!mocks.refs) throw new Error('socket mock not initialized');
  return mocks.refs;
};

// Vue 3 never renders the virtual `key` prop into the DOM, so `[key="tape"]`
// can never match (`key` is a patch hint, not an attribute). Branch by real
// DOM instead: TapeStrip's aria-label and the takeover overlay's bg-bg/70 root.
describe('RouletteSpin', () => {
  it('is hidden while idle', () => {
    refs().status.value = 'idle';
    const wrapper = mount(RouletteSpin);
    expect(wrapper.find('[aria-label="Roulette tape"]').exists()).toBe(false);
    expect(wrapper.find('.bg-bg\\/70').exists()).toBe(false);
  });

  it('shows the tape while spinning', async () => {
    const { status } = refs();
    status.value = 'idle';
    const wrapper = mount(RouletteSpin);
    status.value = 'spinning';
    await flushPromises();
    expect(wrapper.find('[aria-label="Roulette tape"]').exists()).toBe(true);
  });

  it('shows the tape pulsing first, then the jackpot takeover', async () => {
    vi.useFakeTimers();
    const { status } = refs();
    status.value = 'idle';
    const wrapper = mount(RouletteSpin);
    status.value = 'jackpot';
    await flushPromises();
    expect(wrapper.find('[aria-label="Roulette tape"]').exists()).toBe(true);

    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(wrapper.find('.bg-bg\\/70').exists()).toBe(true);
    vi.useRealTimers();
  });
});
