import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as { matchMedia?: unknown }).matchMedia;
    document.documentElement.classList.remove('dark');
    vi.resetModules();
  });

  it('returns dark when stored theme is dark', async () => {
    localStorage.setItem('theme', 'dark');
    const { useTheme } = await import('../useTheme');
    expect(useTheme().isDark.value).toBe(true);
  });

  it('returns light when stored theme is light', async () => {
    localStorage.setItem('theme', 'light');
    const { useTheme } = await import('../useTheme');
    expect(useTheme().isDark.value).toBe(false);
  });

  it('falls back to prefers-color-scheme when nothing is stored', async () => {
    const noop = vi.fn<(...args: unknown[]) => void>();
    window.matchMedia = vi
      .fn<(query: string) => MediaQueryList>()
      .mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: noop,
        removeEventListener: noop,
        dispatchEvent: noop,
        addListener: noop,
        removeListener: noop,
      } as unknown as MediaQueryList) as unknown as typeof window.matchMedia;
    const { useTheme } = await import('../useTheme');
    expect(useTheme().isDark.value).toBe(true);
  });

  it('toggles and persists the theme', async () => {
    const { useTheme } = await import('../useTheme');
    const initial = useTheme().isDark.value;
    useTheme().toggle();
    await nextTick();
    expect(useTheme().isDark.value).toBe(!initial);
    expect(localStorage.getItem('theme')).toBe(useTheme().isDark.value ? 'dark' : 'light');
  });

  it('applies the dark class to the document element', async () => {
    const { useTheme } = await import('../useTheme');
    useTheme().toggle();
    await nextTick();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
