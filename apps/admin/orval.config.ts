import { defineConfig } from 'orval';

// Input is the committed spec file (`apps/api/openapi.json`), not a live server -
// `pnpm gen:api` and CI work without `pnpm dev:api` running. Regenerate the spec
// with `pnpm --filter api openapi:dump` after changing a route.
export default defineConfig({
  foxApi: {
    input: {
      target: '../api/openapi.json',
    },
    output: {
      mode: 'tags-split', // one folder per OpenAPI tag = per api module
      target: './src/api/generated',
      schemas: './src/api/generated/schemas', // types live in their own modules
      client: 'vue-query',
      httpClient: 'fetch',
      prettier: true,
      override: {
        enumGenerationType: 'enum',
      },
    },
  },
});
