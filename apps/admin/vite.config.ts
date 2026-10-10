import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // One .env for the whole repo, not one per app, so the first client-exposed variable does not
  // need duplicating into apps/admin/.env while everything else lives at the root - the backend
  // already loads it (packages/backend-shared/src/config.ts resolves the path from the package,
  // not cwd). Nothing in this app reads env vars yet; when something does, only VITE_-prefixed
  // vars reach the client bundle, so the root file's DATABASE_URL and tokens stay server-side.
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
