import { ref, watchEffect } from 'vue';

const STORAGE_KEY = 'theme';

function getInitialDark(): boolean {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

const isDark = ref(getInitialDark());

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

applyTheme(isDark.value);

watchEffect(() => {
  applyTheme(isDark.value);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light');
  }
});

export function useTheme() {
  const toggle = () => {
    isDark.value = !isDark.value;
  };

  return { isDark, toggle };
}
