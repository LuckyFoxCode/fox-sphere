import { ref, watchEffect } from 'vue';

const STORAGE_KEY = 'theme';

function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const isDark = ref(getInitialDark());

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

applyTheme(isDark.value);

watchEffect(() => {
  applyTheme(isDark.value);
  localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light');
});

export function useTheme() {
  const toggle = () => {
    isDark.value = !isDark.value;
  };

  return { isDark, toggle };
}
