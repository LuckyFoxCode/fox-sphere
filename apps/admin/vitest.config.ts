import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merged with the app's vite config so the @/ alias and the Vue plugin apply.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'lcov'],
        include: [
          'src/App.vue',
          'src/views/**/*.{ts,vue}',
          'src/components/channels/**/*.{ts,vue}',
          'src/components/nav/**/*.{ts,vue}',
          'src/components/status/**/*.{ts,vue}',
          'src/composables/**/*.{ts,vue}',
          'src/lib/**/*.{ts,vue}',
          'src/router/**/*.{ts,vue}',
        ],
        exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  }),
);
