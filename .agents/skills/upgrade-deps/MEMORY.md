# upgrade-deps - accumulated traps

Append-only. Each entry is something that actually cost time, not speculation.

## Prisma

- **`prisma generate` must run before any type-check.** `apps/backend/src/generated/prisma` is gitignored, so a fresh clone or a `git clean` leaves `tsc` failing with missing-module errors that look like a broken upgrade and are not. The gate runs `pnpm --filter backend exec prisma generate` for this reason.
- **The client entrypoint is `generated/prisma/client`,** not `generated/prisma`. A Prisma major that changes the generated layout will surface here first, in `apps/backend/src/shared/lib/prisma.ts`.
- **`moduleFormat` is unset** in the `prisma-client` generator block while the backend is ESM. It works today on the generator's default. Re-check it on any Prisma major - a changed default would break the import silently at runtime rather than at build.
- `prisma`, `@prisma/client` and `@prisma/adapter-pg` move as one bucket.

## TypeScript

- **Pinned `~6.0`,** and `apps/backend/tsconfig.json` carries `ignoreDeprecations: "6.0"`. A TypeScript major can reject that option outright, so a TS bump fails at config parse before it reaches a single source file. Expect to remove or re-target the option as part of the bump.
- A TS bump moves the backend `tsc`, the frontend `vue-tsc`, and the tsdown builds in `packages/*` all at once. Own bucket, first among the majors.

## Frontend

- **Tailwind 4 is configured through `@tailwindcss/vite`.** There is no `tailwind.config.js` in this repo, so migration guides that talk about editing one do not apply.
- **`apps/frontend/package.json` declares `engines.node` as `^20.19.0 || >=22.12.0`.** This is host-only: `.docker/backend.Dockerfile` never builds the frontend (it's deliberately absent - see `.agents/rules/monorepo.md`), so the container's `node:24-alpine` has no bearing on it. Anything that turns on strict engine checking will surface as a frontend install failure on whatever Node the host happens to be running.
- `vue`, `vue-tsc` and `@vitejs/plugin-vue` move together. `vue-tsc` lagging the compiler produces type errors in SFCs nobody touched.
- **The frontend lint stack is four coupled packages: `eslint`, `@vue/eslint-config-typescript`, `oxlint`, `eslint-plugin-oxlint`.** `apps/frontend/eslint.config.ts` calls `pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json')`, so an oxlint bump can break the eslint config, not just oxlint. `typescript-eslint` is a different, backend-only pairing (`apps/backend/eslint.config.js`) - it is not part of the frontend's cluster even though both apps sit on eslint `^10`.

## Workspace

- **`packages/*` build with tsdown, not `tsc`.** A TypeScript or build-tooling bump exercises a different code path there than in the apps, and `pnpm build:p` must pass before either app type-checks.
- **`.docker/backend.Dockerfile` copies the root manifests plus one `package.json` per member the backend build needs** - today that's `apps/backend`, `packages/types`, `packages/shared-schemas`. `apps/frontend` is deliberately absent; the backend image never builds it. A new member that the backend depends on needs a new `COPY` line there, or the Docker build silently installs without it.
- The running backend container holds the image's dependencies. `docker compose exec` will not see a host-side upgrade - rebuild with `docker compose build backend` to test new versions in-container.
