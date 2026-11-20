import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// vi.hoisted держит контейнер выше vi.mock - иначе фабрика обратится к
// неинициализированным переменным (TDZ) при первом импорте компонента.
const mocks = vi.hoisted(() => ({
  refs: undefined as
    | {
        xpBoost: { value: { multiplier: number } | null };
        xpBoostTimeLeft: { value: number };
      }
    | undefined,
}));

vi.mock('@/services', () => ({ socket: {} }));

vi.mock('@/composables/sockets', async () => {
  const { ref } = await import('vue');
  const xpBoost = ref<{ multiplier: number } | null>(null);
  const xpBoostTimeLeft = ref(0);
  mocks.refs = { xpBoost, xpBoostTimeLeft };

  return { useStreamSocket: () => ({ xpBoost, xpBoostTimeLeft }) };
});

const StreamXpBoost = (await import('../StreamXpBoost.vue')).default;

const refs = () => {
  if (!mocks.refs) throw new Error('socket mock not initialized');
  return mocks.refs;
};

const show = (multiplier: number | null, seconds = 0) => {
  const current = refs();
  current.xpBoost.value = multiplier === null ? null : { multiplier };
  current.xpBoostTimeLeft.value = seconds;

  return mount(StreamXpBoost);
};

describe('StreamXpBoost', () => {
  it('молчит, когда буста нет', () => {
    const wrapper = show(null);

    expect(wrapper.text()).not.toContain('×');
    expect(wrapper.find('.absolute').exists()).toBe(false);
  });

  it('молчит, когда время вышло, хотя буст ещё в состоянии', () => {
    // Гонка на границе: сервер уже прислал буст, но `endsAt` в прошлом.
    // Плашка не должна мигать на нуле.
    expect(show(2, 0).text()).not.toContain('×');
  });

  it('показывает множитель и остаток', () => {
    const wrapper = show(2, 200);

    expect(wrapper.text()).toContain('×2');
    expect(wrapper.text()).toContain('3:20');
  });

  it('стоит вне потока, чтобы не сдвигать чат', () => {
    // Регрессия: плашка рисовалась в обычном потоке внутри `<main class="flex">`
    // и при появлении отжимала сайдбар вправо. `absolute` - то, что это лечит,
    // и без него чат снова поедет.
    expect(show(2, 200).find('.absolute').exists()).toBe(true);
  });
});
