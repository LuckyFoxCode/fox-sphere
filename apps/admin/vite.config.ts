import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // One .env for the whole repo, not one per app. The backend already loads the root file
  // (packages/backend-shared/src/config.ts resolves it from the package, not cwd), so leaving
  // Vite on its default would silently split configuration in two: VITE_* vars would have to be
  // duplicated into apps/admin/.env while everything else lived at the root.
  // Safe: only VITE_-prefixed vars reach the client bundle, so the root file's DATABASE_URL and
  // Twitch tokens stay server-side.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    // apps/api is HTTP only - no /socket.io proxy, because it has no socket server.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
