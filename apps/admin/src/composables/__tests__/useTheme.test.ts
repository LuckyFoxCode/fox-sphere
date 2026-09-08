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
    window.matchMedia = vi.fn<() => { matches: boolean }>().mockReturnValue({ matches: true });
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
