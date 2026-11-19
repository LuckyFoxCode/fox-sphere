import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MarqueeText from '../MarqueeText.vue';

// В jsdom нет ResizeObserver, а компонент заводит его в onMounted.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const setWidth = (element: Element, property: 'clientWidth' | 'scrollWidth', value: number) => {
  Object.defineProperty(element, property, { value, configurable: true });
};

describe('MarqueeText', () => {
  it('держит в разметке одну копию, пока текст стоит', () => {
    const wrapper = mount(MarqueeText, { props: { text: 'Every Breath' } });

    // Вторая копия - только для бесшовного цикла. В покое трек шире текста вдвое,
    // и её хвост вылезал рядом с названием, когда само название влезает,
    // а название с копией и отступом - уже нет.
    expect(wrapper.findAll('.music-track > span')).toHaveLength(1);
    expect(wrapper.find('.music-run').exists()).toBe(false);
  });

  it('добавляет вторую копию и запускает анимацию, когда текст шире контейнера', async () => {
    const wrapper = mount(MarqueeText, { props: { text: 'Every Breath' } });

    setWidth(wrapper.find('.overflow-hidden').element, 'clientWidth', 120);
    setWidth(wrapper.find('.music-track > span').element, 'scrollWidth', 260);
    // Замер перезапускается на смену текста: новых ширин компонент не видит,
    // пока его не разбудят.
    await wrapper.setProps({ text: 'Every Breath (extended mix)' });

    expect(wrapper.findAll('.music-track > span')).toHaveLength(2);
    expect(wrapper.find('.music-run').exists()).toBe(true);
    expect(wrapper.find('.music-track').attributes('style')).toContain('--music-period: 292px');
  });
});
